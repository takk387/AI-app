/**
 * File Analyzer
 *
 * Analyzes generated files to extract rich metadata including
 * file types, exports, imports, API contracts, and coding patterns.
 * Used by PhaseExecutionManager for inter-phase tracking.
 */

import type { ImportInfo } from '@/types/dynamicPhases';

// ============================================================================
// MAIN ANALYSIS ENTRY POINT
// ============================================================================

/**
 * Analyze generated files to extract rich metadata
 * Returns AccumulatedFile and APIContract data for tracking
 */
export function analyzeGeneratedFiles(files: Array<{ path: string; content: string }>): {
  accumulatedFiles: Array<{
    path: string;
    type: 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other';
    exports: string[];
    dependencies: string[];
    summary: string;
    imports: ImportInfo[];
  }>;
  apiContracts: Array<{
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    requestSchema?: string;
    responseSchema?: string;
    authentication: boolean;
  }>;
  establishedPatterns: string[];
} {
  const accumulatedFiles: Array<{
    path: string;
    type: 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other';
    exports: string[];
    dependencies: string[];
    summary: string;
    imports: ImportInfo[];
  }> = [];
  const apiContracts: Array<{
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    requestSchema?: string;
    responseSchema?: string;
    authentication: boolean;
  }> = [];
  const patterns = new Set<string>();

  for (const file of files) {
    // Classify file type
    const type = classifyFileType(file.path, file.content);

    // Extract exports
    const exports = extractExports(file.content);

    // Extract imports/dependencies
    const dependencies = extractImports(file.content);

    // Extract rich imports for validation (P2)
    const imports = extractImportsRich(file.content);

    // Generate summary
    const summary = generateFileSummary(file);

    accumulatedFiles.push({
      path: file.path,
      type,
      exports,
      dependencies,
      summary,
      imports,
    });

    // Extract API contracts if it's an API route
    if (type === 'api') {
      const contracts = extractAPIContracts(file);
      apiContracts.push(...contracts);
    }

    // Detect patterns used
    const detectedPatterns = detectPatterns(file.content);
    detectedPatterns.forEach((p) => patterns.add(p));
  }

  return {
    accumulatedFiles,
    apiContracts,
    establishedPatterns: Array.from(patterns),
  };
}

// ============================================================================
// FILE TYPE CLASSIFICATION
// ============================================================================

/**
 * Classify file type based on path and content
 */
export function classifyFileType(
  path: string,
  content: string
): 'component' | 'api' | 'type' | 'util' | 'style' | 'config' | 'other' {
  const lowerPath = path.toLowerCase();

  if (lowerPath.includes('/api/') || lowerPath.includes('route.ts')) {
    return 'api';
  }
  if (lowerPath.includes('/types/') || lowerPath.endsWith('.d.ts')) {
    return 'type';
  }
  if (
    lowerPath.includes('/utils/') ||
    lowerPath.includes('/lib/') ||
    lowerPath.includes('/helpers/')
  ) {
    return 'util';
  }
  if (
    lowerPath.includes('/components/') ||
    (content.includes('export default function') && content.includes('return ('))
  ) {
    return 'component';
  }
  if (
    lowerPath.endsWith('.css') ||
    lowerPath.endsWith('.scss') ||
    lowerPath.includes('/styles/')
  ) {
    return 'style';
  }
  if (lowerPath.includes('.config.') || lowerPath.includes('/config/')) {
    return 'config';
  }

  return 'other';
}

// ============================================================================
// EXPORT EXTRACTION
// ============================================================================

/**
 * Extract exported items from file content
 */
export function extractExports(content: string): string[] {
  const exports: string[] = [];

  // Named exports: export const/function/class/interface/type
  const namedExportRegex = /export\s+(?:const|let|function|class|interface|type)\s+(\w+)/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  // Default export with name
  const defaultExportRegex = /export\s+default\s+(?:function|class)\s+(\w+)/;
  const defaultMatch = content.match(defaultExportRegex);
  if (defaultMatch) {
    exports.push(`default:${defaultMatch[1]}`);
  }

  // Export { ... }
  const bracedExportRegex = /export\s*\{\s*([^}]+)\s*\}/g;
  while ((match = bracedExportRegex.exec(content)) !== null) {
    const items = match[1].split(',').map((s) =>
      s
        .trim()
        .split(/\s+as\s+/)[0]
        .trim()
    );
    exports.push(...items.filter(Boolean));
  }

  return [...new Set(exports)].slice(0, 20);
}

// ============================================================================
// IMPORT EXTRACTION
// ============================================================================

/**
 * Extract imported dependencies from file content
 */
export function extractImports(content: string): string[] {
  const dependencies: string[] = [];

  // Import from statements
  const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const dep = match[1];
    // Skip relative imports, focus on packages and aliases
    if (!dep.startsWith('.')) {
      dependencies.push(dep.split('/')[0]); // Get package name
    }
  }

  return [...new Set(dependencies)].slice(0, 15);
}

/**
 * Extract rich import information including relative imports
 * Used for import/export validation (P2)
 */
export function extractImportsRich(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  // Named imports: import { X, Y } from 'path'
  const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let namedMatch: RegExpExecArray | null;
  while ((namedMatch = namedImportRegex.exec(content)) !== null) {
    const symbols = namedMatch[1]
      .split(',')
      .map((s) =>
        s
          .trim()
          .split(/\s+as\s+/)[0]
          .trim()
      )
      .filter((s) => s.length > 0);
    imports.push({
      symbols,
      from: namedMatch[2],
      isRelative: namedMatch[2].startsWith('.'),
    });
  }

  // Default imports: import X from 'path'
  const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let defaultMatch: RegExpExecArray | null;
  while ((defaultMatch = defaultImportRegex.exec(content)) !== null) {
    // Skip if already captured by named import regex
    if (!imports.some((i) => i.from === defaultMatch![2])) {
      imports.push({
        symbols: [`default:${defaultMatch[1]}`],
        from: defaultMatch[2],
        isRelative: defaultMatch[2].startsWith('.'),
      });
    }
  }

  return imports;
}

// ============================================================================
// FILE SUMMARY
// ============================================================================

/**
 * Generate a brief summary of what a file does
 */
export function generateFileSummary(file: { path: string; content: string }): string {
  const type = classifyFileType(file.path, file.content);
  const exports = extractExports(file.content);
  const fileName = file.path.split('/').pop() || file.path;

  // Look for JSDoc comment at top
  const jsdocMatch = file.content.match(/^\/\*\*[\s\S]*?\*\//);
  if (jsdocMatch) {
    const description = jsdocMatch[0]
      .replace(/\/\*\*|\*\/|\*/g, '')
      .trim()
      .split('\n')[0]
      .trim();
    if (description.length > 10 && description.length < 150) {
      return description;
    }
  }

  // Generate based on type and exports
  switch (type) {
    case 'api':
      return `API route handling ${exports.filter((e) => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(e)).join(', ') || 'requests'}`;
    case 'component':
      return `React component: ${exports[0] || fileName.replace(/\.(tsx?|jsx?)$/, '')}`;
    case 'type':
      return `Type definitions: ${exports.slice(0, 3).join(', ')}${exports.length > 3 ? '...' : ''}`;
    case 'util':
      return `Utility functions: ${exports.slice(0, 3).join(', ')}${exports.length > 3 ? '...' : ''}`;
    case 'config':
      return `Configuration for ${fileName.replace(/\.(ts|js|json)$/, '')}`;
    default:
      return `${fileName} - ${exports.length} exports`;
  }
}

// ============================================================================
// API CONTRACT EXTRACTION
// ============================================================================

/**
 * Extract API contracts from a route file
 */
export function extractAPIContracts(file: { path: string; content: string }): Array<{
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestSchema?: string;
  responseSchema?: string;
  authentication: boolean;
}> {
  const contracts: Array<{
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    requestSchema?: string;
    responseSchema?: string;
    authentication: boolean;
  }> = [];

  // Derive endpoint from path
  const pathMatch = file.path.match(/\/api\/(.+?)(?:\/route)?\.ts/);
  const endpoint = pathMatch ? `/api/${pathMatch[1]}` : file.path;

  // Find exported HTTP methods
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
  for (const method of methods) {
    if (
      file.content.includes(`export async function ${method}`) ||
      file.content.includes(`export function ${method}`)
    ) {
      // Check for auth
      const hasAuth =
        file.content.includes('getServerSession') ||
        file.content.includes('auth()') ||
        file.content.includes('requireAuth') ||
        file.content.includes('Authorization');

      // Try to find request/response types
      const requestMatch = file.content.match(
        new RegExp(`${method}[^{]*\\{[^}]*body[^:]*:\\s*(\\w+)`)
      );
      const responseMatch = file.content.match(
        /NextResponse\.json\s*\(\s*\{[^}]*\}\s*(?:as\s+(\w+))?/
      );

      contracts.push({
        endpoint,
        method,
        requestSchema: requestMatch?.[1],
        responseSchema: responseMatch?.[1],
        authentication: hasAuth,
      });
    }
  }

  return contracts;
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

/**
 * Detect coding patterns used in file for consistency
 */
export function detectPatterns(content: string): string[] {
  const patterns: string[] = [];

  // State management
  if (content.includes('useState')) patterns.push('react-useState');
  if (content.includes('useReducer')) patterns.push('react-useReducer');
  if (content.includes('createContext')) patterns.push('react-context');
  if (content.includes('zustand')) patterns.push('zustand-store');
  if (content.includes('redux')) patterns.push('redux');

  // Data fetching
  if (content.includes('useSWR')) patterns.push('swr');
  if (content.includes('useQuery')) patterns.push('react-query');
  if (content.includes('getServerSideProps')) patterns.push('next-ssr');
  if (content.includes('getStaticProps')) patterns.push('next-ssg');

  // Styling
  if (content.includes('className=') && content.includes('`')) patterns.push('tailwind-dynamic');
  if (content.includes('styled.')) patterns.push('styled-components');
  if (content.includes('css`')) patterns.push('emotion');

  // Form handling
  if (content.includes('useForm')) patterns.push('react-hook-form');
  if (content.includes('Formik')) patterns.push('formik');
  if (content.includes('zod')) patterns.push('zod-validation');

  // Auth patterns
  if (content.includes('getServerSession')) patterns.push('next-auth');
  if (content.includes('supabase.auth')) patterns.push('supabase-auth');

  // Error handling
  if (content.includes('try {') && content.includes('catch')) patterns.push('try-catch');
  if (content.includes('ErrorBoundary')) patterns.push('error-boundary');

  return patterns;
}
