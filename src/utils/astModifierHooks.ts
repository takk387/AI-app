import type Parser from 'tree-sitter';
import type { CodeParser } from './treeSitterParser';
import type {
  StateVariableSpec,
  UseEffectSpec,
  UseRefSpec,
  UseMemoSpec,
  UseCallbackSpec,
  UseReducerSpec,
  FunctionSpec,
  Modification,
  ASTModifierOptions,
} from './astModifierTypes';

/**
 * AST Modifier - Hook & Function Insertion Operations
 *
 * Pure utility functions for inserting React hooks and functions.
 * Extracted from ASTModifier class.
 */

/**
 * Helper: find the function body node from a function node
 */
function findBodyNode(functionNode: Parser.SyntaxNode): Parser.SyntaxNode | null {
  let bodyNode = functionNode.childForFieldName('body');
  if (!bodyNode) {
    for (const child of functionNode.children) {
      if (child.type === 'statement_block') {
        bodyNode = child;
        break;
      }
    }
  }
  return bodyNode;
}

/**
 * Build a Modification to add a useState hook
 */
export function buildStateVariableMod(
  parser: CodeParser,
  tree: Parser.Tree | null,
  originalCode: string,
  spec: StateVariableSpec,
  options: Required<ASTModifierOptions>
): Modification | null {
  if (!tree) return null;

  // Find the function body to insert into
  const functionNode = parser.findDefaultExportedFunction(tree);
  if (!functionNode) {
    console.warn('Could not find function to add state variable to');
    return null;
  }

  const bodyNode = findBodyNode(functionNode);
  if (!bodyNode) {
    console.warn('Could not find function body');
    return null;
  }

  // Find insertion point intelligently
  // Look for opening brace and check if next char is newline
  const openBrace = bodyNode.children.find((c) => c.type === '{');
  if (!openBrace) return null;

  const insertPosition = openBrace.endIndex;

  // Check if there's already a newline after the brace
  const hasNewlineAfterBrace = originalCode[insertPosition] === '\n';

  // If there's no newline, we need to add one
  // Generate state variable code with proper formatting
  const stateCode = hasNewlineAfterBrace
    ? `${options.indentation}const [${spec.name}, ${spec.setter}] = useState(${spec.initialValue});\n`
    : `\n${options.indentation}const [${spec.name}, ${spec.setter}] = useState(${spec.initialValue});\n`;

  return {
    type: 'insert',
    start: insertPosition,
    end: insertPosition,
    newCode: stateCode,
    priority: 800,
    description: `Add state variable ${spec.name}`,
  };
}

/**
 * Build a Modification to add a useEffect hook
 */
export function buildUseEffectMod(
  parser: CodeParser,
  tree: Parser.Tree | null,
  originalCode: string,
  spec: UseEffectSpec,
  options: Required<ASTModifierOptions>
): Modification | null {
  if (!tree) return null;

  const functionNode = parser.findDefaultExportedFunction(tree);
  if (!functionNode) {
    console.warn('Could not find function to add useEffect to');
    return null;
  }

  const bodyNode = findBodyNode(functionNode);
  if (!bodyNode) {
    console.warn('Could not find function body');
    return null;
  }

  // Find insertion point (after state variables, before return)
  // Look for the last useState or useEffect call, or use start of body
  let insertPosition = bodyNode.startIndex + 1; // After opening brace

  // Try to find last hook call
  const bodyText = bodyNode.text;
  const hookMatches = [...bodyText.matchAll(/use(State|Effect|Memo|Callback|Ref)/g)];
  if (hookMatches.length > 0) {
    const lastHook = hookMatches[hookMatches.length - 1];
    if (lastHook.index !== undefined) {
      // Find the end of this statement (semicolon or newline)
      const afterHook = bodyText.substring(lastHook.index);
      const semicolonMatch = afterHook.match(/;/);
      if (semicolonMatch && semicolonMatch.index !== undefined) {
        insertPosition = bodyNode.startIndex + lastHook.index + semicolonMatch.index + 1;
      }
    }
  }

  // Build useEffect code
  const deps =
    spec.dependencies === undefined
      ? ''
      : spec.dependencies.length === 0
        ? '[]'
        : `[${spec.dependencies.join(', ')}]`;

  const cleanup = spec.cleanup
    ? `\n${options.indentation}${options.indentation}return () => {\n${options.indentation}${options.indentation}${options.indentation}${spec.cleanup}\n${options.indentation}${options.indentation}};`
    : '';

  const effectCode = `\n${options.indentation}useEffect(() => {\n${options.indentation}${options.indentation}${spec.body}${cleanup}\n${options.indentation}}, ${deps});\n`;

  return {
    type: 'insert',
    start: insertPosition,
    end: insertPosition,
    newCode: effectCode,
    priority: 750,
    description: 'Add useEffect hook',
  };
}

/**
 * Build a Modification to add a useRef hook
 */
export function buildRefMod(
  parser: CodeParser,
  tree: Parser.Tree | null,
  originalCode: string,
  spec: UseRefSpec,
  options: Required<ASTModifierOptions>
): Modification | null {
  if (!tree) return null;

  const functionNode = parser.findDefaultExportedFunction(tree);
  if (!functionNode) {
    console.warn('Could not find function to add useRef to');
    return null;
  }

  const bodyNode = findBodyNode(functionNode);
  if (!bodyNode) {
    console.warn('Could not find function body');
    return null;
  }

  // Find insertion point (after opening brace, similar to state variables)
  const openBrace = bodyNode.children.find((c) => c.type === '{');
  if (!openBrace) return null;

  const insertPosition = openBrace.endIndex;

  // Check if there's already a newline after the brace
  const hasNewlineAfterBrace = originalCode[insertPosition] === '\n';

  // Generate ref variable code with proper formatting
  const refCode = hasNewlineAfterBrace
    ? `${options.indentation}const ${spec.name} = useRef(${spec.initialValue});\n`
    : `\n${options.indentation}const ${spec.name} = useRef(${spec.initialValue});\n`;

  return {
    type: 'insert',
    start: insertPosition,
    end: insertPosition,
    newCode: refCode,
    priority: 800, // Same priority as state variables
    description: `Add ref variable ${spec.name}`,
  };
}

/**
 * Build a Modification to add a useMemo hook
 */
export function buildMemoMod(
  parser: CodeParser,
  tree: Parser.Tree | null,
  _originalCode: string,
  spec: UseMemoSpec,
  options: Required<ASTModifierOptions>
): Modification | null {
  if (!tree) return null;

  const functionNode = parser.findDefaultExportedFunction(tree);
  if (!functionNode) {
    console.warn('Could not find function to add useMemo to');
    return null;
  }

  const bodyNode = findBodyNode(functionNode);
  if (!bodyNode) {
    console.warn('Could not find function body');
    return null;
  }

  // Find insertion point (after state/ref variables, before functions)
  // Look for the last state/ref declaration
  let insertPosition = bodyNode.startIndex + 1; // After opening brace

  // Try to find last hook call (useState, useRef, or useMemo)
  const bodyText = bodyNode.text;
  const hookMatches = [...bodyText.matchAll(/use(State|Ref|Memo)/g)];
  if (hookMatches.length > 0) {
    const lastHook = hookMatches[hookMatches.length - 1];
    if (lastHook.index !== undefined) {
      // Find the end of this statement (semicolon)
      const afterHook = bodyText.substring(lastHook.index);
      const semicolonMatch = afterHook.match(/;/);
      if (semicolonMatch && semicolonMatch.index !== undefined) {
        insertPosition = bodyNode.startIndex + lastHook.index + semicolonMatch.index + 1;
      }
    }
  }

  // Build useMemo code
  const deps = `[${spec.dependencies.join(', ')}]`;
  const memoCode = `\n${options.indentation}const ${spec.name} = useMemo(() => ${spec.computation}, ${deps});\n`;

  return {
    type: 'insert',
    start: insertPosition,
    end: insertPosition,
    newCode: memoCode,
    priority: 790, // Slightly lower than state/ref but higher than functions
    description: `Add memoized variable ${spec.name}`,
  };
}

/**
 * Build a Modification to add a useCallback hook
 */
export function buildCallbackMod(
  parser: CodeParser,
  tree: Parser.Tree | null,
  _originalCode: string,
  spec: UseCallbackSpec,
  options: Required<ASTModifierOptions>
): Modification | null {
  if (!tree) return null;

  const functionNode = parser.findDefaultExportedFunction(tree);
  if (!functionNode) {
    console.warn('Could not find function to add useCallback to');
    return null;
  }

  const bodyNode = findBodyNode(functionNode);
  if (!bodyNode) {
    console.warn('Could not find function body');
    return null;
  }

  // Find insertion point (after state/ref/memo hooks, before functions)
  let insertPosition = bodyNode.startIndex + 1; // After opening brace

  // Try to find last hook call (useState, useRef, useMemo, or useCallback)
  const bodyText = bodyNode.text;
  const hookMatches = [...bodyText.matchAll(/use(State|Ref|Memo|Callback)/g)];
  if (hookMatches.length > 0) {
    const lastHook = hookMatches[hookMatches.length - 1];
    if (lastHook.index !== undefined) {
      // Find the end of this statement (semicolon)
      const afterHook = bodyText.substring(lastHook.index);
      const semicolonMatch = afterHook.match(/;/);
      if (semicolonMatch && semicolonMatch.index !== undefined) {
        insertPosition = bodyNode.startIndex + lastHook.index + semicolonMatch.index + 1;
      }
    }
  }

  // Build useCallback code
  const params = spec.params ? spec.params.join(', ') : '';
  const deps = `[${spec.dependencies.join(', ')}]`;
  const callbackCode = `\n${options.indentation}const ${spec.name} = useCallback((${params}) => {\n${options.indentation}${options.indentation}${spec.body}\n${options.indentation}}, ${deps});\n`;

  return {
    type: 'insert',
    start: insertPosition,
    end: insertPosition,
    newCode: callbackCode,
    priority: 780, // Lower than memo (790) but higher than regular functions (700)
    description: `Add callback function ${spec.name}`,
  };
}

/**
 * Build Modifications to add a useReducer hook (includes reducer function + hook call)
 */
export function buildReducerMods(
  parser: CodeParser,
  tree: Parser.Tree | null,
  originalCode: string,
  spec: UseReducerSpec,
  options: Required<ASTModifierOptions>
): Modification[] {
  if (!tree) return [];

  const functionNode = parser.findDefaultExportedFunction(tree);
  if (!functionNode) {
    console.warn('Could not find function to add useReducer to');
    return [];
  }

  const bodyNode = findBodyNode(functionNode);
  if (!bodyNode) {
    console.warn('Could not find function body');
    return [];
  }

  const mods: Modification[] = [];

  // Find insertion point for reducer function (after opening brace, before hooks)
  const openBrace = bodyNode.children.find((c) => c.type === '{');
  if (!openBrace) return [];

  const reducerInsertPosition = openBrace.endIndex;
  const hasNewlineAfterBrace = originalCode[reducerInsertPosition] === '\n';

  // Build reducer function with switch statement
  const caseStatements = spec.actions
    .map(
      (action) =>
        `${options.indentation}${options.indentation}case '${action.type}':\n${options.indentation}${options.indentation}${options.indentation}${action.handler}`
    )
    .join('\n');

  const reducerFunction = `${hasNewlineAfterBrace ? '' : '\n'}${options.indentation}function ${spec.reducerName}(state, action) {\n${options.indentation}${options.indentation}switch (action.type) {\n${caseStatements}\n${options.indentation}${options.indentation}default:\n${options.indentation}${options.indentation}${options.indentation}return state;\n${options.indentation}${options.indentation}}\n${options.indentation}}\n`;

  // Add reducer function first (priority 796 - just above useReducer hook)
  // This ensures reducer function appears BEFORE useReducer call in code
  mods.push({
    type: 'insert',
    start: reducerInsertPosition,
    end: reducerInsertPosition,
    newCode: reducerFunction,
    priority: 796,
    description: `Add reducer function ${spec.reducerName}`,
  });

  // Find insertion point for useReducer hook (after state/ref/memo hooks)
  let hookInsertPosition = bodyNode.startIndex + 1; // After opening brace

  // Try to find last hook call (useState, useRef, useMemo - NOT useCallback or useReducer)
  const bodyText = bodyNode.text;
  const hookMatches = [...bodyText.matchAll(/use(State|Ref|Memo)/g)];
  if (hookMatches.length > 0) {
    const lastHook = hookMatches[hookMatches.length - 1];
    if (lastHook.index !== undefined) {
      const afterHook = bodyText.substring(lastHook.index);
      const semicolonMatch = afterHook.match(/;/);
      if (semicolonMatch && semicolonMatch.index !== undefined) {
        hookInsertPosition = bodyNode.startIndex + lastHook.index + semicolonMatch.index + 1;
      }
    }
  }

  // Build useReducer hook call
  const reducerHookCode = `\n${options.indentation}const [${spec.name}, ${spec.dispatchName}] = useReducer(${spec.reducerName}, ${spec.initialState});\n`;

  // Add useReducer hook call (priority 795 - after useMemo, before useCallback)
  mods.push({
    type: 'insert',
    start: hookInsertPosition,
    end: hookInsertPosition,
    newCode: reducerHookCode,
    priority: 795,
    description: `Add useReducer hook for ${spec.name}`,
  });

  return mods;
}

/**
 * Build a Modification to add a function to the component
 */
export function buildFunctionMod(
  parser: CodeParser,
  tree: Parser.Tree | null,
  _originalCode: string,
  spec: FunctionSpec,
  options: Required<ASTModifierOptions>
): Modification | null {
  if (!tree) return null;

  const functionNode = parser.findDefaultExportedFunction(tree);
  if (!functionNode) {
    console.warn('Could not find function to add handler to');
    return null;
  }

  const bodyNode = findBodyNode(functionNode);
  if (!bodyNode) {
    console.warn('Could not find function body');
    return null;
  }

  // Find insertion point (after hooks, before return statement)
  let insertPosition = bodyNode.startIndex + 1;

  // Try to find last hook or function declaration
  const bodyText = bodyNode.text;
  const declarationMatches = [...bodyText.matchAll(/(?:const|function|use)\s+\w+/g)];
  if (declarationMatches.length > 0) {
    const lastDecl = declarationMatches[declarationMatches.length - 1];
    if (lastDecl.index !== undefined) {
      // Find end of this statement/declaration
      const afterDecl = bodyText.substring(lastDecl.index);
      const endMatch = afterDecl.match(/[;}]\s*\n/);
      if (endMatch && endMatch.index !== undefined) {
        insertPosition =
          bodyNode.startIndex + lastDecl.index + endMatch.index + endMatch[0].length;
      }
    }
  }

  // Build function code
  const isArrow = spec.isArrow !== false; // Default to arrow function
  const isAsync = spec.isAsync === true;
  const asyncKeyword = isAsync ? 'async ' : '';
  const params = spec.params ? spec.params.join(', ') : '';

  let functionCode: string;
  if (isArrow) {
    // Arrow function: const handleLogin = async (e) => { ... }
    functionCode = `\n${options.indentation}const ${spec.name} = ${asyncKeyword}(${params}) => {\n${options.indentation}${options.indentation}${spec.body}\n${options.indentation}};\n`;
  } else {
    // Regular function: function handleLogin(e) { ... }
    functionCode = `\n${options.indentation}${asyncKeyword}function ${spec.name}(${params}) {\n${options.indentation}${options.indentation}${spec.body}\n${options.indentation}}\n`;
  }

  return {
    type: 'insert',
    start: insertPosition,
    end: insertPosition,
    newCode: functionCode,
    priority: 700,
    description: `Add function ${spec.name}`,
  };
}
