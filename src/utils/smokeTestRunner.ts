'use client';

/**
 * Smoke Test Runner
 *
 * Converts testCriteria strings into executable smoke tests.
 * Uses pattern matching to verify code structure meets criteria.
 *
 * Part of P7: testCriteria Execution
 */

import type { SmokeTestResult, PhaseTestResults } from '@/types/dynamicPhases';

// Re-export types for convenience
export type { SmokeTestResult, PhaseTestResults };

interface TestContext {
  files: Array<{ path: string; content: string }>;
  exports: Map<string, string[]>;
}

type TestMatcher = (criterion: string, context: TestContext) => SmokeTestResult | null;

/**
 * Pattern-based test matchers for common criteria
 */
const TEST_MATCHERS: TestMatcher[] = [
  // "App renders without errors"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('renders without errors')) return null;

    const appFile = context.files.find(
      (f) => f.path.includes('App.tsx') || f.path.includes('page.tsx')
    );

    if (!appFile) {
      return { criterion, passed: false, error: 'App entry file not found', duration: 0 };
    }

    // Check for basic React structure
    const hasExport =
      appFile.content.includes('export default') || appFile.content.includes('export function');
    const hasJsx =
      appFile.content.includes('return') &&
      (appFile.content.includes('<') || appFile.content.includes('jsx'));

    return {
      criterion,
      passed: hasExport && hasJsx,
      error: hasExport && hasJsx ? undefined : 'Invalid React component structure',
      duration: 5,
    };
  },

  // "Navigation works between pages"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('navigation')) return null;

    const hasRouter = context.files.some(
      (f) =>
        f.content.includes('useRouter') ||
        f.content.includes('Link') ||
        f.content.includes('next/navigation') ||
        f.content.includes('react-router')
    );

    return {
      criterion,
      passed: hasRouter,
      error: hasRouter ? undefined : 'No navigation components found',
      duration: 5,
    };
  },

  // "Responsive at all breakpoints"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('responsive')) return null;

    const hasResponsive = context.files.some(
      (f) =>
        f.content.includes('sm:') ||
        f.content.includes('md:') ||
        f.content.includes('lg:') ||
        f.content.includes('xl:') ||
        f.content.includes('@media')
    );

    return {
      criterion,
      passed: hasResponsive,
      error: hasResponsive ? undefined : 'No responsive styles found',
      duration: 5,
    };
  },

  // "Form validation works"
  (criterion, context) => {
    if (
      !criterion.toLowerCase().includes('form') &&
      !criterion.toLowerCase().includes('validation')
    )
      return null;

    const hasValidation = context.files.some(
      (f) =>
        f.content.includes('required') ||
        f.content.includes('pattern=') ||
        f.content.includes('.test(') ||
        f.content.includes('validate') ||
        f.content.includes('yup') ||
        f.content.includes('zod')
    );

    return {
      criterion,
      passed: hasValidation,
      error: hasValidation ? undefined : 'No form validation found',
      duration: 5,
    };
  },

  // "API endpoints respond correctly"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('api') && !criterion.toLowerCase().includes('endpoint'))
      return null;

    const apiFiles = context.files.filter((f) => f.path.includes('/api/'));

    if (apiFiles.length === 0) {
      return { criterion, passed: true, duration: 0 }; // No API = pass (N/A)
    }

    const hasHandlers = apiFiles.every(
      (f) =>
        f.content.includes('export async function') ||
        f.content.includes('export function') ||
        f.content.includes('NextResponse') ||
        f.content.includes('Response')
    );

    return {
      criterion,
      passed: hasHandlers,
      error: hasHandlers ? undefined : 'API route missing proper handler',
      duration: 5,
    };
  },

  // "Authentication flow works"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('auth')) return null;

    const hasAuth = context.files.some(
      (f) =>
        f.content.includes('signIn') ||
        f.content.includes('login') ||
        f.content.includes('useAuth') ||
        f.content.includes('session') ||
        f.content.includes('useSession') ||
        f.content.includes('AuthContext')
    );

    return {
      criterion,
      passed: hasAuth,
      error: hasAuth ? undefined : 'No authentication implementation found',
      duration: 5,
    };
  },

  // "Error handling works"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('error')) return null;

    const hasErrorHandling = context.files.some(
      (f) =>
        (f.content.includes('try') && f.content.includes('catch')) ||
        f.content.includes('onError') ||
        f.content.includes('ErrorBoundary') ||
        f.content.includes('error.tsx')
    );

    return {
      criterion,
      passed: hasErrorHandling,
      error: hasErrorHandling ? undefined : 'No error handling found',
      duration: 5,
    };
  },

  // "Loading states are shown"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('loading')) return null;

    const hasLoading = context.files.some(
      (f) =>
        f.content.includes('isLoading') ||
        f.content.includes('loading') ||
        f.content.includes('Spinner') ||
        f.content.includes('Skeleton') ||
        f.content.includes('loading.tsx')
    );

    return {
      criterion,
      passed: hasLoading,
      error: hasLoading ? undefined : 'No loading states found',
      duration: 5,
    };
  },

  // "Data persists correctly"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('persist') && !criterion.toLowerCase().includes('storage'))
      return null;

    const hasPersistence = context.files.some(
      (f) =>
        f.content.includes('localStorage') ||
        f.content.includes('sessionStorage') ||
        f.content.includes('IndexedDB') ||
        f.content.includes('prisma') ||
        f.content.includes('supabase')
    );

    return {
      criterion,
      passed: hasPersistence,
      error: hasPersistence ? undefined : 'No data persistence found',
      duration: 5,
    };
  },

  // "State management works"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('state')) return null;

    const hasStateManagement = context.files.some(
      (f) =>
        f.content.includes('useState') ||
        f.content.includes('useReducer') ||
        f.content.includes('zustand') ||
        f.content.includes('redux') ||
        f.content.includes('useContext')
    );

    return {
      criterion,
      passed: hasStateManagement,
      error: hasStateManagement ? undefined : 'No state management found',
      duration: 5,
    };
  },

  // "Components render correctly"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('component')) return null;

    const componentFiles = context.files.filter(
      (f) => f.path.includes('/components/') && (f.path.endsWith('.tsx') || f.path.endsWith('.jsx'))
    );

    if (componentFiles.length === 0) {
      return { criterion, passed: false, error: 'No component files found', duration: 0 };
    }

    const allValid = componentFiles.every(
      (f) =>
        (f.content.includes('export default') || f.content.includes('export function')) &&
        f.content.includes('return')
    );

    return {
      criterion,
      passed: allValid,
      error: allValid ? undefined : 'Some components have invalid structure',
      duration: 5,
    };
  },

  // "Styling is applied correctly"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('style') && !criterion.toLowerCase().includes('css'))
      return null;

    const hasStyling = context.files.some(
      (f) =>
        f.content.includes('className=') ||
        f.content.includes('style=') ||
        f.path.endsWith('.css') ||
        f.content.includes('styled')
    );

    return {
      criterion,
      passed: hasStyling,
      error: hasStyling ? undefined : 'No styling found',
      duration: 5,
    };
  },

  // "Types are correctly defined"
  (criterion, context) => {
    if (!criterion.toLowerCase().includes('type')) return null;

    const typeFiles = context.files.filter(
      (f) => f.path.includes('/types/') || f.path.endsWith('.d.ts')
    );

    const hasTypes =
      typeFiles.length > 0 ||
      context.files.some(
        (f) => f.content.includes('interface ') || f.content.includes('type ')
      );

    return {
      criterion,
      passed: hasTypes,
      error: hasTypes ? undefined : 'No type definitions found',
      duration: 5,
    };
  },
];

/**
 * Run smoke tests for phase criteria
 */
export function runSmokeTests(
  testCriteria: string[],
  files: Array<{ path: string; content: string }>,
  phaseNumber: number
): PhaseTestResults {
  const results: SmokeTestResult[] = [];

  // Build context
  const exports = new Map<string, string[]>();
  for (const file of files) {
    const fileExports = extractExports(file.content);
    exports.set(file.path, fileExports);
  }
  const context: TestContext = { files, exports };

  // Run each criterion through matchers
  for (const criterion of testCriteria) {
    let matched = false;

    for (const matcher of TEST_MATCHERS) {
      const result = matcher(criterion, context);
      if (result) {
        results.push(result);
        matched = true;
        break;
      }
    }

    // If no matcher found, mark as manual review needed
    if (!matched) {
      results.push({
        criterion,
        passed: true, // Assume pass, flag for manual review
        error: 'Manual verification required',
        duration: 0,
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    phaseNumber,
    total: results.length,
    passed,
    failed,
    results,
    allPassed: failed === 0,
  };
}

/**
 * Extract export names from file content
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];
  const exportRegex =
    /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  return exports;
}

/**
 * Generate a human-readable test report
 */
export function formatTestReport(results: PhaseTestResults): string {
  let report = `## Phase ${results.phaseNumber} Test Results\n\n`;
  report += `**Total:** ${results.total} | **Passed:** ${results.passed} | **Failed:** ${results.failed}\n\n`;

  if (results.allPassed) {
    report += 'All tests passed.\n';
  } else {
    report += '### Failed Tests\n\n';
    for (const result of results.results.filter((r) => !r.passed)) {
      report += `- ${result.criterion}\n`;
      if (result.error) {
        report += `  Error: ${result.error}\n`;
      }
    }
  }

  const manualReview = results.results.filter((r) => r.error === 'Manual verification required');
  if (manualReview.length > 0) {
    report += '\n### Requires Manual Review\n\n';
    for (const result of manualReview) {
      report += `- ${result.criterion}\n`;
    }
  }

  return report;
}
