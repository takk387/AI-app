/**
 * ConsensusNegotiator Service
 *
 * Stage 4 of the Dual AI Planning pipeline.
 * Facilitates negotiation between Claude and Gemini until they reach consensus
 * on architecture decisions. Maximum 5 rounds before escalating to user.
 *
 * Key behaviors:
 * - Claude Opus 4.6 (with extended thinking) reviews Gemini's architecture
 * - Gemini 3 Pro reviews Claude's architecture
 * - Claude questions coding approaches; Gemini proposes agentic alternatives
 * - Convergence check prevents infinite loops
 * - Progress callback per round for SSE streaming
 *
 * Server-side only — calls /api/ai/claude and /api/ai/gemini proxy routes.
 */

import type { AppConcept } from '@/types/appConcept';
import type {
  ArchitecturePosition,
  ConsensusResult,
  Disagreement,
  NegotiationRound,
  UnifiedArchitecture,
  IntelligenceContext,
} from '@/types/dualPlanning';
import { MODEL_IDS } from '@/constants/aiModels';

// ============================================================================
// TYPES
// ============================================================================

interface ReviewResponse {
  feedback: string;
  agreements: string[];
  disagreements: {
    topic: string;
    myStance: string;
    otherStance: string;
    myReasoning: string;
    willingToCompromise: boolean;
  }[];
  proposedAdjustments: Partial<ArchitecturePosition>;
}

type RoundCompleteCallback = (round: number, maxRounds: number) => void;

// ============================================================================
// SERVICE CLASS
// ============================================================================

class ConsensusNegotiatorService {
  private maxRounds = 5;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? '';
  }

  /**
   * Negotiate between two architecture positions until consensus or escalation.
   */
  async negotiate(
    claudeArch: ArchitecturePosition,
    geminiArch: ArchitecturePosition,
    appConcept: AppConcept,
    intelligence: IntelligenceContext,
    onRoundComplete?: RoundCompleteCallback
  ): Promise<ConsensusResult> {
    const rounds: NegotiationRound[] = [];
    let currentClaudeArch = claudeArch;
    let currentGeminiArch = geminiArch;

    for (let round = 1; round <= this.maxRounds; round++) {
      // Both AIs review each other's architecture in parallel
      const [claudeReview, geminiReview] = await Promise.all([
        this.claudeReviewsGemini(currentGeminiArch, currentClaudeArch, appConcept, intelligence),
        this.geminiReviewsClaude(currentClaudeArch, currentGeminiArch, appConcept, intelligence),
      ]);

      // Build round data
      const agreements = this.findAgreements(claudeReview, geminiReview);
      const disagreements = this.findDisagreements(claudeReview, geminiReview);

      const roundData: NegotiationRound = {
        round,
        claudePosition: currentClaudeArch,
        geminiPosition: currentGeminiArch,
        claudeFeedback: claudeReview.feedback,
        geminiFeedback: geminiReview.feedback,
        agreements,
        disagreements,
      };
      rounds.push(roundData);

      // Notify progress
      onRoundComplete?.(round, this.maxRounds);

      // Check for consensus
      if (disagreements.length === 0) {
        const finalArchitecture = this.mergeArchitectures(
          currentClaudeArch,
          currentGeminiArch,
          agreements,
          rounds.length
        );
        return { reached: true, rounds, finalArchitecture };
      }

      // Check convergence before continuing
      if (rounds.length >= 2 && !this.isConverging(rounds)) {
        return {
          reached: false,
          rounds,
          escalationReason: 'Negotiation not converging — disagreements are not decreasing',
          divergentIssues: disagreements,
        };
      }

      // Both AIs adjust their architectures based on feedback
      const [updatedClaude, updatedGemini] = await Promise.all([
        this.claudeAdjustsArchitecture(currentClaudeArch, geminiReview, disagreements, appConcept),
        this.geminiAdjustsArchitecture(currentGeminiArch, claudeReview, disagreements, appConcept),
      ]);

      currentClaudeArch = updatedClaude;
      currentGeminiArch = updatedGemini;
    }

    // Max rounds reached without consensus
    const finalDisagreements = rounds[rounds.length - 1].disagreements;
    return {
      reached: false,
      rounds,
      escalationReason: `Unable to reach consensus after ${this.maxRounds} rounds`,
      divergentIssues: finalDisagreements,
    };
  }

  // ==========================================================================
  // CROSS-REVIEW PHASE
  // ==========================================================================

  private async claudeReviewsGemini(
    geminiArch: ArchitecturePosition,
    ownArch: ArchitecturePosition,
    concept: AppConcept,
    intelligence: IntelligenceContext
  ): Promise<ReviewResponse> {
    const prompt = `You are Claude, collaborating with Gemini 3 Pro to create the best possible application architecture.

YOUR CURRENT ARCHITECTURE:
${JSON.stringify(ownArch, null, 2)}

GEMINI'S CURRENT ARCHITECTURE:
${JSON.stringify(geminiArch, null, 2)}

APP CONCEPT:
- Name: ${concept.name}
- Description: ${concept.description}
- Purpose: ${concept.purpose}
- Features: ${JSON.stringify(concept.coreFeatures, null, 2)}
- Technical: ${JSON.stringify(concept.technical, null, 2)}

LATEST INTELLIGENCE:
${JSON.stringify(intelligence, null, 2)}

Your role: Review Gemini's architecture with focus on IMPLEMENTATION FEASIBILITY.
- Question coding complexity and over-engineering
- Evaluate if agentic workflows are genuinely needed or overcomplicating things
- Check database schema correctness and query performance
- Verify API design follows REST/GraphQL best practices
- Assess security of auth approach

Be objective. If Gemini's approach is better, say so.

Return ONLY valid JSON (no markdown):
{
  "feedback": "Overall assessment in 2-3 sentences",
  "agreements": ["aspect we agree on", ...],
  "disagreements": [
    {
      "topic": "e.g. database choice",
      "myStance": "my preferred approach",
      "otherStance": "Gemini's approach",
      "myReasoning": "why mine is better",
      "willingToCompromise": true
    }
  ],
  "proposedAdjustments": {}
}`;

    return this.callAIAndParse('claude', prompt, MODEL_IDS.CLAUDE_OPUS, true);
  }

  private async geminiReviewsClaude(
    claudeArch: ArchitecturePosition,
    ownArch: ArchitecturePosition,
    concept: AppConcept,
    intelligence: IntelligenceContext
  ): Promise<ReviewResponse> {
    const prompt = `You are Gemini, collaborating with Claude Opus 4.6 to create the best possible application architecture.

YOUR CURRENT ARCHITECTURE:
${JSON.stringify(ownArch, null, 2)}

CLAUDE'S CURRENT ARCHITECTURE:
${JSON.stringify(claudeArch, null, 2)}

APP CONCEPT:
- Name: ${concept.name}
- Description: ${concept.description}
- Purpose: ${concept.purpose}
- Features: ${JSON.stringify(concept.coreFeatures, null, 2)}
- Technical: ${JSON.stringify(concept.technical, null, 2)}

LATEST INTELLIGENCE:
${JSON.stringify(intelligence, null, 2)}

Your role: Review Claude's architecture with focus on AGENTIC OPPORTUNITIES.
- Identify where agentic workflows could simplify or improve the architecture
- Question traditional approaches when agent-based alternatives exist
- Propose multi-agent systems where beneficial
- Evaluate scalability with modern AI-powered patterns
- Consider cost-effectiveness of different approaches

Be objective. If Claude's approach is better, say so.

Return ONLY valid JSON (no markdown):
{
  "feedback": "Overall assessment in 2-3 sentences",
  "agreements": ["aspect we agree on", ...],
  "disagreements": [
    {
      "topic": "e.g. content moderation approach",
      "myStance": "my preferred approach",
      "otherStance": "Claude's approach",
      "myReasoning": "why mine is better",
      "willingToCompromise": true
    }
  ],
  "proposedAdjustments": {}
}`;

    return this.callAIAndParse('gemini', prompt, MODEL_IDS.GEMINI_PRO, false);
  }

  // ==========================================================================
  // ADJUSTMENT PHASE
  // ==========================================================================

  private async claudeAdjustsArchitecture(
    currentArch: ArchitecturePosition,
    geminiReview: ReviewResponse,
    disagreements: Disagreement[],
    concept: AppConcept
  ): Promise<ArchitecturePosition> {
    const prompt = `Based on Gemini's feedback, adjust your architecture.

YOUR CURRENT ARCHITECTURE:
${JSON.stringify(currentArch, null, 2)}

GEMINI'S FEEDBACK:
${JSON.stringify(geminiReview, null, 2)}

REMAINING DISAGREEMENTS:
${JSON.stringify(disagreements, null, 2)}

APP CONCEPT FEATURES: ${concept.coreFeatures?.map((f) => f.name).join(', ')}

Instructions:
1. Incorporate Gemini's valid points into your architecture
2. For areas where you still disagree, strengthen your reasoning
3. Propose compromises where possible
4. Focus on implementation feasibility

Return ONLY valid JSON matching the ArchitecturePosition structure:
{
  "database": { "provider": "...", "schema": "...", "models": [...] },
  "api": { "style": "...", "routes": [...] },
  "auth": { "provider": "...", "strategy": "...", "flows": [...] },
  "agentic": { "enabled": false, "workflows": [], "framework": "none" },
  "realtime": { "enabled": false, "technology": "none", "channels": [] },
  "techStack": { "framework": "...", "database": "...", "orm": "...", "libraries": [...] },
  "scaling": { "caching": { "strategy": "...", "layers": [...] }, "indexing": { "databaseIndexes": [...] }, "optimization": { "techniques": [...] } },
  "aiSelections": { "codeGeneration": "...", "testing": "...", "review": "..." }
}`;

    try {
      const response = await this.callAI('claude', prompt, MODEL_IDS.CLAUDE_OPUS, true);
      return this.parseArchitectureResponse(response, currentArch);
    } catch {
      return currentArch;
    }
  }

  private async geminiAdjustsArchitecture(
    currentArch: ArchitecturePosition,
    claudeReview: ReviewResponse,
    disagreements: Disagreement[],
    concept: AppConcept
  ): Promise<ArchitecturePosition> {
    const prompt = `Based on Claude's feedback, adjust your architecture.

YOUR CURRENT ARCHITECTURE:
${JSON.stringify(currentArch, null, 2)}

CLAUDE'S FEEDBACK:
${JSON.stringify(claudeReview, null, 2)}

REMAINING DISAGREEMENTS:
${JSON.stringify(disagreements, null, 2)}

APP CONCEPT FEATURES: ${concept.coreFeatures?.map((f) => f.name).join(', ')}

Instructions:
1. Incorporate Claude's valid points into your architecture
2. For areas where you still disagree, strengthen your reasoning
3. Propose compromises where possible
4. Focus on agentic opportunities that genuinely simplify the architecture

Return ONLY valid JSON matching the ArchitecturePosition structure (same format as input).`;

    try {
      const response = await this.callAI('gemini', prompt, MODEL_IDS.GEMINI_PRO, false);
      return this.parseArchitectureResponse(response, currentArch);
    } catch {
      return currentArch;
    }
  }

  // ==========================================================================
  // CONSENSUS LOGIC
  // ==========================================================================

  private findAgreements(claudeReview: ReviewResponse, geminiReview: ReviewResponse): string[] {
    const agreements = new Set<string>();

    // Agreements both AIs mention
    for (const ca of claudeReview.agreements) {
      agreements.add(ca);
    }
    for (const ga of geminiReview.agreements) {
      // Add if not already covered (or similar to existing)
      const normalized = ga.toLowerCase();
      const alreadyCovered = [...agreements].some(
        (existing) => existing.toLowerCase() === normalized
      );
      if (!alreadyCovered) {
        agreements.add(ga);
      }
    }

    return [...agreements];
  }

  private findDisagreements(
    claudeReview: ReviewResponse,
    geminiReview: ReviewResponse
  ): Disagreement[] {
    const disagreements: Disagreement[] = [];
    const processedTopics = new Set<string>();

    // Process Claude's disagreements
    for (const cd of claudeReview.disagreements) {
      const topicKey = cd.topic.toLowerCase();
      if (processedTopics.has(topicKey)) continue;
      processedTopics.add(topicKey);

      // Find matching Gemini disagreement
      const matchingGemini = geminiReview.disagreements.find(
        (gd) => gd.topic.toLowerCase() === topicKey
      );

      disagreements.push({
        topic: cd.topic,
        claudeStance: cd.myStance,
        geminiStance: matchingGemini?.myStance ?? cd.otherStance,
        reasoning: {
          claude: cd.myReasoning,
          gemini: matchingGemini?.myReasoning ?? '',
        },
      });
    }

    // Process Gemini's disagreements that Claude didn't mention
    for (const gd of geminiReview.disagreements) {
      const topicKey = gd.topic.toLowerCase();
      if (processedTopics.has(topicKey)) continue;
      processedTopics.add(topicKey);

      disagreements.push({
        topic: gd.topic,
        claudeStance: gd.otherStance,
        geminiStance: gd.myStance,
        reasoning: {
          claude: '',
          gemini: gd.myReasoning,
        },
      });
    }

    return disagreements;
  }

  private isConverging(rounds: NegotiationRound[]): boolean {
    if (rounds.length < 2) return true;

    const prev = rounds[rounds.length - 2];
    const current = rounds[rounds.length - 1];

    // Converging if disagreements are strictly decreasing
    return current.disagreements.length < prev.disagreements.length;
  }

  private mergeArchitectures(
    claudeArch: ArchitecturePosition,
    geminiArch: ArchitecturePosition,
    agreements: string[],
    totalRounds: number
  ): UnifiedArchitecture {
    // Since they've reached consensus, architectures should be nearly identical.
    // Use Claude's as base (implementation-focused) and enrich with Gemini's agentic insights.
    const merged: UnifiedArchitecture = {
      ...claudeArch,
      // If Gemini enabled agentic and Claude agreed, use Gemini's agentic section
      agentic: geminiArch.agentic.enabled ? geminiArch.agentic : claudeArch.agentic,
      consensusReport: {
        rounds: totalRounds,
        finalAgreements: agreements,
        compromises: [],
      },
    };

    return merged;
  }

  // ==========================================================================
  // AI COMMUNICATION
  // ==========================================================================

  private async callAI(
    provider: 'claude' | 'gemini',
    prompt: string,
    model: string,
    extendedThinking: boolean
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/ai/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, extendedThinking }),
    });

    if (!response.ok) {
      throw new Error(`AI call to ${provider} failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content ?? '';
  }

  private async callAIAndParse(
    provider: 'claude' | 'gemini',
    prompt: string,
    model: string,
    extendedThinking: boolean
  ): Promise<ReviewResponse> {
    try {
      const text = await this.callAI(provider, prompt, model, extendedThinking);
      return this.parseReviewResponse(text);
    } catch {
      return {
        feedback: `${provider} review failed, using empty review`,
        agreements: [],
        disagreements: [],
        proposedAdjustments: {},
      };
    }
  }

  // ==========================================================================
  // PARSERS
  // ==========================================================================

  private parseReviewResponse(text: string): ReviewResponse {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          feedback: parsed.feedback ?? '',
          agreements: Array.isArray(parsed.agreements) ? parsed.agreements : [],
          disagreements: Array.isArray(parsed.disagreements) ? parsed.disagreements : [],
          proposedAdjustments: parsed.proposedAdjustments ?? {},
        };
      }
    } catch {
      // Fall through
    }
    return {
      feedback: text.slice(0, 200),
      agreements: [],
      disagreements: [],
      proposedAdjustments: {},
    };
  }

  private parseArchitectureResponse(
    text: string,
    fallback: ArchitecturePosition
  ): ArchitecturePosition {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate that it has the expected top-level keys
        if (parsed.database && parsed.api && parsed.auth) {
          return parsed as ArchitecturePosition;
        }
      }
    } catch {
      // Fall through
    }
    return fallback;
  }
}

// Singleton export
export const consensusNegotiator = new ConsensusNegotiatorService();
export { ConsensusNegotiatorService };
