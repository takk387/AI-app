/**
 * Import and export extraction from TypeScript AST nodes
 */

import * as ts from 'typescript';
import { ExportInfo, ImportInfo, ImportedSymbol } from '../../types/codeContext';
import {
  hasDefaultModifier,
  hasAsyncModifier,
  getFunctionSignature,
  getVariableSignature,
  resolveImportPath,
} from './parserHelpers';

export function extractImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo {
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
    resolvedPath: isExternal ? undefined : resolveImportPath(source),
    isExternal,
    isTypeOnly,
    imports: importedSymbols,
  };
}

export function extractExportDeclaration(
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

export function extractExportAssignment(
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

export function extractExportedDeclaration(
  node: ts.Node,
  sourceFile: ts.SourceFile
): ExportInfo | null {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return {
      name: node.name.text,
      kind: 'function',
      isDefault: hasDefaultModifier(node),
      isAsync: hasAsyncModifier(node),
      signature: getFunctionSignature(node, sourceFile),
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    };
  }

  if (ts.isClassDeclaration(node) && node.name) {
    return {
      name: node.name.text,
      kind: 'class',
      isDefault: hasDefaultModifier(node),
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
            ? hasAsyncModifier(decl.initializer as ts.FunctionLikeDeclaration)
            : false;

        return {
          name: decl.name.text,
          kind: node.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let',
          isDefault: false,
          isAsync,
          signature: getVariableSignature(decl, sourceFile),
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
