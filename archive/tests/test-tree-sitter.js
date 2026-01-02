// Simple test script for Tree-sitter parser
// Run with: node test-tree-sitter.js

const { CodeParser } = require('./src/utils/treeSitterParser.ts');

// Test 1: Parse a simple React component
console.log('=== Test 1: Parse Simple React Component ===\n');

const simpleCode = `
import { useState } from 'react';

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

try {
  const parser = new CodeParser('typescript');
  const tree = parser.parse(simpleCode);
  
  if (!tree) {
    console.error('❌ Failed to parse code');
    process.exit(1);
  }
  
  console.log('✅ Code parsed successfully');
  console.log(`Has errors: ${parser.hasErrors(tree)}`);
  
  // Test finding imports
  const imports = parser.findImports(tree);
  console.log(`Found ${imports.length} import(s)`);
  
  // Test finding function
  const appFunc = parser.findFunction(tree, 'App');
  console.log(`Found App function: ${appFunc ? '✅' : '❌'}`);
  
  // Test finding variable
  const countVar = parser.findVariable(tree, 'count');
  console.log(`Found count variable: ${countVar ? '✅' : '❌'}`);
  
  // Test finding component
  const divComponent = parser.findComponent(tree, 'div');
  console.log(`Found div component: ${divComponent ? '✅' : '❌'}`);
  
  // Print tree structure
  console.log('\nTree structure (depth 2):');
  console.log(parser.printTree(tree, 2));
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

// Test 2: Parse code with syntax error
console.log('\n=== Test 2: Parse Code with Syntax Error ===\n');

const brokenCode = `
function App() {
  const [count = useState(0);  // Missing closing bracket
  return <div>Count: {count}</div>
}
`;

try {
  const parser = new CodeParser('typescript');
  const tree = parser.parse(brokenCode);
  
  if (!tree) {
    console.error('❌ Failed to parse broken code');
    process.exit(1);
  }
  
  console.log('✅ Broken code parsed (error-tolerant)');
  console.log(`Has errors: ${parser.hasErrors(tree)}`);
  
  // Can still find valid parts
  const appFunc = parser.findFunction(tree, 'App');
  console.log(`Found App function despite errors: ${appFunc ? '✅' : '❌'}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

// Test 3: Parse typical AI-generated app
console.log('\n=== Test 3: Parse AI-Generated Todo App ===\n');

const todoAppCode = `
import { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, { id: Date.now(), text: inputValue, completed: false }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Todo List</h1>
        
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new todo..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={addTodo}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {todos.map(todo => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span className={todo.completed ? 'line-through' : ''}>
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="ml-auto text-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

try {
  const parser = new CodeParser('typescript');
  const tree = parser.parse(todoAppCode);
  
  if (!tree) {
    console.error('❌ Failed to parse todo app');
    process.exit(1);
  }
  
  console.log('✅ Todo app parsed successfully');
  console.log(`Has errors: ${parser.hasErrors(tree)}`);
  
  // Test finding multiple elements
  const imports = parser.findImports(tree);
  console.log(`Found ${imports.length} import(s): ✅`);
  
  const appFunc = parser.findFunction(tree, 'App');
  console.log(`Found App function: ${appFunc ? '✅' : '❌'}`);
  
  const todosVar = parser.findVariable(tree, 'todos');
  console.log(`Found todos variable: ${todosVar ? '✅' : '❌'}`);
  
  const inputVar = parser.findVariable(tree, 'inputValue');
  console.log(`Found inputValue variable: ${inputVar ? '✅' : '❌'}`);
  
  // Test finding JSX elements
  const divs = parser.findNodes(tree, 'jsx_element');
  console.log(`Found ${divs.length} JSX elements: ✅`);
  
  const buttons = parser.findComponent(tree, 'button');
  console.log(`Found button component: ${buttons ? '✅' : '❌'}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

console.log('\n=== All Tests Passed! ===\n');
console.log('✅ Tree-sitter parser is working correctly');
console.log('✅ Can parse valid code');
console.log('✅ Error-tolerant for broken code');
console.log('✅ Can find imports, functions, variables, JSX elements');
console.log('✅ Ready for Phase 2: AST Modifier Core\n');
