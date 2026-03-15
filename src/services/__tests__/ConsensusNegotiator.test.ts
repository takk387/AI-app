/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ConsensusNegotiator Tests
 *
 * Tests the Stage 4 consensus negotiation between Claude and Gemini:
 * - Consensus reached in round 1
 * - Consensus after multiple rounds
 * - Escalation on non-convergence
 * - Max rounds escalation
 * - structuredClone integrity (round data immutability)
 * - AI parse failure fallback
 * - NegotiationSummary generation
 */

import type { AppConcept } from '@/types/appConcept';
import type {
  ArchitecturePosition,
  IntelligenceContext,
  ConsensusResult,
} from '@/types/dualPlanning';

// ============================================================================
// MOCKS
// ============================================================================

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockArchitecture(overrides?: Partial<ArchitecturePosition>): ArchitecturePosition {
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
    ...overrides,
  } as ArchitecturePosition;
}

function createMockConcept(): AppConcept {
  return {
    name: 'Test App',
    description: 'Test',
    purpose: 'Testing',
    targetUsers: 'Devs',
    coreFeatures: [{ name: 'Auth', description: 'Authentication' }],
    technical: { platform: 'web' },
    uiPreferences: { style: 'modern', theme: 'light' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as AppConcept;
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

/**
 * Mock fetch to return specific review responses.
 * callIndex tracks which call is which (Claude review, Gemini review, Claude adjust, Gemini adjust, etc.)
 */
function mockAIResponse(response: object) {
  return {
    ok: true,
    json: () => Promise.resolve({ content: JSON.stringify(response) }),
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('ConsensusNegotiator', () => {
  let negotiator: InstanceType<
    typeof import('@/services/ConsensusNegotiator').ConsensusNegotiatorService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    const { ConsensusNegotiatorService } = require('@/services/ConsensusNegotiator');
    negotiator = new ConsensusNegotiatorService('http://localhost:3000');
  });

  describe('Consensus in Round 1', () => {
    it('should reach consensus when both AIs have no disagreements', async () => {
      // Both reviews return no disagreements
      mockFetch.mockResolvedValue(
        mockAIResponse({
          feedback: 'Great architecture!',
          agreements: ['Database choice', 'API style'],
          disagreements: [],
          proposedAdjustments: {},
        })
      );

      const result = await negotiator.negotiate(
        createMockArchitecture(),
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence()
      );

      expect(result.reached).toBe(true);
      expect(result.rounds).toHaveLength(1);
      expect(result.finalArchitecture).toBeDefined();
    });

    it('should merge agreements from both AIs', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        // Claude review
        if (callCount === 1) {
          return Promise.resolve(
            mockAIResponse({
              feedback: 'Good',
              agreements: ['Database is solid'],
              disagreements: [],
              proposedAdjustments: {},
            })
          );
        }
        // Gemini review
        return Promise.resolve(
          mockAIResponse({
            feedback: 'Good',
            agreements: ['API design is clean'],
            disagreements: [],
            proposedAdjustments: {},
          })
        );
      });

      const result = await negotiator.negotiate(
        createMockArchitecture(),
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence()
      );

      expect(result.reached).toBe(true);
      expect(result.rounds[0].agreements).toContain('Database is solid');
      expect(result.rounds[0].agreements).toContain('API design is clean');
    });
  });

  describe('Consensus After Multiple Rounds', () => {
    it('should resolve after decreasing disagreements', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        // Round 1 reviews: 2 disagreements
        if (callCount <= 2) {
          return Promise.resolve(
            mockAIResponse({
              feedback: 'Some issues',
              agreements: ['Auth approach'],
              disagreements:
                callCount === 1
                  ? [
                      {
                        topic: 'Database',
                        myStance: 'Postgres',
                        otherStance: 'MongoDB',
                        myReasoning: 'Better joins',
                        willingToCompromise: true,
                      },
                    ]
                  : [
                      {
                        topic: 'Caching',
                        myStance: 'Redis',
                        otherStance: 'In-memory',
                        myReasoning: 'Scales better',
                        willingToCompromise: true,
                      },
                    ],
              proposedAdjustments: {},
            })
          );
        }
        // Round 1 adjustments: return architecture
        if (callCount <= 4) {
          return Promise.resolve(mockAIResponse(createMockArchitecture()));
        }
        // Round 2 reviews: 0 disagreements (consensus!)
        return Promise.resolve(
          mockAIResponse({
            feedback: 'Agreed',
            agreements: ['Database', 'Caching', 'Auth'],
            disagreements: [],
            proposedAdjustments: {},
          })
        );
      });

      const result = await negotiator.negotiate(
        createMockArchitecture(),
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence()
      );

      expect(result.reached).toBe(true);
      expect(result.rounds).toHaveLength(2);
    });
  });

  describe('Escalation on Non-Convergence', () => {
    it('should escalate when disagreements do not decrease', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        // All reviews return same number of disagreements (not converging)
        if (callCount % 4 <= 2) {
          return Promise.resolve(
            mockAIResponse({
              feedback: 'Disagree',
              agreements: [],
              disagreements: [
                {
                  topic: 'Database',
                  myStance: 'A',
                  otherStance: 'B',
                  myReasoning: 'reason',
                  willingToCompromise: false,
                },
                {
                  topic: 'Auth',
                  myStance: 'X',
                  otherStance: 'Y',
                  myReasoning: 'reason',
                  willingToCompromise: false,
                },
              ],
              proposedAdjustments: {},
            })
          );
        }
        // Adjustments return architecture
        return Promise.resolve(mockAIResponse(createMockArchitecture()));
      });

      const result = await negotiator.negotiate(
        createMockArchitecture(),
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence()
      );

      expect(result.reached).toBe(false);
      expect(result.escalationReason).toContain('not converging');
    });
  });

  describe('Max Rounds Escalation', () => {
    it('should escalate after 5 rounds if disagreements remain', async () => {
      let roundCount = 0;
      mockFetch.mockImplementation(() => {
        // Track round boundaries (2 review calls per round)
        roundCount++;
        const currentRound = Math.ceil(roundCount / 4); // 4 calls per round (2 reviews + 2 adjustments)
        const disagreementCount = Math.max(1, 6 - currentRound); // Decreasing: 5, 4, 3, 2, 1

        // Reviews
        if (roundCount % 4 <= 2 && roundCount % 4 !== 0) {
          return Promise.resolve(
            mockAIResponse({
              feedback: `Round ${currentRound}`,
              agreements: [],
              disagreements: Array.from({ length: disagreementCount }, (_, i) => ({
                topic: `Issue ${i}`,
                myStance: 'A',
                otherStance: 'B',
                myReasoning: 'reason',
                willingToCompromise: true,
              })),
              proposedAdjustments: {},
            })
          );
        }
        // Adjustments
        return Promise.resolve(mockAIResponse(createMockArchitecture()));
      });

      const roundCallbacks: number[] = [];
      const result = await negotiator.negotiate(
        createMockArchitecture(),
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence(),
        (round) => roundCallbacks.push(round)
      );

      expect(result.reached).toBe(false);
      expect(result.escalationReason).toContain('5 rounds');
    });
  });

  describe('structuredClone Integrity', () => {
    it('should preserve round data when architectures are mutated later', async () => {
      const mutableArch = createMockArchitecture();
      let callCount = 0;

      mockFetch.mockImplementation(() => {
        callCount++;
        // Round 1: 1 disagreement
        if (callCount <= 2) {
          return Promise.resolve(
            mockAIResponse({
              feedback: 'Review',
              agreements: [],
              disagreements: [
                {
                  topic: 'DB',
                  myStance: 'A',
                  otherStance: 'B',
                  myReasoning: 'r',
                  willingToCompromise: true,
                },
              ],
              proposedAdjustments: {},
            })
          );
        }
        // Adjustment: return MUTATED architecture (different provider)
        if (callCount <= 4) {
          return Promise.resolve(
            mockAIResponse({
              ...createMockArchitecture(),
              database: { provider: 'mongodb', models: [] },
            })
          );
        }
        // Round 2: consensus
        return Promise.resolve(
          mockAIResponse({
            feedback: 'Agreed',
            agreements: ['All'],
            disagreements: [],
            proposedAdjustments: {},
          })
        );
      });

      const result = await negotiator.negotiate(
        mutableArch,
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence()
      );

      // Round 1 should still have the ORIGINAL architecture, not the mutated one
      expect(result.rounds[0].claudePosition.database.provider).toBe('postgresql');
    });
  });

  describe('AI Parse Failure Fallback', () => {
    it('should return empty review when AI returns invalid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: 'This is not JSON at all' }),
      });

      const result = await negotiator.negotiate(
        createMockArchitecture(),
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence()
      );

      // Should not throw — should handle gracefully
      expect(result.rounds).toHaveLength(1);
      expect(result.reached).toBe(true); // Empty disagreements = consensus
    });

    it('should return fallback review when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await negotiator.negotiate(
        createMockArchitecture(),
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence()
      );

      // Should not throw
      expect(result).toBeDefined();
      expect(result.rounds).toHaveLength(1);
    });
  });

  describe('NegotiationSummary', () => {
    it('should generate correct summary for consensus result', () => {
      const consensusResult: ConsensusResult = {
        reached: true,
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
                claudeStance: '',
                geminiStance: '',
                reasoning: { claude: '', gemini: '' },
              },
            ],
          },
          {
            round: 2,
            claudePosition: createMockArchitecture(),
            geminiPosition: createMockArchitecture(),
            claudeFeedback: '',
            geminiFeedback: '',
            agreements: ['All'],
            disagreements: [],
          },
        ],
        finalArchitecture: createMockArchitecture() as any,
      };

      const summary = negotiator.getNegotiationSummary(consensusResult);

      expect(summary.reached).toBe(true);
      expect(summary.totalRounds).toBe(2);
      expect(summary.finalDisagreementCount).toBe(0);
      expect(summary.disagreementCountPerRound).toEqual([1, 0]);
      expect(summary.escalationReason).toBeNull();
    });

    it('should generate correct summary for escalation result', () => {
      const escalationResult: ConsensusResult = {
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
                claudeStance: '',
                geminiStance: '',
                reasoning: { claude: '', gemini: '' },
              },
            ],
          },
        ],
        escalationReason: 'Not converging',
        divergentIssues: [],
      };

      const summary = negotiator.getNegotiationSummary(escalationResult);

      expect(summary.reached).toBe(false);
      expect(summary.totalRounds).toBe(1);
      expect(summary.finalDisagreementCount).toBe(1);
      expect(summary.escalationReason).toBe('Not converging');
    });
  });

  describe('Round Complete Callback', () => {
    it('should call onRoundComplete for each round', async () => {
      mockFetch.mockResolvedValue(
        mockAIResponse({
          feedback: 'OK',
          agreements: ['All'],
          disagreements: [],
          proposedAdjustments: {},
        })
      );

      const roundCallback = jest.fn();
      await negotiator.negotiate(
        createMockArchitecture(),
        createMockArchitecture(),
        createMockConcept(),
        createMockIntelligence(),
        roundCallback
      );

      expect(roundCallback).toHaveBeenCalledWith(1, 5);
    });
  });
});
