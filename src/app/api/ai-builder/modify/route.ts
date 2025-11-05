import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { executeASTOperation, isASTOperation, type ASTOperation } from '@/utils/astExecutor';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// TypeScript interfaces for diff format
interface DiffChange {
  type: 'ADD_IMPORT' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'REPLACE' | 'DELETE' | 'APPEND' 
      | 'AST_WRAP_ELEMENT' | 'AST_ADD_STATE' | 'AST_ADD_IMPORT' | 'AST_MODIFY_CLASSNAME'
      | 'AST_INSERT_JSX' | 'AST_ADD_USEEFFECT' | 'AST_MODIFY_PROP' | 'AST_ADD_AUTHENTICATION'
      | 'AST_ADD_REF' | 'AST_ADD_MEMO' | 'AST_ADD_CALLBACK' | 'AST_ADD_REDUCER';
  line?: number;
  searchFor?: string;
  content?: string;
  replaceWith?: string;
  // AST operation fields
  targetElement?: string;
  wrapperComponent?: string;
  wrapperProps?: Record<string, string>;
  name?: string;
  setter?: string;
  initialValue?: string;
  source?: string;
  defaultImport?: string;
  namedImports?: string[];
  namespaceImport?: string;
  import?: {
    source: string;
    defaultImport?: string;
    namedImports?: string[];
    namespaceImport?: string;
  };
  // AST_MODIFY_CLASSNAME fields
  staticClasses?: string[];
  template?: {
    variable: string;
    trueValue: string;
    falseValue?: string;
    operator?: '?' | '&&';
  };
  rawTemplate?: string;
  // AST_INSERT_JSX fields
  jsx?: string;
  position?: 'before' | 'after' | 'inside_start' | 'inside_end';
  // AST_ADD_USEEFFECT fields
  body?: string;
  dependencies?: string[];
  cleanup?: string;
  // AST_MODIFY_PROP fields
  propName?: string;
  propValue?: string;
  action?: 'add' | 'update' | 'remove';
  // AST_ADD_REF fields
  // name and initialValue already defined above
  // AST_ADD_MEMO fields
  computation?: string;
  // name and dependencies already defined above
  // AST_ADD_CALLBACK fields
  params?: string[];
  // name, body, and dependencies already defined above
  // AST_ADD_REDUCER fields
  dispatchName?: string;
  reducerName?: string;
  initialState?: string;
  actions?: Array<{
    type: string;
    handler: string;
  }>;
}

interface FileDiff {
  path: string;
  action: 'MODIFY' | 'CREATE' | 'DELETE';
  changes: DiffChange[];
}

interface StagePlan {
  currentStage: number;
  totalStages: number;
  stageDescription: string;
  nextStages: string[];
}

interface DiffResponse {
  changeType: 'MODIFICATION';
  summary: string;
  files: FileDiff[];
  stagePlan?: StagePlan;
}

export async function POST(request: Request) {
  try {
    const { prompt, currentAppState, conversationHistory } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local'
      }, { status: 500 });
    }

    if (!currentAppState) {
      return NextResponse.json({
        error: 'Current app state is required for modifications'
      }, { status: 400 });
    }

    const systemPrompt = `You are an expert code modification assistant. Your job is to generate MINIMAL, TARGETED changes to existing code - NOT rewrite entire files.

🎯 CRITICAL RULES FOR MODIFICATIONS:

1. **MINIMAL CHANGES ONLY**
   - Change ONLY what the user explicitly requested
   - Preserve ALL existing code that wasn't mentioned
   - Don't rewrite entire files - use surgical edits
   - Think: "What's the SMALLEST change to accomplish this?"

2. **COMPONENT SYNTAX RULES** (Critical for React/JSX files)
   - **NEVER use nested function declarations** - function HelperName() {} inside another function is INVALID
   - **Correct Pattern 1**: Declare helper components BEFORE the main export
     * Example: function TodoItem(props) { return <div>...</div>; } goes ABOVE export default function App()
   - **Correct Pattern 2**: Use arrow functions for helpers INSIDE main component
     * Example: const TodoItem = (props) => { return <div>...</div>; }
   - **WRONG - Will cause SyntaxError**: export default function App() { function Helper() {} }
   - **Error message if violated**: "SyntaxError: Unexpected keyword 'function'"
   - **Remember**: Nested function declarations = SYNTAX ERROR in strict mode (React uses strict mode)

3. **DIFF FORMAT REQUIRED**
   - You MUST respond in the exact JSON diff format below
   - NO conversational text, NO markdown, ONLY valid JSON
   - Each change must be precise and targeted

4. **CHANGE TYPES AVAILABLE**
   - ADD_IMPORT: Add import at top of file
   - INSERT_AFTER: Insert code after a specific line/pattern
   - INSERT_BEFORE: Insert code before a specific line/pattern  
   - REPLACE: Replace specific code with new code
   - DELETE: Remove specific code
   - APPEND: Add code at end of file

4. **SEARCH PATTERNS**
   - Use unique, exact code snippets for searchFor
   - Include enough context to be unambiguous
   - Use actual code from the file, not summaries

📋 REQUIRED RESPONSE FORMAT:

\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Brief description of what was changed",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "ADD_IMPORT",
          "content": "import { useState } from 'react';"
        },
        {
          "type": "INSERT_AFTER",
          "searchFor": "export default function App() {",
          "content": "  const [darkMode, setDarkMode] = useState(false);"
        },
        {
          "type": "REPLACE",
          "searchFor": "<div className=\\"container\\">",
          "replaceWith": "<div className={\`container \${darkMode ? 'dark' : ''}\`}>"
        }
      ]
    }
  ]
}
\`\`\`

📝 EXAMPLES:

**Example 1: Add Dark Mode Toggle**
User request: "Add a dark mode toggle"
Current app has: Basic layout with container div

Your response:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Added dark mode toggle button and state management",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "ADD_IMPORT",
          "content": "import { useState } from 'react';"
        },
        {
          "type": "INSERT_AFTER",
          "searchFor": "export default function App() {",
          "content": "  const [darkMode, setDarkMode] = useState(false);"
        },
        {
          "type": "INSERT_AFTER",
          "searchFor": "<h1",
          "content": "      <button\\n        onClick={() => setDarkMode(!darkMode)}\\n        className=\\"px-4 py-2 bg-gray-800 text-white rounded\\"\\n      >\\n        {darkMode ? '☀️ Light' : '🌙 Dark'}\\n      </button>"
        },
        {
          "type": "REPLACE",
          "searchFor": "<div className=\\"min-h-screen",
          "replaceWith": "<div className={\`min-h-screen \${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}\`}"
        }
      ]
    }
  ]
}
\`\`\`

**Example 2: Fix Button Color**
User request: "Change the button to blue"

Your response:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Changed button color from gray to blue",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "REPLACE",
          "searchFor": "className=\\"px-4 py-2 bg-gray-500",
          "replaceWith": "className=\\"px-4 py-2 bg-blue-500"
        }
      ]
    }
  ]
}
\`\`\`

**Example 3: Add New Feature (Multiple Files)**
User request: "Add a counter that saves to localStorage"

Your response:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Added counter with localStorage persistence",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "ADD_IMPORT",
          "content": "import { useState, useEffect } from 'react';"
        },
        {
          "type": "INSERT_AFTER",
          "searchFor": "export default function App() {",
          "content": "  const [count, setCount] = useState(0);\\n\\n  useEffect(() => {\\n    const saved = localStorage.getItem('count');\\n    if (saved) setCount(parseInt(saved));\\n  }, []);\\n\\n  useEffect(() => {\\n    localStorage.setItem('count', count.toString());\\n  }, [count]);"
        },
        {
          "type": "INSERT_BEFORE",
          "searchFor": "</div>\\n    </div>\\n  );\\n}",
          "content": "      <div className=\\"mt-8\\">\\n        <button onClick={() => setCount(count + 1)}>Count: {count}</button>\\n      </div>"
        }
      ]
    }
  ]
}
\`\`\`

🚨 CRITICAL REMINDERS:

1. **NEVER include conversational text** - Only valid JSON
2. **NEVER rewrite entire files** - Only targeted changes
3. **ALWAYS use exact code snippets** in searchFor
4. **ALWAYS preserve existing functionality** unless explicitly asked to change it
5. **Response must be valid JSON** that can be parsed directly

---

🔧 **AST-BASED OPERATIONS (For Precise Structural Changes)**

For complex React modifications that need surgical precision, use these AST operations instead of string-based REPLACE:

**AST_WRAP_ELEMENT** - Wrap JSX element in a component (e.g., authentication wrapper)

When to use: User wants to add authentication, authorization, error boundaries, providers
Example use case: "add authentication", "protect this with login", "add auth guard"

\`\`\`json
{
  "type": "AST_WRAP_ELEMENT",
  "targetElement": "div",
  "wrapperComponent": "AuthGuard",
  "wrapperProps": {
    "fallback": "LoginPage"
  },
  "import": {
    "source": "@/components/AuthGuard",
    "defaultImport": "AuthGuard"
  }
}
\`\`\`

**AST_ADD_STATE** - Add useState hook with auto-import

When to use: User wants to add state management, track values, toggle features
Example use case: "add a counter", "track user preferences", "add dark mode state"

\`\`\`json
{
  "type": "AST_ADD_STATE",
  "name": "isOpen",
  "setter": "setIsOpen",
  "initialValue": "false"
}
\`\`\`

**AST_ADD_IMPORT** - Add import with automatic deduplication

When to use: Need to import React hooks, external libraries, or components
Example use case: When adding features that require new dependencies

\`\`\`json
{
  "type": "AST_ADD_IMPORT",
  "source": "react",
  "namedImports": ["useState", "useEffect"]
}
\`\`\`

**AST_MODIFY_CLASSNAME** - Safely modify className attribute

When to use: Dark mode, dynamic styling, conditional classes
Example use case: "add dark mode", "make button change color when active"

\`\`\`json
{
  "type": "AST_MODIFY_CLASSNAME",
  "targetElement": "div",
  "staticClasses": ["container", "mx-auto"],
  "template": {
    "variable": "darkMode",
    "trueValue": "dark",
    "falseValue": "",
    "operator": "?"
  }
}
\`\`\`

Result: \`<div className={\`container mx-auto \${darkMode ? 'dark' : ''}\`}>\`

**AST_INSERT_JSX** - Insert JSX elements without pattern matching

When to use: Adding buttons, forms, UI elements, sections
Example use case: "add a button", "insert a loading spinner", "add user profile section"

Positions available:
- \`before\` - Insert before the target element
- \`after\` - Insert after the target element  
- \`inside_start\` - Insert as first child inside target element
- \`inside_end\` - Insert as last child inside target element

\`\`\`json
{
  "type": "AST_INSERT_JSX",
  "targetElement": "div",
  "jsx": "<button onClick={() => handleLogout()}>Logout</button>",
  "position": "inside_end"
}
\`\`\`

**Why use this instead of INSERT_AFTER?**
- ✅ No pattern matching - finds elements via AST structure
- ✅ Won't fail when code changes
- ✅ Smart positioning (respects indentation)
- ✅ Reliable across staged modifications

**AST_ADD_USEEFFECT** - Add useEffect hooks reliably

When to use: Side effects, API calls, subscriptions, localStorage
Example use case: "fetch data on mount", "save to localStorage", "subscribe to events"

Features:
- Auto-imports useEffect from React
- Smart positioning (places after existing hooks)
- Dependency array support
- Optional cleanup function

\`\`\`json
{
  "type": "AST_ADD_USEEFFECT",
  "body": "fetchUserData(userId);",
  "dependencies": ["userId"]
}
\`\`\`

With cleanup:
\`\`\`json
{
  "type": "AST_ADD_USEEFFECT",
  "body": "const timer = setInterval(() => { checkStatus(); }, 1000);",
  "dependencies": [],
  "cleanup": "clearInterval(timer);"
}
\`\`\`

Run once on mount (empty dependency array):
\`\`\`json
{
  "type": "AST_ADD_USEEFFECT",
  "body": "console.log('Component mounted');",
  "dependencies": []
}
\`\`\`

**AST_MODIFY_PROP** - Modify component props safely

When to use: Change event handlers, update prop values, add/remove props
Example use case: "change onClick handler", "add disabled prop", "update button text"

Actions available:
- \`add\` - Add a new prop
- \`update\` - Change existing prop value
- \`remove\` - Delete a prop

\`\`\`json
{
  "type": "AST_MODIFY_PROP",
  "targetElement": "button",
  "propName": "onClick",
  "propValue": "handleNewClick",
  "action": "update"
}
\`\`\`

Add a new prop:
\`\`\`json
{
  "type": "AST_MODIFY_PROP",
  "targetElement": "button",
  "propName": "disabled",
  "propValue": "isLoading",
  "action": "add"
}
\`\`\`

Remove a prop:
\`\`\`json
{
  "type": "AST_MODIFY_PROP",
  "targetElement": "button",
  "propName": "onClick",
  "action": "remove"
}
\`\`\`

**AST_ADD_AUTHENTICATION** - Complete authentication system in one operation

When to use: User explicitly asks to "add authentication", "add login", "add user authentication"
Example use case: "add authentication", "add login/logout", "add user auth"

**⭐ THIS IS THE BEST WAY TO ADD AUTHENTICATION - Use this instead of manual staging!**

This composed operation automatically:
- ✅ Adds isLoggedIn, email, password state
- ✅ Creates handleLogin and handleLogout functions
- ✅ Builds complete login form UI
- ✅ Wraps existing content in conditional
- ✅ Adds logout button to authenticated section
- ✅ All in ONE operation, no manual staging needed!

Options:
- \`loginFormStyle\`: "simple" or "styled" (default: "styled")
- \`includeEmailField\`: true or false (default: true)

\`\`\`json
{
  "type": "AST_ADD_AUTHENTICATION",
  "loginFormStyle": "styled",
  "includeEmailField": true
}
\`\`\`

Simple style (minimal):
\`\`\`json
{
  "type": "AST_ADD_AUTHENTICATION",
  "loginFormStyle": "simple",
  "includeEmailField": false
}
\`\`\`

**What it generates:**

With styled form (default):
- Professional login form with Tailwind CSS
- Email + password inputs (or just password if includeEmailField=false)
- Full-screen centered layout
- Styled logout button in app
- Conditional rendering (login form when logged out, app when logged in)

With simple form:
- Basic HTML form
- Minimal styling
- Simple logout button
- Same authentication logic, just less styling

**Complete Example - Adding Authentication:**

User request: "add authentication"

Your response:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Added complete authentication system with login/logout",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "AST_ADD_AUTHENTICATION",
          "loginFormStyle": "styled",
          "includeEmailField": true
        }
      ]
    }
  ]
}
\`\`\`

**That's it!** One operation does everything. No staging, no multiple steps.

**Why this is better than manual staging:**
- ❌ OLD WAY: 5-10 separate INSERT/REPLACE operations, prone to errors
- ✅ NEW WAY: 1 operation, guaranteed to work
- ❌ OLD WAY: Had to wrap return in conditional manually (often broke)
- ✅ NEW WAY: AST handles conditional wrapping perfectly
- ❌ OLD WAY: Pattern matching failed across stages
- ✅ NEW WAY: Uses AST structure, no pattern matching

**AST_ADD_REF** - Add useRef hook for DOM references and persistent values

When to use: DOM manipulation, focus management, storing mutable values that don't trigger re-renders
Example use case: "focus the input on load", "track previous value", "store timer reference", "access DOM element"

Features:
- Auto-imports useRef from React
- Smart positioning (places with other hooks at top of component)
- No re-renders when ref value changes
- Perfect for DOM references and mutable values

\`\`\`json
{
  "type": "AST_ADD_REF",
  "name": "inputRef",
  "initialValue": "null"
}
\`\`\`

**Common Use Cases:**

1. **Focus Management** - Auto-focus input on mount:
\`\`\`json
{
  "type": "AST_ADD_REF",
  "name": "inputRef",
  "initialValue": "null"
}
\`\`\`
Then add useEffect to focus:
\`\`\`json
{
  "type": "AST_ADD_USEEFFECT",
  "body": "inputRef.current?.focus();",
  "dependencies": []
}
\`\`\`

2. **Store Timer/Interval** - For cleanup:
\`\`\`json
{
  "type": "AST_ADD_REF",
  "name": "timerRef",
  "initialValue": "null"
}
\`\`\`

3. **Track Previous Value** - Compare with current:
\`\`\`json
{
  "type": "AST_ADD_REF",
  "name": "prevCountRef",
  "initialValue": "0"
}
\`\`\`

**When NOT to use:**
- ❌ For state that should trigger re-renders (use AST_ADD_STATE instead)
- ❌ For derived values from props/state (use AST_ADD_MEMO instead)

**AST_ADD_MEMO** - Add useMemo hook for expensive computations

When to use: Expensive calculations, filtered/sorted lists, derived data, complex object creation
Example use case: "optimize filtering", "cache calculation", "memoize sorted list", "expensive computation"

Features:
- Auto-imports useMemo from React
- Smart positioning (after useState/useRef, before useCallback)
- Only recalculates when dependencies change
- Prevents unnecessary re-computations

\`\`\`json
{
  "type": "AST_ADD_MEMO",
  "name": "filteredItems",
  "computation": "items.filter(item => item.active)",
  "dependencies": ["items"]
}
\`\`\`

**Common Use Cases:**

1. **Filter Lists** - Expensive filtering:
\`\`\`json
{
  "type": "AST_ADD_MEMO",
  "name": "filteredUsers",
  "computation": "users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))",
  "dependencies": ["users", "searchTerm"]
}
\`\`\`

2. **Sort Data** - Expensive sorting:
\`\`\`json
{
  "type": "AST_ADD_MEMO",
  "name": "sortedItems",
  "computation": "items.sort((a, b) => b.date - a.date)",
  "dependencies": ["items"]
}
\`\`\`

3. **Complex Calculations** - Aggregate/compute:
\`\`\`json
{
  "type": "AST_ADD_MEMO",
  "name": "totalPrice",
  "computation": "cart.reduce((sum, item) => sum + item.price * item.quantity, 0)",
  "dependencies": ["cart"]
}
\`\`\`

4. **Derived State** - Compute from multiple sources:
\`\`\`json
{
  "type": "AST_ADD_MEMO",
  "name": "isValid",
  "computation": "email.length > 0 && password.length >= 8 && acceptedTerms",
  "dependencies": ["email", "password", "acceptedTerms"]
}
\`\`\`

**When NOT to use:**
- ❌ For simple calculations (no need to memoize \`count * 2\`)
- ❌ For functions passed to child components (use AST_ADD_CALLBACK instead)

**AST_ADD_CALLBACK** - Add useCallback hook for memoized functions

When to use: Event handlers passed to child components, functions in dependency arrays, preventing child re-renders
Example use case: "optimize child re-renders", "memoize event handler", "stable function reference"

Features:
- Auto-imports useCallback from React
- Smart positioning (after useMemo, before regular functions)
- Prevents unnecessary child component re-renders
- Stable function reference across renders

\`\`\`json
{
  "type": "AST_ADD_CALLBACK",
  "name": "handleClick",
  "params": ["id"],
  "body": "setSelectedId(id);",
  "dependencies": []
}
\`\`\`

**Common Use Cases:**

1. **Event Handlers for Child Components** - Prevent re-renders:
\`\`\`json
{
  "type": "AST_ADD_CALLBACK",
  "name": "handleItemClick",
  "params": ["id"],
  "body": "setSelectedId(id);\\nconsole.log('Selected:', id);",
  "dependencies": []
}
\`\`\`

2. **Functions with Dependencies** - Access state/props:
\`\`\`json
{
  "type": "AST_ADD_CALLBACK",
  "name": "handleAddToCart",
  "params": ["productId"],
  "body": "setCart([...cart, { id: productId, quantity: 1 }]);",
  "dependencies": ["cart"]
}
\`\`\`

3. **Async Operations** - API calls:
\`\`\`json
{
  "type": "AST_ADD_CALLBACK",
  "name": "fetchUserData",
  "params": ["userId"],
  "body": "const response = await fetch(\`/api/users/\${userId}\`);\\nconst data = await response.json();\\nsetUser(data);",
  "dependencies": []
}
\`\`\`

4. **Form Handlers** - Input changes:
\`\`\`json
{
  "type": "AST_ADD_CALLBACK",
  "name": "handleInputChange",
  "params": ["e"],
  "body": "const { name, value } = e.target;\\nsetFormData(prev => ({ ...prev, [name]: value }));",
  "dependencies": []
}
\`\`\`

**When NOT to use:**
- ❌ For functions only used inside the component (regular functions are fine)
- ❌ When the function doesn't depend on props/state (define outside component)

**AST_ADD_REDUCER** - Add useReducer hook with complete reducer function

When to use: Complex state logic, multiple related state updates, state transitions, form management
Example use case: "complex form", "todo list", "multi-step wizard", "state machine"

Features:
- Auto-imports useReducer from React
- Creates complete reducer function with switch statement
- Adds useReducer hook call
- Smart positioning (reducer function first, then hook)
- Handles multiple action types automatically

\`\`\`json
{
  "type": "AST_ADD_REDUCER",
  "name": "state",
  "dispatchName": "dispatch",
  "reducerName": "reducer",
  "initialState": "{ count: 0, loading: false }",
  "actions": [
    {
      "type": "INCREMENT",
      "handler": "return { ...state, count: state.count + 1 };"
    },
    {
      "type": "DECREMENT", 
      "handler": "return { ...state, count: state.count - 1 };"
    },
    {
      "type": "RESET",
      "handler": "return { count: 0, loading: false };"
    }
  ]
}
\`\`\`

**What this generates:**

\`\`\`typescript
function reducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'RESET':
      return { count: 0, loading: false };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0, loading: false });
\`\`\`

**Common Use Cases:**

1. **Counter with Multiple Actions** - Up/down/reset:
\`\`\`json
{
  "type": "AST_ADD_REDUCER",
  "name": "state",
  "dispatchName": "dispatch",
  "reducerName": "counterReducer",
  "initialState": "{ count: 0 }",
  "actions": [
    { "type": "INCREMENT", "handler": "return { count: state.count + 1 };" },
    { "type": "DECREMENT", "handler": "return { count: state.count - 1 };" },
    { "type": "RESET", "handler": "return { count: 0 };" }
  ]
}
\`\`\`

2. **Todo List** - Add/remove/toggle/clear:
\`\`\`json
{
  "type": "AST_ADD_REDUCER",
  "name": "state",
  "dispatchName": "dispatch",
  "reducerName": "todoReducer",
  "initialState": "{ todos: [], filter: 'all' }",
  "actions": [
    { "type": "ADD_TODO", "handler": "return { ...state, todos: [...state.todos, action.payload] };" },
    { "type": "REMOVE_TODO", "handler": "return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };" },
    { "type": "TOGGLE_TODO", "handler": "return { ...state, todos: state.todos.map(t => t.id === action.payload ? { ...t, completed: !t.completed } : t) };" }
  ]
}
\`\`\`

3. **Form State** - Complex form with validation:
\`\`\`json
{
  "type": "AST_ADD_REDUCER",
  "name": "formState",
  "dispatchName": "formDispatch",
  "reducerName": "formReducer",
  "initialState": "{ values: {}, errors: {}, touched: {}, isSubmitting: false }",
  "actions": [
    { "type": "SET_FIELD", "handler": "return { ...state, values: { ...state.values, [action.field]: action.value } };" },
    { "type": "SET_ERROR", "handler": "return { ...state, errors: { ...state.errors, [action.field]: action.error } };" },
    { "type": "SET_TOUCHED", "handler": "return { ...state, touched: { ...state.touched, [action.field]: true } };" },
    { "type": "SUBMIT_START", "handler": "return { ...state, isSubmitting: true };" },
    { "type": "SUBMIT_END", "handler": "return { ...state, isSubmitting: false };" }
  ]
}
\`\`\`

4. **Loading/Error States** - Async operations:
\`\`\`json
{
  "type": "AST_ADD_REDUCER",
  "name": "state",
  "dispatchName": "dispatch",
  "reducerName": "asyncReducer",
  "initialState": "{ data: null, loading: false, error: null }",
  "actions": [
    { "type": "FETCH_START", "handler": "return { data: null, loading: true, error: null };" },
    { "type": "FETCH_SUCCESS", "handler": "return { data: action.payload, loading: false, error: null };" },
    { "type": "FETCH_ERROR", "handler": "return { data: null, loading: false, error: action.payload };" }
  ]
}
\`\`\`

**When NOT to use:**
- ❌ For simple state (use AST_ADD_STATE instead - it's simpler)
- ❌ When state updates are independent (multiple useState is clearer)
- ✅ USE when: Multiple related state values, complex update logic, state transitions

**🎯 WHEN TO USE AST OPERATIONS:**

Use AST operations for:
- ✅ **Wrapping components** - Use AST_WRAP_ELEMENT for AuthGuard, ErrorBoundary, Provider
- ✅ **Adding React hooks:**
  - AST_ADD_STATE for useState
  - AST_ADD_USEEFFECT for useEffect with cleanup
  - AST_ADD_REF for useRef (DOM refs, mutable values)
  - AST_ADD_MEMO for useMemo (expensive computations)
  - AST_ADD_CALLBACK for useCallback (memoized functions)
  - AST_ADD_REDUCER for useReducer (complex state logic)
- ✅ **Managing imports** - Use AST_ADD_IMPORT for automatic deduplication
- ✅ **Structural JSX changes** - Use AST_INSERT_JSX for reliable positioning
- ✅ **className modifications** - ALWAYS use AST_MODIFY_CLASSNAME for dynamic classes
- ✅ **Modifying props** - Use AST_MODIFY_PROP for add/update/remove
- ✅ **Complete features** - Use AST_ADD_AUTHENTICATION for full auth system

**CRITICAL: Choose the right AST operation for React hooks:**
- Simple state? → AST_ADD_STATE (useState)
- Side effects? → AST_ADD_USEEFFECT (useEffect)
- DOM reference? → AST_ADD_REF (useRef)
- Expensive computation? → AST_ADD_MEMO (useMemo)
- Event handler for child? → AST_ADD_CALLBACK (useCallback)
- Complex state logic? → AST_ADD_REDUCER (useReducer)

Use string-based operations for:
- ✅ Changing text content (simple text replacements)
- ✅ Minor code tweaks (variable names, constants)
- ❌ NOT for JSX insertion (use AST_INSERT_JSX)
- ❌ NOT for className changes (use AST_MODIFY_CLASSNAME)
- ❌ NOT for adding any hooks (use appropriate AST_ADD_* operation)
- ❌ NOT for prop changes (use AST_MODIFY_PROP)

**Example: Adding Authentication**

\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Added authentication wrapper to protect app content",
  "files": [
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [
        {
          "type": "AST_WRAP_ELEMENT",
          "targetElement": "div",
          "wrapperComponent": "AuthGuard",
          "import": {
            "source": "@/components/AuthGuard",
            "defaultImport": "AuthGuard"
          }
        },
        {
          "type": "AST_ADD_STATE",
          "name": "isAuthenticated",
          "setter": "setIsAuthenticated",
          "initialValue": "false"
        }
      ]
    }
  ]
}
\`\`\`

---

🎯 STAGED MODIFICATION SYSTEM (For Complex Changes):

**When conversation history includes "Complex Modification Detected" + user said "proceed":**

This means user has consented to staged implementation. Follow these instructions:

**STEP 1: READ INTERNAL_PLAN from conversation history**
- Look for ===INTERNAL_PLAN=== sections in previous messages
- Understand existing architecture, completed features, deferred features
- This helps you maintain consistency and build on existing work

**STEP 2: PLAN STAGES mentally**
- Break the complex feature into 2-4 logical stages
- Stage 1: Core functionality (minimal, working foundation)
- Stage 2-3: Enhancements and additional features
- Final Stage: Polish and refinements
- Think: "What's the MINIMUM needed for each stage?"

**STEP 3: IMPLEMENT ONLY STAGE 1**
- Generate diffs for Stage 1 ONLY
- Keep changes minimal and focused
- Preserve ALL existing styling, colors, layouts
- Use same code patterns as existing app

**STEP 4: RESPONSE FORMAT for staged modifications:**

Instead of normal MODIFICATION response, use this format:

\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Stage 1/3: [Feature] - [What Stage 1 adds]",
  "stagePlan": {
    "currentStage": 1,
    "totalStages": 3,
    "stageDescription": "Core [feature] functionality",
    "nextStages": [
      "Stage 2: [Description]",
      "Stage 3: [Description]"
    ]
  },
  "files": [
    /* Only Stage 1 changes */
  ]
}
\`\`\`

**EXAMPLE: "Add authentication" with staged approach**

Stage 1 Response:
\`\`\`json
{
  "changeType": "MODIFICATION",
  "summary": "Stage 1/3: Authentication - Login form UI and state management",
  "stagePlan": {
    "currentStage": 1,
    "totalStages": 3,
    "stageDescription": "Basic login form with input fields and state",
    "nextStages": [
      "Stage 2: Signup flow and form validation",
      "Stage 3: Protected routes and session persistence"
    ]
  },
  "files": [{
    "path": "src/App.tsx",
    "action": "MODIFY",
    "changes": [
      {
        "type": "ADD_IMPORT",
        "content": "import { useState } from 'react';"
      },
      {
        "type": "INSERT_AFTER",
        "searchFor": "export default function App() {",
        "content": "  const [email, setEmail] = useState('');\\n  const [password, setPassword] = useState('');\\n  const [isLoggedIn, setIsLoggedIn] = useState(false);"
      },
      {
        "type": "INSERT_BEFORE",
        "searchFor": "</div>\\n    </div>\\n  );\\n}",
        "content": "      {!isLoggedIn ? (\\n        <div className=\\"max-w-md mx-auto mt-8 p-6 bg-white rounded-lg\\">\\n          <h2 className=\\"text-2xl font-bold mb-4\\">Login</h2>\\n          <input\\n            type=\\"email\\"\\n            value={email}\\n            onChange={(e) => setEmail(e.target.value)}\\n            placeholder=\\"Email\\"\\n            className=\\"w-full mb-3 px-4 py-2 border rounded\\"\\n          />\\n          <input\\n            type=\\"password\\"\\n            value={password}\\n            onChange={(e) => setPassword(e.target.value)}\\n            placeholder=\\"Password\\"\\n            className=\\"w-full mb-3 px-4 py-2 border rounded\\"\\n          />\\n          <button\\n            onClick={() => setIsLoggedIn(true)}\\n            className=\\"w-full bg-blue-500 text-white py-2 rounded\\"\\n          >\\n            Login\\n          </button>\\n        </div>\\n      ) : (\\n        <div>\\n          {/* Existing app content */}\\n        </div>\\n      )}"
      }
    ]
  }]
}
\`\`\`

**CRITICAL RULES for Staged Modifications:**
1. ONLY implement the current stage - don't try to do everything at once
2. PRESERVE existing styling - match colors, fonts, layouts from current app
3. Use MINIMAL changes - surgical edits only
4. After Stage 1 completes, user will review and approve
5. Then they'll request Stage 2, and you'll continue from there

---

Current App State:
${JSON.stringify(currentAppState, null, 2)}

Now generate the minimal diff to accomplish the user's request.`;

    console.log('Generating modifications with Claude Sonnet 4.5...');

    // Extract current file contents for AI reference
    let fileContentsSection = '';
    if (currentAppState && currentAppState.files && Array.isArray(currentAppState.files)) {
      fileContentsSection = '\n\n📁 **CURRENT FILE CONTENTS** (Read these EXACTLY for your SEARCH blocks):\n\n';
      currentAppState.files.forEach((file: any) => {
        fileContentsSection += `\n${'='.repeat(60)}\n`;
        fileContentsSection += `FILE: ${file.path}\n`;
        fileContentsSection += `${'='.repeat(60)}\n`;
        fileContentsSection += file.content;
        fileContentsSection += `\n${'='.repeat(60)}\n`;
      });
      fileContentsSection += '\n⚠️ CRITICAL: Your SEARCH blocks must match the code above EXACTLY (character-for-character, including all whitespace and indentation).\n';
    }

    // Build conversation context
    const messages: any[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

    // Add current modification request WITH file contents
    const enhancedPrompt = fileContentsSection 
      ? `${fileContentsSection}\n\n🎯 **USER REQUEST:**\n${prompt}`
      : prompt;
    
    messages.push({ role: 'user', content: enhancedPrompt });

    // Use streaming for better handling with timeout
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096, // Much smaller than full-app since we're only sending diffs
      temperature: 0.7,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: messages
    });

    // Collect the full response with timeout
    let responseText = '';
    const timeout = 45000; // 45 seconds
    const startTime = Date.now();
    
    try {
      for await (const chunk of stream) {
        if (Date.now() - startTime > timeout) {
          throw new Error('AI response timeout - the modification was taking too long. Please try a simpler request or try again.');
        }
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          responseText += chunk.delta.text;
        }
      }
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      throw new Error(streamError instanceof Error ? streamError.message : 'Failed to receive AI response');
    }
      
    console.log('Modification response length:', responseText.length, 'chars');
    console.log('Response preview:', responseText.substring(0, 500));
    
    if (!responseText) {
      throw new Error('No response from Claude');
    }

    // Parse JSON response
    let diffResponse: DiffResponse;
    
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      
      diffResponse = JSON.parse(jsonString.trim());
      
      // Validate response structure
      if (!diffResponse.changeType || !diffResponse.summary || !diffResponse.files) {
        throw new Error('Invalid diff response structure');
      }
      
      console.log('Parsed diff response:', {
        changeType: diffResponse.changeType,
        summary: diffResponse.summary,
        filesCount: diffResponse.files.length
      });
      
    } catch (parseError) {
      console.error('Failed to parse diff response:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json({
        error: 'The AI had trouble understanding how to modify your app. This can happen with complex changes. Try breaking your request into smaller steps, or use simpler language.',
        suggestion: 'Try asking for one change at a time, like "add a button" or "change the color to blue".',
        technicalDetails: {
          responsePreview: responseText.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

    return NextResponse.json(diffResponse);
    
  } catch (error) {
    console.error('Error in modify route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate modifications' },
      { status: 500 }
    );
  }
}
