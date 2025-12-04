import { NextRequest, NextResponse } from 'next/server';
import { ASTModifier } from '@/utils/astModifier';

export async function POST(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [] as any[],
    summary: { passed: 0, failed: 0, total: 0 },
  };

  try {
    // TEST 1: Add Import to Clean File
    console.log('\n🧪 TEST 1: Add Import to Clean File');
    const test1Code = `
export default function App() {
  return <div>Hello</div>;
}
`;

    const modifier1 = new ASTModifier(test1Code);
    await modifier1.initialize();

    modifier1.addImport({
      source: 'react',
      namedImports: ['useState'],
    });

    const result1 = await modifier1.generate();

    results.tests.push({
      name: 'Add Import to Clean File',
      passed: result1.success && result1.code?.includes("import { useState } from 'react'"),
      code: result1.code,
      errors: result1.errors,
    });

    // TEST 2: Merge Imports
    console.log('\n🧪 TEST 2: Merge Imports');
    const test2Code = `
import { useState } from 'react';

export default function App() {
  return <div>Hello</div>;
}
`;

    const modifier2 = new ASTModifier(test2Code);
    await modifier2.initialize();

    modifier2.addImport({
      source: 'react',
      namedImports: ['useEffect'],
    });

    const result2 = await modifier2.generate();

    results.tests.push({
      name: 'Merge Imports',
      passed:
        result2.success &&
        result2.code?.includes('useState') &&
        result2.code?.includes('useEffect') &&
        (result2.code?.match(/import.*from 'react'/g) || []).length === 1,
      code: result2.code,
      errors: result2.errors,
    });

    // TEST 3: Wrap Element in AuthGuard
    console.log('\n🧪 TEST 3: Wrap Element in AuthGuard');
    const test3Code = `
export default function App() {
  return (
    <div className="container">
      <h1>My App</h1>
    </div>
  );
}
`;

    const modifier3 = new ASTModifier(test3Code);
    await modifier3.initialize();

    const tree3 = modifier3.getTree();
    const parser3 = modifier3.getParser();

    // Debug: Check what nodes exist
    console.log('🔍 DEBUG: Tree exists?', !!tree3);
    console.log('🔍 DEBUG: Root node exists?', !!tree3?.rootNode);

    // Try to find JSX elements
    const jsxElements = parser3.findNodes(tree3, 'jsx_element');
    console.log('🔍 DEBUG: JSX elements found:', jsxElements.length);

    if (jsxElements.length > 0) {
      const firstJsx = jsxElements[0];
      console.log('🔍 DEBUG: First JSX type:', firstJsx.type);
      const opening = firstJsx.childForFieldName('opening_element');
      console.log('🔍 DEBUG: Opening element exists?', !!opening);
      if (opening) {
        const name = opening.childForFieldName('name');
        console.log('🔍 DEBUG: Name node exists?', !!name);
        console.log('🔍 DEBUG: Name text:', name?.text);
      }
    }

    const divElement = parser3.findComponent(tree3, 'div');

    console.log('🔍 DEBUG: divElement found?', !!divElement);
    console.log('🔍 DEBUG: divElement type:', divElement?.type);
    console.log('🔍 DEBUG: divElement start:', divElement?.startIndex);
    console.log('🔍 DEBUG: divElement end:', divElement?.endIndex);

    if (divElement) {
      modifier3.wrapElement(divElement, {
        component: 'AuthGuard',
        import: {
          source: '@/components/AuthGuard',
          defaultImport: 'AuthGuard',
        },
      });

      // Check modifications after wrapElement
      console.log('🔍 DEBUG: Modifications count:', (modifier3 as any).modifications?.length);
    } else {
      console.log('❌ DEBUG: divElement is null/undefined!');
    }

    const result3 = await modifier3.generate();
    console.log('🔍 DEBUG: Result success:', result3.success);
    console.log('🔍 DEBUG: Result errors:', result3.errors);

    results.tests.push({
      name: 'Wrap Element in AuthGuard',
      passed:
        result3.success &&
        result3.code?.includes('<AuthGuard>') &&
        result3.code?.includes('</AuthGuard>') &&
        result3.code?.includes("import AuthGuard from '@/components/AuthGuard'"),
      code: result3.code,
      errors: result3.errors,
    });

    // TEST 4: Add State Variable
    console.log('\n🧪 TEST 4: Add State Variable');
    const test4Code = `
export default function App() {
  return <div>Hello</div>;
}
`;

    const modifier4 = new ASTModifier(test4Code);
    await modifier4.initialize();

    modifier4.addStateVariable({
      name: 'count',
      setter: 'setCount',
      initialValue: '0',
    });

    const result4 = await modifier4.generate();

    results.tests.push({
      name: 'Add State Variable',
      passed:
        result4.success &&
        result4.code?.includes('const [count, setCount] = useState(0)') &&
        result4.code?.includes("import { useState } from 'react'"),
      code: result4.code,
      errors: result4.errors,
    });

    // TEST 5: Multiple Modifications (The Big One!)
    console.log('\n🧪 TEST 5: Multiple Modifications (Complete Workflow)');
    const test5Code = `
export default function App() {
  return (
    <div className="app">
      <h1>Todo App</h1>
    </div>
  );
}
`;

    const modifier5 = new ASTModifier(test5Code);
    await modifier5.initialize();

    // Add multiple imports
    modifier5.addImport({
      source: 'react',
      namedImports: ['useState', 'useEffect'],
    });

    modifier5.addImport({
      source: '@/components/Button',
      defaultImport: 'Button',
    });

    // Add state variables
    modifier5.addStateVariable({
      name: 'todos',
      setter: 'setTodos',
      initialValue: '[]',
    });

    modifier5.addStateVariable({
      name: 'isLoading',
      setter: 'setIsLoading',
      initialValue: 'false',
    });

    // Wrap in AuthGuard
    const tree5 = modifier5.getTree();
    const parser5 = modifier5.getParser();
    const div5 = parser5.findComponent(tree5, 'div');

    if (div5) {
      modifier5.wrapElement(div5, {
        component: 'AuthGuard',
        import: {
          source: '@/components/AuthGuard',
          defaultImport: 'AuthGuard',
        },
      });
    }

    const result5 = await modifier5.generate();

    results.tests.push({
      name: 'Multiple Modifications (Complete)',
      passed:
        result5.success &&
        result5.code?.includes('useState') &&
        result5.code?.includes('useEffect') &&
        result5.code?.includes('Button') &&
        result5.code?.includes('[todos, setTodos]') &&
        result5.code?.includes('[isLoading, setIsLoading]') &&
        result5.code?.includes('<AuthGuard>') &&
        !result5.code?.includes('undefined'),
      code: result5.code,
      errors: result5.errors,
    });

    // TEST 6: Error Handling - Invalid Syntax
    console.log('\n🧪 TEST 6: Error Handling');
    const test6Code = `export default function App() { return <div>Test</div>; }`;

    const modifier6 = new ASTModifier(test6Code);
    await modifier6.initialize();

    // Try to add conflicting imports (should throw error)
    let error6Caught = false;
    try {
      // This should throw an error (can't combine default + namespace)
      modifier6['generateImportCode']({
        source: 'react',
        defaultImport: 'React',
        namespaceImport: 'ReactNS',
      });
    } catch (e) {
      error6Caught = true;
    }

    results.tests.push({
      name: 'Error Handling (Invalid Import)',
      passed: error6Caught,
      message: 'Correctly caught invalid default+namespace combination',
    });

    // Calculate summary
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter((t) => t.passed).length;
    results.summary.failed = results.summary.total - results.summary.passed;

    console.log('\n📊 TEST SUMMARY:');
    console.log(`Total: ${results.summary.total}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Test execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Phase 2 AST Modifier Test Endpoint',
    instructions: 'Send a POST request to run tests',
    example: 'curl -X POST http://localhost:3000/api/test-modifier',
  });
}
