/**
 * Custom hook detection and extraction from TypeScript AST
 */

import * as ts from 'typescript';
import { HookInfo } from '../../types/codeContext';

export function isCustomHook(node: ts.Node): boolean {
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

export function extractHook(node: ts.Node, sourceFile: ts.SourceFile): HookInfo | null {
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
  const dependencies = findHookDependencies(func, sourceFile);

  return {
    name,
    isCustom: true,
    parameters,
    returnType,
    dependencies,
    line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
  };
}

export function findHookDependencies(
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
