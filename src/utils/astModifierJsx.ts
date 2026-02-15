import type Parser from 'tree-sitter';
import type { CodeParser } from './treeSitterParser';
import type {
  WrapperSpec,
  ModifyClassNameSpec,
  InsertJSXSpec,
  ModifyPropSpec,
  ConditionalWrapSpec,
  ReplaceFunctionBodySpec,
  DeleteElementSpec,
  Modification,
  ASTModifierOptions,
} from './astModifierTypes';

/**
 * AST Modifier - JSX Manipulation Operations
 *
 * Pure utility functions for JSX element manipulation.
 * Extracted from ASTModifier class.
 */

/**
 * Build Modifications to wrap a JSX element in another component
 */
export function buildWrapElementMods(
  originalCode: string,
  elementNode: Parser.SyntaxNode,
  wrapper: WrapperSpec,
  options: Required<ASTModifierOptions>
): Modification[] {
  const mods: Modification[] = [];

  // Generate wrapper opening and closing
  // NOTE: Props are wrapped in {} by default. If you need string literals,
  // pass them pre-quoted: { fallback: '"LoginPage"' }
  const propsStr = wrapper.props
    ? ' ' +
      Object.entries(wrapper.props)
        .map(([key, value]) => `${key}={${value}}`)
        .join(' ')
    : '';

  const opening = `<${wrapper.component}${propsStr}>`;
  const closing = `</${wrapper.component}>`;

  // Calculate indentation: use the element's actual column position
  const elementLineStart = originalCode.lastIndexOf('\n', elementNode.startIndex - 1) + 1;
  const elementColumn = elementNode.startIndex - elementLineStart;
  const baseIndentation = ' '.repeat(elementColumn);

  // Insert opening before element (higher priority to ensure it's applied after closing in reverse order)
  mods.push({
    type: 'insert',
    start: elementNode.startIndex,
    end: elementNode.startIndex,
    newCode: opening + '\n' + baseIndentation + options.indentation,
    priority: 501, // Higher priority than closing
    description: `Wrap element in ${wrapper.component} (opening)`,
  });

  // Insert closing after element
  mods.push({
    type: 'insert',
    start: elementNode.endIndex,
    end: elementNode.endIndex,
    newCode: '\n' + baseIndentation + closing,
    priority: 500, // Lower priority than opening
    description: `Wrap element in ${wrapper.component} (closing)`,
  });

  return mods;
}

/**
 * Build Modifications to modify the className attribute of a JSX element
 */
export function buildModifyClassNameMods(
  originalCode: string,
  elementNode: Parser.SyntaxNode,
  spec: ModifyClassNameSpec
): Modification[] {
  const mods: Modification[] = [];

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
      existingClasses.push(...cleaned.split(/\s+/).filter((c) => c.length > 0));
    } else if (valueText.startsWith('{')) {
      // JSX expression: Try to extract static classes
      // For template literals like {`container ${...}`}
      const templateMatch = valueText.match(/`([^$]*)/);
      if (templateMatch) {
        const staticPart = templateMatch[1].trim();
        if (staticPart) {
          existingClasses.push(...staticPart.split(/\s+/).filter((c) => c.length > 0));
        }
      }
    }
  }

  // Combine with spec classes
  const allStaticClasses = [...existingClasses, ...(spec.staticClasses || [])];

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
    const dynamicPart =
      operator === '?'
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
    return mods;
  }

  if (classNameAttr && classNameValue) {
    // Replace existing className value
    mods.push({
      type: 'replace',
      start: classNameValue.startIndex,
      end: classNameValue.endIndex,
      newCode: newClassNameValue,
      priority: 700,
      description: `Modify className attribute`,
    });
  } else if (classNameAttr) {
    // className exists but no value - add value
    mods.push({
      type: 'insert',
      start: classNameAttr.endIndex,
      end: classNameAttr.endIndex,
      newCode: `=${newClassNameValue}`,
      priority: 700,
      description: `Add className value`,
    });
  } else {
    // No className attribute - add it
    // Find where to insert (after tag name in opening element)
    for (const child of elementNode.children) {
      if (child.type === 'jsx_opening_element') {
        // Find the tag name
        const identifier = child.childForFieldName('name');
        if (identifier) {
          mods.push({
            type: 'insert',
            start: identifier.endIndex,
            end: identifier.endIndex,
            newCode: ` className=${newClassNameValue}`,
            priority: 700,
            description: `Add className attribute`,
          });
          break;
        }
      }
    }
  }

  return mods;
}

/**
 * Build Modifications to insert JSX at a specific position relative to an element
 */
export function buildInsertJSXMods(
  originalCode: string,
  elementNode: Parser.SyntaxNode,
  spec: InsertJSXSpec,
  options: Required<ASTModifierOptions>
): Modification[] {
  const mods: Modification[] = [];

  // Calculate indentation based on element position
  const elementLineStart = originalCode.lastIndexOf('\n', elementNode.startIndex - 1) + 1;
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
          const closingBracket = child.children.find((c) => c.text === '>');
          if (closingBracket) {
            insertPosition = closingBracket.endIndex;
            newCode = '\n' + baseIndentation + options.indentation + spec.jsx;
            mods.push({
              type: 'insert',
              start: insertPosition,
              end: insertPosition,
              newCode,
              priority: 600,
              description: 'Insert JSX inside element (start)',
            });
            return mods;
          }
        }
      }
      console.warn('Could not find opening element closing bracket');
      return mods;

    case 'inside_end':
      // Insert as last child inside element
      // Find the closing element
      for (const child of elementNode.children) {
        if (child.type === 'jsx_closing_element') {
          insertPosition = child.startIndex;
          newCode =
            '\n' + baseIndentation + options.indentation + spec.jsx + '\n' + baseIndentation;
          mods.push({
            type: 'insert',
            start: insertPosition,
            end: insertPosition,
            newCode,
            priority: 600,
            description: 'Insert JSX inside element (end)',
          });
          return mods;
        }
      }
      console.warn('Could not find closing element');
      return mods;
  }

  mods.push({
    type: 'insert',
    start: insertPosition,
    end: insertPosition,
    newCode,
    priority: 600,
    description: `Insert JSX ${spec.position}`,
  });

  return mods;
}

/**
 * Build Modifications to modify a prop on a JSX element
 */
export function buildModifyPropMods(
  originalCode: string,
  elementNode: Parser.SyntaxNode,
  spec: ModifyPropSpec
): Modification[] {
  const mods: Modification[] = [];

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
    return mods;
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
        return mods;
      }

      if (propNode) {
        // Update existing prop
        mods.push({
          type: 'replace',
          start: propNode.startIndex,
          end: propNode.endIndex,
          newCode: `${spec.name}={${spec.value}}`,
          priority: 650,
          description: `Update prop ${spec.name}`,
        });
      } else {
        // Add new prop
        // Find where to insert (after tag name)
        const tagName = openingElement.childForFieldName('name');
        if (tagName) {
          mods.push({
            type: 'insert',
            start: tagName.endIndex,
            end: tagName.endIndex,
            newCode: ` ${spec.name}={${spec.value}}`,
            priority: 650,
            description: `Add prop ${spec.name}`,
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
        if (originalCode[end] === ' ') {
          end++;
        } else if (start > 0 && originalCode[start - 1] === ' ') {
          // Include leading space in deletion
          mods.push({
            type: 'delete',
            start: start - 1,
            end: end,
            newCode: '',
            priority: 650,
            description: `Remove prop ${spec.name}`,
          });
          return mods;
        }

        mods.push({
          type: 'delete',
          start: start,
          end: end,
          newCode: '',
          priority: 650,
          description: `Remove prop ${spec.name}`,
        });
      }
      break;
  }

  return mods;
}

/**
 * Build Modifications to wrap existing return statement in conditional
 */
export function buildConditionalMods(
  parser: CodeParser,
  tree: Parser.Tree | null,
  originalCode: string,
  spec: ConditionalWrapSpec,
  options: Required<ASTModifierOptions>
): Modification[] {
  const mods: Modification[] = [];
  if (!tree) return mods;

  // Find the function's return statement
  const functionNode = parser.findDefaultExportedFunction(tree);
  if (!functionNode) {
    console.warn('Could not find function to wrap return statement');
    return mods;
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
    return mods;
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
    return mods;
  }

  // Get the base indentation
  const returnLineStart = originalCode.lastIndexOf('\n', returnNode.startIndex - 1) + 1;
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
        return mods;
      }
      newCode = `${baseIndentation}if (!${spec.condition}) {\n${baseIndentation}${options.indentation}return ${spec.fallback};\n${baseIndentation}}\n\n${baseIndentation}`;

      mods.push({
        type: 'insert',
        start: returnNode.startIndex,
        end: returnNode.startIndex,
        newCode,
        priority: 550,
        description: `Add conditional before return`,
      });
      break;

    case 'conditional-render':
      // return !condition ? <Fallback /> : <Original />;
      if (!spec.fallback) {
        console.warn('Fallback required for conditional-render');
        return mods;
      }

      // Find the JSX being returned
      {
        const returnKeyword = returnNode.children.find((c) => c.text === 'return');
        if (!returnKeyword) {
          console.warn('Could not find return keyword');
          return mods;
        }

        // Find the JSX expression (skip whitespace and parentheses)
        let jsxStart = returnKeyword.endIndex;
        while (
          jsxStart < returnNode.endIndex &&
          (originalCode[jsxStart] === ' ' ||
            originalCode[jsxStart] === '(' ||
            originalCode[jsxStart] === '\n')
        ) {
          jsxStart++;
        }

        // Find the end of JSX (before closing paren or semicolon)
        let jsxEnd = returnNode.endIndex - 1;
        while (
          jsxEnd > jsxStart &&
          (originalCode[jsxEnd] === ';' ||
            originalCode[jsxEnd] === ')' ||
            originalCode[jsxEnd] === ' ' ||
            originalCode[jsxEnd] === '\n')
        ) {
          jsxEnd--;
        }
        jsxEnd++; // Include the last character

        const originalJSX = originalCode.substring(jsxStart, jsxEnd).trim();
        const wrappedJSX = `!${spec.condition} ? ${spec.fallback} : ${originalJSX}`;

        mods.push({
          type: 'replace',
          start: jsxStart,
          end: jsxEnd,
          newCode: wrappedJSX,
          priority: 550,
          description: `Wrap return in conditional`,
        });
      }
      break;

    case 'ternary':
      // Same as conditional-render
      if (!spec.fallback) {
        console.warn('Fallback required for ternary');
        return mods;
      }

      {
        const returnKwd = returnNode.children.find((c) => c.text === 'return');
        if (!returnKwd) {
          console.warn('Could not find return keyword');
          return mods;
        }

        let jsxStartPos = returnKwd.endIndex;
        while (
          jsxStartPos < returnNode.endIndex &&
          (originalCode[jsxStartPos] === ' ' ||
            originalCode[jsxStartPos] === '(' ||
            originalCode[jsxStartPos] === '\n')
        ) {
          jsxStartPos++;
        }

        let jsxEndPos = returnNode.endIndex - 1;
        while (
          jsxEndPos > jsxStartPos &&
          (originalCode[jsxEndPos] === ';' ||
            originalCode[jsxEndPos] === ')' ||
            originalCode[jsxEndPos] === ' ' ||
            originalCode[jsxEndPos] === '\n')
        ) {
          jsxEndPos--;
        }
        jsxEndPos++;

        const origJSX = originalCode.substring(jsxStartPos, jsxEndPos).trim();
        const wrappedJsx = `${spec.condition} ? ${origJSX} : ${spec.fallback}`;

        mods.push({
          type: 'replace',
          start: jsxStartPos,
          end: jsxEndPos,
          newCode: wrappedJsx,
          priority: 550,
          description: `Wrap return in ternary`,
        });
      }
      break;
  }

  return mods;
}

/**
 * Build a Modification to replace the body of an existing function
 */
export function buildReplaceFunctionBodyMod(
  originalCode: string,
  functionNode: Parser.SyntaxNode,
  spec: ReplaceFunctionBodySpec,
  options: Required<ASTModifierOptions>
): Modification | null {
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
    return null;
  }

  // Find the opening and closing braces
  const openBrace = bodyNode.children.find((c) => c.text === '{');
  const closeBrace = bodyNode.children.find((c) => c.text === '}');

  if (!openBrace || !closeBrace) {
    console.warn('Could not find function braces');
    return null;
  }

  // Calculate indentation based on function position
  const functionLineStart = originalCode.lastIndexOf('\n', functionNode.startIndex - 1) + 1;
  const functionColumn = functionNode.startIndex - functionLineStart;
  const baseIndentation = ' '.repeat(functionColumn);

  // Build new function body with proper indentation
  const newBody = `{\n${baseIndentation}${options.indentation}${spec.newBody}\n${baseIndentation}}`;

  return {
    type: 'replace',
    start: bodyNode.startIndex,
    end: bodyNode.endIndex,
    newCode: newBody,
    priority: 600,
    description: `Replace body of function ${spec.functionName}`,
  };
}

/**
 * Build Modifications to delete a JSX element
 */
export function buildDeleteElementMods(
  originalCode: string,
  element: Parser.SyntaxNode,
  spec: DeleteElementSpec
): Modification[] {
  const mods: Modification[] = [];

  // Calculate deletion range including potential surrounding whitespace
  let deleteStart = element.startIndex;
  let deleteEnd = element.endIndex;

  // Check for leading whitespace/newline to include in deletion
  while (
    deleteStart > 0 &&
    (originalCode[deleteStart - 1] === ' ' || originalCode[deleteStart - 1] === '\t')
  ) {
    deleteStart--;
  }

  // Check for leading newline
  if (deleteStart > 0 && originalCode[deleteStart - 1] === '\n') {
    deleteStart--;
  }

  // Check for trailing newline to maintain formatting
  if (deleteEnd < originalCode.length && originalCode[deleteEnd] === '\n') {
    deleteEnd++;
  }

  mods.push({
    type: 'delete',
    start: deleteStart,
    end: deleteEnd,
    newCode: '',
    priority: 400,
    description: `Delete ${spec.elementType} element`,
  });

  return mods;
}
