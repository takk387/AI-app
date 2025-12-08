/**
 * CodeParser - AST-based code analysis using TypeScript Compiler API
 * Extracts semantic information from TypeScript/TSX files for intelligent context selection
 */

import * as ts from 'typescript';
import { hashSync } from '../utils/hashUtils';
import {
  FileAnalysis,
  FileType,
  ExportInfo,
  ImportInfo,
  ImportedSymbol,
  ComponentInfo,
  PropInfo,
  HookInfo,
  TypeInfo,
  APIEndpointInfo,
  CodeParserConfig,
  DEFAULT_CODE_PARSER_CONFIG,
  FILE_TYPE_IMPORTANCE,
} from '../types/codeContext';
import { countTokens } from '../utils/tokenizer';

// ============================================================================
// CODE PARSER CLASS
// ============================================================================

export class CodeParser {
  private config: CodeParserConfig;
  private compilerOptions: ts.CompilerOptions;

  constructor(config: Partial<CodeParserConfig> = {}) {
    this.config = { ...DEFAULT_CODE_PARSER_CONFIG, ...config };
    this.compilerOptions = {
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
    };
  }

  // ==========================================================================
  // MAIN ANALYSIS METHOD
  // ==========================================================================

  /**
   * Analyze a TypeScript/TSX file and extract semantic information
   */
  analyzeFile(path: string, content: string): FileAnalysis {
    const hash = this.hashContent(content);
    const sourceFile = this.createSourceFile(path, content);

    const exports: ExportInfo[] = [];
    const imports: ImportInfo[] = [];
    const components: ComponentInfo[] = [];
    const hooks: HookInfo[] = [];
    const types: TypeInfo[] = [];
    const apiEndpoints: APIEndpointInfo[] = [];

    // Walk the AST
    const visit = (node: ts.Node) => {
      // Extract imports
      if (ts.isImportDeclaration(node)) {
        imports.push(this.extractImport(node, sourceFile));
      }

      // Extract exports
      if (ts.isExportDeclaration(node)) {
        exports.push(...this.extractExportDeclaration(node, sourceFile));
      }
      if (ts.isExportAssignment(node)) {
        exports.push(this.extractExportAssignment(node, sourceFile));
      }

      // Check for exported declarations
      if (this.hasExportModifier(node)) {
        const extracted = this.extractExportedDeclaration(node, sourceFile);
        if (extracted) {
          exports.push(extracted);
        }
      }

      // Detect React components
      if (this.isReactComponent(node, sourceFile)) {
        const component = this.extractComponent(node, sourceFile);
        if (component) {
          components.push(component);
        }
      }

      // Detect custom hooks
      if (this.isCustomHook(node)) {
        const hook = this.extractHook(node, sourceFile);
        if (hook) {
          hooks.push(hook);
        }
      }

      // Extract type definitions
      if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        types.push(this.extractType(node, sourceFile));
      }

      // Detect API endpoints (Next.js route handlers)
      if (this.isAPIHandler(node, path)) {
        apiEndpoints.push(...this.extractAPIEndpoints(node, path, sourceFile));
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Calculate derived values
    const fileType = this.classifyFileType(path, exports, components, apiEndpoints, hooks);
    const tokenCount = countTokens(content);
    const importanceScore = this.calculateImportance(path, fileType, exports, components, types);
    const summary = this.generateSummary(path, exports, components, types, apiEndpoints, hooks);

    return {
      path,
      hash,
      type: fileType,
      exports,
      imports,
      dependencies: imports
        .filter((i) => !i.isExternal && i.resolvedPath)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map((i) => i.resolvedPath!),
      dependents: [], // Filled in by DependencyGraphBuilder
      components,
      hooks,
      types,
      apiEndpoints,
      tokenCount,
      importanceScore,
      lastModified: Date.now(),
      summary,
    };
  }

  // ==========================================================================
  // IMPORT EXTRACTION
  // ==========================================================================

  private extractImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo {
    const moduleSpecifier = node.moduleSpecifier;
    const source = ts.isStringLiteral(moduleSpecifier)
      ? moduleSpecifier.text
      : moduleSpecifier.getText(sourceFile);

    const isExternal = !source.startsWith('.') && !source.startsWith('/');
    const isTypeOnly = node.importClause?.isTypeOnly ?? false;
    const importedSymbols: ImportedSymbol[] = [];

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        importedSymbols.push({
          name: node.importClause.name.text,
          isDefault: true,
          isNamespace: false,
        });
      }

      // Named imports or namespace import
      if (node.importClause.namedBindings) {
        if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          importedSymbols.push({
            name: node.importClause.namedBindings.name.text,
            isDefault: false,
            isNamespace: true,
          });
        } else if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            importedSymbols.push({
              name: element.propertyName?.text ?? element.name.text,
              alias: element.propertyName ? element.name.text : undefined,
              isDefault: false,
              isNamespace: false,
            });
          }
        }
      }
    }

    return {
      source,
      resolvedPath: isExternal ? undefined : this.resolveImportPath(source),
      isExternal,
      isTypeOnly,
      imports: importedSymbols,
    };
  }

  // ==========================================================================
  // EXPORT EXTRACTION
  // ==========================================================================

  private extractExportDeclaration(
    node: ts.ExportDeclaration,
    sourceFile: ts.SourceFile
  ): ExportInfo[] {
    const exports: ExportInfo[] = [];

    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        exports.push({
          name: element.name.text,
          kind: 'const', // Can't determine type from export statement alone
          isDefault: false,
          isAsync: false,
          line: sourceFile.getLineAndCharacterOfPosition(element.getStart()).line + 1,
        });
      }
    }

    return exports;
  }

  private extractExportAssignment(
    node: ts.ExportAssignment,
    sourceFile: ts.SourceFile
  ): ExportInfo {
    return {
      name: 'default',
      kind: 'default',
      isDefault: true,
      isAsync: false,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }

  private extractExportedDeclaration(node: ts.Node, sourceFile: ts.SourceFile): ExportInfo | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return {
        name: node.name.text,
        kind: 'function',
        isDefault: this.hasDefaultModifier(node),
        isAsync: this.hasAsyncModifier(node),
        signature: this.getFunctionSignature(node, sourceFile),
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      };
    }

    if (ts.isClassDeclaration(node) && node.name) {
      return {
        name: node.name.text,
        kind: 'class',
        isDefault: this.hasDefaultModifier(node),
        isAsync: false,
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      };
    }

    if (ts.isVariableStatement(node)) {
      const declarations = node.declarationList.declarations;
      if (declarations.length > 0) {
        const decl = declarations[0];
        if (ts.isIdentifier(decl.name)) {
          const isAsync =
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
              ? this.hasAsyncModifier(decl.initializer as ts.FunctionLikeDeclaration)
              : false;

          return {
            name: decl.name.text,
            kind: node.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let',
            isDefault: false,
            isAsync,
            signature: this.getVariableSignature(decl, sourceFile),
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          };
        }
      }
    }

    if (ts.isInterfaceDeclaration(node)) {
      return {
        name: node.name.text,
        kind: 'interface',
        isDefault: false,
        isAsync: false,
        typeSignature: node.getText(sourceFile),
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      };
    }

    if (ts.isTypeAliasDeclaration(node)) {
      return {
        name: node.name.text,
        kind: 'type',
        isDefault: false,
        isAsync: false,
        typeSignature: node.getText(sourceFile),
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      };
    }

    if (ts.isEnumDeclaration(node)) {
      return {
        name: node.name.text,
        kind: 'enum',
        isDefault: false,
        isAsync: false,
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
      };
    }

    return null;
  }

  // ==========================================================================
  // COMPONENT DETECTION & EXTRACTION
  // ==========================================================================

  private isReactComponent(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    // Function component (function declaration)
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      if (this.isComponentName(name) && this.returnsJSX(node, sourceFile)) {
        return true;
      }
    }

    // Arrow function component (variable declaration)
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && this.isComponentName(decl.name.text)) {
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
          ) {
            if (this.returnsJSX(decl.initializer, sourceFile)) {
              return true;
            }
          }
          // React.memo, React.forwardRef wrappers
          if (decl.initializer && ts.isCallExpression(decl.initializer)) {
            const callText = decl.initializer.expression.getText(sourceFile);
            if (
              callText.includes('memo') ||
              callText.includes('forwardRef') ||
              callText.includes('React.memo') ||
              callText.includes('React.forwardRef')
            ) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private extractComponent(node: ts.Node, sourceFile: ts.SourceFile): ComponentInfo | null {
    let name = '';
    let func: ts.FunctionLikeDeclaration | null = null;
    let hasForwardRef = false;
    let hasMemo = false;

    if (ts.isFunctionDeclaration(node) && node.name) {
      name = node.name.text;
      func = node;
    } else if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (ts.isIdentifier(decl.name)) {
        name = decl.name.text;

        if (
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          func = decl.initializer;
        } else if (decl.initializer && ts.isCallExpression(decl.initializer)) {
          const callText = decl.initializer.expression.getText(sourceFile);
          hasForwardRef = callText.includes('forwardRef');
          hasMemo = callText.includes('memo');

          // Get the inner function
          if (decl.initializer.arguments.length > 0) {
            const arg = decl.initializer.arguments[0];
            if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
              func = arg;
            }
          }
        }
      }
    }

    if (!name) return null;

    const props = func ? this.extractComponentProps(func, sourceFile) : [];
    const hooks = func ? this.findHooksUsed(func, sourceFile) : [];
    const childComponents = func ? this.findChildComponents(func, sourceFile) : [];

    return {
      name,
      isDefault: this.hasExportModifier(node) && this.hasDefaultModifier(node),
      isFunctionComponent: true,
      isClassComponent: false,
      props,
      hooks,
      childComponents,
      hasForwardRef,
      hasMemo,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }

  private extractComponentProps(
    func: ts.FunctionLikeDeclaration,
    sourceFile: ts.SourceFile
  ): PropInfo[] {
    const props: PropInfo[] = [];

    if (func.parameters.length > 0) {
      const propsParam = func.parameters[0];

      // Destructured props
      if (ts.isObjectBindingPattern(propsParam.name)) {
        for (const element of propsParam.name.elements) {
          if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
            props.push({
              name: element.name.text,
              type: element.propertyName
                ? element.propertyName.getText(sourceFile)
                : element.name.text,
              required: !element.initializer,
              defaultValue: element.initializer?.getText(sourceFile),
            });
          }
        }
      }
      // Type annotation on props parameter
      else if (propsParam.type && ts.isTypeLiteralNode(propsParam.type)) {
        for (const member of propsParam.type.members) {
          if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
            props.push({
              name: member.name.text,
              type: member.type?.getText(sourceFile) ?? 'any',
              required: !member.questionToken,
            });
          }
        }
      }
    }

    return props;
  }

  // ==========================================================================
  // HOOK DETECTION & EXTRACTION
  // ==========================================================================

  private isCustomHook(node: ts.Node): boolean {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text.startsWith('use') && node.name.text.length > 3;
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          if (name.startsWith('use') && name.length > 3) {
            if (
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
            ) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private extractHook(node: ts.Node, sourceFile: ts.SourceFile): HookInfo | null {
    let name = '';
    let func: ts.FunctionLikeDeclaration | null = null;

    if (ts.isFunctionDeclaration(node) && node.name) {
      name = node.name.text;
      func = node;
    } else if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (
        ts.isIdentifier(decl.name) &&
        decl.initializer &&
        (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
      ) {
        name = decl.name.text;
        func = decl.initializer;
      }
    }

    if (!name || !func) return null;

    const parameters = func.parameters.map((p) => p.getText(sourceFile));
    const returnType = func.type?.getText(sourceFile);
    const dependencies = this.findHookDependencies(func, sourceFile);

    return {
      name,
      isCustom: true,
      parameters,
      returnType,
      dependencies,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }

  private findHooksUsed(func: ts.FunctionLikeDeclaration, sourceFile: ts.SourceFile): string[] {
    const hooks: Set<string> = new Set();

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(sourceFile);
        if (callee.startsWith('use') || callee.startsWith('React.use')) {
          hooks.add(callee.replace('React.', ''));
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(func);
    return Array.from(hooks);
  }

  private findHookDependencies(
    func: ts.FunctionLikeDeclaration,
    sourceFile: ts.SourceFile
  ): string[] {
    const deps: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(sourceFile);
        if (
          callee === 'useEffect' ||
          callee === 'useMemo' ||
          callee === 'useCallback' ||
          callee === 'useLayoutEffect'
        ) {
          // Find the dependency array (usually the second argument)
          if (node.arguments.length >= 2) {
            const depsArg = node.arguments[1];
            if (ts.isArrayLiteralExpression(depsArg)) {
              for (const element of depsArg.elements) {
                deps.push(element.getText(sourceFile));
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(func);
    return deps;
  }

  // ==========================================================================
  // TYPE EXTRACTION
  // ==========================================================================

  private extractType(
    node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration,
    sourceFile: ts.SourceFile
  ): TypeInfo {
    const definition = node.getText(sourceFile);
    const tokenCount = countTokens(definition);
    let extends_: string[] | undefined;

    if (ts.isInterfaceDeclaration(node) && node.heritageClauses) {
      extends_ = node.heritageClauses
        .filter((c) => c.token === ts.SyntaxKind.ExtendsKeyword)
        .flatMap((c) => c.types.map((t) => t.getText(sourceFile)));
    }

    return {
      name: node.name.text,
      kind: ts.isInterfaceDeclaration(node)
        ? 'interface'
        : ts.isEnumDeclaration(node)
          ? 'enum'
          : 'type',
      exported: this.hasExportModifier(node),
      definition,
      tokenCount,
      extends: extends_,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }

  // ==========================================================================
  // API ENDPOINT DETECTION
  // ==========================================================================

  private isAPIHandler(node: ts.Node, path: string): boolean {
    // Next.js API routes are in /api/ directory
    if (!path.includes('/api/') && !path.includes('\\api\\')) {
      return false;
    }

    // Look for exported GET, POST, PUT, DELETE, PATCH functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(name);
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(name)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private extractAPIEndpoints(
    node: ts.Node,
    path: string,
    sourceFile: ts.SourceFile
  ): APIEndpointInfo[] {
    const endpoints: APIEndpointInfo[] = [];
    const routePath = this.extractRoutePath(path);

    const addEndpoint = (method: string, funcNode: ts.Node) => {
      const hasAuth = this.detectAuthCheck(funcNode, sourceFile);
      const { requestType, responseType } = this.extractAPITypes(funcNode, sourceFile);

      endpoints.push({
        method: method as APIEndpointInfo['method'],
        path: routePath,
        hasAuth,
        requestType,
        responseType,
        line: sourceFile.getLineAndCharacterOfPosition(funcNode.getStart()).line + 1,
      });
    };

    if (ts.isFunctionDeclaration(node) && node.name) {
      addEndpoint(node.name.text, node);
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          addEndpoint(decl.name.text, node);
        }
      }
    }

    return endpoints;
  }

  private extractRoutePath(filePath: string): string {
    // Convert file path to API route path
    // e.g., src/app/api/users/[id]/route.ts -> /api/users/[id]
    const match = filePath.match(/[/\\]api[/\\](.+)[/\\]route\.(ts|js)$/);
    if (match) {
      return '/api/' + match[1].replace(/\\/g, '/');
    }
    return filePath;
  }

  private detectAuthCheck(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    const text = node.getText(sourceFile).toLowerCase();
    return (
      text.includes('auth') ||
      text.includes('session') ||
      text.includes('token') ||
      text.includes('unauthorized') ||
      text.includes('401')
    );
  }

  private extractAPITypes(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): { requestType?: string; responseType?: string } {
    // This is a simplified extraction - could be enhanced
    const text = node.getText(sourceFile);
    let requestType: string | undefined;
    let responseType: string | undefined;

    // Look for type assertions or explicit types
    const requestMatch = text.match(/request\.json\(\)\s*as\s+(\w+)/);
    if (requestMatch) {
      requestType = requestMatch[1];
    }

    const responseMatch = text.match(/NextResponse\.json<(\w+)>/);
    if (responseMatch) {
      responseType = responseMatch[1];
    }

    return { requestType, responseType };
  }

  // ==========================================================================
  // FILE CLASSIFICATION
  // ==========================================================================

  private classifyFileType(
    path: string,
    exports: ExportInfo[],
    components: ComponentInfo[],
    apiEndpoints: APIEndpointInfo[],
    hooks: HookInfo[]
  ): FileType {
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();

    // Test files
    if (
      normalizedPath.includes('.test.') ||
      normalizedPath.includes('.spec.') ||
      normalizedPath.includes('/__tests__/')
    ) {
      return 'test';
    }

    // API routes
    if (apiEndpoints.length > 0) {
      return 'api-route';
    }

    // Type definitions
    if (
      normalizedPath.includes('/types/') ||
      normalizedPath.endsWith('.d.ts') ||
      exports.every((e) => e.kind === 'type' || e.kind === 'interface')
    ) {
      return 'type-definition';
    }

    // Hooks
    if (hooks.length > 0 || normalizedPath.includes('/hooks/')) {
      return 'hook';
    }

    // Context providers
    if (
      normalizedPath.includes('/context') ||
      normalizedPath.includes('provider') ||
      exports.some((e) => e.name.includes('Provider') || e.name.includes('Context'))
    ) {
      return 'context-provider';
    }

    // Pages
    if (
      normalizedPath.includes('/pages/') ||
      (normalizedPath.includes('/app/') && normalizedPath.includes('page.'))
    ) {
      return 'page';
    }

    // Layouts
    if (normalizedPath.includes('layout.')) {
      return 'layout';
    }

    // Components
    if (components.length > 0 || normalizedPath.includes('/components/')) {
      return 'component';
    }

    // Utilities
    if (
      normalizedPath.includes('/utils/') ||
      normalizedPath.includes('/lib/') ||
      normalizedPath.includes('/helpers/')
    ) {
      return 'utility';
    }

    // Styles
    if (
      normalizedPath.endsWith('.css') ||
      normalizedPath.endsWith('.scss') ||
      normalizedPath.includes('styles')
    ) {
      return 'style';
    }

    // Config
    if (
      normalizedPath.includes('config') ||
      normalizedPath.includes('.config.') ||
      normalizedPath.endsWith('rc.ts') ||
      normalizedPath.endsWith('rc.js')
    ) {
      return 'config';
    }

    return 'other';
  }

  // ==========================================================================
  // IMPORTANCE SCORING
  // ==========================================================================

  private calculateImportance(
    path: string,
    fileType: FileType,
    exports: ExportInfo[],
    components: ComponentInfo[],
    types: TypeInfo[]
  ): number {
    let score = FILE_TYPE_IMPORTANCE[fileType] ?? 0.4;

    // Boost for many exports (more reusable)
    if (exports.length > 5) {
      score += 0.1;
    }

    // Boost for types (highly reusable)
    if (types.length > 3) {
      score += 0.1;
    }

    // Boost for context providers
    if (exports.some((e) => e.name.includes('Provider') || e.name.includes('Context'))) {
      score += 0.15;
    }

    // Boost for index files (re-export hubs)
    if (path.includes('index.')) {
      score += 0.1;
    }

    // Reduce for large component files (likely less reusable)
    if (components.length > 3) {
      score -= 0.05;
    }

    return Math.max(0, Math.min(1, score));
  }

  // ==========================================================================
  // SUMMARY GENERATION
  // ==========================================================================

  private generateSummary(
    path: string,
    exports: ExportInfo[],
    components: ComponentInfo[],
    types: TypeInfo[],
    apiEndpoints: APIEndpointInfo[],
    hooks: HookInfo[]
  ): string {
    const parts: string[] = [];
    const fileName = path.split(/[/\\]/).pop() ?? path;

    if (components.length > 0) {
      const names = components.map((c) => c.name).slice(0, 3);
      parts.push(`Components: ${names.join(', ')}${components.length > 3 ? '...' : ''}`);
    }

    if (types.length > 0) {
      const names = types.map((t) => t.name).slice(0, 3);
      parts.push(`Types: ${names.join(', ')}${types.length > 3 ? '...' : ''}`);
    }

    if (apiEndpoints.length > 0) {
      const endpoints = apiEndpoints.map((e) => `${e.method} ${e.path}`).slice(0, 2);
      parts.push(`API: ${endpoints.join(', ')}${apiEndpoints.length > 2 ? '...' : ''}`);
    }

    if (hooks.length > 0) {
      const names = hooks.map((h) => h.name).slice(0, 3);
      parts.push(`Hooks: ${names.join(', ')}${hooks.length > 3 ? '...' : ''}`);
    }

    // Add remaining exports not covered above
    const coveredNames = new Set([
      ...components.map((c) => c.name),
      ...types.map((t) => t.name),
      ...hooks.map((h) => h.name),
    ]);

    const otherExports = exports
      .filter((e) => !coveredNames.has(e.name) && e.name !== 'default')
      .slice(0, 3);

    if (otherExports.length > 0) {
      parts.push(`Exports: ${otherExports.map((e) => e.name).join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' | ') : fileName;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private createSourceFile(path: string, content: string): ts.SourceFile {
    return ts.createSourceFile(
      path,
      content,
      ts.ScriptTarget.ESNext,
      true,
      this.getScriptKind(path)
    );
  }

  private getScriptKind(path: string): ts.ScriptKind {
    if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
    if (path.endsWith('.ts')) return ts.ScriptKind.TS;
    if (path.endsWith('.jsx')) return ts.ScriptKind.JSX;
    if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
      return ts.ScriptKind.JS;
    }
    return ts.ScriptKind.Unknown;
  }

  private hasExportModifier(node: ts.Node): boolean {
    if (!ts.canHaveModifiers(node)) return false;
    const modifiers = ts.getModifiers(node);
    return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }

  private hasDefaultModifier(node: ts.Node): boolean {
    if (!ts.canHaveModifiers(node)) return false;
    const modifiers = ts.getModifiers(node);
    return modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
  }

  private hasAsyncModifier(node: ts.FunctionLikeDeclaration): boolean {
    const modifiers = ts.getModifiers(node);
    return modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
  }

  private isComponentName(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  private returnsJSX(
    node: ts.FunctionLikeDeclaration | ts.ArrowFunction
  ): boolean {
    let hasJSX = false;

    const visit = (n: ts.Node) => {
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
        hasJSX = true;
        return;
      }
      if (!hasJSX) {
        ts.forEachChild(n, visit);
      }
    };

    visit(node);
    return hasJSX;
  }

  private findChildComponents(
    func: ts.FunctionLikeDeclaration,
    sourceFile: ts.SourceFile
  ): string[] {
    const children: Set<string> = new Set();

    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        if (this.isComponentName(tagName)) {
          children.add(tagName);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(func);
    return Array.from(children);
  }

  private getFunctionSignature(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): string {
    const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
    const returnType = node.type?.getText(sourceFile) ?? 'void';
    return `(${params}) => ${returnType}`;
  }

  private getVariableSignature(
    node: ts.VariableDeclaration,
    sourceFile: ts.SourceFile
  ): string | undefined {
    if (!node.initializer) return undefined;

    if (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) {
      const params = node.initializer.parameters.map((p) => p.getText(sourceFile)).join(', ');
      const returnType = node.initializer.type?.getText(sourceFile) ?? 'unknown';
      return `(${params}) => ${returnType}`;
    }

    return undefined;
  }

  private resolveImportPath(importPath: string): string | undefined {
    // Simplified resolution - in real implementation would use proper path resolution
    if (importPath.startsWith('.')) {
      return importPath;
    }
    return undefined;
  }

  private hashContent(content: string): string {
    return hashSync(content);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let parserInstance: CodeParser | null = null;

export function getCodeParser(config?: Partial<CodeParserConfig>): CodeParser {
  if (!parserInstance || config) {
    parserInstance = new CodeParser(config);
  }
  return parserInstance;
}
