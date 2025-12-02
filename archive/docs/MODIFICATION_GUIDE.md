# 🔄 Modification System Guide

Complete guide to how the diff-based modification system works in AI App Builder.

---

## 📋 Overview

The AI App Builder uses a **diff-based modification system** (Phase 2) that makes **surgical edits** to your code instead of rewriting entire files.

### Why Diff-Based?
- ✅ **Preserves existing code** - Only changes what you request
- ✅ **Token efficient** - 95% fewer tokens than full rewrites
- ✅ **Faster** - Smaller changes = quicker generation
- ✅ **Safer** - Review changes before applying
- ✅ **Precise** - Target specific code sections

---

## 🎯 How It Works

### Step 1: You Request a Change
```
"Add a dark mode toggle"
"Change the button to blue"
"Add export to CSV"
```

### Step 2: AI Analyzes
- Reads current app state
- Identifies what needs to change
- Plans minimal modifications
- Generates diff (change instructions)

### Step 3: Diff Preview
- Shows summary of changes
- Lists affected files
- Displays change types (ADD_IMPORT, REPLACE, etc.)
- Preview of code changes

### Step 4: You Approve or Reject
- Review the proposed changes
- Click **✅ Apply Changes** or **❌ Reject Changes**
- If rejected, try rephrasing your request

### Step 5: Changes Applied
- Diffs applied to current code
- New version saved to history
- Preview updates automatically
- Can undo with Ctrl+Z if needed

---

## 🔧 Change Types

### ADD_IMPORT
**What it does**: Adds import statement at top of file

**Example request**: "Use useState"

**Diff generated**:
```json
{
  "type": "ADD_IMPORT",
  "content": "import { useState } from 'react';"
}
```

**Result**: Import added after existing imports

---

### INSERT_AFTER
**What it does**: Inserts code after a specific pattern

**Example request**: "Add state for dark mode"

**Diff generated**:
```json
{
  "type": "INSERT_AFTER",
  "searchFor": "export default function App() {",
  "content": "  const [darkMode, setDarkMode] = useState(false);"
}
```

**Result**: New line inserted after function declaration

---

### INSERT_BEFORE
**What it does**: Inserts code before a specific pattern

**Example request**: "Add a button before the footer"

**Diff generated**:
```json
{
  "type": "INSERT_BEFORE",
  "searchFor": "</footer>",
  "content": "      <button>Click me</button>"
}
```

**Result**: Button added above footer

---

### REPLACE
**What it does**: Replaces specific code with new code

**Example request**: "Change button color to blue"

**Diff generated**:
```json
{
  "type": "REPLACE",
  "searchFor": "bg-gray-500",
  "replaceWith": "bg-blue-500"
}
```

**Result**: Only that class name changes

---

### DELETE
**What it does**: Removes specific code

**Example request**: "Remove the sidebar"

**Diff generated**:
```json
{
  "type": "DELETE",
  "searchFor": "<aside className=\"sidebar\">...</aside>"
}
```

**Result**: Sidebar code removed

---

### APPEND
**What it does**: Adds code at end of file

**Example request**: "Add a helper function"

**Diff generated**:
```json
{
  "type": "APPEND",
  "content": "\nfunction formatDate(date) {\n  return date.toLocaleDateString();\n}"
}
```

**Result**: Function added at file end

---

## 🎯 AST-Based Operations (Phase 5 - Advanced)

### What Are AST Operations?

**AST** = Abstract Syntax Tree = Structural representation of code

Instead of fragile string matching, AST operations use the **code structure** to make precise, validated modifications.

### When AST is Used

The AI automatically uses AST for:
- ✅ **Authentication** (`AST_ADD_AUTHENTICATION`)
- ✅ **Component wrapping** (`AST_WRAP_ELEMENT`)
- ✅ **Adding hooks** (`AST_ADD_STATE`, `AST_ADD_USEEFFECT`)
- ✅ **Structural changes** (functions, conditionals)
- ✅ **Complex modifications** (anything with nesting)

### Why AST Operations Are Better

| String-Based (Old) | AST-Based (New) |
|-------------------|-----------------|
| ❌ "undefined" errors | ✅ Validated output |
| ❌ Breaks on formatting | ✅ Format-independent |
| ❌ Ambiguous matching | ✅ Precise targeting |
| ❌ Fragile | ✅ Robust |

### AST_ADD_AUTHENTICATION 🔐

**What it does**: Adds complete authentication system in one operation

**Request**: "add authentication"

**What happens automatically:**
1. Adds state variables (isLoggedIn, email, password)
2. Creates handleLogin and handleLogout functions
3. Generates styled login form UI
4. Wraps existing content in conditional
5. Adds logout button to authenticated view

**Result:** Complete working authentication in ONE command!

**Options:**
- `loginFormStyle: 'simple'` - Basic HTML form
- `loginFormStyle: 'styled'` - Tailwind styled form (default)
- `includeEmailField: false` - Password-only login

### Other AST Operations

**AST_WRAP_ELEMENT** - Wrap JSX in components
**AST_ADD_STATE** - Add useState with auto-import
**AST_ADD_IMPORT** - Smart import deduplication
**AST_MODIFY_CLASSNAME** - Dynamic className changes
**AST_INSERT_JSX** - Insert UI elements precisely
**AST_ADD_USEEFFECT** - Add useEffect hooks
**AST_MODIFY_PROP** - Modify component props

---

## 🚦 Approval System

### Auto-Applied (No Approval Needed)
Changes marked as **MINOR_CHANGE**:

**Examples**:
- ✅ Color changes: "Make button blue"
- ✅ Text updates: "Change title to Welcome"
- ✅ Styling tweaks: "Add rounded corners"
- ✅ Small additions: "Add a console.log"
- ✅ Bug fixes: "Fix the typo in error message"

**What happens**:
1. AI generates diff
2. Shows diff preview
3. You review
4. Click **✅ Apply** 
5. Applied immediately

---

### Requires Approval (Shows Modal)
Changes marked as **MAJOR_CHANGE**:

**Examples**:
- ⚠️ New features: "Add authentication"
- ⚠️ UI redesigns: "Change entire layout"
- ⚠️ Removing features: "Delete user profiles"
- ⚠️ Major refactors: "Convert to TypeScript"
- ⚠️ Data structure changes: "Use Redux instead"

**What happens**:
1. AI generates diff
2. Shows approval modal
3. Explains what will change
4. Lists affected files
5. You must click **✅ Approve** or **❌ Reject**
6. If approved, saved to version history first

---

## 🎭 Staged Modifications

For **complex features** that can't be done in one step.

### When Staged Modifications Trigger

**Complex indicators**:
- "add authentication"
- "add database"
- "add payment system"
- "add real-time chat"
- "completely redesign"
- "add backend"

### How It Works

#### Phase 1: Detection
```
User: "Add authentication to my app"

AI: ⚠️ Complex Modification Detected
     This requires staged implementation.
     
     Why? Auth needs multiple parts working together.
     
     Stages:
     1. Login form UI
     2. Signup flow
     3. Protected routes
     4. Session persistence
     
     Reply 'proceed' to continue.
```

#### Phase 2: User Consents
```
User: "proceed"

AI: 📋 Implementation Plan Ready
    
    Stage 1/3: Login form with state management
    
    Upcoming:
    - Stage 2: Signup + validation
    - Stage 3: Protected routes + persistence
    
    Review changes for Stage 1 below.
```

#### Phase 3: Stage 1 Diff Preview
Shows diff for **only Stage 1**:
- Login form JSX
- State variables for email/password
- Login button handler
- Basic validation

You approve/reject.

#### Phase 4: Checkpoint
```
AI: ✅ Stage Complete!
    
    Your login form is working.
    
    Happy with this stage?
    - Reply 'yes' → Move to Stage 2
    - Reply 'change X' → I'll adjust it
    - Reply 'cancel' → Stop here
```

#### Phase 5: Continue or Adjust
```
User: "yes"

AI: ✅ Proceeding to Stage 2/3
    [Shows diff for Stage 2]
```

OR

```
User: "make the button bigger"

AI: [Generates adjustment diff]
    [Shows updated Stage 1 with bigger button]
```

### Benefits of Staging
- ✅ **Preserves styling** - Each stage only adds, doesn't redesign
- ✅ **Works incrementally** - Test each piece before next
- ✅ **Guided control** - You approve direction at checkpoints
- ✅ **Prevents chaos** - No "rewrite everything" disasters

---

## 💡 Best Practices

### Writing Good Modification Requests

**Be Specific** ✅
```
✅ "Change the main button to blue with white text"
❌ "Make it look better"
```

**One Thing at a Time** ✅
```
✅ "Add a dark mode toggle"
✅ Then: "Add dark mode colors to the header"
❌ "Add dark mode and animations and a new sidebar"
```

**Reference Existing Code** ✅
```
✅ "Change the login button color"
✅ "Add validation to the email field"
❌ "Add a button" (which button? where?)
```

**Use Clear Language** ✅
```
✅ "Add error handling for failed API calls"
✅ "Remove the sidebar navigation"
❌ "Fix the thing that's broken"
```

---

## 🐛 Troubleshooting

### "Search pattern not found"

**Cause**: AI couldn't find the code it wanted to change

**Solutions**:
1. Reject and rephrase more specifically
2. Tell AI exact location: "in the handleSubmit function"
3. Try simpler change first
4. Check if code was already changed

---

### "REPLACE produced undefined"

**Cause**: Known issue with complex REPLACE operations

**Solutions**:
1. Break into smaller changes
2. Use DELETE + INSERT instead of REPLACE
3. Try rewording the request
4. Report the issue (helps us improve)

---

### Changes Not Visible in Preview

**Cause**: Preview needs refresh or code error

**Solutions**:
1. Click refresh button in preview
2. Check browser console for errors
3. Try toggling between Code and Preview tabs
4. Undo (Ctrl+Z) and try different approach

---

### AI Changed Too Much

**Cause**: Request was interpreted broadly

**Solutions**:
1. **Immediate**: Undo with Ctrl+Z
2. **Next time**: Be more specific
3. Use staged modifications for big features
4. Review diff preview carefully before applying

---

## 📊 Modification Examples

### Example 1: Simple Color Change

**Request**: "Change button to blue"

**Diff**:
```json
{
  "files": [{
    "path": "src/App.tsx",
    "action": "MODIFY",
    "changes": [{
      "type": "REPLACE",
      "searchFor": "bg-gray-500",
      "replaceWith": "bg-blue-500"
    }]
  }]
}
```

**Result**: Only button color changes, everything else preserved

---

### Example 2: Add Feature

**Request**: "Add a counter"

**Diff**:
```json
{
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
        "content": "  const [count, setCount] = useState(0);"
      },
      {
        "type": "INSERT_BEFORE",
        "searchFor": "</div>\n  );",
        "content": "      <button onClick={() => setCount(count + 1)}>\n        Count: {count}\n      </button>"
      }
    ]
  }]
}
```

**Result**: Counter added, existing code untouched

---

### Example 3: Multiple Files

**Request**: "Add a utils file with helper functions"

**Diff**:
```json
{
  "files": [
    {
      "path": "src/utils.ts",
      "action": "CREATE",
      "changes": [{
        "type": "APPEND",
        "content": "export function formatDate(date: Date) {\n  return date.toLocaleDateString();\n}"
      }]
    },
    {
      "path": "src/App.tsx",
      "action": "MODIFY",
      "changes": [{
        "type": "ADD_IMPORT",
        "content": "import { formatDate } from './utils';"
      }]
    }
  ]
}
```

**Result**: New file created, import added

---

## 🔮 Advanced Techniques

### Iterative Refinement
1. Make initial change
2. Test in preview
3. Request adjustment
4. Repeat until perfect
5. All changes saved in version history

### Experimentation with Undo
1. Try one approach
2. Undo if not satisfied (Ctrl+Z)
3. Try different approach
4. Compare results
5. Keep the better version

### Checkpoint Strategy
1. Get app to stable state
2. Note the version number
3. Try experimental changes
4. If they fail, revert to checkpoint
5. Try different approach

---

## 📈 Performance Tips

### Token Efficiency
- Simple changes: ~100-200 tokens
- Medium changes: ~500-1000 tokens
- Complex changes: ~2000-4000 tokens
- Full app rewrite: ~8000-16000 tokens

**Diff-based is 95% more efficient than rewrites!**

### Speed Optimization
- Specific requests = faster generation
- One change at a time = quicker review
- Clear language = fewer retries
- Staged for complex = reliable results

---

## 🎓 Learning Path

### Beginner
1. Start with simple changes (colors, text)
2. Learn to read diff previews
3. Practice approve/reject decisions
4. Master undo for mistakes

### Intermediate
1. Request multi-step changes
2. Use staged modifications
3. Experiment with fork + compare
4. Optimize request phrasing

### Advanced
1. Chain complex modifications
2. Build large features incrementally
3. Leverage version history strategically
4. Contribute to improving the system

---

**Last Updated**: November 2025  
**Version**: 2.0 (Phase 2 Complete)
