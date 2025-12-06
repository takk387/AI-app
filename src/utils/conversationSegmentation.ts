/**
 * Conversation Segmentation Utility
 *
 * Splits long conversations into logical segments based on topic changes.
 * Enables better context management by allowing selective segment loading.
 */

import type { ChatMessage } from '@/types/aiBuilderTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Topic categories for conversation segments
 */
export type SegmentTopic =
  | 'introduction'
  | 'feature_discussion'
  | 'technical_specs'
  | 'ui_design'
  | 'user_roles'
  | 'workflow'
  | 'data_model'
  | 'integration'
  | 'clarification'
  | 'confirmation'
  | 'general';

/**
 * A segment of conversation focused on a specific topic
 */
export interface ConversationSegment {
  id: string;
  topic: SegmentTopic;
  topicLabel: string;
  startIndex: number;
  endIndex: number;
  messages: ChatMessage[];
  summary: string;
  keyPoints: string[];
  extractedData: SegmentExtractedData;
  importance: 'high' | 'medium' | 'low';
  tokenEstimate: number;
}

/**
 * Data extracted from a segment
 */
export interface SegmentExtractedData {
  features?: string[];
  roles?: string[];
  technicalDecisions?: string[];
  uiElements?: string[];
  dataModels?: string[];
  integrations?: string[];
  constraints?: string[];
  questions?: string[];
  answers?: string[];
}

/**
 * Result of segmenting a conversation
 */
export interface SegmentationResult {
  segments: ConversationSegment[];
  totalMessages: number;
  totalSegments: number;
  topicDistribution: Record<SegmentTopic, number>;
  segmentedAt: string;
}

/**
 * Options for segmentation
 */
export interface SegmentationOptions {
  /** Minimum messages per segment (default: 2) */
  minSegmentSize?: number;
  /** Maximum messages per segment (default: 20) */
  maxSegmentSize?: number;
  /** Whether to merge small adjacent segments of same topic (default: true) */
  mergeSmallSegments?: boolean;
}

// ============================================================================
// TOPIC DETECTION PATTERNS
// ============================================================================

const TOPIC_PATTERNS: Record<SegmentTopic, RegExp[]> = {
  introduction: [
    /(?:I want to|I'd like to|I need to|let me|we're going to)\s+(?:build|create|make|develop)/gi,
    /(?:hello|hi|hey|welcome|let's start|getting started)/gi,
    /(?:what kind of|describe your|tell me about your)\s+(?:app|project|idea)/gi,
  ],
  feature_discussion: [
    /(?:feature|functionality|capability|function|ability)\s*(?:to|for|that)/gi,
    /(?:users? (?:can|should|will|need to)|the app (?:should|will|must))/gi,
    /(?:add|implement|include|build|create)\s+(?:a|an|the)?\s*(?:\w+\s+)?(?:feature|function)/gi,
    /(?:authentication|login|signup|dashboard|profile|settings|notification)/gi,
  ],
  technical_specs: [
    /(?:database|api|backend|server|endpoint|integration)/gi,
    /(?:postgresql|mysql|mongodb|supabase|firebase|aws|azure)/gi,
    /(?:react|next\.?js|node|typescript|javascript|python)/gi,
    /(?:authentication|oauth|jwt|session|token)/gi,
    /(?:real-?time|websocket|push notification|webhook)/gi,
  ],
  ui_design: [
    /(?:design|layout|ui|ux|interface|screen|page|component)/gi,
    /(?:color|theme|style|font|typography|spacing)/gi,
    /(?:button|form|modal|sidebar|header|footer|navigation)/gi,
    /(?:responsive|mobile|desktop|tablet)/gi,
    /(?:dark mode|light mode|theme)/gi,
  ],
  user_roles: [
    /(?:role|permission|access|user type|admin|moderator|editor|viewer)/gi,
    /(?:can access|has permission|allowed to|restricted from)/gi,
    /(?:different (?:types of )?users|user levels|user groups)/gi,
  ],
  workflow: [
    /(?:workflow|process|flow|step|procedure|sequence)/gi,
    /(?:when|after|once|then|next|finally)\s+(?:the user|they|it|the system)/gi,
    /(?:first|second|third|then|after that|finally)/gi,
    /(?:approval|review|submission|completion)/gi,
  ],
  data_model: [
    /(?:data model|schema|entity|table|field|column|relationship)/gi,
    /(?:store|save|persist|retrieve|query|fetch)/gi,
    /(?:one-to-many|many-to-many|foreign key|primary key)/gi,
    /(?:user data|profile data|settings|preferences)/gi,
  ],
  integration: [
    /(?:integrate|integration|connect|third-party|external)/gi,
    /(?:api|webhook|oauth|sso)/gi,
    /(?:stripe|paypal|twilio|sendgrid|slack|discord)/gi,
    /(?:import|export|sync|migration)/gi,
  ],
  clarification: [
    /(?:what do you mean|can you explain|could you clarify|I'm not sure)/gi,
    /(?:do you want|would you like|should I|do you need)/gi,
    /(?:\?$)/gm, // Questions
  ],
  confirmation: [
    /(?:yes|okay|sounds good|perfect|great|exactly|correct|that's right)/gi,
    /(?:confirmed|approved|agreed|let's do it|go ahead)/gi,
    /(?:looks good|that works|I like that)/gi,
  ],
  general: [], // Fallback - no specific patterns
};

// ============================================================================
// SEGMENTATION FUNCTIONS
// ============================================================================

/**
 * Detect the primary topic of a message
 */
function detectMessageTopic(message: ChatMessage): SegmentTopic {
  const content = message.content.toLowerCase();
  let bestTopic: SegmentTopic = 'general';
  let bestScore = 0;

  for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS) as [SegmentTopic, RegExp[]][]) {
    if (topic === 'general') continue;

    let score = 0;
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic;
}

/**
 * Get human-readable label for a topic
 */
function getTopicLabel(topic: SegmentTopic): string {
  const labels: Record<SegmentTopic, string> = {
    introduction: 'Introduction',
    feature_discussion: 'Feature Discussion',
    technical_specs: 'Technical Specifications',
    ui_design: 'UI/UX Design',
    user_roles: 'User Roles & Permissions',
    workflow: 'Workflow & Process',
    data_model: 'Data Model',
    integration: 'Integrations',
    clarification: 'Clarification',
    confirmation: 'Confirmation',
    general: 'General Discussion',
  };
  return labels[topic];
}

/**
 * Extract key points from a segment
 */
function extractKeyPoints(messages: ChatMessage[]): string[] {
  const keyPoints: string[] = [];
  const content = messages.map((m) => m.content).join(' ');

  // Extract bullet points
  const bulletPattern = /[-•*]\s+([^.\n]+)/g;
  let match;
  while ((match = bulletPattern.exec(content)) !== null) {
    const point = match[1].trim();
    if (point.length > 10 && point.length < 150) {
      keyPoints.push(point);
    }
  }

  // Extract numbered items
  const numberedPattern = /\d+[.)]\s+([^.\n]+)/g;
  while ((match = numberedPattern.exec(content)) !== null) {
    const point = match[1].trim();
    if (point.length > 10 && point.length < 150 && !keyPoints.includes(point)) {
      keyPoints.push(point);
    }
  }

  // Extract key statements
  const keyStatementPattern = /(?:must|should|will|need to)\s+([^.]+)/gi;
  while ((match = keyStatementPattern.exec(content)) !== null) {
    const point = match[1].trim();
    if (point.length > 10 && point.length < 100 && !keyPoints.some((k) => k.includes(point))) {
      keyPoints.push(point);
    }
  }

  return keyPoints.slice(0, 10);
}

/**
 * Extract data specific to segment topic
 */
function extractSegmentData(messages: ChatMessage[], topic: SegmentTopic): SegmentExtractedData {
  const content = messages.map((m) => m.content).join('\n');
  const data: SegmentExtractedData = {};

  switch (topic) {
    case 'feature_discussion':
      data.features = extractPatternMatches(content, [
        /(?:feature|functionality):\s*([^.\n]+)/gi,
        /(?:add|implement|build)\s+(?:a|an|the)?\s*([^.]{10,60})/gi,
      ]);
      break;

    case 'user_roles':
      data.roles = extractPatternMatches(content, [
        /(?:role|user type):\s*([^.\n]+)/gi,
        /(?:admin|user|guest|moderator|editor|viewer|manager|owner)/gi,
      ]);
      break;

    case 'technical_specs':
      data.technicalDecisions = extractPatternMatches(content, [
        /(?:use|using|with)\s+([\w\s]+(?:database|api|framework|library))/gi,
        /(?:postgresql|mysql|mongodb|supabase|firebase|react|next\.?js|node)/gi,
      ]);
      break;

    case 'ui_design':
      data.uiElements = extractPatternMatches(content, [
        /(?:button|form|modal|sidebar|header|navigation|component)s?\s*(?:for|to|that)?\s*([^.]{5,50})?/gi,
        /(?:design|layout):\s*([^.\n]+)/gi,
      ]);
      break;

    case 'data_model':
      data.dataModels = extractPatternMatches(content, [
        /(?:table|entity|model|schema):\s*([^.\n]+)/gi,
        /(?:store|save)\s+([^.]{10,50})/gi,
      ]);
      break;

    case 'integration':
      data.integrations = extractPatternMatches(content, [
        /(?:integrate|connect)\s+(?:with)?\s*([^.]{5,40})/gi,
        /(?:stripe|paypal|twilio|sendgrid|slack|google|aws)/gi,
      ]);
      break;

    case 'clarification':
      data.questions = messages
        .filter((m) => m.content.includes('?'))
        .map((m) => {
          const questionMatch = m.content.match(/([^.!?]*\?)/);
          return questionMatch ? questionMatch[1].trim() : '';
        })
        .filter((q) => q.length > 10);
      break;
  }

  // Extract constraints from any segment
  data.constraints = extractPatternMatches(content, [
    /(?:must not|cannot|should not|don't)\s+([^.]+)/gi,
    /(?:limit|maximum|minimum)\s+([^.]+)/gi,
  ]);

  return data;
}

/**
 * Helper to extract pattern matches
 */
function extractPatternMatches(content: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const value = (match[1] || match[0]).trim();
      if (value.length > 3 && value.length < 100 && !matches.includes(value)) {
        matches.push(value);
      }
    }
  }

  return matches.slice(0, 10);
}

/**
 * Generate summary for a segment
 */
function generateSegmentSummary(messages: ChatMessage[], topic: SegmentTopic): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  // Take key parts from first and last messages
  const firstUser = userMessages[0]?.content.slice(0, 150) || '';
  const lastAssistant = assistantMessages[assistantMessages.length - 1]?.content.slice(0, 150) || '';

  return `${getTopicLabel(topic)}: ${firstUser}${lastAssistant ? ` → ${lastAssistant}` : ''}`.slice(
    0,
    300
  );
}

/**
 * Estimate tokens for messages
 */
function estimateTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, m) => total + Math.ceil(m.content.length / 4) + 4, 0);
}

/**
 * Determine segment importance based on topic and content
 */
function determineImportance(
  messages: ChatMessage[],
  topic: SegmentTopic
): 'high' | 'medium' | 'low' {
  // High importance topics
  if (['feature_discussion', 'technical_specs', 'user_roles', 'data_model'].includes(topic)) {
    return 'high';
  }

  // Medium importance
  if (['ui_design', 'workflow', 'integration'].includes(topic)) {
    return 'medium';
  }

  // Check for decisions/confirmations
  const content = messages.map((m) => m.content).join(' ').toLowerCase();
  if (/(?:decided|confirmed|agreed|approved|let's do)/.test(content)) {
    return 'high';
  }

  return 'low';
}

/**
 * Segment a conversation into logical parts
 */
export function segmentConversation(
  messages: ChatMessage[],
  options: SegmentationOptions = {}
): SegmentationResult {
  const { minSegmentSize = 2, maxSegmentSize = 20, mergeSmallSegments = true } = options;

  if (messages.length === 0) {
    return {
      segments: [],
      totalMessages: 0,
      totalSegments: 0,
      topicDistribution: {} as Record<SegmentTopic, number>,
      segmentedAt: new Date().toISOString(),
    };
  }

  // Detect topic for each message
  const messageTopics = messages.map((m) => detectMessageTopic(m));

  // Create initial segments based on topic changes
  const rawSegments: Array<{ topic: SegmentTopic; startIndex: number; endIndex: number }> = [];
  let currentTopic = messageTopics[0];
  let segmentStart = 0;

  for (let i = 1; i < messages.length; i++) {
    const topic = messageTopics[i];

    // Topic changed or segment too large
    if (topic !== currentTopic || i - segmentStart >= maxSegmentSize) {
      rawSegments.push({
        topic: currentTopic,
        startIndex: segmentStart,
        endIndex: i - 1,
      });
      currentTopic = topic;
      segmentStart = i;
    }
  }

  // Add final segment
  rawSegments.push({
    topic: currentTopic,
    startIndex: segmentStart,
    endIndex: messages.length - 1,
  });

  // Merge small segments if enabled
  let processedSegments = rawSegments;
  if (mergeSmallSegments) {
    processedSegments = [];
    for (const segment of rawSegments) {
      const size = segment.endIndex - segment.startIndex + 1;
      const lastSegment = processedSegments[processedSegments.length - 1];

      if (
        size < minSegmentSize &&
        lastSegment &&
        (lastSegment.topic === segment.topic ||
          lastSegment.endIndex - lastSegment.startIndex + 1 < minSegmentSize)
      ) {
        // Merge with previous segment
        lastSegment.endIndex = segment.endIndex;
        // Keep the more specific topic
        if (segment.topic !== 'general' && lastSegment.topic === 'general') {
          lastSegment.topic = segment.topic;
        }
      } else {
        processedSegments.push({ ...segment });
      }
    }
  }

  // Build full segment objects
  const segments: ConversationSegment[] = processedSegments.map((seg, index) => {
    const segmentMessages = messages.slice(seg.startIndex, seg.endIndex + 1);
    return {
      id: `segment-${index}-${seg.topic}`,
      topic: seg.topic,
      topicLabel: getTopicLabel(seg.topic),
      startIndex: seg.startIndex,
      endIndex: seg.endIndex,
      messages: segmentMessages,
      summary: generateSegmentSummary(segmentMessages, seg.topic),
      keyPoints: extractKeyPoints(segmentMessages),
      extractedData: extractSegmentData(segmentMessages, seg.topic),
      importance: determineImportance(segmentMessages, seg.topic),
      tokenEstimate: estimateTokens(segmentMessages),
    };
  });

  // Calculate topic distribution
  const topicDistribution: Record<SegmentTopic, number> = {} as Record<SegmentTopic, number>;
  for (const segment of segments) {
    topicDistribution[segment.topic] = (topicDistribution[segment.topic] || 0) + 1;
  }

  return {
    segments,
    totalMessages: messages.length,
    totalSegments: segments.length,
    topicDistribution,
    segmentedAt: new Date().toISOString(),
  };
}

/**
 * Get segments matching a specific topic
 */
export function getSegmentsByTopic(
  result: SegmentationResult,
  topic: SegmentTopic
): ConversationSegment[] {
  return result.segments.filter((s) => s.topic === topic);
}

/**
 * Get high-importance segments
 */
export function getHighImportanceSegments(result: SegmentationResult): ConversationSegment[] {
  return result.segments.filter((s) => s.importance === 'high');
}

/**
 * Build context string from selected segments
 */
export function buildContextFromSegments(
  segments: ConversationSegment[],
  maxTokens: number = 4000
): string {
  const parts: string[] = [];
  let tokenCount = 0;

  // Sort by importance
  const sorted = [...segments].sort((a, b) => {
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    return importanceOrder[a.importance] - importanceOrder[b.importance];
  });

  for (const segment of sorted) {
    if (tokenCount + segment.tokenEstimate > maxTokens) {
      // Add summary instead of full segment
      const summaryTokens = Math.ceil(segment.summary.length / 4);
      if (tokenCount + summaryTokens <= maxTokens) {
        parts.push(`[${segment.topicLabel}] ${segment.summary}`);
        tokenCount += summaryTokens;
      }
      continue;
    }

    parts.push(`=== ${segment.topicLabel} ===`);

    if (segment.keyPoints.length > 0) {
      parts.push('Key Points:');
      for (const point of segment.keyPoints.slice(0, 5)) {
        parts.push(`• ${point}`);
      }
    }

    // Add extracted data summary
    const data = segment.extractedData;
    if (data.features?.length) {
      parts.push(`Features: ${data.features.join(', ')}`);
    }
    if (data.roles?.length) {
      parts.push(`Roles: ${data.roles.join(', ')}`);
    }
    if (data.technicalDecisions?.length) {
      parts.push(`Technical: ${data.technicalDecisions.join(', ')}`);
    }

    parts.push('');
    tokenCount += segment.tokenEstimate;
  }

  return parts.join('\n');
}

/**
 * Get segmentation summary for logging
 */
export function getSegmentationSummary(result: SegmentationResult): string {
  const topicCounts = Object.entries(result.topicDistribution)
    .filter(([, count]) => count > 0)
    .map(([topic, count]) => `${topic}: ${count}`)
    .join(', ');

  return `${result.totalSegments} segments from ${result.totalMessages} messages (${topicCounts})`;
}
