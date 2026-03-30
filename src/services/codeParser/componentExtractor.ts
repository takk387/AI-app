/**
 * React component detection and extraction from TypeScript AST
 */

import * as ts from 'typescript';
import { ComponentInfo, PropInfo } from '../../types/codeContext';
import {
  isComponentName,
  returnsJSX,
  hasExportModifier,
  hasDefaultModifier,
} from './parserHelpers';

export function isReactComponent(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  // Function component (function declaration)
  if (ts.isFunctionDeclaration(node) && node.name) {
    const name = node.name.text;
    if (isComponentName(name) && returnsJSX(node)) {
      return true;
    }
  }

  // Arrow function component (variable declaration)
  if (ts.isVariableStatement(node)) {
    for (const decl of node.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && isComponentName(decl.name.text)) {
        if (
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          if (returnsJSX(decl.initializer)) {
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

export function extractComponent(node: ts.Node, sourceFile: ts.SourceFile): ComponentInfo | null {
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

  const props = func ? extractComponentProps(func, sourceFile) : [];
  const hooks = func ? findHooksUsed(func, sourceFile) : [];
  const childComponents = func ? findChildComponents(func, sourceFile) : [];

  return {
    name,
    isDefault: hasExportModifier(node) && hasDefaultModifier(node),
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

export function extractComponentProps(
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

export function findHooksUsed(
  func: ts.FunctionLikeDeclaration,
  sourceFile: ts.SourceFile
): string[] {
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

export function findChildComponents(
  func: ts.FunctionLikeDeclaration,
  sourceFile: ts.SourceFile
): string[] {
  const children: Set<string> = new Set();

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (isComponentName(tagName)) {
        children.add(tagName);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(func);
  return Array.from(children);
}
