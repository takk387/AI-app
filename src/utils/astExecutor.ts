import { ASTModifier } from './astModifier';
import type { ImportSpec, WrapperSpec, StateVariableSpec } from './astModifierTypes';

/**
 * AST Operation Types
 * These represent high-level operations that use the AST Modifier
 */
export interface ASTWrapElementOperation {
  type: 'AST_WRAP_ELEMENT';
  targetElement: string;        // JSX element to find (e.g., 'div', 'App')
  wrapperComponent: string;     // Component to wrap with (e.g., 'AuthGuard')
  wrapperProps?: Record<string, string>; // Optional props for wrapper
  import?: {
    source: string;
    defaultImport?: string;
    namedImports?: string[];
    namespaceImport?: string;
  };
}

export interface ASTAddStateOperation {
  type: 'AST_ADD_STATE';
  name: string;           // State variable name (e.g., 'isOpen')
  setter: string;         // Setter function name (e.g., 'setIsOpen')
  initialValue: string;   // Initial value (e.g., 'false', '0', '[]')
}

export interface ASTAddImportOperation {
  type: 'AST_ADD_IMPORT';
  source: string;
  defaultImport?: string;
  namedImports?: string[];
  namespaceImport?: string;
}

export interface ASTModifyClassNameOperation {
  type: 'AST_MODIFY_CLASSNAME';
  targetElement: string;        // JSX element to find
  staticClasses?: string[];     // Static classes to preserve/add
  template?: {
    variable: string;           // Variable name (e.g., 'darkMode')
    trueValue: string;          // Value when true (e.g., 'dark')
    falseValue?: string;        // Value when false (default: '')
    operator?: '?' | '&&';      // Operator to use (default: '?')
  };
  rawTemplate?: string;         // Or raw template string (advanced)
}

export interface ASTInsertJSXOperation {
  type: 'AST_INSERT_JSX';
  targetElement: string;        // JSX element to find
  jsx: string;                  // JSX code to insert
  position: 'before' | 'after' | 'inside_start' | 'inside_end';
}

export interface ASTAddUseEffectOperation {
  type: 'AST_ADD_USEEFFECT';
  body: string;                 // Effect body code
  dependencies?: string[];      // Dependency array
  cleanup?: string;            // Optional cleanup function body
}

export interface ASTModifyPropOperation {
  type: 'AST_MODIFY_PROP';
  targetElement: string;        // JSX element to find
  propName: string;            // Prop name
  propValue?: string;          // New value (undefined = remove)
  action: 'add' | 'update' | 'remove';
}

export interface ASTAddAuthenticationOperation {
  type: 'AST_ADD_AUTHENTICATION';
  loginFormStyle?: 'simple' | 'styled';  // Style of login form
  includeEmailField?: boolean;           // Include email field (default: true)
}

export interface ASTAddRefOperation {
  type: 'AST_ADD_REF';
  name: string;              // Ref variable name (e.g., 'inputRef')
  initialValue: string;      // Initial value (e.g., 'null' or 'undefined')
}

export interface ASTAddMemoOperation {
  type: 'AST_ADD_MEMO';
  name: string;              // Memoized variable name (e.g., 'filteredItems')
  computation: string;       // Computation to memoize (e.g., 'items.filter(i => i.active)')
  dependencies: string[];    // Dependency array (e.g., ['items', 'searchTerm'])
}

export type ASTOperation = 
  | ASTWrapElementOperation
  | ASTAddStateOperation
  | ASTAddImportOperation
  | ASTModifyClassNameOperation
  | ASTInsertJSXOperation
  | ASTAddUseEffectOperation
  | ASTModifyPropOperation
  | ASTAddAuthenticationOperation
  | ASTAddRefOperation
  | ASTAddMemoOperation;

/**
 * Result of executing an AST operation
 */
export interface ASTExecutionResult {
  success: boolean;
  code?: string;
  errors?: string[];
  operation?: string; // Description of what was done
}

/**
 * Execute a single AST operation on code
 * 
 * @param code - The source code to modify
 * @param operation - The AST operation to perform
 * @returns Result with modified code or errors
 */
export async function executeASTOperation(
  code: string,
  operation: ASTOperation
): Promise<ASTExecutionResult> {
  try {
    // Initialize AST Modifier
    const modifier = new ASTModifier(code);
    await modifier.initialize();
    
    const tree = modifier.getTree();
    const parser = modifier.getParser();
    
    // Execute operation based on type
    switch (operation.type) {
      case 'AST_WRAP_ELEMENT': {
        // Find the target JSX element
        const element = parser.findComponent(tree, operation.targetElement);
        
        if (!element) {
          return {
            success: false,
            errors: [`Could not find JSX element: ${operation.targetElement}`]
          };
        }
        
        // Build wrapper spec
        const wrapperSpec: WrapperSpec = {
          component: operation.wrapperComponent,
          props: operation.wrapperProps
        };
        
        // Add import if specified
        if (operation.import) {
          wrapperSpec.import = {
            source: operation.import.source,
            defaultImport: operation.import.defaultImport,
            namedImports: operation.import.namedImports,
            namespaceImport: operation.import.namespaceImport
          };
        }
        
        // Apply wrapper
        modifier.wrapElement(element, wrapperSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: `Wrapped ${operation.targetElement} in ${operation.wrapperComponent}`
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_ADD_STATE': {
        // Build state variable spec
        const stateSpec: StateVariableSpec = {
          name: operation.name,
          setter: operation.setter,
          initialValue: operation.initialValue
        };
        
        // Add state variable
        modifier.addStateVariable(stateSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: `Added state variable: ${operation.name}`
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_ADD_IMPORT': {
        // Build import spec
        const importSpec: ImportSpec = {
          source: operation.source,
          defaultImport: operation.defaultImport,
          namedImports: operation.namedImports,
          namespaceImport: operation.namespaceImport
        };
        
        // Add import
        modifier.addImport(importSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: `Added import from ${operation.source}`
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_MODIFY_CLASSNAME': {
        // Find the target JSX element
        const element = parser.findComponent(tree, operation.targetElement);
        
        if (!element) {
          return {
            success: false,
            errors: [`Could not find JSX element: ${operation.targetElement}`]
          };
        }
        
        // Build className spec
        const classNameSpec = {
          staticClasses: operation.staticClasses,
          template: operation.template,
          rawTemplate: operation.rawTemplate
        };
        
        // Apply className modification
        modifier.modifyClassName(element, classNameSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: `Modified className on ${operation.targetElement}`
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_INSERT_JSX': {
        // Find the target JSX element
        const element = parser.findComponent(tree, operation.targetElement);
        
        if (!element) {
          return {
            success: false,
            errors: [`Could not find JSX element: ${operation.targetElement}`]
          };
        }
        
        // Build insert spec
        const insertSpec = {
          jsx: operation.jsx,
          position: operation.position
        };
        
        // Apply JSX insertion
        modifier.insertJSX(element, insertSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: `Inserted JSX ${operation.position} ${operation.targetElement}`
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_ADD_USEEFFECT': {
        // Build useEffect spec
        const effectSpec = {
          body: operation.body,
          dependencies: operation.dependencies,
          cleanup: operation.cleanup
        };
        
        // Add useEffect
        modifier.addUseEffect(effectSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: 'Added useEffect hook'
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_MODIFY_PROP': {
        // Find the target JSX element
        const element = parser.findComponent(tree, operation.targetElement);
        
        if (!element) {
          return {
            success: false,
            errors: [`Could not find JSX element: ${operation.targetElement}`]
          };
        }
        
        // Build prop spec
        const propSpec = {
          name: operation.propName,
          value: operation.propValue,
          action: operation.action
        };
        
        // Apply prop modification
        modifier.modifyProp(element, propSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: `Modified prop ${operation.propName} on ${operation.targetElement}`
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_ADD_REF': {
        // Build ref spec
        const refSpec = {
          name: operation.name,
          initialValue: operation.initialValue
        };
        
        // Add ref
        modifier.addRef(refSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: `Added ref variable: ${operation.name}`
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_ADD_MEMO': {
        // Build memo spec
        const memoSpec = {
          name: operation.name,
          computation: operation.computation,
          dependencies: operation.dependencies
        };
        
        // Add memo
        modifier.addMemo(memoSpec);
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: `Added memoized variable: ${operation.name}`
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      case 'AST_ADD_AUTHENTICATION': {
        // Composed operation that adds complete authentication
        const includeEmail = operation.includeEmailField !== false;
        const style = operation.loginFormStyle || 'styled';
        
        // Step 1: Add state for authentication
        modifier.addStateVariable({
          name: 'isLoggedIn',
          setter: 'setIsLoggedIn',
          initialValue: 'false'
        });
        
        // Step 2: Add state for credentials (if email included)
        if (includeEmail) {
          modifier.addStateVariable({
            name: 'email',
            setter: 'setEmail',
            initialValue: "''"
          });
        }
        
        modifier.addStateVariable({
          name: 'password',
          setter: 'setPassword',
          initialValue: "''"
        });
        
        // Step 3: Add login handler function
        const loginBody = includeEmail
          ? `if (email && password) {\n      setIsLoggedIn(true);\n    }`
          : `if (password) {\n      setIsLoggedIn(true);\n    }`;
        
        modifier.addFunction({
          name: 'handleLogin',
          params: ['e'],
          body: `e.preventDefault();\n    ${loginBody}`,
          isArrow: true
        });
        
        // Step 4: Add logout handler function
        modifier.addFunction({
          name: 'handleLogout',
          params: [],
          body: `setIsLoggedIn(false);\n    ${includeEmail ? 'setEmail(\'\');\n    ' : ''}setPassword('');`,
          isArrow: true
        });
        
        // Step 5: Build login form JSX based on style
        let loginFormJSX: string;
        if (style === 'simple') {
          loginFormJSX = `<div>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          ${includeEmail ? '<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />' : ''}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
      </div>`;
        } else {
          // Styled form
          loginFormJSX = `<div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            ${includeEmail ? '<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />' : ''}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors">Login</button>
          </form>
        </div>
      </div>`;
        }
        
        // Step 6: Wrap existing return in conditional
        modifier.wrapInConditional({
          condition: 'isLoggedIn',
          type: 'if-return',
          fallback: loginFormJSX
        });
        
        // Step 7: Find the main return element and add logout button
        // This will be inside the authenticated section
        const mainElement = parser.findDefaultExportedFunction(tree);
        if (mainElement) {
          // Find the return statement and its JSX
          for (const child of mainElement.children) {
            if (child.type === 'statement_block') {
              for (const stmt of child.children) {
                if (stmt.type === 'return_statement') {
                  // Find the JSX element being returned
                  for (const returnChild of stmt.children) {
                    if (returnChild.type === 'jsx_element' || returnChild.type === 'jsx_fragment') {
                      // Insert logout button at the start of this element
                      const logoutButton = style === 'simple'
                        ? '<button onClick={handleLogout}>Logout</button>'
                        : '<button onClick={handleLogout} className="mb-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">Logout</button>';
                      
                      modifier.insertJSX(returnChild, {
                        jsx: logoutButton,
                        position: 'inside_start'
                      });
                      break;
                    }
                  }
                  break;
                }
              }
              break;
            }
          }
        }
        
        // Generate modified code
        const result = await modifier.generate();
        
        if (result.success) {
          return {
            success: true,
            code: result.code,
            operation: 'Added authentication system with login/logout'
          };
        } else {
          return {
            success: false,
            errors: result.errors
          };
        }
      }
      
      default:
        return {
          success: false,
          errors: [`Unknown AST operation type: ${(operation as any).type}`]
        };
    }
    
  } catch (error) {
    return {
      success: false,
      errors: [
        'AST operation failed',
        error instanceof Error ? error.message : String(error)
      ]
    };
  }
}

/**
 * Execute multiple AST operations in sequence
 * 
 * @param code - The source code to modify
 * @param operations - Array of AST operations to perform
 * @returns Result with final modified code or errors
 */
export async function executeASTOperations(
  code: string,
  operations: ASTOperation[]
): Promise<ASTExecutionResult> {
  let currentCode = code;
  const appliedOperations: string[] = [];
  
  for (const operation of operations) {
    const result = await executeASTOperation(currentCode, operation);
    
    if (!result.success) {
      return {
        success: false,
        errors: [
          `Failed after ${appliedOperations.length} operations`,
          ...(result.errors || [])
        ]
      };
    }
    
    currentCode = result.code!;
    if (result.operation) {
      appliedOperations.push(result.operation);
    }
  }
  
  return {
    success: true,
    code: currentCode,
    operation: appliedOperations.join('; ')
  };
}

/**
 * Check if an operation is an AST operation
 */
export function isASTOperation(operation: any): operation is ASTOperation {
  return operation && typeof operation.type === 'string' && operation.type.startsWith('AST_');
}
