/**
 * Phase Context Extractor
 *
 * Extracts context relevant to specific phase types from wizard conversations.
 * Uses segmentation, structured extraction, and optional embeddings for
 * intelligent context filtering.
 */

import type { ChatMessage } from '@/types/aiBuilderTypes';
import type { FeatureDomain } from '@/types/dynamicPhases';
import {
  segmentConversation,
  type ConversationSegment,
  type SegmentTopic,
} from './conversationSegmentation';
import {
  buildStructuredContext,
  type ExtractedFeature,
  type ExtractedWorkflow,
  type ExtractedTechnicalSpec,
} from './structuredExtraction';
import { cosineSimilarity, generateEmbedding, hasEmbeddingAPI } from './embeddings';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context extracted for a specific phase
 */
export interface PhaseContext {
  phaseType: FeatureDomain;
  relevantSegments: ConversationSegment[];
  extractedRequirements: string[];
  userDecisions: string[];
  technicalNotes: string[];
  featureSpecs: ExtractedFeature[];
  workflowSpecs: ExtractedWorkflow[];
  validationRules: string[];
  uiPatterns: string[];
  contextSummary: string;
  tokenEstimate: number;
}

/**
 * Map of phase types to relevant topic categories
 */
const PHASE_TOPICS: Record<FeatureDomain, SegmentTopic[]> = {
  setup: ['introduction', 'general'],
  database: ['data_model', 'technical_specs'],
  auth: ['user_roles', 'technical_specs'],
  'core-entity': ['data_model', 'feature_discussion'],
  feature: ['feature_discussion', 'workflow', 'ui_design'],
  'ui-component': ['ui_design', 'feature_discussion'],
  integration: ['integration', 'technical_specs'],
  'real-time': ['technical_specs', 'feature_discussion'],
  storage: ['technical_specs', 'feature_discussion'],
  notification: ['feature_discussion', 'workflow'],
  offline: ['technical_specs', 'feature_discussion'],
  search: ['feature_discussion', 'technical_specs'],
  analytics: ['feature_discussion', 'data_model'],
  admin: ['user_roles', 'feature_discussion'],
  'ui-role': ['user_roles', 'ui_design'],
  testing: ['technical_specs', 'general'],
  polish: ['ui_design', 'general'],
};

/**
 * Search queries for semantic similarity by phase type
 */
const PHASE_QUERIES: Record<FeatureDomain, string> = {
  setup: 'project setup configuration initialization folder structure dependencies',
  database: 'database schema data model tables fields relationships constraints migrations',
  auth: 'user authentication login register roles permissions security session jwt oauth',
  'core-entity': 'main entities business objects data structure core features',
  feature: 'feature implementation functionality user stories acceptance criteria validation',
  'ui-component': 'user interface components buttons forms modals navigation design',
  integration: 'API integration external services webhooks third-party connections',
  'real-time': 'real-time websocket live updates synchronization notifications',
  storage: 'file upload storage media images documents attachments s3 blob',
  notification: 'push notification email alerts messages in-app notifications',
  offline: 'offline support service worker local storage sync queue',
  search: 'search filtering autocomplete full-text indexing queries',
  analytics: 'analytics dashboard charts metrics reporting data visualization',
  admin: 'admin panel administration moderation user management settings',
  'ui-role': 'role-specific views dashboards access control permissions',
  testing: 'testing tests fixtures mocks unit tests integration tests',
  polish: 'polish animations transitions loading states error handling UX',
};

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract context relevant to a specific phase type
 */
export async function extractPhaseContext(
  messages: ChatMessage[],
  phaseType: FeatureDomain
): Promise<PhaseContext> {
  // Step 1: Segment the conversation
  const segmentResult = segmentConversation(messages);

  // Step 2: Get topic-relevant segments
  const relevantTopics = PHASE_TOPICS[phaseType] || ['general'];
  const topicSegments = segmentResult.segments.filter((s) => relevantTopics.includes(s.topic));

  // Step 3: If embedding API available, also do semantic search
  let semanticSegments: ConversationSegment[] = [];
  if (hasEmbeddingAPI() && segmentResult.segments.length > 0) {
    try {
      const phaseQuery = PHASE_QUERIES[phaseType] || phaseType;
      semanticSegments = await findSemanticallySimilarSegments(
        segmentResult.segments,
        phaseQuery,
        3
      );
    } catch (error) {
      console.warn('[PhaseContextExtractor] Semantic search failed:', error);
    }
  }

  // Step 4: Combine and deduplicate segments
  const allRelevant = [...topicSegments, ...semanticSegments];
  const uniqueSegments = deduplicateSegments(allRelevant);

  // Step 5: Get structured context from full conversation
  const structuredContext = buildStructuredContext(messages);

  // Step 6: Filter structured data relevant to this phase
  const relevantFeatures = filterFeaturesForPhase(structuredContext.features, phaseType);
  const relevantWorkflows = filterWorkflowsForPhase(structuredContext.workflows, phaseType);
  const relevantTechSpecs = filterTechSpecsForPhase(structuredContext.technicalSpecs, phaseType);

  // Step 7: Extract specific requirements from segments
  const extractedRequirements = extractRequirementsFromSegments(uniqueSegments, phaseType);
  const userDecisions = extractDecisionsFromSegments(uniqueSegments);
  const technicalNotes = extractTechnicalNotesFromSegments(uniqueSegments, phaseType);
  const validationRules = extractValidationRules(uniqueSegments, phaseType);
  const uiPatterns = extractUIPatterns(uniqueSegments, phaseType);

  // Step 8: Build context summary
  const contextSummary = buildPhaseContextSummary(
    uniqueSegments,
    relevantFeatures,
    relevantWorkflows,
    relevantTechSpecs,
    phaseType
  );

  // Step 9: Estimate tokens
  const tokenEstimate = estimateContextTokens(uniqueSegments, contextSummary);

  return {
    phaseType,
    relevantSegments: uniqueSegments,
    extractedRequirements,
    userDecisions,
    technicalNotes,
    featureSpecs: relevantFeatures,
    workflowSpecs: relevantWorkflows,
    validationRules,
    uiPatterns,
    contextSummary,
    tokenEstimate,
  };
}

// ============================================================================
// SEMANTIC SEARCH
// ============================================================================

/**
 * Find segments semantically similar to a query
 */
async function findSemanticallySimilarSegments(
  segments: ConversationSegment[],
  query: string,
  limit: number
): Promise<ConversationSegment[]> {
  const queryEmbedding = await generateEmbedding(query);

  const scored = await Promise.all(
    segments.map(async (segment) => {
      // Combine segment content for embedding
      const segmentText = [
        segment.summary,
        ...segment.keyPoints,
        ...segment.messages.slice(0, 3).map((m) => m.content.slice(0, 200)),
      ].join(' ');

      const segmentEmbedding = await generateEmbedding(segmentText);

      return {
        segment,
        score: cosineSimilarity(queryEmbedding.embedding, segmentEmbedding.embedding),
      };
    })
  );

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((s) => s.score > 0.4) // Minimum similarity threshold
    .map((s) => s.segment);
}

// ============================================================================
// FILTERING FUNCTIONS
// ============================================================================

/**
 * Deduplicate segments by ID
 */
function deduplicateSegments(segments: ConversationSegment[]): ConversationSegment[] {
  const seen = new Set<string>();
  const unique: ConversationSegment[] = [];

  for (const segment of segments) {
    if (!seen.has(segment.id)) {
      seen.add(segment.id);
      unique.push(segment);
    }
  }

  // Sort by importance and position
  return unique.sort((a, b) => {
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    const importanceDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
    if (importanceDiff !== 0) return importanceDiff;
    return a.startIndex - b.startIndex;
  });
}

/**
 * Filter features relevant to a specific phase type
 */
function filterFeaturesForPhase(
  features: ExtractedFeature[],
  phaseType: FeatureDomain
): ExtractedFeature[] {
  const phaseKeywords = getPhaseKeywords(phaseType);

  return features.filter((feature) => {
    const featureText =
      `${feature.name} ${feature.description} ${feature.technicalNotes.join(' ')}`.toLowerCase();
    return phaseKeywords.some((keyword) => featureText.includes(keyword.toLowerCase()));
  });
}

/**
 * Filter workflows relevant to a specific phase type
 */
function filterWorkflowsForPhase(
  workflows: ExtractedWorkflow[],
  phaseType: FeatureDomain
): ExtractedWorkflow[] {
  const phaseKeywords = getPhaseKeywords(phaseType);

  return workflows.filter((workflow) => {
    const workflowText =
      `${workflow.name} ${workflow.description} ${workflow.triggerCondition}`.toLowerCase();
    return phaseKeywords.some((keyword) => workflowText.includes(keyword.toLowerCase()));
  });
}

/**
 * Filter technical specs relevant to a specific phase type
 */
function filterTechSpecsForPhase(
  specs: ExtractedTechnicalSpec[],
  phaseType: FeatureDomain
): ExtractedTechnicalSpec[] {
  const categoryMap: Record<FeatureDomain, string[]> = {
    auth: ['auth'],
    database: ['database'],
    integration: ['api', 'integration'],
    'real-time': ['realtime'],
    storage: ['storage'],
    setup: ['other'],
    'core-entity': ['database'],
    feature: ['api', 'database'],
    'ui-component': [],
    notification: ['api'],
    offline: ['storage'],
    search: ['database', 'api'],
    analytics: ['database', 'api'],
    admin: ['auth', 'database'],
    'ui-role': ['auth'],
    testing: [],
    polish: [],
  };

  const relevantCategories = categoryMap[phaseType] || [];
  return specs.filter((spec) => relevantCategories.includes(spec.category));
}

/**
 * Get keywords for a phase type
 */
function getPhaseKeywords(phaseType: FeatureDomain): string[] {
  const keywordMap: Record<FeatureDomain, string[]> = {
    setup: ['setup', 'config', 'initialize', 'project', 'structure', 'dependencies'],
    database: ['database', 'schema', 'table', 'field', 'relationship', 'model', 'data'],
    auth: ['login', 'register', 'password', 'role', 'permission', 'session', 'auth'],
    'core-entity': ['entity', 'model', 'object', 'core', 'main', 'primary'],
    feature: ['feature', 'functionality', 'user story', 'acceptance', 'validation'],
    'ui-component': ['button', 'form', 'modal', 'component', 'ui', 'design', 'layout'],
    integration: ['api', 'integration', 'webhook', 'external', 'service', 'third-party'],
    'real-time': ['real-time', 'websocket', 'live', 'sync', 'push', 'instant'],
    storage: ['upload', 'file', 'image', 'storage', 'media', 'attachment'],
    notification: ['notification', 'alert', 'email', 'push', 'message'],
    offline: ['offline', 'sync', 'local', 'cache', 'service worker'],
    search: ['search', 'filter', 'query', 'find', 'autocomplete'],
    analytics: ['analytics', 'dashboard', 'chart', 'metric', 'report'],
    admin: ['admin', 'manage', 'moderate', 'settings', 'configuration'],
    'ui-role': ['dashboard', 'view', 'role', 'access', 'permission'],
    testing: ['test', 'mock', 'fixture', 'assertion'],
    polish: ['animation', 'transition', 'loading', 'error', 'empty state'],
  };

  return keywordMap[phaseType] || [];
}

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

/**
 * Extract requirements from segments for a specific phase
 */
function extractRequirementsFromSegments(
  segments: ConversationSegment[],
  phaseType: FeatureDomain
): string[] {
  const requirements: string[] = [];
  const keywords = getPhaseKeywords(phaseType);

  for (const segment of segments) {
    // Extract from key points
    for (const point of segment.keyPoints) {
      if (keywords.some((k) => point.toLowerCase().includes(k))) {
        requirements.push(point);
      }
    }

    // Extract from segment data
    const data = segment.extractedData;
    if (data.features) requirements.push(...data.features.slice(0, 3));
    if (data.technicalDecisions) requirements.push(...data.technicalDecisions.slice(0, 3));
    if (data.constraints) requirements.push(...data.constraints.slice(0, 2));
  }

  // Deduplicate
  return [...new Set(requirements)].slice(0, 15);
}

/**
 * Extract user decisions from segments
 */
function extractDecisionsFromSegments(segments: ConversationSegment[]): string[] {
  const decisions: string[] = [];

  for (const segment of segments) {
    if (segment.topic === 'confirmation') {
      decisions.push(...segment.keyPoints.slice(0, 3));
    }

    // Look for decision patterns in messages
    for (const msg of segment.messages) {
      const decisionMatch = msg.content.match(
        /(?:decided|agreed|confirmed|going with|chose|selected)\s+(?:to\s+)?(.{10,80}?)(?:\.|,|$)/gi
      );
      if (decisionMatch) {
        decisions.push(...decisionMatch.map((m) => m.trim()));
      }
    }
  }

  return [...new Set(decisions)].slice(0, 10);
}

/**
 * Extract technical notes from segments
 */
function extractTechnicalNotesFromSegments(
  segments: ConversationSegment[],
  _phaseType: FeatureDomain
): string[] {
  const notes: string[] = [];

  for (const segment of segments) {
    if (segment.topic === 'technical_specs') {
      notes.push(...segment.keyPoints);
      if (segment.extractedData.technicalDecisions) {
        notes.push(...segment.extractedData.technicalDecisions);
      }
    }
  }

  return [...new Set(notes)].slice(0, 10);
}

/**
 * Extract validation rules from segments
 */
function extractValidationRules(
  segments: ConversationSegment[],
  _phaseType: FeatureDomain
): string[] {
  const rules: string[] = [];

  for (const segment of segments) {
    for (const msg of segment.messages) {
      // Look for validation patterns
      const validationPatterns = [
        /(?:must be|should be|has to be)\s+([^.]+)/gi,
        /(?:validate|validation|valid)\s+([^.]+)/gi,
        /(?:required|mandatory|minimum|maximum)\s+([^.]+)/gi,
        /(?:at least|at most|between)\s+([^.]+)/gi,
      ];

      for (const pattern of validationPatterns) {
        let match;
        while ((match = pattern.exec(msg.content)) !== null) {
          const rule = match[1].trim();
          if (rule.length > 5 && rule.length < 100) {
            rules.push(rule);
          }
        }
      }
    }
  }

  return [...new Set(rules)].slice(0, 10);
}

/**
 * Extract UI patterns from segments
 */
function extractUIPatterns(segments: ConversationSegment[], _phaseType: FeatureDomain): string[] {
  const patterns: string[] = [];

  for (const segment of segments) {
    if (segment.topic === 'ui_design') {
      patterns.push(...segment.keyPoints);
      if (segment.extractedData.uiElements) {
        patterns.push(...segment.extractedData.uiElements);
      }
    }
  }

  return [...new Set(patterns)].slice(0, 10);
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

/**
 * Build a summary of phase context
 */
function buildPhaseContextSummary(
  segments: ConversationSegment[],
  features: ExtractedFeature[],
  workflows: ExtractedWorkflow[],
  techSpecs: ExtractedTechnicalSpec[],
  phaseType: FeatureDomain
): string {
  const parts: string[] = [];

  parts.push(`=== Context for ${phaseType.toUpperCase()} Phase ===\n`);

  // Add relevant features
  if (features.length > 0) {
    parts.push('Relevant Features:');
    for (const feature of features.slice(0, 5)) {
      parts.push(`• ${feature.name}: ${feature.description.slice(0, 100)}`);
      if (feature.userStories.length > 0) {
        parts.push(`  User stories: ${feature.userStories.slice(0, 2).join('; ')}`);
      }
      if (feature.acceptanceCriteria.length > 0) {
        parts.push(`  Acceptance: ${feature.acceptanceCriteria.slice(0, 2).join('; ')}`);
      }
    }
    parts.push('');
  }

  // Add relevant workflows
  if (workflows.length > 0) {
    parts.push('Relevant Workflows:');
    for (const workflow of workflows.slice(0, 3)) {
      parts.push(`• ${workflow.name}: ${workflow.description}`);
      if (workflow.steps.length > 0) {
        const stepSummary = workflow.steps
          .slice(0, 3)
          .map((s) => `${s.order}. ${s.action}`)
          .join(' → ');
        parts.push(`  Steps: ${stepSummary}`);
      }
    }
    parts.push('');
  }

  // Add technical specs
  if (techSpecs.length > 0) {
    parts.push('Technical Requirements:');
    for (const spec of techSpecs) {
      parts.push(`• ${spec.category}: ${spec.requirement}`);
      if (spec.details.length > 0) {
        parts.push(`  ${spec.details.slice(0, 2).join('; ')}`);
      }
    }
    parts.push('');
  }

  // Add key points from high-importance segments
  const highSegments = segments.filter((s) => s.importance === 'high');
  if (highSegments.length > 0) {
    parts.push('Key Discussion Points:');
    for (const segment of highSegments.slice(0, 3)) {
      parts.push(`[${segment.topicLabel}]`);
      for (const point of segment.keyPoints.slice(0, 3)) {
        parts.push(`• ${point}`);
      }
    }
  }

  return parts.join('\n').slice(0, 3000); // Limit size
}

/**
 * Estimate token count for context
 */
function estimateContextTokens(segments: ConversationSegment[], contextSummary: string): number {
  const segmentTokens = segments.reduce((sum, s) => sum + s.tokenEstimate, 0);
  const summaryTokens = Math.ceil(contextSummary.length / 4);
  return segmentTokens + summaryTokens;
}

// ============================================================================
// BATCH EXTRACTION
// ============================================================================

/**
 * Extract context for multiple phase types at once
 */
export async function extractContextForAllPhases(
  messages: ChatMessage[],
  phaseTypes: FeatureDomain[]
): Promise<Map<FeatureDomain, PhaseContext>> {
  const contextMap = new Map<FeatureDomain, PhaseContext>();

  // Process in parallel for efficiency
  const results = await Promise.all(
    phaseTypes.map(async (phaseType) => ({
      phaseType,
      context: await extractPhaseContext(messages, phaseType),
    }))
  );

  for (const { phaseType, context } of results) {
    contextMap.set(phaseType, context);
  }

  return contextMap;
}

/**
 * Get a compact summary of all phase contexts
 */
export function summarizePhaseContexts(contextMap: Map<FeatureDomain, PhaseContext>): string {
  const parts: string[] = [];

  for (const [phaseType, context] of contextMap) {
    if (context.relevantSegments.length > 0 || context.featureSpecs.length > 0) {
      parts.push(
        `${phaseType}: ${context.relevantSegments.length} segments, ${context.featureSpecs.length} features, ${context.tokenEstimate} tokens`
      );
    }
  }

  return parts.join('\n');
}
