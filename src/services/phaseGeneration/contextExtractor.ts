/**
 * Context Extractor
 *
 * Extracts and enriches phase context from conversation history,
 * feature specifications, workflow definitions, and validation rules.
 */

import type { AppConcept } from '@/types/appConcept';
import type {
  FeatureDomain,
  DynamicPhase,
  FeatureSpecification,
  WorkflowSpecification,
  PhaseConceptContext,
} from '@/types/dynamicPhases';
import { truncateAtWordBoundary } from '@/utils/contextCompression';

import { PHASE_KEYWORDS } from './phaseKeywords';

// ============================================================================
// CONTEXT EXTRACTION
// ============================================================================

/**
 * Extract relevant context from conversationContext for a specific phase
 */
export function extractRelevantContext(context: string, domain: FeatureDomain): string {
  if (!context) return '';

  const keywords = PHASE_KEYWORDS[domain] || [];
  if (keywords.length === 0) return '';

  // Split context into paragraphs
  const paragraphs = context.split(/\n\n+/).filter((p) => p.trim().length > 20);

  // Score paragraphs by keyword relevance
  const scored = paragraphs.map((p) => {
    const lowerP = p.toLowerCase();
    const score = keywords.filter((k) => lowerP.includes(k.toLowerCase())).length;
    return { text: p, score };
  });

  // Get top relevant paragraphs (max 12000 chars for large complex apps)
  const relevant = scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((p) => p.text);

  const result = relevant.join('\n\n');
  const limit = 12000;

  if (result.length > limit) {
    // Add truncation notice so AI knows context was cut
    return (
      result.slice(0, limit) +
      `\n\n[NOTE: ${result.length - limit} additional characters of conversation context omitted. Focus on requirements above.]`
    );
  }
  return result;
}

/**
 * Extract feature specifications from concept for a phase
 */
export function extractFeatureSpecs(
  concept: AppConcept,
  domain: FeatureDomain,
  featureNames: string[]
): FeatureSpecification[] {
  const specs: FeatureSpecification[] = [];
  const context = concept.conversationContext || '';

  for (const featureName of featureNames) {
    // Extract user stories related to this feature
    const userStories = extractPatternMatches(
      context,
      new RegExp(
        `(?:as a|user (?:can|wants to|should))\\s+[^.]*${escapeRegex(featureName)}[^.]*`,
        'gi'
      )
    );

    // Extract acceptance criteria
    const acceptanceCriteria = extractPatternMatches(
      context,
      new RegExp(`(?:should|must|needs to)\\s+[^.]*${escapeRegex(featureName)}[^.]*`, 'gi')
    );

    // Extract technical notes
    const technicalNotes = extractPatternMatches(
      context,
      new RegExp(`(?:api|database|backend|endpoint)[^.]*${escapeRegex(featureName)}[^.]*`, 'gi')
    );

    // Determine priority from feature
    const feature = concept.coreFeatures.find((f) => f.name === featureName);
    const priority = feature?.priority || 'medium';

    specs.push({
      name: featureName,
      userStories: userStories.slice(0, 6),
      acceptanceCriteria: acceptanceCriteria.slice(0, 6),
      technicalNotes: technicalNotes.slice(0, 6),
      priority,
    });
  }

  return specs;
}

/**
 * Extract workflow specifications from concept for a phase
 */
export function extractWorkflowSpecs(
  concept: AppConcept,
  domain: FeatureDomain
): WorkflowSpecification[] {
  const specs: WorkflowSpecification[] = [];
  const keywords = PHASE_KEYWORDS[domain] || [];

  // Use workflows from concept if available
  if (concept.workflows) {
    for (const workflow of concept.workflows) {
      // Check if workflow is relevant to this phase
      const workflowText =
        `${workflow.name} ${workflow.description || ''} ${workflow.steps.join(' ')}`.toLowerCase();
      const isRelevant = keywords.some((k) => workflowText.includes(k.toLowerCase()));

      if (isRelevant) {
        specs.push({
          name: workflow.name,
          trigger: workflow.steps[0] || 'User initiates',
          steps: workflow.steps.map((step) => ({
            action: step,
            actor: workflow.involvedRoles[0] || 'User',
          })),
          errorHandling: undefined,
        });
      }
    }
  }

  return specs.slice(0, 10);
}

/**
 * Extract validation rules from conversation context
 */
export function extractValidationRules(context: string, domain: FeatureDomain): string[] {
  if (!context) return [];

  const patterns = [
    /(?:must be|should be|has to be)\s+([^.]{10,80})/gi,
    /(?:validate|validation|valid)\s+([^.]{10,80})/gi,
    /(?:required|mandatory|minimum|maximum)\s+([^.]{10,80})/gi,
    /(?:at least|at most|between)\s+([^.]{10,80})/gi,
  ];

  const rules: string[] = [];
  const keywords = PHASE_KEYWORDS[domain] || [];

  for (const pattern of patterns) {
    const matches = extractPatternMatches(context, pattern);
    // Filter by relevance to domain
    for (const match of matches) {
      if (keywords.some((k) => match.toLowerCase().includes(k.toLowerCase()))) {
        rules.push(match);
      }
    }
  }

  return Array.from(new Set(rules)).slice(0, 10);
}

// ============================================================================
// PATTERN MATCHING HELPERS
// ============================================================================

/**
 * Helper to extract pattern matches from text
 */
export function extractPatternMatches(text: string, pattern: RegExp): string[] {
  const matches: string[] = [];
  let match;
  const regex = new RegExp(pattern.source, pattern.flags);

  while ((match = regex.exec(text)) !== null) {
    const value = (match[1] || match[0]).trim();
    if (value.length > 5 && value.length < 150 && !matches.includes(value)) {
      matches.push(value);
    }
  }

  return matches;
}

/**
 * Escape special regex characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// PHASE CONTEXT ENHANCEMENT
// ============================================================================

/**
 * Enhance a phase with rich context from the concept
 */
export function enhancePhaseWithContext(phase: DynamicPhase, concept: AppConcept): DynamicPhase {
  const domain = phase.domain;
  const conversationContext = concept.conversationContext || '';

  // Extract relevant context for this phase
  const relevantContext = extractRelevantContext(conversationContext, domain);

  // Extract feature specifications
  const featureSpecs = extractFeatureSpecs(concept, domain, phase.features);

  // Extract workflow specifications
  const workflowSpecs = extractWorkflowSpecs(concept, domain);

  // Extract validation rules
  const validationRules = extractValidationRules(conversationContext, domain);

  // Build enhanced concept context
  const enhancedConceptContext: PhaseConceptContext = {
    ...phase.conceptContext,
    conversationContext: relevantContext,
    featureSpecs: featureSpecs.length > 0 ? featureSpecs : undefined,
    workflowSpecs: workflowSpecs.length > 0 ? workflowSpecs : undefined,
    technicalConstraints: validationRules.length > 0 ? validationRules : undefined,
  };

  // Build enhanced description with context (using word-boundary-aware truncation)
  let enhancedDescription = phase.description;
  if (relevantContext) {
    enhancedDescription +=
      '\n\nContext from requirements:\n' + truncateAtWordBoundary(relevantContext, 500);
  }

  return {
    ...phase,
    description: enhancedDescription,
    conceptContext: enhancedConceptContext,
  };
}
