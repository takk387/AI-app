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

export type ASTOperation = 
  | ASTWrapElementOperation
  | ASTAddStateOperation
  | ASTAddImportOperation
  | ASTModifyClassNameOperation
  | ASTInsertJSXOperation
  | ASTAddUseEffectOperation
  | ASTModifyPropOperation;

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
