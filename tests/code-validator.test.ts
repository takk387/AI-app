/**
 * Unit Tests for Code Validator
 *
 * Tests all validation functions to ensure they catch errors accurately
 */

import {
  hasNestedFunctionDeclarations,
  hasBalancedJSXTags,
  hasTypeScriptInJSX,
  hasUnclosedStrings,
  validateGeneratedCode,
  autoFixCode,
} from '../src/utils/codeValidator';

// =============================================================================
// Test hasNestedFunctionDeclarations
// =============================================================================

describe('hasNestedFunctionDeclarations', () => {
  it('should detect nested function declaration', () => {
    const code = `
      function App() {
        function Helper() {
          return <div>Test</div>;
        }
        return <div><Helper /></div>;
      }
    `;
    const errors = hasNestedFunctionDeclarations(code);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('NESTED_FUNCTION');
    expect(errors[0].message).toContain('Helper');
    expect(errors[0].message).toContain('App');
  });

  it('should NOT detect arrow function inside function (valid)', () => {
    const code = `
      function App() {
        const Helper = () => {
          return <div>Test</div>;
        };
        return <div><Helper /></div>;
      }
    `;
    const errors = hasNestedFunctionDeclarations(code);
    expect(errors).toHaveLength(0);
  });

  it('should NOT detect function declared before export', () => {
    const code = `
      function Helper() {
        return <div>Test</div>;
      }

      export default function App() {
        return <div><Helper /></div>;
      }
    `;
    const errors = hasNestedFunctionDeclarations(code);
    expect(errors).toHaveLength(0);
  });

  it('should detect multiple nested functions', () => {
    const code = `
      export default function App() {
        function Helper1() {
          return <div>Test</div>;
        }
        function Helper2() {
          return <span>Test</span>;
        }
        return <div><Helper1 /><Helper2 /></div>;
      }
    `;
    const errors = hasNestedFunctionDeclarations(code);
    expect(errors).toHaveLength(2);
  });

  it('should ignore function keyword in comments', () => {
    const code = `
      // This function does something
      function App() {
        // function Helper() would be nested
        return <div>Test</div>;
      }
    `;
    const errors = hasNestedFunctionDeclarations(code);
    expect(errors).toHaveLength(0);
  });

  it('should ignore function keyword in strings', () => {
    const code = `
      function App() {
        const message = "function Helper() {}";
        return <div>{message}</div>;
      }
    `;
    const errors = hasNestedFunctionDeclarations(code);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Test hasBalancedJSXTags
// =============================================================================

describe('hasBalancedJSXTags', () => {
  it('should detect unclosed JSX tag', () => {
    const code = `
      export default function App() {
        return (
          <div>
            <Component>
              <span>Test</span>
          </div>
        );
      }
    `;
    const errors = hasBalancedJSXTags(code);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('UNBALANCED_JSX');
  });

  it('should detect mismatched JSX tags', () => {
    const code = `
      export default function App() {
        return (
          <Container>
            <Span>Test</Container>
          </Span>
        );
      }
    `;
    const errors = hasBalancedJSXTags(code);
    expect(errors).toHaveLength(2);
  });

  it('should handle self-closing tags correctly', () => {
    const code = `
      export default function App() {
        return (
          <div>
            <Component />
            <input />
            <br />
          </div>
        );
      }
    `;
    const errors = hasBalancedJSXTags(code);
    expect(errors).toHaveLength(0);
  });

  it('should handle properly balanced nested tags', () => {
    const code = `
      export default function App() {
        return (
          <Container>
            <Header>
              <Title>Test</Title>
            </Header>
            <Content>
              <Section>Test</Section>
            </Content>
          </Container>
        );
      }
    `;
    const errors = hasBalancedJSXTags(code);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Test hasTypeScriptInJSX
// =============================================================================

describe('hasTypeScriptInJSX', () => {
  it('should detect interface in .jsx file', () => {
    const code = `
      interface Props {
        name: string;
      }

      export default function App(props) {
        return <div>{props.name}</div>;
      }
    `;
    const errors = hasTypeScriptInJSX(code, 'src/App.jsx');
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('TYPESCRIPT_IN_JSX');
    expect(errors[0].message.toLowerCase()).toContain('interface');
  });

  it('should NOT detect interface in .tsx file', () => {
    const code = `
      interface Props {
        name: string;
      }

      export default function App(props: Props) {
        return <div>{props.name}</div>;
      }
    `;
    const errors = hasTypeScriptInJSX(code, 'src/App.tsx');
    expect(errors).toHaveLength(0);
  });

  it('should detect type annotations in .jsx file', () => {
    const code = `
      export default function App() {
        const count: number = 5;
        return <div>{count}</div>;
      }
    `;
    const errors = hasTypeScriptInJSX(code, 'src/App.jsx');
    expect(errors).toHaveLength(1);
  });

  it('should detect "as" assertions in .jsx file', () => {
    const code = `
      export default function App() {
        const value = getValue() as string;
        return <div>{value}</div>;
      }
    `;
    const errors = hasTypeScriptInJSX(code, 'src/App.jsx');
    expect(errors).toHaveLength(1);
  });
});

// =============================================================================
// Test hasUnclosedStrings
// =============================================================================

describe('hasUnclosedStrings', () => {
  it('should detect unclosed double-quoted string', () => {
    const code = `
      export default function App() {
        const message = "Hello World;
        return <div>{message}</div>;
      }
    `;
    const errors = hasUnclosedStrings(code);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('UNCLOSED_STRING');
    expect(errors[0].message).toContain('double');
  });

  it('should detect unclosed single-quoted string', () => {
    const code = `
      export default function App() {
        const message = 'Hello World;
        return <div>{message}</div>;
      }
    `;
    const errors = hasUnclosedStrings(code);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('single');
  });

  it('should detect unclosed template literal', () => {
    const code = `
      export default function App() {
        const message = \`Hello World;
        return <div>{message}</div>;
      }
    `;
    const errors = hasUnclosedStrings(code);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('template');
  });

  it('should handle properly closed strings', () => {
    const code = `
      export default function App() {
        const message1 = "Hello World";
        const message2 = 'Test';
        const message3 = \`Template\`;
        return <div>{message1} {message2} {message3}</div>;
      }
    `;
    const errors = hasUnclosedStrings(code);
    expect(errors).toHaveLength(0);
  });

  it('should handle escaped quotes correctly', () => {
    const code = `
      export default function App() {
        const message = "He said \\"Hello\\"";
        return <div>{message}</div>;
      }
    `;
    const errors = hasUnclosedStrings(code);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Test validateGeneratedCode (integration)
// =============================================================================

describe('validateGeneratedCode', () => {
  it('should detect nested function declarations', async () => {
    const code = `
      export default function App() {
        function Helper() {
          return <div>Test</div>;
        }
        return <div><Helper /></div>;
      }
    `;
    const result = await validateGeneratedCode(code, 'src/App.tsx');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0].type).toBe('NESTED_FUNCTION');
  });

  it('should validate clean code as valid', async () => {
    const code = `
      export default function App() {
        const [count, setCount] = useState(0);

        return (
          <div className="container">
            <h1>Counter: {count}</h1>
            <button onClick={() => setCount(count + 1)}>
              Increment
            </button>
          </div>
        );
      }
    `;
    const result = await validateGeneratedCode(code, 'src/App.tsx');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// =============================================================================
// Test autoFixCode
// =============================================================================

describe('autoFixCode', () => {
  it('should auto-fix unclosed double-quoted string', () => {
    const code = `const message = "Hello World;`;
    const errors = hasUnclosedStrings(code);
    const fixed = autoFixCode(code, errors);
    expect(fixed).toContain('World;"');
  });

  it('should auto-fix unclosed single-quoted string', () => {
    const code = `const message = 'Hello World;`;
    const errors = hasUnclosedStrings(code);
    const fixed = autoFixCode(code, errors);
    expect(fixed).toContain("World;'");
  });

  it('should auto-fix unclosed template literal', () => {
    const code = 'const message = `Hello World;';
    const errors = hasUnclosedStrings(code);
    const fixed = autoFixCode(code, errors);
    expect(fixed).toContain('World;`');
  });

  it('should handle code with no errors', () => {
    const code = `const message = "Hello World";`;
    const errors: ReturnType<typeof hasUnclosedStrings> = [];
    const fixed = autoFixCode(code, errors);
    expect(fixed).toBe(code);
  });
});
