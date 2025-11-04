import type Parser from 'tree-sitter';

/**
 * Type of modification to apply
 */
export type ModificationType = 'insert' | 'replace' | 'delete';

/**
 * A modification to be applied to the code
 */
export interface Modification {
  type: ModificationType;
  start: number;  // Character position in original code
  end: number;    // Character position in original code
  newCode: string;
  priority: number; // Higher priority = applied first (for overlapping mods)
  description?: string; // For debugging
}

/**
 * Import specification
 */
export interface ImportSpec {
  source: string;              // e.g., 'react' or '@/components/AuthGuard'
  defaultImport?: string;      // e.g., 'React' or 'AuthGuard'
  namedImports?: string[];     // e.g., ['useState', 'useEffect']
  namespaceImport?: string;    // e.g., '* as React'
}

/**
 * JSX element wrapper specification
 */
export interface WrapperSpec {
  component: string;           // Component name to wrap with
  props?: Record<string, string>; // Props to add
  import?: ImportSpec;         // Import to add for the wrapper
}

/**
 * State variable specification
 */
export interface StateVariableSpec {
  name: string;                // e.g., 'isOpen'
  setter: string;              // e.g., 'setIsOpen'
  initialValue: string;        // e.g., 'false' or '[]'
}

/**
 * Template for dynamic className
 */
export interface ClassNameTemplate {
  variable: string;            // Variable name (e.g., 'darkMode')
  trueValue: string;           // Value when true (e.g., 'dark')
  falseValue?: string;         // Value when false (default: '')
  operator?: '?' | '&&';       // Operator to use (default: '?')
}

/**
 * className modification specification
 */
export interface ModifyClassNameSpec {
  staticClasses?: string[];    // Static classes to preserve/add
  template?: ClassNameTemplate; // Dynamic template to add
  rawTemplate?: string;        // Or raw template string (advanced)
}

/**
 * JSX insertion position
 */
export type InsertPosition = 
  | 'before'          // Before the target element
  | 'after'           // After the target element
  | 'inside_start'    // First child inside element
  | 'inside_end';     // Last child inside element

/**
 * JSX insertion specification
 */
export interface InsertJSXSpec {
  jsx: string;                  // JSX code to insert
  position: InsertPosition;     // Where to insert
}

/**
 * useEffect hook specification
 */
export interface UseEffectSpec {
  body: string;                 // Effect body code
  dependencies?: string[];      // Dependency array (empty = run once)
  cleanup?: string;            // Optional cleanup function body
}

/**
 * useRef hook specification
 */
export interface UseRefSpec {
  name: string;                // Ref variable name (e.g., 'inputRef')
  initialValue: string;        // Initial value (e.g., 'null' or 'undefined')
}

/**
 * useMemo hook specification
 */
export interface UseMemoSpec {
  name: string;                // Memoized variable name (e.g., 'filteredItems')
  computation: string;         // Computation to memoize (e.g., 'items.filter(i => i.active)')
  dependencies: string[];      // Dependency array (e.g., ['items', 'searchTerm'])
}

/**
 * useCallback hook specification
 */
export interface UseCallbackSpec {
  name: string;                // Callback function name (e.g., 'handleClick')
  params?: string[];           // Parameters (e.g., ['id', 'event'])
  body: string;                // Function body code
  dependencies: string[];      // Dependency array (e.g., ['items', 'setItems'])
}

/**
 * Action specification for useReducer
 */
export interface ReducerActionSpec {
  type: string;                // Action type (e.g., 'INCREMENT', 'DECREMENT')
  handler: string;             // Handler code (e.g., 'return { ...state, count: state.count + 1 }')
}

/**
 * useReducer hook specification
 */
export interface UseReducerSpec {
  name: string;                // State variable name (e.g., 'state')
  dispatchName: string;        // Dispatch function name (e.g., 'dispatch')
  reducerName: string;         // Reducer function name (e.g., 'reducer')
  initialState: string;        // Initial state (e.g., '{ count: 0 }')
  actions: ReducerActionSpec[]; // Array of actions to handle
}

/**
 * Prop modification specification
 */
export interface ModifyPropSpec {
  name: string;                // Prop name
  value?: string;              // New value (undefined = remove prop)
  action: 'add' | 'update' | 'remove';
}

/**
 * Function specification
 */
export interface FunctionSpec {
  name: string;                // Function name (e.g., 'handleLogin')
  params?: string[];           // Parameters (e.g., ['e', 'data'])
  body: string;                // Function body code
  isArrow?: boolean;           // Use arrow function syntax (default: true)
  isAsync?: boolean;           // Make function async (default: false)
}

/**
 * Conditional wrap specification
 */
export interface ConditionalWrapSpec {
  condition: string;           // Condition to check (e.g., 'isLoggedIn')
  type: 'if-return' | 'ternary' | 'conditional-render'; // Wrap style
  fallback?: string;           // Fallback JSX when condition is false
}

/**
 * Result of a modification operation
 */
export interface ModificationResult {
  success: boolean;
  code?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Options for the AST Modifier
 */
export interface ASTModifierOptions {
  preserveFormatting?: boolean;  // Try to preserve original formatting
  validateAfter?: boolean;       // Re-parse and validate after modifications
  indentation?: string;          // Indentation to use (default: 2 spaces)
}

/**
 * Position information for a node
 */
export interface NodePosition {
  start: number;
  end: number;
  line: number;
  column: number;
}

/**
 * Context for applying modifications
 */
export interface ModificationContext {
  originalCode: string;
  tree: Parser.Tree;
  modifications: Modification[];
  imports: Map<string, ImportSpec>; // Track imports to deduplicate
}
