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
  autoFixCode
} from '../src/utils/codeValidator.ts';

// Test utilities
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failCount++;
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertArrayLength(array, length, message) {
  if (array.length !== length) {
    throw new Error(`${message}\n  Expected length: ${length}\n  Actual length: ${array.length}\n  Array: ${JSON.stringify(array, null, 2)}`);
  }
}

function assertContains(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(`${message}\n  String: ${str}\n  Expected to contain: ${substring}`);
  }
}

console.log('\n🧪 Testing Code Validator\n');

// =============================================================================
// Test hasNestedFunctionDeclarations
// =============================================================================

console.log('📝 Testing hasNestedFunctionDeclarations...\n');

test('Should detect nested function declaration', () => {
  const code = `
    function App() {
      function Helper() {
        return <div>Test</div>;
      }
      return <div><Helper /></div>;
    }
  `;
  const errors = hasNestedFunctionDeclarations(code);
  assertArrayLength(errors, 1, 'Should find 1 nested function error');
  assertEqual(errors[0].type, 'NESTED_FUNCTION', 'Error type should be NESTED_FUNCTION');
  assertContains(errors[0].message, 'Helper', 'Error should mention Helper function');
  assertContains(errors[0].message, 'App', 'Error should mention App function');
});

test('Should NOT detect arrow function inside function (valid)', () => {
  const code = `
    function App() {
      const Helper = () => {
        return <div>Test</div>;
      };
      return <div><Helper /></div>;
    }
  `;
  const errors = hasNestedFunctionDeclarations(code);
  assertArrayLength(errors, 0, 'Should find 0 errors - arrow functions are valid');
});

test('Should NOT detect function declared before export', () => {
  const code = `
    function Helper() {
      return <div>Test</div>;
    }
    
    export default function App() {
      return <div><Helper /></div>;
    }
  `;
  const errors = hasNestedFunctionDeclarations(code);
  assertArrayLength(errors, 0, 'Should find 0 errors - Helper is declared before App');
});

test('Should detect multiple nested functions', () => {
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
  assertArrayLength(errors, 2, 'Should find 2 nested function errors');
});

test('Should ignore function keyword in comments', () => {
  const code = `
    // This function does something
    function App() {
      // function Helper() would be nested
      return <div>Test</div>;
    }
  `;
  const errors = hasNestedFunctionDeclarations(code);
  assertArrayLength(errors, 0, 'Should find 0 errors - function in comments ignored');
});

test('Should ignore function keyword in strings', () => {
  const code = `
    function App() {
      const message = "function Helper() {}";
      return <div>{message}</div>;
    }
  `;
  const errors = hasNestedFunctionDeclarations(code);
  assertArrayLength(errors, 0, 'Should find 0 errors - function in string ignored');
});

// =============================================================================
// Test hasBalancedJSXTags
// =============================================================================

console.log('\n📝 Testing hasBalancedJSXTags...\n');

test('Should detect unclosed JSX tag', () => {
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
  assertArrayLength(errors, 1, 'Should find 1 unbalanced JSX error');
  assertEqual(errors[0].type, 'UNBALANCED_JSX', 'Error type should be UNBALANCED_JSX');
});

test('Should detect mismatched JSX tags', () => {
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
  // Should detect mismatched tags
  assertArrayLength(errors, 2, 'Should find errors for mismatched tags');
});

test('Should handle self-closing tags correctly', () => {
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
  assertArrayLength(errors, 0, 'Should find 0 errors - self-closing tags are valid');
});

test('Should handle properly balanced nested tags', () => {
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
  assertArrayLength(errors, 0, 'Should find 0 errors - all tags properly balanced');
});

// =============================================================================
// Test hasTypeScriptInJSX
// =============================================================================

console.log('\n📝 Testing hasTypeScriptInJSX...\n');

test('Should detect interface in .jsx file', () => {
  const code = `
    interface Props {
      name: string;
    }
    
    export default function App(props) {
      return <div>{props.name}</div>;
    }
  `;
  const errors = hasTypeScriptInJSX(code, 'src/App.jsx');
  assertArrayLength(errors, 1, 'Should find 1 TypeScript error');
  assertEqual(errors[0].type, 'TYPESCRIPT_IN_JSX', 'Error type should be TYPESCRIPT_IN_JSX');
  assertContains(errors[0].message.toLowerCase(), 'interface', 'Error should mention interface');
});

test('Should NOT detect interface in .tsx file', () => {
  const code = `
    interface Props {
      name: string;
    }
    
    export default function App(props: Props) {
      return <div>{props.name}</div>;
    }
  `;
  const errors = hasTypeScriptInJSX(code, 'src/App.tsx');
  assertArrayLength(errors, 0, 'Should find 0 errors - TypeScript allowed in .tsx');
});

test('Should detect type annotations in .jsx file', () => {
  const code = `
    export default function App() {
      const count: number = 5;
      return <div>{count}</div>;
    }
  `;
  const errors = hasTypeScriptInJSX(code, 'src/App.jsx');
  assertArrayLength(errors, 1, 'Should find 1 TypeScript error for type annotation');
});

test('Should detect "as" assertions in .jsx file', () => {
  const code = `
    export default function App() {
      const value = getValue() as string;
      return <div>{value}</div>;
    }
  `;
  const errors = hasTypeScriptInJSX(code, 'src/App.jsx');
  assertArrayLength(errors, 1, 'Should find 1 TypeScript error for "as" assertion');
});

// =============================================================================
// Test hasUnclosedStrings
// =============================================================================

console.log('\n📝 Testing hasUnclosedStrings...\n');

test('Should detect unclosed double-quoted string', () => {
  const code = `
    export default function App() {
      const message = "Hello World;
      return <div>{message}</div>;
    }
  `;
  const errors = hasUnclosedStrings(code);
  assertArrayLength(errors, 1, 'Should find 1 unclosed string error');
  assertEqual(errors[0].type, 'UNCLOSED_STRING', 'Error type should be UNCLOSED_STRING');
  assertContains(errors[0].message, 'double', 'Error should mention double quote');
});

test('Should detect unclosed single-quoted string', () => {
  const code = `
    export default function App() {
      const message = 'Hello World;
      return <div>{message}</div>;
    }
  `;
  const errors = hasUnclosedStrings(code);
  assertArrayLength(errors, 1, 'Should find 1 unclosed string error');
  assertContains(errors[0].message, 'single', 'Error should mention single quote');
});

test('Should detect unclosed template literal', () => {
  const code = `
    export default function App() {
      const message = \`Hello World;
      return <div>{message}</div>;
    }
  `;
  const errors = hasUnclosedStrings(code);
  assertArrayLength(errors, 1, 'Should find 1 unclosed template literal error');
  assertContains(errors[0].message, 'template', 'Error should mention template literal');
});

test('Should handle properly closed strings', () => {
  const code = `
    export default function App() {
      const message1 = "Hello World";
      const message2 = 'Test';
      const message3 = \`Template\`;
      return <div>{message1} {message2} {message3}</div>;
    }
  `;
  const errors = hasUnclosedStrings(code);
  assertArrayLength(errors, 0, 'Should find 0 errors - all strings properly closed');
});

test('Should handle escaped quotes correctly', () => {
  const code = `
    export default function App() {
      const message = "He said \\"Hello\\"";
      return <div>{message}</div>;
    }
  `;
  const errors = hasUnclosedStrings(code);
  assertArrayLength(errors, 0, 'Should find 0 errors - escaped quotes handled correctly');
});

// =============================================================================
// Test validateGeneratedCode (integration)
// =============================================================================

console.log('\n📝 Testing validateGeneratedCode (integration)...\n');

test('Should run all validators and combine errors', () => {
  const code = `
    export default function App() {
      function Helper() {
        return <div>Test;
      }
      return <Component><Helper /></div>;
    }
  `;
  const result = validateGeneratedCode(code, 'src/App.tsx');
  assertEqual(result.valid, false, 'Code should be invalid');
  // Should have errors for: nested function, unclosed string, unbalanced JSX
  assertEqual(result.errors.length >= 2, true, 'Should have multiple errors');
});

test('Should validate clean code as valid', () => {
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
  const result = validateGeneratedCode(code, 'src/App.tsx');
  assertEqual(result.valid, true, 'Clean code should be valid');
  assertArrayLength(result.errors, 0, 'Should have 0 errors');
});

// =============================================================================
// Test autoFixCode
// =============================================================================

console.log('\n📝 Testing autoFixCode...\n');

test('Should auto-fix unclosed double-quoted string', () => {
  const code = `const message = "Hello World;`;
  const errors = hasUnclosedStrings(code);
  const fixed = autoFixCode(code, errors);
  assertContains(fixed, 'World;"', 'Should add closing double quote at end');
});

test('Should auto-fix unclosed single-quoted string', () => {
  const code = `const message = 'Hello World;`;
  const errors = hasUnclosedStrings(code);
  const fixed = autoFixCode(code, errors);
  assertContains(fixed, "World;'", 'Should add closing single quote at end');
});

test('Should auto-fix unclosed template literal', () => {
  const code = 'const message = `Hello World;';
  const errors = hasUnclosedStrings(code);
  const fixed = autoFixCode(code, errors);
  assertContains(fixed, 'World;`', 'Should add closing backtick at end');
});

test('Should handle code with no errors', () => {
  const code = `const message = "Hello World";`;
  const errors = [];
  const fixed = autoFixCode(code, errors);
  assertEqual(fixed, code, 'Should return unchanged code when no errors');
});

// =============================================================================
// Summary
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log(`Total Tests: ${testCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);
console.log('='.repeat(60) + '\n');

if (failCount > 0) {
  process.exit(1);
}
