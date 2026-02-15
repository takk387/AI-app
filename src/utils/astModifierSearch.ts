import type Parser from 'tree-sitter';
import type { DeleteElementSpec } from './astModifierTypes';

/**
 * AST Modifier - Search & Element Matching Helpers
 *
 * Pure utility functions for searching the Tree-sitter AST.
 * Extracted from ASTModifier class.
 */

/**
 * Recursively search for a function by name
 */
export function searchForFunction(
  node: Parser.SyntaxNode,
  functionName: string
): Parser.SyntaxNode | null {
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
    if (
      nameNode &&
      nameNode.text === functionName &&
      valueNode &&
      (valueNode.type === 'arrow_function' || valueNode.type === 'function')
    ) {
      return node;
    }
  }

  // Recursively search children
  for (const child of node.children) {
    const result = searchForFunction(child, functionName);
    if (result) return result;
  }

  return null;
}

/**
 * Helper to find a function by name in the tree
 */
export function findFunction(
  tree: Parser.Tree | null,
  functionName: string
): Parser.SyntaxNode | null {
  if (!tree) return null;

  try {
    // Fallback: manually search the tree
    return searchForFunction(tree.rootNode, functionName);
  } catch {
    return searchForFunction(tree.rootNode, functionName);
  }
}

/**
 * Recursively search for element to delete
 */
export function searchForElementToDelete(
  node: Parser.SyntaxNode,
  spec: DeleteElementSpec
): Parser.SyntaxNode | null {
  // Check if this node matches our criteria
  if (matchesElementSpec(node, spec)) {
    return node;
  }

  // Recursively search children
  for (const child of node.children) {
    const result = searchForElementToDelete(child, spec);
    if (result) return result;
  }

  return null;
}

/**
 * Helper method to find element to delete based on spec
 */
export function findElementToDelete(
  tree: Parser.Tree | null,
  spec: DeleteElementSpec
): Parser.SyntaxNode | null {
  if (!tree) return null;

  return searchForElementToDelete(tree.rootNode, spec);
}

/**
 * Check if a node matches the deletion spec
 */
export function matchesElementSpec(node: Parser.SyntaxNode, spec: DeleteElementSpec): boolean {
  // Check element type
  const nodeType = node.type;

  // For JSX elements, check if it matches the target
  if (nodeType === 'jsx_element' || nodeType === 'jsx_self_closing_element') {
    const openingElement =
      nodeType === 'jsx_element'
        ? node.children.find((c) => c.type === 'jsx_opening_element')
        : node;

    if (openingElement) {
      const tagName = openingElement.childForFieldName('name');
      if (tagName && tagName.text === spec.elementType) {
        // Check additional criteria if specified
        if (spec.identifier) {
          return hasMatchingIdentifier(node, spec.identifier);
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
export function hasMatchingIdentifier(node: Parser.SyntaxNode, identifier: string): boolean {
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
