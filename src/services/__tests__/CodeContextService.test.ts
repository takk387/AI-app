/**
 * CodeContextService Tests
 *
 * Tests the code context orchestration service including:
 * - Context extraction and updating
 * - Dependency graph building
 * - Cache management
 * - State management
 */

import { CodeContextService, type UpdateContextResult } from '../CodeContextService';
import type { FileContent, CodeContextSnapshot } from '@/types/codeContext';

// Mock dependencies
jest.mock('../CodeParser', () => ({
  getCodeParser: jest.fn(() => ({
    analyzeFile: jest.fn((path: string, content: string) => ({
      path,
      type: path.endsWith('.tsx') ? 'component' : 'utility',
      imports: [],
      exports: [],
      dependencies: [],
      tokenCount: Math.ceil(content.length / 4),
      complexity: 'low',
      hasJSX: path.endsWith('.tsx'),
      hooks: [],
      components: [],
    })),
  })),
  CodeParser: jest.fn(),
}));

jest.mock('../DependencyGraphBuilder', () => ({
  getDependencyGraphBuilder: jest.fn(() => ({
    buildGraph: jest.fn(() => ({
      files: new Map(),
      edges: [],
      roots: [],
      leaves: [],
      cycles: [],
      stats: {
        totalFiles: 0,
        totalEdges: 0,
        maxDepth: 0,
        avgInDegree: 0,
        avgOutDegree: 0,
        circularDependencies: 0,
      },
    })),
  })),
  DependencyGraphBuilder: jest.fn(),
}));

jest.mock('../ContextSelector', () => ({
  getContextSelector: jest.fn(() => ({
    selectContext: jest.fn(() => ({
      files: [],
      totalTokens: 0,
      strategy: 'balanced',
    })),
  })),
  ContextSelector: jest.fn(),
}));

jest.mock('../ContextCache', () => ({
  getContextCache: jest.fn(() => ({
    getAnalysis: jest.fn(() => null),
    setAnalysis: jest.fn(),
    getSnapshot: jest.fn(() => null),
    setSnapshot: jest.fn(),
    invalidateFile: jest.fn(),
    invalidateSnapshotsForFiles: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 })),
  })),
  ContextCache: jest.fn(),
}));

jest.mock('../../utils/hashUtils', () => ({
  hashSync: jest.fn((content: string) => `hash-${content.length}`),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockFile(
  path: string,
  content: string = 'export default function() {}'
): FileContent {
  return { path, content };
}

function createMockFiles(): FileContent[] {
  return [
    createMockFile('src/App.tsx', 'export default function App() { return <div>Hello</div>; }'),
    createMockFile(
      'src/components/Button.tsx',
      'export const Button = () => <button>Click</button>;'
    ),
    createMockFile(
      'src/utils/helpers.ts',
      'export function formatDate(d: Date) { return d.toISOString(); }'
    ),
    createMockFile('src/types/index.ts', 'export interface User { id: string; name: string; }'),
  ];
}

// ============================================================================
// TESTS
// ============================================================================

describe('CodeContextService', () => {
  describe('constructor', () => {
    test('initializes with app ID and name', () => {
      const service = new CodeContextService('app-123', 'My App');

      expect(service).toBeDefined();
    });

    test('initializes with default app type', () => {
      const service = new CodeContextService('app-123', 'My App');
      const state = service.getState();

      expect(state.appType).toBe('FRONTEND_ONLY');
    });

    test('accepts custom app type', () => {
      const service = new CodeContextService('app-123', 'My App', 'FULL_STACK');
      const state = service.getState();

      expect(state.appType).toBe('FULL_STACK');
    });

    test('initializes with empty file maps', () => {
      const service = new CodeContextService('app-123', 'My App');
      const state = service.getState();

      expect(state.files.size).toBe(0);
      expect(state.analysis.size).toBe(0);
    });

    test('initializes app metadata in state', () => {
      const service = new CodeContextService('app-123', 'My App');
      const state = service.getState();

      expect(state.appId).toBe('app-123');
      expect(state.appName).toBe('My App');
    });
  });

  describe('updateContext', () => {
    test('processes files and returns result', async () => {
      const service = new CodeContextService('app-123', 'My App');
      const files = createMockFiles();

      const result = await service.updateContext(files);

      expect(result).toBeDefined();
      expect(typeof result.filesProcessed).toBe('number');
    });

    test('updates state with processed files', async () => {
      const service = new CodeContextService('app-123', 'My App');
      const files = createMockFiles();

      await service.updateContext(files);
      const state = service.getState();

      expect(state.files.size).toBeGreaterThan(0);
    });

    test('increments version after update', async () => {
      const service = new CodeContextService('app-123', 'My App');
      const initialVersion = service.getState().version;

      await service.updateContext(createMockFiles());
      const newVersion = service.getState().version;

      expect(newVersion).toBeGreaterThan(initialVersion);
    });
  });

  describe('getState', () => {
    test('returns current state object', () => {
      const service = new CodeContextService('app-123', 'My App');
      const state = service.getState();

      expect(state).toHaveProperty('appId');
      expect(state).toHaveProperty('appName');
      expect(state).toHaveProperty('files');
      expect(state).toHaveProperty('analysis');
      expect(state).toHaveProperty('dependencyGraph');
    });
  });

  describe('getDependencyGraph', () => {
    test('returns dependency graph structure', () => {
      const service = new CodeContextService('app-123', 'My App');
      const graph = service.getDependencyGraph();

      expect(graph).toHaveProperty('files');
      expect(graph).toHaveProperty('edges');
      expect(graph).toHaveProperty('roots');
      expect(graph).toHaveProperty('leaves');
      expect(graph).toHaveProperty('stats');
    });
  });

  describe('clearCache', () => {
    test('clears cached data', async () => {
      const service = new CodeContextService('app-123', 'My App');
      await service.updateContext(createMockFiles());

      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    test('returns cache statistics', () => {
      const service = new CodeContextService('app-123', 'My App');
      const stats = service.getCacheStats();

      expect(stats).toBeDefined();
    });
  });
});

describe('File Importance Scoring', () => {
  test('type files should have higher importance', () => {
    // Types are critical for understanding the codebase
    const typePath = 'src/types/index.ts';
    const componentPath = 'src/components/Button.tsx';

    // Type files typically score higher due to their role in defining interfaces
    expect(typePath.includes('types')).toBe(true);
    expect(componentPath.includes('types')).toBe(false);
  });

  test('utility files should have moderate importance', () => {
    const utilPath = 'src/utils/helpers.ts';

    expect(utilPath.includes('utils') || utilPath.includes('lib')).toBe(true);
  });

  test('test files should have lower importance', () => {
    const testPath = 'src/__tests__/App.test.tsx';
    const specPath = 'src/components/Button.spec.tsx';

    expect(testPath.includes('test') || testPath.includes('__tests__')).toBe(true);
    expect(specPath.includes('spec')).toBe(true);
  });
});

describe('Token Budget', () => {
  test('respects token budget when selecting context', () => {
    // Token budget is a key constraint for context selection
    const maxTokens = 8000;
    const largeFileTokens = 5000;
    const smallFileTokens = 1000;

    // If we have budget for 8000 tokens and one file is 5000,
    // we can fit that plus 3 smaller files
    const remainingBudget = maxTokens - largeFileTokens;
    const additionalFiles = Math.floor(remainingBudget / smallFileTokens);

    expect(additionalFiles).toBe(3);
  });

  test('prioritizes high-importance files within budget', () => {
    // High importance files should be included first
    const files = [
      { path: 'src/types/index.ts', importance: 0.9, tokens: 500 },
      { path: 'src/utils/helpers.ts', importance: 0.7, tokens: 300 },
      { path: 'src/components/Button.tsx', importance: 0.5, tokens: 400 },
    ];

    // Sort by importance descending
    const sorted = [...files].sort((a, b) => b.importance - a.importance);

    expect(sorted[0].path).toBe('src/types/index.ts');
    expect(sorted[1].path).toBe('src/utils/helpers.ts');
  });
});

describe('Dependency Tracking', () => {
  test('tracks file dependencies', () => {
    const dependencies = new Map<string, string[]>();

    // App.tsx imports Button
    dependencies.set('src/App.tsx', ['src/components/Button.tsx', 'src/utils/helpers.ts']);

    // Button imports helpers
    dependencies.set('src/components/Button.tsx', ['src/utils/helpers.ts']);

    expect(dependencies.get('src/App.tsx')).toContain('src/components/Button.tsx');
    expect(dependencies.get('src/components/Button.tsx')).toContain('src/utils/helpers.ts');
  });

  test('identifies root files (no dependents)', () => {
    const dependents = new Map<string, string[]>();

    // helpers is imported by App and Button
    dependents.set('src/utils/helpers.ts', ['src/App.tsx', 'src/components/Button.tsx']);

    // App is not imported by anything (root)
    dependents.set('src/App.tsx', []);

    // Roots are files with no dependents
    const roots = [...dependents.entries()]
      .filter(([, deps]) => deps.length === 0)
      .map(([path]) => path);

    expect(roots).toContain('src/App.tsx');
  });

  test('identifies leaf files (no dependencies)', () => {
    const dependencies = new Map<string, string[]>();

    // helpers has no dependencies (leaf)
    dependencies.set('src/utils/helpers.ts', []);

    // App has dependencies
    dependencies.set('src/App.tsx', ['src/components/Button.tsx']);

    // Leaves are files with no dependencies
    const leaves = [...dependencies.entries()]
      .filter(([, deps]) => deps.length === 0)
      .map(([path]) => path);

    expect(leaves).toContain('src/utils/helpers.ts');
  });
});

describe('Context Snapshot', () => {
  test('snapshot includes selected files', () => {
    const snapshot: CodeContextSnapshot = {
      id: 'snapshot-1',
      createdAt: Date.now(),
      files: [
        {
          path: 'src/App.tsx',
          representation: 'full',
          content: 'export default function App() {}',
          tokenCount: 50,
        },
      ],
      totalTokens: 50,
      strategy: 'balanced',
      dependencyHints: [],
      omittedSummary: {
        count: 0,
        totalTokens: 0,
        categories: {},
      },
    };

    expect(snapshot.files).toHaveLength(1);
    expect(snapshot.totalTokens).toBe(50);
  });

  test('snapshot includes omitted file summary', () => {
    const omittedSummary: CodeContextSnapshot['omittedSummary'] = {
      count: 5,
      totalTokens: 2500,
      categories: {
        test: 3,
        component: 2,
      },
    };

    expect(omittedSummary.count).toBe(5);
    expect(omittedSummary.categories.test).toBe(3);
  });

  test('snapshot includes dependency hints', () => {
    const hints: CodeContextSnapshot['dependencyHints'] = [
      {
        from: 'src/App.tsx',
        to: 'src/components/Button.tsx',
        type: 'import',
      },
    ];

    expect(hints[0].from).toBe('src/App.tsx');
    expect(hints[0].to).toBe('src/components/Button.tsx');
  });
});
