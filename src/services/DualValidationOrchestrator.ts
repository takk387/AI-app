/**
 * DualValidationOrchestrator Service
 *
 * Stage 5 of the Dual AI Planning pipeline.
 * Both AIs independently validate the unified architecture against the user's
 * original AppConcept. If critical issues are found, triggers replanning.
 *
 * Key behaviors:
 * - Claude checks implementation feasibility
 * - Gemini checks agentic design quality
 * - Results merged and deduplicated
 * - Decision: approve if no critical issues AND coverage >= 95%
 * - Max 3 replan attempts
 *
 * Server-side only — calls /api/ai/claude and /api/ai/gemini proxy routes.
 */

import type { AppConcept } from '@/types/appConcept';
import type {
  UnifiedArchitecture,
  DualValidationResult,
  ValidationReport,
  ValidationIssue,
} from '@/types/dualPlanning';
import { MODEL_IDS } from '@/constants/aiModels';

// ============================================================================
// CONSTANTS
// ============================================================================

const COVERAGE_THRESHOLD = 95;

// ============================================================================
// SERVICE CLASS
// ============================================================================

class DualValidationOrchestratorService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? '';
  }

  /**
   * Validate a unified architecture against the original app concept.
   * Both AIs validate in parallel; results are merged and deduplicated.
   */
  async validate(
    architecture: UnifiedArchitecture,
    concept: AppConcept
  ): Promise<DualValidationResult> {
    const [claudeValidation, geminiValidation] = await Promise.all([
      this.claudeValidate(architecture, concept),
      this.geminiValidate(architecture, concept),
    ]);

    const finalReport = this.mergeValidations(claudeValidation, geminiValidation);

    return { claudeValidation, geminiValidation, finalReport };
  }

  // ==========================================================================
  // INDIVIDUAL VALIDATIONS
  // ==========================================================================

  private async claudeValidate(
    architecture: UnifiedArchitecture,
    concept: AppConcept
  ): Promise<ValidationReport> {
    const prompt = `You are validating an application architecture against the user's original concept.
Your focus: IMPLEMENTATION FEASIBILITY — can this architecture actually be built correctly?

ARCHITECTURE:
${JSON.stringify(architecture, null, 2)}

ORIGINAL APP CONCEPT:
- Name: ${concept.name}
- Description: ${concept.description}
- Purpose: ${concept.purpose}
- Target Users: ${concept.targetUsers}
- Core Features: ${JSON.stringify(concept.coreFeatures, null, 2)}
- Technical Requirements: ${JSON.stringify(concept.technical, null, 2)}
- Workflows: ${JSON.stringify(concept.workflows ?? [], null, 2)}
- Roles: ${JSON.stringify(concept.roles ?? [], null, 2)}

Check for:
1. Missing features from the concept that the architecture doesn't address
2. Gaps in user flows or workflows
3. Scaling bottlenecks in the database schema or API design
4. Security vulnerabilities in the auth or API approach
5. Performance issues with the chosen tech stack
6. Implementation complexity that might cause delays
7. Missing API endpoints for declared features
8. Database schema gaps (missing models or relationships)

Be thorough. If the architecture is solid, give high coverage. If issues exist, list them all.

Return ONLY valid JSON (no markdown):
{
  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "category": "missing_feature" | "flow_gap" | "scaling" | "security" | "performance" | "agentic_design",
      "description": "Clear description of the issue",
      "affectedFeatures": ["feature names"],
      "suggestedFix": "How to fix this"
    }
  ],
  "coverage": 0-100,
  "reasoning": "Overall assessment of architecture quality"
}`;

    return this.callAIAndParseValidation('claude', prompt, MODEL_IDS.CLAUDE_OPUS, true);
  }

  private async geminiValidate(
    architecture: UnifiedArchitecture,
    concept: AppConcept
  ): Promise<ValidationReport> {
    const prompt = `You are validating an application architecture against the user's original concept.
Your focus: AGENTIC DESIGN QUALITY — are AI-powered workflows properly designed?

ARCHITECTURE:
${JSON.stringify(architecture, null, 2)}

ORIGINAL APP CONCEPT:
- Name: ${concept.name}
- Description: ${concept.description}
- Purpose: ${concept.purpose}
- Target Users: ${concept.targetUsers}
- Core Features: ${JSON.stringify(concept.coreFeatures, null, 2)}
- Technical Requirements: ${JSON.stringify(concept.technical, null, 2)}
- Workflows: ${JSON.stringify(concept.workflows ?? [], null, 2)}
- Roles: ${JSON.stringify(concept.roles ?? [], null, 2)}

Check for:
1. Missing features from the concept that the architecture doesn't address
2. Opportunities for agentic workflows that were missed
3. Agentic workflows that are over-engineered (simpler approach would work)
4. Agent orchestration issues (deadlocks, race conditions, error propagation)
5. Scaling issues with AI-powered features (rate limits, costs, latency)
6. Security gaps in AI agent access patterns
7. Missing error handling for AI failures
8. Cost optimization opportunities

Be thorough and objective. Rate coverage honestly.

Return ONLY valid JSON (no markdown) in the same format as above.`;

    return this.callAIAndParseValidation('gemini', prompt, MODEL_IDS.GEMINI_PRO, false);
  }

  // ==========================================================================
  // MERGE & DECISION LOGIC
  // ==========================================================================

  private mergeValidations(
    claudeReport: ValidationReport,
    geminiReport: ValidationReport
  ): DualValidationResult['finalReport'] {
    const allIssues = [...claudeReport.issues, ...geminiReport.issues];
    const combinedIssues = this.deduplicateIssues(allIssues);

    const hasCriticalIssues = combinedIssues.some((i) => i.severity === 'critical');
    const overallCoverage = Math.round((claudeReport.coverage + geminiReport.coverage) / 2);

    return {
      combinedIssues,
      overallCoverage,
      needsReplan: hasCriticalIssues || overallCoverage < COVERAGE_THRESHOLD,
      approvedForExecution: !hasCriticalIssues && overallCoverage >= COVERAGE_THRESHOLD,
    };
  }

  private deduplicateIssues(issues: ValidationIssue[]): ValidationIssue[] {
    const unique: ValidationIssue[] = [];

    for (const issue of issues) {
      const isDuplicate = unique.some((existing) => {
        // Same category and similar description
        if (existing.category !== issue.category) return false;

        const existingDesc = existing.description.toLowerCase();
        const issueDesc = issue.description.toLowerCase();

        // Check for substantial overlap (>60% word match)
        const existingWords = new Set(existingDesc.split(/\s+/));
        const issueWords = issueDesc.split(/\s+/);
        const matchCount = issueWords.filter((w) => existingWords.has(w)).length;
        const overlapRatio = matchCount / Math.max(issueWords.length, 1);

        return overlapRatio > 0.6;
      });

      if (!isDuplicate) {
        unique.push(issue);
      } else {
        // If duplicate exists but new one is higher severity, upgrade
        const existingIdx = unique.findIndex((existing) => {
          const existingDesc = existing.description.toLowerCase();
          const issueDesc = issue.description.toLowerCase();
          const existingWords = new Set(existingDesc.split(/\s+/));
          const issueWords = issueDesc.split(/\s+/);
          const matchCount = issueWords.filter((w) => existingWords.has(w)).length;
          return matchCount / Math.max(issueWords.length, 1) > 0.6;
        });

        if (existingIdx !== -1) {
          const severityOrder = { critical: 3, warning: 2, suggestion: 1 };
          const existingSeverity = severityOrder[unique[existingIdx].severity];
          const newSeverity = severityOrder[issue.severity];
          if (newSeverity > existingSeverity) {
            unique[existingIdx] = issue;
          }
        }
      }
    }

    return unique;
  }

  // ==========================================================================
  // AI COMMUNICATION
  // ==========================================================================

  private async callAIAndParseValidation(
    provider: 'claude' | 'gemini',
    prompt: string,
    model: string,
    extendedThinking: boolean
  ): Promise<ValidationReport> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, extendedThinking }),
      });

      if (!response.ok) {
        throw new Error(`${provider} validation failed: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content ?? '';

      return this.parseValidationReport(text);
    } catch {
      // On failure, return a cautious report that doesn't block the pipeline
      return {
        issues: [
          {
            severity: 'warning',
            category: 'performance',
            description: `${provider} validation was unable to complete. Manual review recommended.`,
            affectedFeatures: [],
            suggestedFix: 'Review the architecture manually before proceeding.',
          },
        ],
        coverage: 80,
        reasoning: `${provider} validation could not be completed. Defaulting to cautious approval.`,
      };
    }
  }

  private parseValidationReport(text: string): ValidationReport {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          issues: Array.isArray(parsed.issues)
            ? parsed.issues.map((issue: Record<string, unknown>) => ({
                severity: issue.severity ?? 'suggestion',
                category: issue.category ?? 'performance',
                description: String(issue.description ?? ''),
                affectedFeatures: Array.isArray(issue.affectedFeatures)
                  ? issue.affectedFeatures
                  : [],
                suggestedFix: String(issue.suggestedFix ?? ''),
              }))
            : [],
          coverage: typeof parsed.coverage === 'number' ? parsed.coverage : 0,
          reasoning: String(parsed.reasoning ?? ''),
        };
      }
    } catch {
      // Fall through
    }

    return {
      issues: [],
      coverage: 0,
      reasoning: 'Could not parse validation response',
    };
  }
}

// Singleton export
export const dualValidationOrchestrator = new DualValidationOrchestratorService();
export { DualValidationOrchestratorService };
