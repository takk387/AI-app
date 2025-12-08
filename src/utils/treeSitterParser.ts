import Parser from 'tree-sitter';
import type {
  ErrorInfo,
  FunctionMatch,
  VariableMatch,
  StateVariable,
  ParserOptions,
  ImportInfo,
} from './treeSitterTypes';

/**
 * Comprehensive Tree-sitter parser for TypeScript/JavaScript/TSX
 *
 * Features:
 * - Supports all function types (declarations, arrow functions, expressions)
 * - Supports all variable patterns (simple, array destructuring, object destructuring)
 * - Error-tolerant parsing (works with syntax errors)
 * - Lazy initialization (doesn't crash on import)
 * - Dual ESM/CommonJS support
 * - Comprehensive null checking
 * - React-specific helpers
 *
 * @version 2.0.0 - Comprehensive rewrite (Nov 2025)
 */
export class CodeParser {
  private parser: Parser;
  private language: 'javascript' | 'typescript';
  private initialized: boolean = false;
  private options: ParserOptions;

  constructor(language: 'javascript' | 'typescript' = 'typescript', options: ParserOptions = {}) {
    this.parser = new Parser();
    this.language = language;
    this.options = {
      throwOnError: false,
      logErrors: true,
      ...options,
    };
    // Note: Don't initialize here - lazy init on first use prevents crashes
  }

  /**
   * Lazy initialization - loads language grammar on first use
   * This prevents crashes on import if packages aren't installed
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.language === 'typescript') {
        // Try ESM import first (modern)
        try {
          const TypeScript = await import('tree-sitter-typescript');
          const lang = TypeScript.default?.tsx || TypeScript.tsx;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.parser.setLanguage(lang as any);
        } catch {
          // Fallback to CommonJS require
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const TypeScript = require('tree-sitter-typescript');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.parser.setLanguage(TypeScript.tsx as any);
        }
      } else {
        // JavaScript
        try {
          const JavaScript = await import('tree-sitter-javascript');
          const lang = JavaScript.default || JavaScript;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.parser.setLanguage(lang as any);
        } catch {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const JavaScript = require('tree-sitter-javascript');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.parser.setLanguage(JavaScript as any);
        }
      }

      this.initialized = true;
    } catch (error) {
      const message =
        `Failed to load tree-sitter language for ${this.language}. ` +
        `Please install: npm install tree-sitter tree-sitter-${this.language}`;

      if (this.options.logErrors) {
        console.error(message, error);
      }

      if (this.options.throwOnError) {
        throw new Error(message);
      }

      throw error;
    }
  }

  /**
   * Parse code into a syntax tree
   * Now async due to lazy initialization
   */
  async parse(code: string): Promise<Parser.Tree | null> {
    if (!code || typeof code !== 'string') {
      if (this.options.logErrors) {
        console.error('parse() requires a non-empty string');
      }
      return null;
    }

    await this.ensureInitialized();

    try {
      const tree = this.parser.parse(code);

      if (!tree || !tree.rootNode) {
        if (this.options.logErrors) {
          console.error('Parser returned invalid tree');
        }
        return null;
      }

      if (tree.rootNode.hasError) {
        if (this.options.logErrors) {
          console.warn('Parse tree has syntax errors:', this.getErrors(tree));
        }
        // Still return tree - error-tolerant!
      }

      return tree;
    } catch (error) {
      if (this.options.logErrors) {
        console.error('Failed to parse code:', error);
      }
      return null;
    }
  }

  /**
   * Synchronous parse for backward compatibility
   * WARNING: Will throw if not initialized yet
   */
  parseSync(code: string): Parser.Tree | null {
    if (!this.initialized) {
      throw new Error('Parser not initialized. Use parse() or call ensureInitialized() first.');
    }

    if (!code || typeof code !== 'string') {
      return null;
    }

    try {
      const tree = this.parser.parse(code);

      if (!tree || !tree.rootNode) {
        return null;
      }

      if (tree.rootNode.hasError && this.options.logErrors) {
        console.warn('Parse tree has syntax errors:', this.getErrors(tree));
      }

      return tree;
    } catch (error) {
      if (this.options.logErrors) {
        console.error('Failed to parse code:', error);
      }
      return null;
    }
  }

  /**
   * Find all nodes of a given type
   */
  findNodes(tree: Parser.Tree | null, nodeType: string): Parser.SyntaxNode[] {
    if (!tree || !tree.rootNode || !nodeType) {
      return [];
    }

    const nodes: Parser.SyntaxNode[] = [];

    const traverse = (node: Parser.SyntaxNode) => {
      if (node.type === nodeType) {
        nodes.push(node);
      }
      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(tree.rootNode);
    return nodes;
  }

  /**
   * Find a function by name - COMPREHENSIVE VERSION
   * Supports all function types:
   * 1. function App() {} - function_declaration
   * 2. const App = () => {} - arrow_function
   * 3. const App = function() {} - function_expression
   */
  findFunction(tree: Parser.Tree | null, funcName: string): FunctionMatch | null {
    if (!tree || !tree.rootNode || !funcName) {
      return null;
    }

    // 1. Check function declarations: function App() {}
    const functionDecls = this.findNodes(tree, 'function_declaration');
    for (const func of functionDecls) {
      const name = func.childForFieldName('name');
      if (name?.text === funcName) {
        return {
          node: func,
          type: 'function_declaration',
          name: funcName,
        };
      }
    }

    // 2. Check arrow functions in lexical declarations: const App = () => {}
    const lexDecls = this.findNodes(tree, 'lexical_declaration');
    for (const decl of lexDecls) {
      for (const child of decl.children) {
        if (child.type === 'variable_declarator') {
          const name = child.childForFieldName('name');
          const value = child.childForFieldName('value');

          if (name?.text === funcName && value?.type === 'arrow_function') {
            return {
              node: value,
              type: 'arrow_function',
              declarator: child,
              name: funcName,
            };
          }
        }
      }
    }

    // 3. Check function expressions: const App = function() {}
    for (const decl of lexDecls) {
      for (const child of decl.children) {
        if (child.type === 'variable_declarator') {
          const name = child.childForFieldName('name');
          const value = child.childForFieldName('value');

          if (name?.text === funcName && value?.type === 'function_expression') {
            return {
              node: value,
              type: 'function_expression',
              declarator: child,
              name: funcName,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Find a variable by name - COMPREHENSIVE VERSION
   * Supports all destructuring patterns:
   * 1. const count = 0 - simple
   * 2. const [a, b] = arr - array destructuring
   * 3. const { name, age } = obj - object destructuring
   * 4. const { name: userName } = obj - renamed destructuring
   */
  findVariable(tree: Parser.Tree | null, varName: string): VariableMatch | null {
    if (!tree || !tree.rootNode || !varName) {
      return null;
    }

    // Use lexical_declaration for const/let (TypeScript/modern JS)
    const declarations = this.findNodes(tree, 'lexical_declaration');

    for (const decl of declarations) {
      for (const child of decl.children) {
        if (child.type === 'variable_declarator') {
          const nameNode = child.childForFieldName('name');

          if (!nameNode) continue;

          // Case 1: Simple identifier - const count = 0
          if (nameNode.text === varName) {
            return {
              node: decl,
              type: 'simple',
              nameNode,
            };
          }

          // Case 2: Array destructuring - const [a, b] = arr
          if (nameNode.type === 'array_pattern') {
            const elements = nameNode.namedChildren;
            for (const element of elements) {
              if (element.text === varName) {
                return {
                  node: decl,
                  type: 'array_destructure',
                  nameNode,
                  element,
                };
              }
            }
          }

          // Case 3: Object destructuring - const { name, age } = obj
          if (nameNode.type === 'object_pattern') {
            const properties = nameNode.namedChildren;
            for (const prop of properties) {
              // Handle shorthand: { name }
              if (prop.type === 'shorthand_property_identifier_pattern') {
                if (prop.text === varName) {
                  return {
                    node: decl,
                    type: 'object_destructure',
                    nameNode,
                    property: prop,
                  };
                }
              }

              // Handle renamed: { name: userName }
              if (prop.type === 'pair_pattern') {
                const key = prop.childForFieldName('key');
                const value = prop.childForFieldName('value');

                // Check the renamed variable
                if (value?.text === varName) {
                  return {
                    node: decl,
                    type: 'object_destructure_renamed',
                    nameNode,
                    property: prop,
                    originalName: key?.text,
                  };
                }
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Find JSX component by tag name
   * Checks both regular and self-closing elements
   */
  findComponent(tree: Parser.Tree | null, componentName: string): Parser.SyntaxNode | null {
    if (!tree || !tree.rootNode || !componentName) {
      return null;
    }

    // Check regular JSX elements: <div>...</div>
    const jsxElements = this.findNodes(tree, 'jsx_element');
    for (const element of jsxElements) {
      // Try different field names (tree-sitter-typescript uses different names)
      let openingElement = element.childForFieldName('opening_element');

      // If that doesn't work, find the opening tag by type
      if (!openingElement) {
        for (const child of element.children) {
          if (child.type === 'jsx_opening_element') {
            openingElement = child;
            break;
          }
        }
      }

      if (openingElement) {
        // Try to get the name
        let name = openingElement.childForFieldName('name');

        // If that doesn't work, find by type
        if (!name) {
          for (const child of openingElement.children) {
            if (child.type === 'identifier' || child.type === 'jsx_identifier') {
              name = child;
              break;
            }
          }
        }

        if (name?.text === componentName) {
          return element;
        }
      }
    }

    // Check self-closing elements: <Component />
    const selfClosing = this.findNodes(tree, 'jsx_self_closing_element');
    for (const element of selfClosing) {
      let name = element.childForFieldName('name');

      // If that doesn't work, find by type
      if (!name) {
        for (const child of element.children) {
          if (child.type === 'identifier' || child.type === 'jsx_identifier') {
            name = child;
            break;
          }
        }
      }

      if (name?.text === componentName) {
        return element;
      }
    }

    return null;
  }

  /**
   * Find all import statements
   */
  findImports(tree: Parser.Tree | null): Parser.SyntaxNode[] {
    if (!tree || !tree.rootNode) {
      return [];
    }
    return this.findNodes(tree, 'import_statement');
  }

  /**
   * Find the export default declaration
   */
  findDefaultExport(tree: Parser.Tree | null): Parser.SyntaxNode | null {
    if (!tree || !tree.rootNode) {
      return null;
    }

    const exports = this.findNodes(tree, 'export_statement');

    for (const exp of exports) {
      // Check if it has 'default' keyword
      for (const child of exp.children) {
        if (child.type === 'default' || child.text === 'default') {
          return exp;
        }
      }
    }

    return null;
  }

  /**
   * Find the default exported function (common React pattern)
   * export default () => {} or export default function App() {}
   */
  findDefaultExportedFunction(tree: Parser.Tree | null): Parser.SyntaxNode | null {
    if (!tree || !tree.rootNode) {
      return null;
    }

    const defaultExport = this.findDefaultExport(tree);
    if (!defaultExport) return null;

    // Check if it's exporting a function
    for (const child of defaultExport.children) {
      if (
        child.type === 'arrow_function' ||
        child.type === 'function' ||
        child.type === 'function_declaration'
      ) {
        return child;
      }
    }

    return null;
  }

  /**
   * Find all useState calls and extract state variable names
   * Pattern: const [state, setState] = useState(initialValue)
   */
  findStateVariables(tree: Parser.Tree | null): StateVariable[] {
    if (!tree || !tree.rootNode) {
      return [];
    }

    const stateVars: StateVariable[] = [];
    // Use lexical_declaration for const/let
    const varDecls = this.findNodes(tree, 'lexical_declaration');

    for (const decl of varDecls) {
      for (const child of decl.children) {
        if (child.type === 'variable_declarator') {
          const nameNode = child.childForFieldName('name');
          const value = child.childForFieldName('value');

          // Check for array pattern: [state, setState]
          if (nameNode?.type === 'array_pattern' && value?.type === 'call_expression') {
            const callee = value.childForFieldName('function');

            // Check if it's useState
            if (callee?.text === 'useState') {
              const elements = nameNode.namedChildren;
              if (elements.length >= 2) {
                const stateVar = elements[0].text;
                const setterVar = elements[1].text;

                // Try to get initial value
                const args = value.childForFieldName('arguments');
                let initialValue: string | undefined;
                if (args && args.namedChildren.length > 0) {
                  initialValue = args.namedChildren[0].text;
                }

                stateVars.push({
                  stateVar,
                  setterVar,
                  initialValue,
                  node: decl,
                });
              }
            }
          }
        }
      }
    }

    return stateVars;
  }

  /**
   * Get detailed import information
   * Returns source and all imported names
   */
  getImportInfo(importNode: Parser.SyntaxNode): ImportInfo | null {
    if (!importNode || importNode.type !== 'import_statement') {
      return null;
    }

    const source = importNode.childForFieldName('source');
    if (!source) return null;

    // Remove quotes from source
    const sourcePath = source.text.replace(/['"]/g, '');

    const imports: ImportInfo['imports'] = [];

    // Find import clause
    const importClause = importNode.children.find(
      (c) => c.type === 'import_clause' || c.type === 'named_imports'
    );

    if (importClause) {
      // Handle named imports: import { a, b as c } from 'module'
      if (importClause.type === 'import_clause') {
        for (const child of importClause.children) {
          if (child.type === 'named_imports') {
            for (const spec of child.namedChildren) {
              if (spec.type === 'import_specifier') {
                const name = spec.childForFieldName('name');
                const alias = spec.childForFieldName('alias');
                imports.push({
                  name: name?.text || '',
                  alias: alias?.text,
                });
              }
            }
          } else if (child.type === 'identifier') {
            // Default import
            imports.push({
              name: child.text,
              isDefault: true,
            });
          } else if (child.type === 'namespace_import') {
            // import * as Name
            const alias = child.childForFieldName('alias');
            imports.push({
              name: '*',
              alias: alias?.text,
              isNamespace: true,
            });
          }
        }
      }
    }

    return {
      source: sourcePath,
      imports,
      node: importNode,
    };
  }

  /**
   * Get all syntax errors in the tree - IMPROVED VERSION
   * Now finds all error nodes, not just direct ERROR types
   */
  getErrors(tree: Parser.Tree | null): ErrorInfo[] {
    if (!tree || !tree.rootNode) {
      return [];
    }

    const errors: ErrorInfo[] = [];
    const seen = new Set<string>(); // Prevent duplicates

    const traverse = (node: Parser.SyntaxNode) => {
      if (node.hasError) {
        // Mark actual error nodes
        if (node.type === 'ERROR' || node.isMissing) {
          const key = `${node.startPosition.row}:${node.startPosition.column}:${node.type}`;
          if (!seen.has(key)) {
            errors.push({
              line: node.startPosition.row + 1, // 1-indexed for humans
              column: node.startPosition.column + 1,
              text: node.text.slice(0, 50), // First 50 chars
              nodeType: node.type,
            });
            seen.add(key);
          }
        }

        // Continue traversing even if this node is an error
        // There might be more specific errors in children
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(tree.rootNode);
    return errors;
  }

  /**
   * Get a human-readable tree representation
   * Useful for debugging - now with null checks
   */
  printTree(tree: Parser.Tree | null, maxDepth: number = 3): string {
    if (!tree) {
      return 'Error: tree is null';
    }

    if (!tree.rootNode) {
      return 'Error: tree has no root node';
    }

    let result = '';

    const traverse = (node: Parser.SyntaxNode, depth: number, prefix: string) => {
      if (depth > maxDepth) return;

      const indent = '  '.repeat(depth);
      const nodeInfo = `${indent}${prefix}${node.type}`;
      const text = node.text.length > 30 ? node.text.slice(0, 30) + '...' : node.text;
      result += `${nodeInfo} "${text}"\n`;

      node.children.forEach((child, index) => {
        const isLast = index === node.children.length - 1;
        const childPrefix = isLast ? '└─ ' : '├─ ';
        traverse(child, depth + 1, childPrefix);
      });
    };

    traverse(tree.rootNode, 0, '');
    return result;
  }

  /**
   * Check if tree has syntax errors - with null checks
   */
  hasErrors(tree: Parser.Tree | null): boolean {
    return tree?.rootNode?.hasError ?? true; // Null/undefined = error
  }

  /**
   * Get node text content - safe version
   */
  getNodeText(node: Parser.SyntaxNode | null): string {
    return node?.text ?? '';
  }

  /**
   * Get node position - safe version
   */
  getNodePosition(node: Parser.SyntaxNode | null): { line: number; column: number } {
    if (!node) {
      return { line: 0, column: 0 };
    }

    return {
      line: node.startPosition.row + 1, // 1-indexed
      column: node.startPosition.column + 1,
    };
  }

  /**
   * Get the parser's initialized state
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Manually initialize the parser (if you want eager loading)
   */
  async initialize(): Promise<void> {
    await this.ensureInitialized();
  }
}

/**
 * Create a parser instance - SAFE VERSION
 * No longer crashes on import!
 */
export function createParser(
  language: 'javascript' | 'typescript' = 'typescript',
  options?: ParserOptions
): CodeParser {
  return new CodeParser(language, options);
}

/**
 * Singleton instance for convenience
 * Lazily initialized on first use
 */
let defaultParser: CodeParser | null = null;

export function getDefaultParser(): CodeParser {
  if (!defaultParser) {
    defaultParser = new CodeParser('typescript');
  }
  return defaultParser;
}

// Export for backward compatibility
export const parser = getDefaultParser();
