/**
 * Mock for tree-sitter native module
 * Used in tests to avoid platform-specific native binary issues
 */

class MockSyntaxNode {
  type = 'program';
  text = '';
  hasError = false;
  isMissing = false;
  children: MockSyntaxNode[] = [];
  startPosition = { row: 0, column: 0 };
  endPosition = { row: 0, column: 0 };

  constructor(text: string = '', hasError: boolean = false) {
    this.text = text;
    this.hasError = hasError;
  }

  childForFieldName(_name: string): MockSyntaxNode | null {
    return null;
  }

  get namedChildren(): MockSyntaxNode[] {
    return this.children;
  }
}

class MockTree {
  rootNode: MockSyntaxNode;

  constructor(code: string = '') {
    this.rootNode = new MockSyntaxNode(code, false);
  }
}

class MockParser {
  private language: any = null;

  setLanguage(lang: any) {
    this.language = lang;
  }

  parse(code: string): MockTree {
    // Return a valid tree with no errors for any code
    // This lets the regex-based fallback validators handle actual validation
    return new MockTree(code);
  }
}

export default MockParser;
export { MockParser as Parser, MockTree as Tree, MockSyntaxNode as SyntaxNode };
