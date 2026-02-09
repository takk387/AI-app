/**
 * BackgroundPlanningOrchestrator Service
 *
 * Main coordinator for the Dual AI Planning pipeline.
 * Orchestrates all 5 stages and emits progress updates for SSE streaming.
 *
 * Pipeline flow:
 * 1. Layout Analysis (0-5%)
 * 2. Intelligence Gathering (5-20%)
 * 3. Parallel Architecture Generation (20-40%)
 * 4. Consensus Negotiation (40-80%)
 * 5. Dual Validation (80-100%)
 * 6. Replan if needed (max 3 attempts)
 *
 * Returns FinalValidatedArchitecture (NOT phases).
 * 10-minute global timeout.
 *
 * Server-side only.
 */

import type { AppConcept } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type {
  FinalValidatedArchitecture,
  UnifiedArchitecture,
  ArchitecturePosition,
  FrontendBackendNeeds,
  IntelligenceContext,
  DualPlanProgress,
  DualPlanStage,
  EscalationData,
} from '@/types/dualPlanning';
import { MODEL_IDS } from '@/constants/aiModels';
import { layoutBackendAnalyzer } from '@/services/LayoutBackendAnalyzer';
import { LiveIntelligenceGathererService } from '@/services/LiveIntelligenceGatherer';
import { ConsensusNegotiatorService } from '@/services/ConsensusNegotiator';
import { DualValidationOrchestratorService } from '@/services/DualValidationOrchestrator';

// ============================================================================
// CONSTANTS
// ============================================================================

const GLOBAL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REPLAN_ATTEMPTS = 3;

// ============================================================================
// TYPES
// ============================================================================

type ProgressCallback = (progress: DualPlanProgress) => void;

export interface PipelineResult {
  type: 'complete' | 'escalation' | 'error';
  architecture?: FinalValidatedArchitecture;
  /** Individual architectures from each AI (always included on complete and escalation) */
  claudeArchitecture?: ArchitecturePosition;
  geminiArchitecture?: ArchitecturePosition;
  negotiationRounds?: number;
  escalation?: EscalationData;
  error?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class BackgroundPlanningOrchestratorService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? '';
  }

  /**
   * Execute the full dual AI planning pipeline.
   */
  async execute(
    concept: AppConcept,
    manifest: LayoutManifest,
    onProgress?: ProgressCallback,
    cachedIntelligence?: IntelligenceContext
  ): Promise<PipelineResult> {
    const emitProgress = (
      stage: DualPlanStage,
      percent: number,
      message: string,
      details?: string,
      negotiationRound?: number,
      maxRounds?: number
    ) => {
      onProgress?.({ stage, percent, message, details, negotiationRound, maxRounds });
    };

    // Wrap in global timeout
    const timeoutPromise = new Promise<PipelineResult>((_, reject) => {
      setTimeout(
        () => reject(new Error('Planning pipeline timed out after 10 minutes')),
        GLOBAL_TIMEOUT_MS
      );
    });

    const pipelinePromise = this.runPipeline(concept, manifest, emitProgress, cachedIntelligence);

    try {
      return await Promise.race([pipelinePromise, timeoutPromise]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown pipeline error';
      emitProgress('error', 0, errorMessage);
      return { type: 'error', error: errorMessage };
    }
  }

  // ==========================================================================
  // PIPELINE EXECUTION
  // ==========================================================================

  private async runPipeline(
    concept: AppConcept,
    manifest: LayoutManifest,
    emitProgress: (
      stage: DualPlanStage,
      percent: number,
      message: string,
      details?: string,
      negotiationRound?: number,
      maxRounds?: number
    ) => void,
    cachedIntelligence?: IntelligenceContext
  ): Promise<PipelineResult> {
    // -----------------------------------------------------------------------
    // STAGE 1: Layout Analysis (0-5%)
    // -----------------------------------------------------------------------
    emitProgress('layout-analysis', 0, 'Analyzing layout for backend requirements...');

    const backendNeeds: FrontendBackendNeeds = layoutBackendAnalyzer.extractBackendNeeds(manifest);

    emitProgress(
      'layout-analysis',
      5,
      `Found ${backendNeeds.dataModels.length} data models, ${backendNeeds.apiEndpoints.length} API endpoints`,
      `Auth: ${backendNeeds.features.authRequired}, Realtime: ${backendNeeds.features.realtimeNeeded}`
    );

    // -----------------------------------------------------------------------
    // STAGE 2: Intelligence Gathering (5-20%)
    // -----------------------------------------------------------------------
    let intelligence: IntelligenceContext;

    if (cachedIntelligence) {
      // Use pre-gathered intelligence from background hook (started during Design step)
      intelligence = cachedIntelligence;
      emitProgress(
        'intelligence',
        20,
        'Using cached intelligence (gathered during design)',
        `Cached at ${intelligence.gatherTimestamp}, ${intelligence.agenticFrameworks.length} agentic tools`
      );
    } else {
      emitProgress('intelligence', 5, 'Gathering live intelligence from web...');

      const intelligenceGatherer = new LiveIntelligenceGathererService(this.baseUrl);
      intelligence = await intelligenceGatherer.gather(concept);

      emitProgress(
        'intelligence',
        20,
        'Intelligence gathering complete',
        `Gathered data on AI models, frameworks, ${intelligence.agenticFrameworks.length} agentic tools`
      );
    }

    // -----------------------------------------------------------------------
    // STAGE 3: Parallel Architecture Generation (20-40%)
    // -----------------------------------------------------------------------
    emitProgress(
      'parallel-generation',
      20,
      'Generating architectures — Claude Opus 4.6 + Gemini 3 Pro in parallel...'
    );

    const [claudeArch, geminiArch] = await Promise.all([
      this.generateClaudeArchitecture(concept, manifest, backendNeeds, intelligence),
      this.generateGeminiArchitecture(concept, manifest, backendNeeds, intelligence),
    ]);

    emitProgress(
      'parallel-generation',
      40,
      'Both architectures generated',
      `Claude: ${claudeArch.api.style} API, ${claudeArch.database.provider} DB | Gemini: ${geminiArch.api.style} API, ${geminiArch.database.provider} DB`
    );

    // -----------------------------------------------------------------------
    // STAGE 4: Consensus Negotiation (40-80%)
    // -----------------------------------------------------------------------
    emitProgress('consensus', 40, 'Starting consensus negotiation...', undefined, 0, 5);

    const negotiator = new ConsensusNegotiatorService(this.baseUrl);
    const consensusResult = await negotiator.negotiate(
      claudeArch,
      geminiArch,
      concept,
      intelligence,
      (round, maxRounds) => {
        const roundPercent = 40 + (round / maxRounds) * 40;
        emitProgress(
          'consensus',
          Math.round(roundPercent),
          `Negotiation round ${round}/${maxRounds}`,
          round === 1
            ? 'AIs exchanging initial reviews...'
            : `Refining architecture — ${5 - round} rounds remaining`,
          round,
          maxRounds
        );
      }
    );

    // Handle escalation (AIs couldn't agree)
    if (!consensusResult.reached) {
      emitProgress(
        'escalated',
        80,
        consensusResult.escalationReason ?? 'Consensus not reached',
        'User intervention required'
      );

      const lastRound = consensusResult.rounds[consensusResult.rounds.length - 1];
      return {
        type: 'escalation',
        escalation: {
          reason: consensusResult.escalationReason ?? 'AIs could not reach consensus',
          divergentIssues: consensusResult.divergentIssues ?? [],
          claudeArchitecture: lastRound?.claudePosition ?? claudeArch,
          geminiArchitecture: lastRound?.geminiPosition ?? geminiArch,
          negotiationRounds: consensusResult.rounds.length,
        },
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const unifiedArchitecture = consensusResult.finalArchitecture!;

    emitProgress(
      'consensus',
      80,
      `Consensus reached in ${consensusResult.rounds.length} round(s)`,
      `${unifiedArchitecture.consensusReport.finalAgreements.length} agreements`
    );

    // -----------------------------------------------------------------------
    // STAGE 5: Dual Validation (80-100%) with replan loop
    // -----------------------------------------------------------------------
    let currentArchitecture = unifiedArchitecture;
    let replanAttempts = 0;

    while (replanAttempts <= MAX_REPLAN_ATTEMPTS) {
      emitProgress(
        'validation',
        80 + replanAttempts * 5,
        replanAttempts === 0
          ? 'Both AIs validating architecture...'
          : `Revalidating after replan attempt ${replanAttempts}...`
      );

      const validator = new DualValidationOrchestratorService(this.baseUrl);
      const validationResult = await validator.validate(currentArchitecture, concept);

      if (validationResult.finalReport.approvedForExecution) {
        // Approved — build final result
        const finalArchitecture: FinalValidatedArchitecture = {
          ...currentArchitecture,
          validation: {
            approvedAt: new Date().toISOString(),
            coverage: validationResult.finalReport.overallCoverage,
            issuesResolved: validationResult.finalReport.combinedIssues.filter(
              (i) => i.severity === 'suggestion'
            ).length,
            replanAttempts,
          },
        };

        emitProgress(
          'complete',
          100,
          'Architecture planning complete!',
          `Coverage: ${validationResult.finalReport.overallCoverage}%, ${consensusResult.rounds.length} negotiation round(s)`
        );

        return {
          type: 'complete',
          architecture: finalArchitecture,
          claudeArchitecture: claudeArch,
          geminiArchitecture: geminiArch,
          negotiationRounds: consensusResult.rounds.length,
        };
      }

      // Needs replan
      if (replanAttempts >= MAX_REPLAN_ATTEMPTS) {
        // Max replans reached — approve with warnings
        const finalArchitecture: FinalValidatedArchitecture = {
          ...currentArchitecture,
          validation: {
            approvedAt: new Date().toISOString(),
            coverage: validationResult.finalReport.overallCoverage,
            issuesResolved: 0,
            replanAttempts,
          },
        };

        emitProgress(
          'complete',
          100,
          'Architecture approved with warnings (max replan attempts reached)',
          `Coverage: ${validationResult.finalReport.overallCoverage}%, ${validationResult.finalReport.combinedIssues.length} remaining issues`
        );

        return {
          type: 'complete',
          architecture: finalArchitecture,
          claudeArchitecture: claudeArch,
          geminiArchitecture: geminiArch,
          negotiationRounds: consensusResult.rounds.length,
        };
      }

      // Attempt replan with validation feedback
      emitProgress(
        'validation',
        85 + replanAttempts * 5,
        `Replanning — ${validationResult.finalReport.combinedIssues.filter((i) => i.severity === 'critical').length} critical issues to resolve`,
        `Attempt ${replanAttempts + 1}/${MAX_REPLAN_ATTEMPTS}`
      );

      currentArchitecture = await this.replanWithFeedback(
        currentArchitecture,
        validationResult.finalReport.combinedIssues,
        concept,
        intelligence
      );

      replanAttempts++;
    }

    // Should not reach here, but safety fallback
    return { type: 'error', error: 'Unexpected pipeline state' };
  }

  // ==========================================================================
  // ARCHITECTURE GENERATION
  // ==========================================================================

  private async generateClaudeArchitecture(
    concept: AppConcept,
    manifest: LayoutManifest,
    backendNeeds: FrontendBackendNeeds,
    intelligence: IntelligenceContext
  ): Promise<ArchitecturePosition> {
    const prompt = `You are designing the application architecture for this app concept.
Focus on IMPLEMENTATION FEASIBILITY — practical, buildable, and efficient.

APP CONCEPT:
- Name: ${concept.name}
- Description: ${concept.description}
- Purpose: ${concept.purpose}
- Target Users: ${concept.targetUsers}
- Features: ${JSON.stringify(concept.coreFeatures, null, 2)}
- Technical Requirements: ${JSON.stringify(concept.technical, null, 2)}
- Roles: ${JSON.stringify(concept.roles ?? [], null, 2)}
- Workflows: ${JSON.stringify(concept.workflows ?? [], null, 2)}

BACKEND NEEDS (extracted from layout):
${JSON.stringify(backendNeeds, null, 2)}

LAYOUT FEATURES DETECTED: ${manifest.detectedFeatures?.join(', ') ?? 'none'}

INTELLIGENCE (latest AI models, frameworks, best practices):
${JSON.stringify(intelligence, null, 2)}

Design the complete architecture. Include agentic workflows ONLY if they genuinely simplify the implementation.

Return ONLY valid JSON:
{
  "database": { "provider": "postgresql", "schema": "Prisma schema description", "models": [{ "name": "User", "fields": [{ "name": "id", "type": "String", "required": true, "unique": true }], "relations": [] }] },
  "api": { "style": "REST", "routes": [{ "method": "GET", "path": "/api/users", "handler": "getUsers", "middleware": ["auth"] }] },
  "auth": { "provider": "NextAuth", "strategy": "JWT", "flows": ["login", "signup"] },
  "agentic": { "enabled": false, "workflows": [], "framework": "none" },
  "realtime": { "enabled": false, "technology": "none", "channels": [] },
  "techStack": { "framework": "Next.js 15", "database": "PostgreSQL", "orm": "Prisma", "libraries": [] },
  "scaling": { "caching": { "strategy": "...", "layers": [] }, "indexing": { "databaseIndexes": [] }, "optimization": { "techniques": [] } },
  "aiSelections": { "codeGeneration": "${MODEL_IDS.CLAUDE_OPUS}", "testing": "${MODEL_IDS.GEMINI_PRO}", "review": "${MODEL_IDS.CLAUDE_OPUS}" }
}`;

    return this.callAIForArchitecture('claude', prompt, MODEL_IDS.CLAUDE_OPUS, true);
  }

  private async generateGeminiArchitecture(
    concept: AppConcept,
    manifest: LayoutManifest,
    backendNeeds: FrontendBackendNeeds,
    intelligence: IntelligenceContext
  ): Promise<ArchitecturePosition> {
    const prompt = `You are designing the application architecture for this app concept.
Focus on AGENTIC OPPORTUNITIES — where AI-powered workflows can simplify or enhance the app.

APP CONCEPT:
- Name: ${concept.name}
- Description: ${concept.description}
- Purpose: ${concept.purpose}
- Target Users: ${concept.targetUsers}
- Features: ${JSON.stringify(concept.coreFeatures, null, 2)}
- Technical Requirements: ${JSON.stringify(concept.technical, null, 2)}
- Roles: ${JSON.stringify(concept.roles ?? [], null, 2)}
- Workflows: ${JSON.stringify(concept.workflows ?? [], null, 2)}

BACKEND NEEDS (extracted from layout):
${JSON.stringify(backendNeeds, null, 2)}

LAYOUT FEATURES DETECTED: ${manifest.detectedFeatures?.join(', ') ?? 'none'}

INTELLIGENCE (latest AI models, frameworks, best practices):
${JSON.stringify(intelligence, null, 2)}

Design the complete architecture. Identify where agentic workflows add real value.
If the concept involves automation, content processing, moderation, or multi-step workflows,
propose agent-based solutions. Don't force agentic patterns where they're unnecessary.

Return ONLY valid JSON matching the same ArchitecturePosition structure:
{
  "database": { "provider": "...", "schema": "...", "models": [...] },
  "api": { "style": "...", "routes": [...] },
  "auth": { "provider": "...", "strategy": "...", "flows": [...] },
  "agentic": { "enabled": true/false, "workflows": [{ "name": "...", "description": "...", "trigger": "user_action", "agents": [{ "name": "...", "role": "...", "tools": [] }], "orchestration": "sequential" }], "framework": "LangChain" | "CrewAI" | "custom" | "none" },
  "realtime": { "enabled": true/false, "technology": "SSE" | "WebSocket" | "none", "channels": [...] },
  "techStack": { "framework": "...", "database": "...", "orm": "...", "libraries": [...] },
  "scaling": { "caching": {...}, "indexing": {...}, "optimization": {...} },
  "aiSelections": { "codeGeneration": "...", "testing": "...", "review": "..." }
}`;

    return this.callAIForArchitecture('gemini', prompt, MODEL_IDS.GEMINI_PRO, false);
  }

  // ==========================================================================
  // REPLAN WITH FEEDBACK
  // ==========================================================================

  private async replanWithFeedback(
    architecture: UnifiedArchitecture,
    issues: { severity: string; category: string; description: string; suggestedFix: string }[],
    concept: AppConcept,
    _intelligence: IntelligenceContext
  ): Promise<UnifiedArchitecture> {
    const criticalIssues = issues.filter((i) => i.severity === 'critical');

    const prompt = `The following architecture has validation issues that need to be fixed.

CURRENT ARCHITECTURE:
${JSON.stringify(architecture, null, 2)}

CRITICAL ISSUES TO FIX:
${JSON.stringify(criticalIssues, null, 2)}

ALL ISSUES:
${JSON.stringify(issues, null, 2)}

APP CONCEPT FEATURES: ${concept.coreFeatures?.map((f) => f.name).join(', ')}

Fix the critical issues while maintaining the existing architecture decisions.
Return the COMPLETE updated architecture as valid JSON.`;

    try {
      const response = await fetch(`${this.baseUrl}/api/ai/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: MODEL_IDS.CLAUDE_OPUS,
          extendedThinking: true,
        }),
      });

      if (!response.ok) return architecture;

      const data = await response.json();
      const text = data.content ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.database && parsed.api && parsed.auth) {
          return {
            ...parsed,
            consensusReport: architecture.consensusReport,
          } as UnifiedArchitecture;
        }
      }
    } catch {
      // Fall through
    }

    return architecture;
  }

  // ==========================================================================
  // AI COMMUNICATION
  // ==========================================================================

  private async callAIForArchitecture(
    provider: 'claude' | 'gemini',
    prompt: string,
    model: string,
    extendedThinking: boolean
  ): Promise<ArchitecturePosition> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, extendedThinking }),
      });

      if (!response.ok) {
        throw new Error(`${provider} architecture generation failed: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.database && parsed.api && parsed.auth) {
          return this.normalizeArchitecture(parsed);
        }
      }

      throw new Error(`Invalid architecture response from ${provider}`);
    } catch {
      // Return a minimal valid architecture as fallback
      return this.getDefaultArchitecture(provider);
    }
  }

  private normalizeArchitecture(parsed: Record<string, unknown>): ArchitecturePosition {
    return {
      database: (parsed.database as ArchitecturePosition['database']) ?? {
        provider: 'postgresql',
        models: [],
      },
      api: (parsed.api as ArchitecturePosition['api']) ?? { style: 'REST', routes: [] },
      auth: (parsed.auth as ArchitecturePosition['auth']) ?? {
        provider: 'NextAuth',
        strategy: 'JWT',
        flows: ['login'],
      },
      agentic: (parsed.agentic as ArchitecturePosition['agentic']) ?? {
        enabled: false,
        workflows: [],
        framework: 'none',
      },
      realtime: (parsed.realtime as ArchitecturePosition['realtime']) ?? {
        enabled: false,
        technology: 'none',
        channels: [],
      },
      techStack: (parsed.techStack as ArchitecturePosition['techStack']) ?? {
        framework: 'Next.js 15',
        database: 'PostgreSQL',
        orm: 'Prisma',
        libraries: [],
      },
      scaling: (parsed.scaling as ArchitecturePosition['scaling']) ?? {
        caching: { strategy: 'none', layers: [] },
        indexing: { databaseIndexes: [] },
        optimization: { techniques: [] },
      },
      aiSelections: (parsed.aiSelections as ArchitecturePosition['aiSelections']) ?? {
        codeGeneration: MODEL_IDS.CLAUDE_OPUS,
        testing: MODEL_IDS.GEMINI_PRO,
        review: MODEL_IDS.CLAUDE_OPUS,
      },
    };
  }

  private getDefaultArchitecture(provider: string): ArchitecturePosition {
    return {
      database: { provider: 'postgresql', models: [] },
      api: { style: 'REST', routes: [] },
      auth: { provider: 'NextAuth', strategy: 'JWT', flows: ['login', 'signup'] },
      agentic: {
        enabled: provider === 'gemini',
        workflows: [],
        framework: 'none',
      },
      realtime: { enabled: false, technology: 'none', channels: [] },
      techStack: {
        framework: 'Next.js 15',
        database: 'PostgreSQL',
        orm: 'Prisma',
        libraries: [],
      },
      scaling: {
        caching: { strategy: 'none', layers: [] },
        indexing: { databaseIndexes: [] },
        optimization: { techniques: [] },
      },
      aiSelections: {
        codeGeneration: MODEL_IDS.CLAUDE_OPUS,
        testing: MODEL_IDS.GEMINI_PRO,
        review: MODEL_IDS.CLAUDE_OPUS,
      },
    };
  }
}

// Singleton export
export const backgroundPlanningOrchestrator = new BackgroundPlanningOrchestratorService();
export { BackgroundPlanningOrchestratorService };
