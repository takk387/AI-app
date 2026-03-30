/**
 * CodeParser - AST-based code analysis using TypeScript Compiler API
 * Extracts semantic information from TypeScript/TSX files for intelligent context selection
 */

import * as ts from 'typescript';
import {
  FileAnalysis,
  ExportInfo,
  ImportInfo,
  ComponentInfo,
  HookInfo,
  TypeInfo,
  APIEndpointInfo,
  CodeParserConfig,
  DEFAULT_CODE_PARSER_CONFIG,
} from '../../types/codeContext';
import { countTokens } from '../../utils/tokenizer';
import { createSourceFile, getScriptKind, hasExportModifier, hashContent } from './parserHelpers';
import {
  extractImport,
  extractExportDeclaration,
  extractExportAssignment,
  extractExportedDeclaration,
} from './importExportExtractor';
import { isReactComponent, extractComponent } from './componentExtractor';
import { isCustomHook, extractHook } from './hookExtractor';
import { isAPIHandler, extractAPIEndpoints, extractType } from './apiExtractor';
import { classifyFileType, calculateImportance, generateSummary } from './fileClassifier';

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
  // FILE EXCLUSION
  // ==========================================================================

  /**
   * Patterns for files that should be excluded from analysis
   * These files add noise without providing useful context
   */
  private static readonly EXCLUDED_PATTERNS = [
    /\.test\.(ts|tsx|js|jsx)$/,
    /\.spec\.(ts|tsx|js|jsx)$/,
    /\.stories\.(ts|tsx|js|jsx)$/,
    /__tests__\//,
    /__mocks__\//,
    /\.mock\.(ts|tsx|js|jsx)$/,
    /\.e2e\.(ts|tsx|js|jsx)$/,
    /\.snapshot$/,
    /node_modules\//,
    /\.d\.ts$/, // Declaration files (usually generated)
    /\.min\.(js|css)$/,
  ];

  /**
   * Check if a file should be analyzed based on exclusion patterns
   * @param path File path to check
   * @returns true if file should be analyzed, false if excluded
   */
  shouldAnalyze(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, '/');
    return !CodeParser.EXCLUDED_PATTERNS.some((pattern) => pattern.test(normalizedPath));
  }

  // ==========================================================================
  // MAIN ANALYSIS METHOD
  // ==========================================================================

  /**
   * Analyze a TypeScript/TSX file and extract semantic information
   */
  analyzeFile(path: string, content: string): FileAnalysis {
    const hash = hashContent(content);
    const sourceFile = createSourceFile(path, content, getScriptKind(path));

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
        imports.push(extractImport(node, sourceFile));
      }

      // Extract exports
      if (ts.isExportDeclaration(node)) {
        exports.push(...extractExportDeclaration(node, sourceFile));
      }
      if (ts.isExportAssignment(node)) {
        exports.push(extractExportAssignment(node, sourceFile));
      }

      // Check for exported declarations
      if (hasExportModifier(node)) {
        const extracted = extractExportedDeclaration(node, sourceFile);
        if (extracted) {
          exports.push(extracted);
        }
      }

      // Detect React components
      if (isReactComponent(node, sourceFile)) {
        const component = extractComponent(node, sourceFile);
        if (component) {
          components.push(component);
        }
      }

      // Detect custom hooks
      if (isCustomHook(node)) {
        const hook = extractHook(node, sourceFile);
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
        types.push(extractType(node, sourceFile));
      }

      // Detect API endpoints (Next.js route handlers)
      if (isAPIHandler(node, path)) {
        apiEndpoints.push(...extractAPIEndpoints(node, path, sourceFile));
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Calculate derived values
    const fileType = classifyFileType(path, exports, components, apiEndpoints, hooks);
    const tokenCount = countTokens(content);
    const importanceScore = calculateImportance(path, fileType, exports, components, types);
    const summary = generateSummary(path, exports, components, types, apiEndpoints, hooks);

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
