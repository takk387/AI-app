// Simple ES Module test for Tree-sitter parser
// Run with: node test-parser.mjs

import Parser from 'tree-sitter';

console.log('=== Tree-sitter Basic Test ===\n');

try {
  // Test that tree-sitter loads
  const parser = new Parser();
  console.log('✅ Tree-sitter loaded successfully');
  
  // Try to load TypeScript language
  const TypeScript = await import('tree-sitter-typescript');
  parser.setLanguage(TypeScript.default.tsx);
  console.log('✅ TypeScript language loaded');
  
  // Parse simple code
  const code = `
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
`;
  
  const tree = parser.parse(code);
  console.log('✅ Code parsed successfully');
  console.log(`Root node type: ${tree.rootNode.type}`);
  console.log(`Has errors: ${tree.rootNode.hasError}`);
  console.log(`Child count: ${tree.rootNode.childCount}`);
  
  console.log('\n=== Phase 1 Validation Complete ===');
  console.log('✅ Tree-sitter is installed and working');
  console.log('✅ Can parse TypeScript/TSX code');
  console.log('✅ Ready to build CodeParser wrapper\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nTroubleshooting:');
  console.error('1. Make sure packages are installed: npm install tree-sitter tree-sitter-typescript');
  console.error('2. Try with --legacy-peer-deps if version conflicts');
  process.exit(1);
}
