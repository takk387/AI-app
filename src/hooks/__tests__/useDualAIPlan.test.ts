/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useDualAIPlan Hook Tests
 *
 * Tests the client-side dual AI planning hook:
 * - Initial state
 * - startPlanning transition
 * - SSE event handling (progress, complete, escalation, error)
 * - cancelPlanning cleanup
 * - retryPlanning
 * - resolveEscalation
 * - confirmArchitectureChoice
 */

import { renderHook, act } from '@testing-library/react';
import type { ArchitecturePosition, EscalationData } from '@/types/dualPlanning';

// ============================================================================
// MOCKS
// ============================================================================

// Mock useAppStore with a simple in-memory store
const mockStore: Record<string, unknown> = {
  dualPlanProgress: null,
  dualArchitectureResult: null,
  dualArchitectureEscalation: null,
  claudeArchitecturePosition: null,
  geminiArchitecturePosition: null,
  architectureNegotiationRounds: 0,
  architectureReviewed: false,
  cachedIntelligence: null,
  userAISelection: null,
};

const mockActions: Record<string, jest.Mock> = {
  setDualPlanProgress: jest.fn((v) => {
    mockStore.dualPlanProgress = v;
  }),
  setDualArchitectureResult: jest.fn((v) => {
    mockStore.dualArchitectureResult = v;
  }),
  setDualArchitectureEscalation: jest.fn((v) => {
    mockStore.dualArchitectureEscalation = v;
  }),
  setClaudeArchitecturePosition: jest.fn((v) => {
    mockStore.claudeArchitecturePosition = v;
  }),
  setGeminiArchitecturePosition: jest.fn((v) => {
    mockStore.geminiArchitecturePosition = v;
  }),
  setArchitectureNegotiationRounds: jest.fn((v) => {
    mockStore.architectureNegotiationRounds = v;
  }),
  setArchitectureReviewed: jest.fn((v) => {
    mockStore.architectureReviewed = v;
  }),
  setUserAISelection: jest.fn((v) => {
    mockStore.userAISelection = v;
  }),
};

jest.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const fullState = { ...mockStore, ...mockActions };
    return selector(fullState);
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock EventSource
class MockEventSource {
  static CLOSED = 2;
  readyState = 1;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = jest.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}
(global as any).EventSource = MockEventSource;

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockArchitecture(): ArchitecturePosition {
  return {
    database: { provider: 'postgresql', models: [] },
    api: { style: 'REST', routes: [] },
    auth: { provider: 'NextAuth', strategy: 'JWT', flows: ['login'] },
    agentic: { enabled: false, workflows: [], framework: 'none' },
    realtime: { enabled: false, technology: 'none', channels: [] },
    techStack: { framework: 'Next.js 15', database: 'PostgreSQL', orm: 'Prisma', libraries: [] },
    scaling: {
      caching: { strategy: 'none', layers: [] },
      indexing: { databaseIndexes: [] },
      optimization: { techniques: [] },
    },
    aiSelections: {
      codeGeneration: 'claude-opus-4-6',
      testing: 'gemini-3-pro',
      review: 'claude-opus-4-6',
    },
  } as ArchitecturePosition;
}

// ============================================================================
// TESTS
// ============================================================================

describe('useDualAIPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store
    mockStore.dualPlanProgress = null;
    mockStore.dualArchitectureResult = null;
    mockStore.dualArchitectureEscalation = null;
    mockStore.claudeArchitecturePosition = null;
    mockStore.geminiArchitecturePosition = null;
    mockStore.architectureNegotiationRounds = 0;
    mockStore.architectureReviewed = false;
    mockStore.cachedIntelligence = null;
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      expect(result.current.isPlanning).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isEscalated).toBe(false);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.stageLabel).toBe('Ready');
    });
  });

  describe('startPlanning Transition', () => {
    it('should set isPlanning to true and reset state', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'test-session' }),
      });

      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      await act(async () => {
        await result.current.startPlanning(
          { name: 'Test', description: 'Test app' } as any,
          { id: 'manifest' } as any
        );
      });

      // Should have called fetch to /api/planning/start
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/planning/start',
        expect.objectContaining({
          method: 'POST',
        })
      );

      // Should have reset escalation and result
      expect(mockActions.setDualArchitectureResult).toHaveBeenCalledWith(null);
      expect(mockActions.setDualArchitectureEscalation).toHaveBeenCalledWith(null);
      expect(mockActions.setArchitectureReviewed).toHaveBeenCalledWith(false);
    });

    it('should set error when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      await act(async () => {
        await result.current.startPlanning({ name: 'Test' } as any, { id: 'manifest' } as any);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.isPlanning).toBe(false);
    });
  });

  describe('cancelPlanning', () => {
    it('should close EventSource and reset state', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'test-session' }),
      });

      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      await act(async () => {
        await result.current.startPlanning({ name: 'Test' } as any, { id: 'manifest' } as any);
      });

      act(() => {
        result.current.cancelPlanning();
      });

      expect(result.current.isPlanning).toBe(false);
      expect(mockActions.setDualPlanProgress).toHaveBeenCalledWith(null);
    });
  });

  describe('resolveEscalation', () => {
    it('should resolve escalation with claude choice', () => {
      const claudeArch = createMockArchitecture();
      const geminiArch = {
        ...createMockArchitecture(),
        agentic: { enabled: true, workflows: [], framework: 'LangChain' },
      };

      mockStore.dualArchitectureEscalation = {
        reason: 'Could not agree',
        divergentIssues: [],
        claudeArchitecture: claudeArch,
        geminiArchitecture: geminiArch,
        negotiationRounds: 3,
      } as unknown as EscalationData;

      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      act(() => {
        result.current.resolveEscalation('claude');
      });

      expect(mockActions.setDualArchitectureResult).toHaveBeenCalled();
      const finalArch =
        mockActions.setDualArchitectureResult.mock.calls[
          mockActions.setDualArchitectureResult.mock.calls.length - 1
        ][0];
      expect(finalArch.database.provider).toBe('postgresql');
      expect(mockActions.setDualArchitectureEscalation).toHaveBeenCalledWith(null);
    });

    it('should merge architectures on merge choice', () => {
      const claudeArch = createMockArchitecture();
      const geminiArch = {
        ...createMockArchitecture(),
        agentic: {
          enabled: true,
          workflows: [
            {
              name: 'test',
              description: 'test workflow',
              trigger: 'user_action' as const,
              agents: [{ name: 'agent1', role: 'worker', tools: [] }],
              orchestration: 'sequential' as const,
            },
          ],
          framework: 'LangChain',
        },
      };

      mockStore.dualArchitectureEscalation = {
        reason: 'Could not agree',
        divergentIssues: [],
        claudeArchitecture: claudeArch,
        geminiArchitecture: geminiArch,
        negotiationRounds: 2,
      } as unknown as EscalationData;

      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      act(() => {
        result.current.resolveEscalation('merge');
      });

      const finalArch =
        mockActions.setDualArchitectureResult.mock.calls[
          mockActions.setDualArchitectureResult.mock.calls.length - 1
        ][0];
      // Merge: Claude base + Gemini agentic
      expect(finalArch.database.provider).toBe('postgresql'); // Claude base
      expect(finalArch.agentic.enabled).toBe(true); // Gemini agentic
    });
  });

  describe('confirmArchitectureChoice', () => {
    it('should accept consensus as-is', () => {
      mockStore.claudeArchitecturePosition = createMockArchitecture();
      mockStore.geminiArchitecturePosition = createMockArchitecture();
      mockStore.dualArchitectureResult = {
        ...createMockArchitecture(),
        consensusReport: { rounds: 1, finalAgreements: [], compromises: [] },
        validation: { approvedAt: '', coverage: 90, issuesResolved: 0, replanAttempts: 0 },
      };

      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      act(() => {
        result.current.confirmArchitectureChoice('consensus');
      });

      expect(mockActions.setArchitectureReviewed).toHaveBeenCalledWith(true);
      expect(mockActions.setDualArchitectureEscalation).toHaveBeenCalledWith(null);
    });
  });

  describe('needsArchitectureReview', () => {
    it('should be true when pipeline done + both archs available + not reviewed', () => {
      mockStore.dualArchitectureResult = { validation: {} } as any;
      mockStore.claudeArchitecturePosition = createMockArchitecture();
      mockStore.geminiArchitecturePosition = createMockArchitecture();
      mockStore.architectureReviewed = false;

      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      expect(result.current.needsArchitectureReview).toBe(true);
    });

    it('should be false when already reviewed', () => {
      mockStore.dualArchitectureResult = { validation: {} } as any;
      mockStore.claudeArchitecturePosition = createMockArchitecture();
      mockStore.geminiArchitecturePosition = createMockArchitecture();
      mockStore.architectureReviewed = true;

      const { useDualAIPlan } = require('@/hooks/useDualAIPlan');
      const { result } = renderHook(() => useDualAIPlan());

      expect(result.current.needsArchitectureReview).toBe(false);
    });
  });
});
