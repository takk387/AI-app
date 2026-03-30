/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * BackgroundPlanningOrchestrator Tests
 *
 * Tests the 5-stage dual AI planning pipeline orchestrator:
 * - Pipeline completion flow
 * - Escalation on no consensus
 * - Global timeout handling
 * - Cached intelligence skip for Stage 2
 * - Progress callbacks use stageProgress
 */

import type { AppConcept } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type {
  ArchitecturePosition,
  IntelligenceContext,
  DualPlanProgress,
} from '@/types/dualPlanning';

// ============================================================================
// MOCKS
// ============================================================================

// Mock all service dependencies
jest.mock('@/services/LayoutBackendAnalyzer', () => ({
  layoutBackendAnalyzer: {
    extractBackendNeeds: jest.fn().mockReturnValue({
      dataModels: [
        { name: 'User', fields: ['id', 'email'], relationships: [], inferredFrom: 'form' },
      ],
      apiEndpoints: [
        { method: 'GET', path: '/api/users', purpose: 'List users', triggeredBy: 'table' },
      ],
      stateManagement: { globalState: [], localState: [], complexity: 'simple' },
      features: {
        authRequired: false,
        realtimeNeeded: false,
        fileUploads: false,
        searchNeeded: false,
        paginationNeeded: false,
        cachingNeeded: false,
      },
      performance: { expectedDataVolume: 'low', queryComplexity: 'simple', concurrentUsers: 10 },
    }),
  },
}));

jest.mock('@/services/LiveIntelligenceGatherer', () => ({
  LiveIntelligenceGathererService: jest.fn().mockImplementation(() => ({
    gather: jest.fn().mockResolvedValue(createMockIntelligence()),
  })),
}));

jest.mock('@/services/ConsensusNegotiator', () => ({
  ConsensusNegotiatorService: jest.fn().mockImplementation(() => ({
    negotiate: jest.fn().mockResolvedValue({
      reached: true,
      rounds: [
        {
          round: 1,
          claudePosition: {},
          geminiPosition: {},
          claudeFeedback: '',
          geminiFeedback: '',
          agreements: ['DB choice'],
          disagreements: [],
        },
      ],
      finalArchitecture: createMockUnifiedArchitecture(),
    }),
  })),
}));

jest.mock('@/services/DualValidationOrchestrator', () => ({
  DualValidationOrchestratorService: jest.fn().mockImplementation(() => ({
    validate: jest.fn().mockResolvedValue({
      finalReport: {
        approvedForExecution: true,
        overallCoverage: 95,
        combinedIssues: [],
      },
    }),
  })),
}));

// Mock fetch for AI calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockConcept(): AppConcept {
  return {
    name: 'Test App',
    description: 'A test application',
    purpose: 'Testing',
    targetUsers: 'Developers',
    coreFeatures: [{ name: 'Auth', description: 'User authentication' }],
    technical: { platform: 'web', framework: 'Next.js' },
    uiPreferences: { style: 'modern', theme: 'light' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as AppConcept;
}

function createMockManifest(): LayoutManifest {
  return {
    id: 'test-manifest',
    components: [],
    detectedFeatures: ['auth', 'dashboard'],
  } as unknown as LayoutManifest;
}

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

function createMockUnifiedArchitecture() {
  return {
    ...createMockArchitecture(),
    consensusReport: { rounds: 1, finalAgreements: ['DB choice'], compromises: [] },
  };
}

function createMockIntelligence(): IntelligenceContext {
  return {
    aiModels: [],
    frameworks: [],
    libraries: [],
    agenticFrameworks: [],
    bestPractices: [],
    recommendations: {
      codeGeneration: { primary: '', alternative: '', reasoning: '', costEstimate: '' },
      testing: { primary: '', alternative: '', reasoning: '', costEstimate: '' },
      review: { primary: '', alternative: '', reasoning: '', costEstimate: '' },
    },
    gatherTimestamp: new Date().toISOString(),
    sources: [],
  } as unknown as IntelligenceContext;
}

// ============================================================================
// TESTS
// ============================================================================

describe('BackgroundPlanningOrchestrator', () => {
  let orchestrator: InstanceType<
    typeof import('@/services/BackgroundPlanningOrchestrator').BackgroundPlanningOrchestratorService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: JSON.stringify(createMockArchitecture()),
        }),
    });

    // Import fresh each test to reset module state
    const {
      BackgroundPlanningOrchestratorService,
    } = require('@/services/BackgroundPlanningOrchestrator');
    orchestrator = new BackgroundPlanningOrchestratorService('http://localhost:3000');
  });

  describe('Pipeline Completion', () => {
    it('should complete pipeline with type "complete" when consensus reached', async () => {
      const result = await orchestrator.execute(createMockConcept(), createMockManifest());

      expect(result.type).toBe('complete');
      expect(result.architecture).toBeDefined();
      expect(result.architecture?.validation).toBeDefined();
      expect(result.claudeArchitecture).toBeDefined();
      expect(result.geminiArchitecture).toBeDefined();
    });

    it('should include negotiation round count in result', async () => {
      const result = await orchestrator.execute(createMockConcept(), createMockManifest());

      expect(result.type).toBe('complete');
      expect(result.negotiationRounds).toBe(1);
    });
  });

  describe('Escalation', () => {
    it('should return escalation when consensus not reached', async () => {
      const { ConsensusNegotiatorService } = require('@/services/ConsensusNegotiator');
      ConsensusNegotiatorService.mockImplementation(() => ({
        negotiate: jest.fn().mockResolvedValue({
          reached: false,
          rounds: [
            {
              round: 1,
              claudePosition: createMockArchitecture(),
              geminiPosition: createMockArchitecture(),
              claudeFeedback: '',
              geminiFeedback: '',
              agreements: [],
              disagreements: [
                {
                  topic: 'DB',
                  claudeStance: 'Postgres',
                  geminiStance: 'MongoDB',
                  reasoning: { claude: '', gemini: '' },
                },
              ],
            },
          ],
          escalationReason: 'Negotiation not converging',
          divergentIssues: [
            {
              topic: 'DB',
              claudeStance: 'Postgres',
              geminiStance: 'MongoDB',
              reasoning: { claude: '', gemini: '' },
            },
          ],
        }),
      }));

      const result = await orchestrator.execute(createMockConcept(), createMockManifest());

      expect(result.type).toBe('escalation');
      expect(result.escalation).toBeDefined();
      expect(result.escalation?.reason).toContain('not converging');
      expect(result.escalation?.divergentIssues).toHaveLength(1);
    });
  });

  describe('Global Timeout', () => {
    it('should return error type when pipeline throws', async () => {
      // Instead of testing the actual setTimeout-based timeout (which interacts
      // poorly with Jest fake timers + async promise chains), we verify that
      // the orchestrator's catch block returns { type: 'error' } when the
      // pipeline throws any error — which is the same code path the timeout hits.
      const { ConsensusNegotiatorService } = require('@/services/ConsensusNegotiator');
      ConsensusNegotiatorService.mockImplementation(() => ({
        negotiate: jest
          .fn()
          .mockRejectedValue(new Error('Planning pipeline timed out after 10 minutes')),
      }));

      const result = await orchestrator.execute(createMockConcept(), createMockManifest());

      expect(result.type).toBe('error');
      expect(result.error).toContain('timed out');
    });
  });

  describe('Cached Intelligence', () => {
    it('should skip Stage 2 when cached intelligence provided', async () => {
      const cached = createMockIntelligence();
      const progressCalls: DualPlanProgress[] = [];

      await orchestrator.execute(
        createMockConcept(),
        createMockManifest(),
        (p) => progressCalls.push(p),
        cached
      );

      // Should see "Using cached intelligence" message, not "Gathering live intelligence"
      const intelligenceMessages = progressCalls.filter((p) => p.stage === 'intelligence');
      expect(intelligenceMessages.some((m) => m.message.includes('cached'))).toBe(true);
      expect(intelligenceMessages.some((m) => m.message.includes('live'))).toBe(false);

      // LiveIntelligenceGatherer should NOT have been called
      const { LiveIntelligenceGathererService } = require('@/services/LiveIntelligenceGatherer');
      const gatherCalls = LiveIntelligenceGathererService.mock.results;
      // If cached, no instance should have called gather
      if (gatherCalls.length > 0) {
        const gathererInstance = gatherCalls[0].value;
        expect(gathererInstance.gather).not.toHaveBeenCalled();
      }
    });
  });

  describe('Progress Callbacks', () => {
    it('should emit progress for all 5 stages plus complete', async () => {
      // Reset mocks to ensure clean consensus behavior
      const { ConsensusNegotiatorService } = require('@/services/ConsensusNegotiator');
      ConsensusNegotiatorService.mockImplementation(() => ({
        negotiate: jest.fn().mockResolvedValue({
          reached: true,
          rounds: [
            {
              round: 1,
              claudePosition: {},
              geminiPosition: {},
              claudeFeedback: '',
              geminiFeedback: '',
              agreements: ['DB'],
              disagreements: [],
            },
          ],
          finalArchitecture: createMockUnifiedArchitecture(),
        }),
      }));

      const {
        DualValidationOrchestratorService,
      } = require('@/services/DualValidationOrchestrator');
      DualValidationOrchestratorService.mockImplementation(() => ({
        validate: jest.fn().mockResolvedValue({
          finalReport: { approvedForExecution: true, overallCoverage: 95, combinedIssues: [] },
        }),
      }));

      const progressCalls: DualPlanProgress[] = [];

      // Need a fresh orchestrator since mocks were reset
      const {
        BackgroundPlanningOrchestratorService,
      } = require('@/services/BackgroundPlanningOrchestrator');
      const freshOrchestrator = new BackgroundPlanningOrchestratorService('http://localhost:3000');

      await freshOrchestrator.execute(
        createMockConcept(),
        createMockManifest(),
        (p: DualPlanProgress) => progressCalls.push(p)
      );

      const stages = new Set(progressCalls.map((p) => p.stage));
      expect(stages.has('layout-analysis')).toBe(true);
      expect(stages.has('intelligence')).toBe(true);
      expect(stages.has('parallel-generation')).toBe(true);
      expect(stages.has('consensus')).toBe(true);
      expect(stages.has('validation')).toBe(true);
      expect(stages.has('complete')).toBe(true);
    });

    it('should end with 100% on complete', async () => {
      // Reset mocks for clean run
      const { ConsensusNegotiatorService } = require('@/services/ConsensusNegotiator');
      ConsensusNegotiatorService.mockImplementation(() => ({
        negotiate: jest.fn().mockResolvedValue({
          reached: true,
          rounds: [
            {
              round: 1,
              claudePosition: {},
              geminiPosition: {},
              claudeFeedback: '',
              geminiFeedback: '',
              agreements: ['DB'],
              disagreements: [],
            },
          ],
          finalArchitecture: createMockUnifiedArchitecture(),
        }),
      }));

      const {
        DualValidationOrchestratorService,
      } = require('@/services/DualValidationOrchestrator');
      DualValidationOrchestratorService.mockImplementation(() => ({
        validate: jest.fn().mockResolvedValue({
          finalReport: { approvedForExecution: true, overallCoverage: 95, combinedIssues: [] },
        }),
      }));

      const progressCalls: DualPlanProgress[] = [];
      const {
        BackgroundPlanningOrchestratorService,
      } = require('@/services/BackgroundPlanningOrchestrator');
      const freshOrchestrator = new BackgroundPlanningOrchestratorService('http://localhost:3000');

      await freshOrchestrator.execute(
        createMockConcept(),
        createMockManifest(),
        (p: DualPlanProgress) => progressCalls.push(p)
      );

      const lastCall = progressCalls[progressCalls.length - 1];
      expect(lastCall.percent).toBe(100);
      expect(lastCall.stage).toBe('complete');
    });
  });
});
