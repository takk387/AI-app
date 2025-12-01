import Parser from 'tree-sitter';
import { CodeParser } from './treeSitterParser';
import type {
  Modification,
  ImportSpec,
  WrapperSpec,
  StateVariableSpec,
  ModifyClassNameSpec,
  InsertJSXSpec,
  UseEffectSpec,
  UseRefSpec,
  UseMemoSpec,
  UseCallbackSpec,
  UseReducerSpec,
  ModifyPropSpec,
  FunctionSpec,
  ConditionalWrapSpec,
  ReplaceFunctionBodySpec,
  DeleteElementSpec,
  MergeImportsSpec,
  ModificationResult,
  ASTModifierOptions,
  NodePosition,
  ModificationContext
} from './astModifierTypes';

/**
 * AST Modifier - Makes surgical modifications to code using Tree-sitter
 * 
 * Features:
 * - Precise position-based modifications
 * - Import deduplication
 * - Validation after modifications
 * - Preserves formatting where possible
 * 
 * @version 1.0.0
 */
export class ASTModifier {
  private parser: CodeParser;
  private originalCode: string;
  private tree: Parser.Tree | null = null;
  private modifications: Modification[] = [];
  private imports: Map<string, ImportSpec> = new Map();
  private scheduledImportUpdates: Set<string> = new Set();
  private options: Required<ASTModifierOptions>;

  constructor(code: string, options: ASTModifierOptions = {}) {
    this.originalCode = code;
    this.parser = new CodeParser('typescript');
    this.options = {
      preserveFormatting: true,
      validateAfter: true,
      indentation: '  ',
      ...options
    };
  }

  /**
   * Initialize the modifier by parsing the code
   */
  async initialize(): Promise<void> {
    this.tree = await this.parser.parse(this.originalCode);
    if (!this.tree) {
      throw new Error('Failed to parse code');
    }
    
    // Extract existing imports
    this.extractExistingImports();
  }

  /**
   * Extract existing imports from the code
   */
  private extractExistingImports(): void {
    if (!this.tree) return;
    
    const importNodes = this.parser.findImports(this.tree);
    for (const importNode of importNodes) {
      const importInfo = this.parser.getImportInfo(importNode);
      
      if (importInfo) {
        // Build ImportSpec from existing import
        const spec: ImportSpec = {
          source: importInfo.source
        };
        
        for (const imp of importInfo.imports) {
          if (imp.isDefault) {
            spec.defaultImport = imp.name;
          } else if (imp.isNamespace) {
            spec.namespaceImport = imp.alias || imp.name;
          } else {
            if (!spec.namedImports) spec.namedImports = [];
            spec.namedImports.push(imp.alias ? `${imp.name} as ${imp.alias}` : imp.name);
          }
        }
        
        this.imports.set(importInfo.source, spec);
      } else {
        // Side-effect import: import 'styles.css';
        // Extract source from the node text
        const importText = importNode.text;
        const match = importText.match(/import\s+['"]([^'"]+)['"]/);
        if (match) {
          const source = match[1];
          // Track side-effect import with empty spec
          this.imports.set(source, { source });
        }
      }
    }
  }

  /**
   * Add an import (deduplicated)
   */
  addImport(spec: ImportSpec): this {
    const existing = this.imports.get(spec.source);
    
    if (existing) {
      // Merge with existing import
      let hasChanges = false;
      
      if (spec.defaultImport && !existing.defaultImport) {
        existing.defaultImport = spec.defaultImport;
        hasChanges = true;
      }
      if (spec.namespaceImport && !existing.namespaceImport) {
        existing.namespaceImport = spec.namespaceImport;
        hasChanges = true;
      }
      if (spec.namedImports) {
        if (!existing.namedImports) {
          existing.namedImports = [];
        }
        // Add new named imports, avoiding duplicates
        // Parse existing named imports to extract just the name (not "name as alias")
        const existingNames = existing.namedImports.map(imp => {
          const match = imp.match(/^(\w+)(?:\s+as\s+\w+)?$/);
          return match ? match[1] : imp;
        });
        
        for (const namedImport of spec.namedImports) {
          // Extract name from potential "name as alias" format
          const match = namedImport.match(/^(\w+)(?:\s+as\s+\w+)?$/);
          const importName = match ? match[1] : namedImport;
          
          // Only add if not already present
          if (!existingNames.includes(importName) && !existing.namedImports.includes(namedImport)) {
            existing.namedImports.push(namedImport);
            hasChanges = true;
          }
        }
      }
      
      // Only schedule update if there were actual changes
      if (hasChanges && !this.scheduledImportUpdates.has(spec.source)) {
        this.scheduleImportUpdate(spec.source);
        this.scheduledImportUpdates.add(spec.source);
      }
    } else {
      // New import - add at the top
      this.imports.set(spec.source, spec);
      this.scheduleImportInsertion(spec);
    }
    
    return this;
  }

  /**
   * Schedule insertion of a new import
   */
  private scheduleImportInsertion(spec: ImportSpec): void {
    if (!this.tree) return;
    
    const importCode = this.generateImportCode(spec);
    
    // Find insertion point (after existing imports or at start)
    const existingImports = this.parser.findImports(this.tree);
    let insertPosition = 0;
    let needsNewline = false;
    
    if (existingImports.length > 0) {
      // Insert after last import
      const lastImport = existingImports[existingImports.length - 1];
      insertPosition = lastImport.endIndex;
      
      // Check if there's already a newline after the last import
      needsNewline = this.originalCode[insertPosition] !== '\n';
    }
    
    // Build the code to insert with proper newlines
    const newCode = needsNewline 
      ? '\n' + importCode + '\n'
      : importCode + '\n';
    
    this.modifications.push({
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newCode,
      priority: 1000, // High priority for imports
      description: `Add import from ${spec.source}`
    });
  }

  /**
   * Schedule update of an existing import
   */
  private scheduleImportUpdate(source: string): void {
    if (!this.tree) return;
    
    const importNodes = this.parser.findImports(this.tree);
    for (const importNode of importNodes) {
      const info = this.parser.getImportInfo(importNode);
      if (info && info.source === source) {
        const spec = this.imports.get(source);
        if (spec) {
          const newImportCode = this.generateImportCode(spec);
          
          this.modifications.push({
            type: 'replace',
            start: importNode.startIndex,
            end: importNode.endIndex,
            newCode: newImportCode,
            priority: 1000,
            description: `Update import from ${source}`
          });
        }
        break;
      }
    }
  }

  /**
   * Generate import code from spec
   */
  private generateImportCode(spec: ImportSpec): string {
    // Validate: Cannot combine default and namespace imports
    if (spec.defaultImport && spec.namespaceImport) {
      throw new Error(
        `Invalid import spec for '${spec.source}': Cannot combine default and namespace imports. ` +
        `Use either defaultImport OR namespaceImport, not both.`
      );
    }
    
    const parts: string[] = [];
    
    if (spec.defaultImport) {
      parts.push(spec.defaultImport);
    }
    
    if (spec.namespaceImport) {
      parts.push(`* as ${spec.namespaceImport}`);
    }
    
    if (spec.namedImports && spec.namedImports.length > 0) {
      parts.push(`{ ${spec.namedImports.join(', ')} }`);
    }
    
    if (parts.length === 0) {
      // Side-effect import: import 'module';
      return `import '${spec.source}';`;
    }
    
    const importClause = parts.join(', ');
    return `import ${importClause} from '${spec.source}';`;
  }

  /**
   * Wrap a JSX element in another component
   */
  wrapElement(elementNode: Parser.SyntaxNode, wrapper: WrapperSpec): this {
    if (!this.tree) return this;
    
    // Add import if specified
    if (wrapper.import) {
      this.addImport(wrapper.import);
    }
    
    // Generate wrapper opening and closing
    // NOTE: Props are wrapped in {} by default. If you need string literals,
    // pass them pre-quoted: { fallback: '"LoginPage"' }
    const propsStr = wrapper.props 
      ? ' ' + Object.entries(wrapper.props)
          .map(([key, value]) => `${key}={${value}}`)
          .join(' ')
      : '';
    
    const opening = `<${wrapper.component}${propsStr}>`;
    const closing = `</${wrapper.component}>`;
    
    // Calculate indentation: use the element's actual column position
    const elementLineStart = this.originalCode.lastIndexOf('\n', elementNode.startIndex - 1) + 1;
    const elementColumn = elementNode.startIndex - elementLineStart;
    const baseIndentation = ' '.repeat(elementColumn);
    
    // Insert opening before element (higher priority to ensure it's applied after closing in reverse order)
    this.modifications.push({
      type: 'insert',
      start: elementNode.startIndex,
      end: elementNode.startIndex,
      newCode: opening + '\n' + baseIndentation + this.options.indentation,
      priority: 501, // Higher priority than closing
      description: `Wrap element in ${wrapper.component} (opening)`
    });
    
    // Insert closing after element
    this.modifications.push({
      type: 'insert',
      start: elementNode.endIndex,
      end: elementNode.endIndex,
      newCode: '\n' + baseIndentation + closing,
      priority: 500, // Lower priority than opening
      description: `Wrap element in ${wrapper.component} (closing)`
    });
    
    return this;
  }

  /**
   * Add a state variable (useState)
   */
  addStateVariable(spec: StateVariableSpec): this {
    if (!this.tree) return this;
    
    // Ensure useState is imported
    this.addImport({
      source: 'react',
      namedImports: ['useState']
    });
    
    // Find the function body to insert into
    const functionNode = this.parser.findDefaultExportedFunction(this.tree);
    if (!functionNode) {
      console.warn('Could not find function to add state variable to');
      return this;
    }
    
    // Find the function body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      // Try to find statement_block child
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn('Could not find function body');
      return this;
    }
    
    // Find insertion point intelligently
    // Look for opening brace and check if next char is newline
    const openBrace = bodyNode.children.find(c => c.type === '{');
    if (!openBrace) return this;
    
    let insertPosition = openBrace.endIndex;
    
    // Check if there's already a newline after the brace
    const hasNewlineAfterBrace = this.originalCode[insertPosition] === '\n';
    
    // If there's no newline, we need to add one
    // Generate state variable code with proper formatting
    const stateCode = hasNewlineAfterBrace
      ? `${this.options.indentation}const [${spec.name}, ${spec.setter}] = useState(${spec.initialValue});\n`
      : `\n${this.options.indentation}const [${spec.name}, ${spec.setter}] = useState(${spec.initialValue});\n`;
    
    this.modifications.push({
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newCode: stateCode,
      priority: 800,
      description: `Add state variable ${spec.name}`
    });
    
    return this;
  }

  /**
   * Modify className attribute of a JSX element
   */
  modifyClassName(elementNode: Parser.SyntaxNode, spec: ModifyClassNameSpec): this {
    if (!this.tree) return this;
    
    // Find the className attribute
    let classNameAttr: Parser.SyntaxNode | null = null;
    let classNameValue: Parser.SyntaxNode | null = null;
    
    // Look for jsx_attribute nodes
    for (const child of elementNode.children) {
      if (child.type === 'jsx_opening_element') {
        for (const attrChild of child.children) {
          if (attrChild.type === 'jsx_attribute') {
            const attrName = attrChild.childForFieldName('name');
            if (attrName && attrName.text === 'className') {
              classNameAttr = attrChild;
              classNameValue = attrChild.childForFieldName('value');
              break;
            }
          }
        }
      }
    }
    
    // Extract existing static classes
    const existingClasses: string[] = [];
    if (classNameValue) {
      const valueText = classNameValue.text;
      
      // Parse different className formats
      if (valueText.startsWith('"') || valueText.startsWith("'")) {
        // String literal: className="container mx-auto"
        const cleaned = valueText.slice(1, -1); // Remove quotes
        existingClasses.push(...cleaned.split(/\s+/).filter(c => c.length > 0));
      } else if (valueText.startsWith('{')) {
        // JSX expression: Try to extract static classes
        // For template literals like {`container ${...}`}
        const templateMatch = valueText.match(/`([^$]*)/);
        if (templateMatch) {
          const staticPart = templateMatch[1].trim();
          if (staticPart) {
            existingClasses.push(...staticPart.split(/\s+/).filter(c => c.length > 0));
          }
        }
      }
    }
    
    // Combine with spec classes
    const allStaticClasses = [
      ...existingClasses,
      ...(spec.staticClasses || [])
    ];
    
    // Remove duplicates while preserving order
    const uniqueClasses = Array.from(new Set(allStaticClasses));
    
    // Generate new className value
    let newClassNameValue: string;
    
    if (spec.rawTemplate) {
      // Use raw template if provided
      newClassNameValue = `{\`${uniqueClasses.join(' ')} ${spec.rawTemplate}\`}`;
    } else if (spec.template) {
      // Build template from spec
      const { variable, trueValue, falseValue = '', operator = '?' } = spec.template;
      
      const staticPart = uniqueClasses.join(' ');
      const dynamicPart = operator === '?'
        ? `\${${variable} ? '${trueValue}' : '${falseValue}'}`
        : `\${${variable} && '${trueValue}'}`;
      
      // Build template literal
      if (staticPart) {
        newClassNameValue = `{\`${staticPart} ${dynamicPart}\`}`;
      } else {
        newClassNameValue = `{${dynamicPart}}`;
      }
    } else if (uniqueClasses.length > 0) {
      // Just static classes
      newClassNameValue = `"${uniqueClasses.join(' ')}"`;
    } else {
      // No classes - don't modify
      return this;
    }
    
    if (classNameAttr && classNameValue) {
      // Replace existing className value
      this.modifications.push({
        type: 'replace',
        start: classNameValue.startIndex,
        end: classNameValue.endIndex,
        newCode: newClassNameValue,
        priority: 700,
        description: `Modify className attribute`
      });
    } else if (classNameAttr) {
      // className exists but no value - add value
      this.modifications.push({
        type: 'insert',
        start: classNameAttr.endIndex,
        end: classNameAttr.endIndex,
        newCode: `=${newClassNameValue}`,
        priority: 700,
        description: `Add className value`
      });
    } else {
      // No className attribute - add it
      // Find where to insert (after tag name in opening element)
      for (const child of elementNode.children) {
        if (child.type === 'jsx_opening_element') {
          // Find the tag name
          const identifier = child.childForFieldName('name');
          if (identifier) {
            this.modifications.push({
              type: 'insert',
              start: identifier.endIndex,
              end: identifier.endIndex,
              newCode: ` className=${newClassNameValue}`,
              priority: 700,
              description: `Add className attribute`
            });
            break;
          }
        }
      }
    }
    
    return this;
  }

  /**
   * Insert JSX at a specific position relative to an element
   */
  insertJSX(elementNode: Parser.SyntaxNode, spec: InsertJSXSpec): this {
    if (!this.tree) return this;
    
    // Calculate indentation based on element position
    const elementLineStart = this.originalCode.lastIndexOf('\n', elementNode.startIndex - 1) + 1;
    const elementColumn = elementNode.startIndex - elementLineStart;
    const baseIndentation = ' '.repeat(elementColumn);
    
    let insertPosition: number;
    let newCode: string;
    
    switch (spec.position) {
      case 'before':
        // Insert before the element
        insertPosition = elementNode.startIndex;
        newCode = spec.jsx + '\n' + baseIndentation;
        break;
      
      case 'after':
        // Insert after the element
        insertPosition = elementNode.endIndex;
        newCode = '\n' + baseIndentation + spec.jsx;
        break;
      
      case 'inside_start':
        // Insert as first child inside element
        // Find the opening element's closing bracket
        for (const child of elementNode.children) {
          if (child.type === 'jsx_opening_element') {
            // Find the closing '>'
            const closingBracket = child.children.find(c => c.text === '>');
            if (closingBracket) {
              insertPosition = closingBracket.endIndex;
              newCode = '\n' + baseIndentation + this.options.indentation + spec.jsx;
              this.modifications.push({
                type: 'insert',
                start: insertPosition,
                end: insertPosition,
                newCode,
                priority: 600,
                description: 'Insert JSX inside element (start)'
              });
              return this;
            }
          }
        }
        console.warn('Could not find opening element closing bracket');
        return this;
      
      case 'inside_end':
        // Insert as last child inside element
        // Find the closing element
        for (const child of elementNode.children) {
          if (child.type === 'jsx_closing_element') {
            insertPosition = child.startIndex;
            newCode = '\n' + baseIndentation + this.options.indentation + spec.jsx + '\n' + baseIndentation;
            this.modifications.push({
              type: 'insert',
              start: insertPosition,
              end: insertPosition,
              newCode,
              priority: 600,
              description: 'Insert JSX inside element (end)'
            });
            return this;
          }
        }
        console.warn('Could not find closing element');
        return this;
    }
    
    this.modifications.push({
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newCode,
      priority: 600,
      description: `Insert JSX ${spec.position}`
    });
    
    return this;
  }

  /**
   * Add a useEffect hook
   */
  addUseEffect(spec: UseEffectSpec): this {
    if (!this.tree) return this;
    
    // Ensure useEffect is imported
    this.addImport({
      source: 'react',
      namedImports: ['useEffect']
    });
    
    // Find the function body to insert into
    const functionNode = this.parser.findDefaultExportedFunction(this.tree);
    if (!functionNode) {
      console.warn('Could not find function to add useEffect to');
      return this;
    }
    
    // Find the function body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn('Could not find function body');
      return this;
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
    const deps = spec.dependencies === undefined 
      ? '' 
      : spec.dependencies.length === 0 
        ? '[]' 
        : `[${spec.dependencies.join(', ')}]`;
    
    const cleanup = spec.cleanup 
      ? `\n${this.options.indentation}${this.options.indentation}return () => {\n${this.options.indentation}${this.options.indentation}${this.options.indentation}${spec.cleanup}\n${this.options.indentation}${this.options.indentation}};`
      : '';
    
    const effectCode = `\n${this.options.indentation}useEffect(() => {\n${this.options.indentation}${this.options.indentation}${spec.body}${cleanup}\n${this.options.indentation}}, ${deps});\n`;
    
    this.modifications.push({
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newCode: effectCode,
      priority: 750,
      description: 'Add useEffect hook'
    });
    
    return this;
  }

  /**
   * Add a useRef hook
   */
  addRef(spec: UseRefSpec): this {
    if (!this.tree) return this;
    
    // Ensure useRef is imported
    this.addImport({
      source: 'react',
      namedImports: ['useRef']
    });
    
    // Find the function body to insert into
    const functionNode = this.parser.findDefaultExportedFunction(this.tree);
    if (!functionNode) {
      console.warn('Could not find function to add useRef to');
      return this;
    }
    
    // Find the function body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn('Could not find function body');
      return this;
    }
    
    // Find insertion point (after opening brace, similar to state variables)
    const openBrace = bodyNode.children.find(c => c.type === '{');
    if (!openBrace) return this;
    
    let insertPosition = openBrace.endIndex;
    
    // Check if there's already a newline after the brace
    const hasNewlineAfterBrace = this.originalCode[insertPosition] === '\n';
    
    // Generate ref variable code with proper formatting
    const refCode = hasNewlineAfterBrace
      ? `${this.options.indentation}const ${spec.name} = useRef(${spec.initialValue});\n`
      : `\n${this.options.indentation}const ${spec.name} = useRef(${spec.initialValue});\n`;
    
    this.modifications.push({
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newCode: refCode,
      priority: 800, // Same priority as state variables
      description: `Add ref variable ${spec.name}`
    });
    
    return this;
  }

  /**
   * Add a useMemo hook
   */
  addMemo(spec: UseMemoSpec): this {
    if (!this.tree) return this;
    
    // Ensure useMemo is imported
    this.addImport({
      source: 'react',
      namedImports: ['useMemo']
    });
    
    // Find the function body to insert into
    const functionNode = this.parser.findDefaultExportedFunction(this.tree);
    if (!functionNode) {
      console.warn('Could not find function to add useMemo to');
      return this;
    }
    
    // Find the function body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn('Could not find function body');
      return this;
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
    const memoCode = `\n${this.options.indentation}const ${spec.name} = useMemo(() => ${spec.computation}, ${deps});\n`;
    
    this.modifications.push({
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newCode: memoCode,
      priority: 790, // Slightly lower than state/ref but higher than functions
      description: `Add memoized variable ${spec.name}`
    });
    
    return this;
  }

  /**
   * Add a useCallback hook
   */
  addCallback(spec: UseCallbackSpec): this {
    if (!this.tree) return this;
    
    // Ensure useCallback is imported
    this.addImport({
      source: 'react',
      namedImports: ['useCallback']
    });
    
    // Find the function body to insert into
    const functionNode = this.parser.findDefaultExportedFunction(this.tree);
    if (!functionNode) {
      console.warn('Could not find function to add useCallback to');
      return this;
    }
    
    // Find the function body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn('Could not find function body');
      return this;
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
    const callbackCode = `\n${this.options.indentation}const ${spec.name} = useCallback((${params}) => {\n${this.options.indentation}${this.options.indentation}${spec.body}\n${this.options.indentation}}, ${deps});\n`;
    
    this.modifications.push({
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newCode: callbackCode,
      priority: 780, // Lower than memo (790) but higher than regular functions (700)
      description: `Add callback function ${spec.name}`
    });
    
    return this;
  }

  /**
   * Add a useReducer hook
   */
  addReducer(spec: UseReducerSpec): this {
    if (!this.tree) return this;
    
    // Ensure useReducer is imported
    this.addImport({
      source: 'react',
      namedImports: ['useReducer']
    });
    
    // Find the function body to insert into
    const functionNode = this.parser.findDefaultExportedFunction(this.tree);
    if (!functionNode) {
      console.warn('Could not find function to add useReducer to');
      return this;
    }
    
    // Find the function body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn('Could not find function body');
      return this;
    }
    
    // Find insertion point for reducer function (after opening brace, before hooks)
    const openBrace = bodyNode.children.find(c => c.type === '{');
    if (!openBrace) return this;
    
    let reducerInsertPosition = openBrace.endIndex;
    const hasNewlineAfterBrace = this.originalCode[reducerInsertPosition] === '\n';
    
    // Build reducer function with switch statement
    const caseStatements = spec.actions.map(action => 
      `${this.options.indentation}${this.options.indentation}case '${action.type}':\n${this.options.indentation}${this.options.indentation}${this.options.indentation}${action.handler}`
    ).join('\n');
    
    const reducerFunction = `${hasNewlineAfterBrace ? '' : '\n'}${this.options.indentation}function ${spec.reducerName}(state, action) {\n${this.options.indentation}${this.options.indentation}switch (action.type) {\n${caseStatements}\n${this.options.indentation}${this.options.indentation}default:\n${this.options.indentation}${this.options.indentation}${this.options.indentation}return state;\n${this.options.indentation}${this.options.indentation}}\n${this.options.indentation}}\n`;
    
    // Add reducer function first (priority 796 - just above useReducer hook)
    // This ensures reducer function appears BEFORE useReducer call in code
    this.modifications.push({
      type: 'insert',
      start: reducerInsertPosition,
      end: reducerInsertPosition,
      newCode: reducerFunction,
      priority: 796,
      description: `Add reducer function ${spec.reducerName}`
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
    const reducerHookCode = `\n${this.options.indentation}const [${spec.name}, ${spec.dispatchName}] = useReducer(${spec.reducerName}, ${spec.initialState});\n`;
    
    // Add useReducer hook call (priority 795 - after useMemo, before useCallback)
    this.modifications.push({
      type: 'insert',
      start: hookInsertPosition,
      end: hookInsertPosition,
      newCode: reducerHookCode,
      priority: 795,
      description: `Add useReducer hook for ${spec.name}`
    });
    
    return this;
  }

  /**
   * Modify a prop on a JSX element
   */
  modifyProp(elementNode: Parser.SyntaxNode, spec: ModifyPropSpec): this {
    if (!this.tree) return this;
    
    // Find the jsx_opening_element
    let openingElement: Parser.SyntaxNode | null = null;
    for (const child of elementNode.children) {
      if (child.type === 'jsx_opening_element') {
        openingElement = child;
        break;
      }
    }
    
    if (!openingElement) {
      console.warn('Could not find opening element');
      return this;
    }
    
    // Find the specific prop
    let propNode: Parser.SyntaxNode | null = null;
    for (const child of openingElement.children) {
      if (child.type === 'jsx_attribute') {
        const propName = child.childForFieldName('name');
        if (propName && propName.text === spec.name) {
          propNode = child;
          break;
        }
      }
    }
    
    switch (spec.action) {
      case 'add':
      case 'update':
        if (!spec.value) {
          console.warn('Value required for add/update action');
          return this;
        }
        
        if (propNode) {
          // Update existing prop
          this.modifications.push({
            type: 'replace',
            start: propNode.startIndex,
            end: propNode.endIndex,
            newCode: `${spec.name}={${spec.value}}`,
            priority: 650,
            description: `Update prop ${spec.name}`
          });
        } else {
          // Add new prop
          // Find where to insert (after tag name)
          const tagName = openingElement.childForFieldName('name');
          if (tagName) {
            this.modifications.push({
              type: 'insert',
              start: tagName.endIndex,
              end: tagName.endIndex,
              newCode: ` ${spec.name}={${spec.value}}`,
              priority: 650,
              description: `Add prop ${spec.name}`
            });
          }
        }
        break;
      
      case 'remove':
        if (propNode) {
          // Remove the prop (including leading space)
          const start = propNode.startIndex;
          let end = propNode.endIndex;
          
          // Check if there's a space after the prop
          if (this.originalCode[end] === ' ') {
            end++;
          } else if (start > 0 && this.originalCode[start - 1] === ' ') {
            // Include leading space in deletion
            this.modifications.push({
              type: 'delete',
              start: start - 1,
              end: end,
              newCode: '',
              priority: 650,
              description: `Remove prop ${spec.name}`
            });
            return this;
          }
          
          this.modifications.push({
            type: 'delete',
            start: start,
            end: end,
            newCode: '',
            priority: 650,
            description: `Remove prop ${spec.name}`
          });
        }
        break;
    }
    
    return this;
  }

  /**
   * Add a function to the component
   */
  addFunction(spec: FunctionSpec): this {
    if (!this.tree) return this;
    
    // Find the function body to insert into
    const functionNode = this.parser.findDefaultExportedFunction(this.tree);
    if (!functionNode) {
      console.warn('Could not find function to add handler to');
      return this;
    }
    
    // Find the function body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn('Could not find function body');
      return this;
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
          insertPosition = bodyNode.startIndex + lastDecl.index + endMatch.index + endMatch[0].length;
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
      functionCode = `\n${this.options.indentation}const ${spec.name} = ${asyncKeyword}(${params}) => {\n${this.options.indentation}${this.options.indentation}${spec.body}\n${this.options.indentation}};\n`;
    } else {
      // Regular function: function handleLogin(e) { ... }
      functionCode = `\n${this.options.indentation}${asyncKeyword}function ${spec.name}(${params}) {\n${this.options.indentation}${this.options.indentation}${spec.body}\n${this.options.indentation}}\n`;
    }
    
    this.modifications.push({
      type: 'insert',
      start: insertPosition,
      end: insertPosition,
      newCode: functionCode,
      priority: 700,
      description: `Add function ${spec.name}`
    });
    
    return this;
  }

  /**
   * Wrap existing return statement in conditional
   */
  wrapInConditional(spec: ConditionalWrapSpec): this {
    if (!this.tree) return this;
    
    // Find the function's return statement
    const functionNode = this.parser.findDefaultExportedFunction(this.tree);
    if (!functionNode) {
      console.warn('Could not find function to wrap return statement');
      return this;
    }
    
    // Find the body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn('Could not find function body');
      return this;
    }
    
    // Find the return statement
    let returnNode: Parser.SyntaxNode | null = null;
    for (const child of bodyNode.children) {
      if (child.type === 'return_statement') {
        returnNode = child;
        break;
      }
    }
    
    if (!returnNode) {
      console.warn('Could not find return statement to wrap');
      return this;
    }
    
    // Get the base indentation
    const returnLineStart = this.originalCode.lastIndexOf('\n', returnNode.startIndex - 1) + 1;
    const returnColumn = returnNode.startIndex - returnLineStart;
    const baseIndentation = ' '.repeat(returnColumn);
    
    // Build the conditional wrapper based on type
    let newCode: string;
    
    switch (spec.type) {
      case 'if-return':
        // if (!condition) return <Fallback />; 
        // return <Original />;
        if (!spec.fallback) {
          console.warn('Fallback required for if-return conditional wrap');
          return this;
        }
        newCode = `${baseIndentation}if (!${spec.condition}) {\n${baseIndentation}${this.options.indentation}return ${spec.fallback};\n${baseIndentation}}\n\n${baseIndentation}`;
        
        this.modifications.push({
          type: 'insert',
          start: returnNode.startIndex,
          end: returnNode.startIndex,
          newCode,
          priority: 550,
          description: `Add conditional before return`
        });
        break;
      
      case 'conditional-render':
        // return !condition ? <Fallback /> : <Original />;
        if (!spec.fallback) {
          console.warn('Fallback required for conditional-render');
          return this;
        }
        
        // Find the JSX being returned
        const returnKeyword = returnNode.children.find(c => c.text === 'return');
        if (!returnKeyword) {
          console.warn('Could not find return keyword');
          return this;
        }
        
        // Find the JSX expression (skip whitespace and parentheses)
        let jsxStart = returnKeyword.endIndex;
        while (jsxStart < returnNode.endIndex && (this.originalCode[jsxStart] === ' ' || this.originalCode[jsxStart] === '(' || this.originalCode[jsxStart] === '\n')) {
          jsxStart++;
        }
        
        // Find the end of JSX (before closing paren or semicolon)
        let jsxEnd = returnNode.endIndex - 1;
        while (jsxEnd > jsxStart && (this.originalCode[jsxEnd] === ';' || this.originalCode[jsxEnd] === ')' || this.originalCode[jsxEnd] === ' ' || this.originalCode[jsxEnd] === '\n')) {
          jsxEnd--;
        }
        jsxEnd++; // Include the last character
        
        const originalJSX = this.originalCode.substring(jsxStart, jsxEnd).trim();
        const wrappedJSX = `!${spec.condition} ? ${spec.fallback} : ${originalJSX}`;
        
        this.modifications.push({
          type: 'replace',
          start: jsxStart,
          end: jsxEnd,
          newCode: wrappedJSX,
          priority: 550,
          description: `Wrap return in conditional`
        });
        break;
      
      case 'ternary':
        // Same as conditional-render
        if (!spec.fallback) {
          console.warn('Fallback required for ternary');
          return this;
        }
        
        const returnKwd = returnNode.children.find(c => c.text === 'return');
        if (!returnKwd) {
          console.warn('Could not find return keyword');
          return this;
        }
        
        let jsxStartPos = returnKwd.endIndex;
        while (jsxStartPos < returnNode.endIndex && (this.originalCode[jsxStartPos] === ' ' || this.originalCode[jsxStartPos] === '(' || this.originalCode[jsxStartPos] === '\n')) {
          jsxStartPos++;
        }
        
        let jsxEndPos = returnNode.endIndex - 1;
        while (jsxEndPos > jsxStartPos && (this.originalCode[jsxEndPos] === ';' || this.originalCode[jsxEndPos] === ')' || this.originalCode[jsxEndPos] === ' ' || this.originalCode[jsxEndPos] === '\n')) {
          jsxEndPos--;
        }
        jsxEndPos++;
        
        const origJSX = this.originalCode.substring(jsxStartPos, jsxEndPos).trim();
        const wrappedJsx = `${spec.condition} ? ${origJSX} : ${spec.fallback}`;
        
        this.modifications.push({
          type: 'replace',
          start: jsxStartPos,
          end: jsxEndPos,
          newCode: wrappedJsx,
          priority: 550,
          description: `Wrap return in ternary`
        });
        break;
    }
    
    return this;
  }

  /**
   * Replace the body of an existing function
   */
  replaceFunctionBody(spec: ReplaceFunctionBodySpec): this {
    if (!this.tree) return this;
    
    // Find the function to modify
    const functionNode = this.findFunction(spec.functionName);
    if (!functionNode) {
      console.warn(`Could not find function: ${spec.functionName}`);
      return this;
    }
    
    // Find the function body
    let bodyNode = functionNode.childForFieldName('body');
    if (!bodyNode) {
      for (const child of functionNode.children) {
        if (child.type === 'statement_block') {
          bodyNode = child;
          break;
        }
      }
    }
    
    if (!bodyNode) {
      console.warn(`Could not find body for function: ${spec.functionName}`);
      return this;
    }
    
    // Find the opening and closing braces
    const openBrace = bodyNode.children.find(c => c.text === '{');
    const closeBrace = bodyNode.children.find(c => c.text === '}');
    
    if (!openBrace || !closeBrace) {
      console.warn('Could not find function braces');
      return this;
    }
    
    // Calculate indentation based on function position
    const functionLineStart = this.originalCode.lastIndexOf('\n', functionNode.startIndex - 1) + 1;
    const functionColumn = functionNode.startIndex - functionLineStart;
    const baseIndentation = ' '.repeat(functionColumn);
    
    // Build new function body with proper indentation
    const newBody = `{\n${baseIndentation}${this.options.indentation}${spec.newBody}\n${baseIndentation}}`;
    
    this.modifications.push({
      type: 'replace',
      start: bodyNode.startIndex,
      end: bodyNode.endIndex,
      newCode: newBody,
      priority: 600,
      description: `Replace body of function ${spec.functionName}`
    });
    
    return this;
  }
  
  /**
   * Delete a JSX element or other code element
   */
  deleteElement(spec: DeleteElementSpec): this {
    if (!this.tree) return this;
    
    // Find the element to delete
    const element = this.findElementToDelete(spec);
    if (!element) {
      console.warn(`Could not find element to delete: ${spec.elementType}`);
      return this;
    }
    
    // Calculate deletion range including potential surrounding whitespace
    let deleteStart = element.startIndex;
    let deleteEnd = element.endIndex;
    
    // Check for leading whitespace/newline to include in deletion
    while (deleteStart > 0 && (this.originalCode[deleteStart - 1] === ' ' || this.originalCode[deleteStart - 1] === '\t')) {
      deleteStart--;
    }
    
    // Check for leading newline
    if (deleteStart > 0 && this.originalCode[deleteStart - 1] === '\n') {
      deleteStart--;
    }
    
    // Check for trailing newline to maintain formatting
    if (deleteEnd < this.originalCode.length && this.originalCode[deleteEnd] === '\n') {
      deleteEnd++;
    }
    
    this.modifications.push({
      type: 'delete',
      start: deleteStart,
      end: deleteEnd,
      newCode: '',
      priority: 400,
      description: `Delete ${spec.elementType} element`
    });
    
    return this;
  }
  
  /**
   * Merge imports from the same source
   */
  mergeImports(spec: MergeImportsSpec): this {
    if (!this.tree) return this;
    
    const sourceImports = this.findImportsForSource(spec.source);
    if (sourceImports.length <= 1) {
      // Nothing to merge
      return this;
    }
    
    switch (spec.strategy) {
      case 'combine':
        this.combineImports(sourceImports, spec.source);
        break;
      case 'deduplicate':
        this.deduplicateImports(sourceImports, spec.source);
        break;
      case 'organize':
        this.organizeImports(sourceImports, spec.source);
        break;
    }
    
    return this;
  }
  
  /**
   * Helper method to find a function by name
   */
  private findFunction(functionName: string): Parser.SyntaxNode | null {
    if (!this.tree) return null;
    
    // Look for function declarations and arrow functions
    const query = `
      (function_declaration name: (identifier) @name (#eq? @name "${functionName}"))
      (variable_declarator name: (identifier) @name value: (arrow_function) (#eq? @name "${functionName}"))
      (variable_declarator name: (identifier) @name value: (function) (#eq? @name "${functionName}"))
    `;
    
    try {
      // Fallback: manually search the tree
      return this.searchForFunction(this.tree.rootNode, functionName);
    } catch {
      return this.searchForFunction(this.tree.rootNode, functionName);
    }
  }
  
  /**
   * Recursively search for a function by name
   */
  private searchForFunction(node: Parser.SyntaxNode, functionName: string): Parser.SyntaxNode | null {
    // Check if this is a function declaration
    if (node.type === 'function_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode && nameNode.text === functionName) {
        return node;
      }
    }
    
    // Check if this is a variable declaration with arrow function
    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name');
      const valueNode = node.childForFieldName('value');
      if (nameNode && nameNode.text === functionName && 
          valueNode && (valueNode.type === 'arrow_function' || valueNode.type === 'function')) {
        return node;
      }
    }
    
    // Recursively search children
    for (const child of node.children) {
      const result = this.searchForFunction(child, functionName);
      if (result) return result;
    }
    
    return null;
  }
  
  /**
   * Helper method to find element to delete based on spec
   */
  private findElementToDelete(spec: DeleteElementSpec): Parser.SyntaxNode | null {
    if (!this.tree) return null;
    
    return this.searchForElementToDelete(this.tree.rootNode, spec);
  }
  
  /**
   * Recursively search for element to delete
   */
  private searchForElementToDelete(node: Parser.SyntaxNode, spec: DeleteElementSpec): Parser.SyntaxNode | null {
    // Check if this node matches our criteria
    if (this.matchesElementSpec(node, spec)) {
      return node;
    }
    
    // Recursively search children
    for (const child of node.children) {
      const result = this.searchForElementToDelete(child, spec);
      if (result) return result;
    }
    
    return null;
  }
  
  /**
   * Check if a node matches the deletion spec
   */
  private matchesElementSpec(node: Parser.SyntaxNode, spec: DeleteElementSpec): boolean {
    // Check element type
    const nodeType = node.type;
    
    // For JSX elements, check if it matches the target
    if (nodeType === 'jsx_element' || nodeType === 'jsx_self_closing_element') {
      const openingElement = nodeType === 'jsx_element' ? 
        node.children.find(c => c.type === 'jsx_opening_element') : node;
      
      if (openingElement) {
        const tagName = openingElement.childForFieldName('name');
        if (tagName && tagName.text === spec.elementType) {
          // Check additional criteria if specified
          if (spec.identifier) {
            return this.hasMatchingIdentifier(node, spec.identifier);
          }
          if (spec.content) {
            return node.text.includes(spec.content);
          }
          return true;
        }
      }
    }
    
    // For other elements, check by type
    if (nodeType.includes(spec.elementType) || nodeType === spec.elementType) {
      if (spec.content) {
        return node.text.includes(spec.content);
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if element has matching identifier (className, id, etc.)
   */
  private hasMatchingIdentifier(node: Parser.SyntaxNode, identifier: string): boolean {
    // Look for className or id attributes
    for (const child of node.children) {
      if (child.type === 'jsx_opening_element' || child.type === 'jsx_self_closing_element') {
        for (const attr of child.children) {
          if (attr.type === 'jsx_attribute') {
            const attrName = attr.childForFieldName('name');
            const attrValue = attr.childForFieldName('value');
            
            if (attrName && (attrName.text === 'className' || attrName.text === 'id')) {
              if (attrValue && attrValue.text.includes(identifier)) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Find all imports for a specific source
   */
  private findImportsForSource(source: string): Parser.SyntaxNode[] {
    if (!this.tree) return [];
    
    const imports: Parser.SyntaxNode[] = [];
    const importNodes = this.parser.findImports(this.tree);
    
    for (const importNode of importNodes) {
      const importInfo = this.parser.getImportInfo(importNode);
      if (importInfo && importInfo.source === source) {
        imports.push(importNode);
      }
    }
    
    return imports;
  }
  
  /**
   * Combine multiple imports into one
   */
  private combineImports(imports: Parser.SyntaxNode[], source: string): void {
    if (imports.length <= 1) return;
    
    // Collect all import parts
    let defaultImport: string | undefined;
    let namespaceImport: string | undefined;
    const namedImports: string[] = [];
    
    for (const importNode of imports) {
      const importInfo = this.parser.getImportInfo(importNode);
      if (importInfo) {
        for (const imp of importInfo.imports) {
          if (imp.isDefault && !defaultImport) {
            defaultImport = imp.name;
          } else if (imp.isNamespace && !namespaceImport) {
            namespaceImport = imp.alias || imp.name;
          } else if (!imp.isDefault && !imp.isNamespace) {
            const importName = imp.alias ? `${imp.name} as ${imp.alias}` : imp.name;
            if (!namedImports.includes(importName)) {
              namedImports.push(importName);
            }
          }
        }
      }
    }
    
    // Generate combined import
    const combinedSpec: ImportSpec = { source };
    if (defaultImport) combinedSpec.defaultImport = defaultImport;
    if (namespaceImport) combinedSpec.namespaceImport = namespaceImport;
    if (namedImports.length > 0) combinedSpec.namedImports = namedImports;
    
    const combinedImport = this.generateImportCode(combinedSpec);
    
    // Replace first import with combined version
    this.modifications.push({
      type: 'replace',
      start: imports[0].startIndex,
      end: imports[0].endIndex,
      newCode: combinedImport,
      priority: 1000,
      description: `Combine imports from ${source}`
    });
    
    // Delete the rest
    for (let i = 1; i < imports.length; i++) {
      const importNode = imports[i];
      let deleteStart = importNode.startIndex;
      let deleteEnd = importNode.endIndex;
      
      // Include trailing newline
      if (deleteEnd < this.originalCode.length && this.originalCode[deleteEnd] === '\n') {
        deleteEnd++;
      }
      
      this.modifications.push({
        type: 'delete',
        start: deleteStart,
        end: deleteEnd,
        newCode: '',
        priority: 999,
        description: `Remove duplicate import from ${source}`
      });
    }
  }
  
  /**
   * Deduplicate imports (remove exact duplicates)
   */
  private deduplicateImports(imports: Parser.SyntaxNode[], source: string): void {
    const seen = new Set<string>();
    
    for (const importNode of imports) {
      const importText = importNode.text.trim();
      
      if (seen.has(importText)) {
        // This is a duplicate, delete it
        let deleteStart = importNode.startIndex;
        let deleteEnd = importNode.endIndex;
        
        // Include trailing newline
        if (deleteEnd < this.originalCode.length && this.originalCode[deleteEnd] === '\n') {
          deleteEnd++;
        }
        
        this.modifications.push({
          type: 'delete',
          start: deleteStart,
          end: deleteEnd,
          newCode: '',
          priority: 999,
          description: `Remove duplicate import from ${source}`
        });
      } else {
        seen.add(importText);
      }
    }
  }
  
  /**
   * Organize imports (sort and group)
   */
  private organizeImports(imports: Parser.SyntaxNode[], source: string): void {
    // For now, just combine them in a logical order
    this.combineImports(imports, source);
  }

  /**
   * Get position info for a node
   */
  getNodePosition(node: Parser.SyntaxNode): NodePosition {
    return {
      start: node.startIndex,
      end: node.endIndex,
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1
    };
  }

  /**
   * Apply all modifications and generate new code
   *
   * Position tracking strategy:
   * - Sort by position descending (higher positions first)
   * - This way, modifications at lower positions aren't affected by higher ones
   * - For same-position modifications, track cumulative offset to adjust positions
   */
  async generate(): Promise<ModificationResult> {
    try {
      // Sort modifications: POSITION FIRST (reverse), then priority, then type
      // This ensures we apply from end to start, avoiding position shifts
      const sortedMods = [...this.modifications].sort((a, b) => {
        // First by position (later first, so we can apply without position shifts)
        if (b.start !== a.start) {
          return b.start - a.start;
        }

        // Then by priority (higher first) as tiebreaker for same position
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }

        // Finally: stable sort by type to ensure consistent ordering
        // Prefer: insert < replace < delete
        const typeOrder = { insert: 0, replace: 1, delete: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      // Apply modifications with position offset tracking
      // Track offsets for modifications at each position to handle same-position mods
      let modifiedCode = this.originalCode;

      // Track cumulative offset for each original start position
      // Key: original start position, Value: cumulative offset from previous same-position mods
      const samePositionOffsets: Map<number, number> = new Map();

      // Also track all applied modifications to detect and handle overlapping ranges
      const appliedRanges: Array<{ start: number; end: number; offset: number }> = [];

      for (const mod of sortedMods) {
        // Calculate adjusted positions
        // 1. Check for same-position modifications (most common case)
        let adjustedStart = mod.start;
        let adjustedEnd = mod.end;

        // Apply offset from previous same-position modifications
        const samePositionOffset = samePositionOffsets.get(mod.start) || 0;
        adjustedStart += samePositionOffset;
        adjustedEnd += samePositionOffset;

        // 2. Check for overlapping modifications (edge case - log warning)
        for (const applied of appliedRanges) {
          // If this modification's original range overlaps with a previously applied one
          if (mod.start < applied.end && mod.end > applied.start) {
            console.warn(
              `[ASTModifier] Overlapping modifications detected: ` +
              `current [${mod.start}-${mod.end}] overlaps with applied [${applied.start}-${applied.end}]. ` +
              `Results may be unexpected. Description: ${mod.description || 'none'}`
            );
          }
        }

        // Create adjusted modification
        const adjustedMod: Modification = {
          ...mod,
          start: adjustedStart,
          end: adjustedEnd
        };

        // Calculate the offset this modification creates
        let offsetDelta = 0;
        switch (mod.type) {
          case 'insert':
            offsetDelta = mod.newCode.length;
            break;
          case 'replace':
            offsetDelta = mod.newCode.length - (mod.end - mod.start);
            break;
          case 'delete':
            offsetDelta = -(mod.end - mod.start);
            break;
        }

        // Update offset for this position (for subsequent same-position mods)
        samePositionOffsets.set(mod.start, samePositionOffset + offsetDelta);

        // Track this modification's range for overlap detection
        appliedRanges.push({
          start: mod.start,
          end: mod.end,
          offset: offsetDelta
        });

        modifiedCode = this.applyModification(modifiedCode, adjustedMod);
      }

      // Validate if requested
      if (this.options.validateAfter) {
        const validationResult = await this.validate(modifiedCode);
        if (!validationResult.success) {
          return validationResult;
        }
      }

      return {
        success: true,
        code: modifiedCode
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Apply a single modification to code
   */
  private applyModification(code: string, mod: Modification): string {
    // Validate positions
    if (mod.start < 0 || mod.start > code.length) {
      throw new Error(
        `Invalid modification start position ${mod.start} (code length: ${code.length}). ` +
        `Description: ${mod.description || 'none'}`
      );
    }
    
    if (mod.end < 0 || mod.end > code.length) {
      throw new Error(
        `Invalid modification end position ${mod.end} (code length: ${code.length}). ` +
        `Description: ${mod.description || 'none'}`
      );
    }
    
    if (mod.end < mod.start) {
      throw new Error(
        `Invalid modification: end position (${mod.end}) is before start position (${mod.start}). ` +
        `Description: ${mod.description || 'none'}`
      );
    }
    
    switch (mod.type) {
      case 'insert':
        return code.substring(0, mod.start) + mod.newCode + code.substring(mod.start);
      
      case 'replace':
        return code.substring(0, mod.start) + mod.newCode + code.substring(mod.end);
      
      case 'delete':
        return code.substring(0, mod.start) + code.substring(mod.end);
      
      default:
        return code;
    }
  }

  /**
   * Validate the modified code
   */
  private async validate(code: string): Promise<ModificationResult> {
    try {
      const tree = await this.parser.parse(code);
      
      if (!tree) {
        return {
          success: false,
          errors: ['Failed to parse modified code']
        };
      }
      
      if (this.parser.hasErrors(tree)) {
        const errors = this.parser.getErrors(tree);
        return {
          success: false,
          errors: errors.map(e => `Syntax error at ${e.line}:${e.column}: ${e.text}`)
        };
      }
      
      return {
        success: true,
        code
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Validation error']
      };
    }
  }

  /**
   * Get the current tree (useful for finding elements)
   */
  getTree(): Parser.Tree | null {
    return this.tree;
  }

  /**
   * Get the parser (useful for finding elements)
   */
  getParser(): CodeParser {
    return this.parser;
  }

  /**
   * Reset all modifications
   */
  reset(): void {
    this.modifications = [];
    this.imports.clear();
    this.scheduledImportUpdates.clear();
    this.tree = null;
    this.extractExistingImports();
  }
}

/**
 * Convenience function to modify code
 */
export async function modifyCode(
  code: string,
  modifications: (modifier: ASTModifier) => void | Promise<void>,
  options?: ASTModifierOptions
): Promise<ModificationResult> {
  const modifier = new ASTModifier(code, options);
  await modifier.initialize();
  await modifications(modifier);
  return await modifier.generate();
}
