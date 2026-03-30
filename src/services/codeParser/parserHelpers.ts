/**
 * Parser helper utilities for AST-based code analysis
 */

import * as ts from 'typescript';
import { hashSync } from '../../utils/hashUtils';

export function createSourceFile(
  path: string,
  content: string,
  scriptKind: ts.ScriptKind
): ts.SourceFile {
  return ts.createSourceFile(path, content, ts.ScriptTarget.ESNext, true, scriptKind);
}

export function getScriptKind(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.ts')) return ts.ScriptKind.TS;
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.Unknown;
}

export function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

export function hasDefaultModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
}

export function hasAsyncModifier(node: ts.FunctionLikeDeclaration): boolean {
  const modifiers = ts.getModifiers(node);
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
}

export function isComponentName(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

export function returnsJSX(node: ts.FunctionLikeDeclaration | ts.ArrowFunction): boolean {
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

export function getFunctionSignature(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile
): string {
  const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
  const returnType = node.type?.getText(sourceFile) ?? 'void';
  return `(${params}) => ${returnType}`;
}

export function getVariableSignature(
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

export function resolveImportPath(importPath: string): string | undefined {
  // Simplified resolution - in real implementation would use proper path resolution
  if (importPath.startsWith('.')) {
    return importPath;
  }
  return undefined;
}

export function hashContent(content: string): string {
  return hashSync(content);
}
