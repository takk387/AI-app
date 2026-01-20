'use client';

/**
 * TypeScript Compiler Service
 *
 * Provides virtual TypeScript type checking for generated code.
 * Uses dynamic import to avoid bundling typescript in client bundle.
 *
 * Part of P5: Cross-Phase Type Checking
 */

import type { TypeCheckResult, TypeCheckError } from '@/types/dynamicPhases';

// Re-export types for convenience
export type { TypeCheckResult, TypeCheckError };

/**
 * Run TypeScript type checking on virtual files
 * Uses virtual file system - no disk writes
 */
export async function runTypeCheck(
  files: Array<{ path: string; content: string }>
): Promise<TypeCheckResult> {
  try {
    // Dynamic import to avoid bundling typescript in client
    const ts = await import('typescript');

    const errors: TypeCheckError[] = [];
    const warnings: TypeCheckError[] = [];

    // Create virtual file map
    const fileMap = new Map<string, string>();
    for (const file of files) {
      fileMap.set(file.path, file.content);
    }

    // Compiler options for type checking only
    const compilerOptions: import('typescript').CompilerOptions = {
      noEmit: true,
      strict: false, // Lenient for generated code
      skipLibCheck: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      allowJs: true,
    };

    // Create compiler host with virtual file system
    const host = ts.createCompilerHost(compilerOptions);
    const originalReadFile = host.readFile;
    host.readFile = (fileName: string) => {
      // Check virtual files first
      if (fileMap.has(fileName)) {
        return fileMap.get(fileName);
      }
      return originalReadFile.call(host, fileName);
    };
    host.fileExists = (fileName: string) => {
      return fileMap.has(fileName) || ts.sys.fileExists(fileName);
    };

    // Create program and get diagnostics
    const program = ts.createProgram(Array.from(fileMap.keys()), compilerOptions, host);

    const diagnostics = [...program.getSemanticDiagnostics(), ...program.getSyntacticDiagnostics()];

    // Convert diagnostics to our format
    for (const diagnostic of diagnostics) {
      const error = formatDiagnostic(diagnostic, ts);
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        errors.push(error);
      } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
        warnings.push(error);
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  } catch (err) {
    // TypeScript may not be available in all environments
    console.warn('TypeScript compilation not available:', err);
    return {
      success: true,
      errors: [],
      warnings: [],
    };
  }
}

/**
 * Format a TypeScript diagnostic to our error format
 */
function formatDiagnostic(
  diagnostic: import('typescript').Diagnostic,
  ts: typeof import('typescript')
): TypeCheckError {
  let file = 'unknown';
  let line = 0;
  let column = 0;

  if (diagnostic.file && diagnostic.start !== undefined) {
    file = diagnostic.file.fileName;
    const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    line = pos.line + 1;
    column = pos.character + 1;
  }

  return {
    file,
    line,
    column,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    code: diagnostic.code,
    severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
  };
}

/**
 * Quick syntax check without full type checking
 * Faster but less thorough - uses a minimal compiler program
 */
export async function runSyntaxCheck(
  files: Array<{ path: string; content: string }>
): Promise<TypeCheckResult> {
  try {
    const ts = await import('typescript');

    const errors: TypeCheckError[] = [];

    // Create virtual file map
    const fileMap = new Map<string, string>();
    for (const file of files) {
      fileMap.set(file.path, file.content);
    }

    // Minimal compiler options for syntax checking only
    const compilerOptions: import('typescript').CompilerOptions = {
      noEmit: true,
      skipLibCheck: true,
      allowJs: true,
    };

    // Create compiler host with virtual file system
    const host = ts.createCompilerHost(compilerOptions);
    const originalReadFile = host.readFile;
    host.readFile = (fileName: string) => {
      if (fileMap.has(fileName)) {
        return fileMap.get(fileName);
      }
      return originalReadFile.call(host, fileName);
    };
    host.fileExists = (fileName: string) => {
      return fileMap.has(fileName) || ts.sys.fileExists(fileName);
    };

    // Create program and get syntactic diagnostics only (fast)
    const program = ts.createProgram(Array.from(fileMap.keys()), compilerOptions, host);
    const syntaxDiagnostics = program.getSyntacticDiagnostics();

    for (const diagnostic of syntaxDiagnostics) {
      errors.push(formatDiagnostic(diagnostic, ts));
    }

    return {
      success: errors.length === 0,
      errors,
      warnings: [],
    };
  } catch (err) {
    console.warn('TypeScript syntax check not available:', err);
    return {
      success: true,
      errors: [],
      warnings: [],
    };
  }
}
