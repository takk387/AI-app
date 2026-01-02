/**
 * Model Router Service
 *
 * Routes AI requests to the appropriate model based on:
 * - Element type being modified
 * - Nature of the request (visual vs structural)
 * - Complexity of the task
 *
 * Dual AI Architecture:
 * - Claude: Best for structure, accessibility, complex reasoning
 * - Gemini: Best for visual analysis, image processing
 */

import type { ElementType } from '@/types/layoutDesign';

/**
 * Available AI model routing targets
 */
export type ModelRouting = 'CLAUDE' | 'GEMINI' | 'DUAL' | 'CLAUDE_HAIKU';

/**
 * Model routing result with explanation
 */
export interface ModelRoutingResult {
  /** Primary model to use */
  primary: ModelRouting;
  /** Fallback model if primary fails */
  fallback?: ModelRouting;
  /** Reason for routing decision */
  reason: string;
  /** Estimated complexity (affects model tier) */
  complexity: 'low' | 'medium' | 'high';
}

/**
 * Visual element types that benefit from Gemini's visual processing
 */
const VISUAL_ELEMENT_TYPES: ElementType[] = ['button', 'card', 'image', 'hero', 'icon', 'video'];

/**
 * Structural element types that benefit from Claude's reasoning
 */
const STRUCTURAL_ELEMENT_TYPES: ElementType[] = [
  'header',
  'footer',
  'sidebar',
  'nav',
  'section',
  'container',
  'form',
];

/**
 * Message patterns indicating visual/style changes
 */
const VISUAL_PATTERNS = [
  /\b(color|colour|style|look|vibe|pop|pretty|beautiful|ugly|aesthetic)\b/i,
  /\b(gradient|shadow|border|rounded|corners)\b/i,
  /\b(hover|animation|effect|transition)\b/i,
  /\b(bigger|smaller|larger|size|scale)\b/i,
];

/**
 * Message patterns indicating structural/accessibility changes
 */
const STRUCTURAL_PATTERNS = [
  /\b(responsive|mobile|tablet|desktop|breakpoint)\b/i,
  /\b(accessibility|a11y|wcag|contrast|screen.?reader)\b/i,
  /\b(layout|structure|position|arrange|reorder)\b/i,
  /\b(semantic|heading|label|aria)\b/i,
  /\b(grid|flex|column|row|stack)\b/i,
];

/**
 * Complex task patterns that need Claude's deep reasoning
 */
const COMPLEX_PATTERNS = [
  /\b(refactor|restructure|redesign|rethink)\b/i,
  /\b(optimize|improve|enhance|fix.+issue)\b/i,
  /\b(why|explain|analyze|compare)\b/i,
  /\b(multiple|several|all|every|each)\b/i,
];

/**
 * Get routing decision for an element-based request
 *
 * @param elementType - The type of element being modified
 * @param message - The user's message/request
 * @returns Routing decision with model, fallback, and reason
 */
export function getRoutingForElement(
  elementType: ElementType,
  message: string
): ModelRoutingResult {
  const isVisualElement = VISUAL_ELEMENT_TYPES.includes(elementType);
  const isStructuralElement = STRUCTURAL_ELEMENT_TYPES.includes(elementType);

  // Check message patterns
  const hasVisualPatterns = VISUAL_PATTERNS.some((p) => p.test(message));
  const hasStructuralPatterns = STRUCTURAL_PATTERNS.some((p) => p.test(message));
  const hasComplexPatterns = COMPLEX_PATTERNS.some((p) => p.test(message));

  // Determine complexity
  const complexity: 'low' | 'medium' | 'high' = hasComplexPatterns
    ? 'high'
    : hasStructuralPatterns || hasVisualPatterns
      ? 'medium'
      : 'low';

  // Complex structural/accessibility work → Claude
  if (hasStructuralPatterns || hasComplexPatterns) {
    return {
      primary: 'CLAUDE',
      fallback: 'CLAUDE_HAIKU',
      reason: `Structural/complex task on ${elementType} requires Claude's reasoning`,
      complexity,
    };
  }

  // Visual changes on visual elements → Gemini for analysis, Claude for implementation
  if (isVisualElement && hasVisualPatterns) {
    return {
      primary: 'DUAL',
      fallback: 'CLAUDE',
      reason: `Visual changes on ${elementType} benefit from dual model analysis`,
      complexity,
    };
  }

  // Visual changes on structural elements → Claude (better at layout)
  if (isStructuralElement && hasVisualPatterns) {
    return {
      primary: 'CLAUDE',
      fallback: 'CLAUDE_HAIKU',
      reason: `Style changes on structural ${elementType} need Claude for layout awareness`,
      complexity,
    };
  }

  // Simple, low-complexity tasks → Claude Haiku for speed
  if (complexity === 'low') {
    return {
      primary: 'CLAUDE_HAIKU',
      fallback: 'CLAUDE',
      reason: `Simple task on ${elementType} - using fast model`,
      complexity,
    };
  }

  // Default to dual for best results
  return {
    primary: 'DUAL',
    fallback: 'CLAUDE',
    reason: `Default dual-model approach for ${elementType} modification`,
    complexity,
  };
}

/**
 * Get routing for a general (non-element) request
 *
 * @param message - The user's message/request
 * @param hasImages - Whether the request includes images
 * @returns Routing decision
 */
export function getRoutingForRequest(
  message: string,
  hasImages: boolean = false
): ModelRoutingResult {
  // Image analysis → Dual (Claude vision + Gemini)
  if (hasImages) {
    return {
      primary: 'DUAL',
      fallback: 'CLAUDE',
      reason: 'Image analysis benefits from dual model processing',
      complexity: 'medium',
    };
  }

  // Check patterns
  const hasComplexPatterns = COMPLEX_PATTERNS.some((p) => p.test(message));
  const hasStructuralPatterns = STRUCTURAL_PATTERNS.some((p) => p.test(message));

  if (hasComplexPatterns) {
    return {
      primary: 'CLAUDE',
      fallback: 'CLAUDE_HAIKU',
      reason: 'Complex reasoning task requires Claude',
      complexity: 'high',
    };
  }

  if (hasStructuralPatterns) {
    return {
      primary: 'CLAUDE',
      fallback: 'CLAUDE_HAIKU',
      reason: 'Structural/accessibility task requires Claude',
      complexity: 'medium',
    };
  }

  // Default to Claude for general requests
  return {
    primary: 'CLAUDE',
    fallback: 'CLAUDE_HAIKU',
    reason: 'Default to Claude for general requests',
    complexity: 'low',
  };
}

/**
 * Get the appropriate model ID for a routing target
 *
 * @param routing - The routing target
 * @returns The model ID string to use with the API
 */
export function getModelId(routing: ModelRouting): string {
  switch (routing) {
    case 'CLAUDE':
      return 'claude-sonnet-4-20250514';
    case 'CLAUDE_HAIKU':
      return 'claude-3-5-haiku-20241022';
    case 'GEMINI':
      return 'gemini-2.0-flash';
    case 'DUAL':
      return 'claude-sonnet-4-20250514'; // Primary for dual
    default:
      return 'claude-sonnet-4-20250514';
  }
}

/**
 * Model routing table for documentation/debugging
 */
export const MODEL_ROUTING_TABLE = {
  tasks: [
    { task: 'Understanding user intent', model: 'CLAUDE', reason: 'Best at natural language' },
    { task: 'Complex design decisions', model: 'CLAUDE', reason: 'Deep reasoning' },
    { task: 'Image/reference analysis', model: 'DUAL', reason: 'Best visual understanding' },
    { task: 'Quick style changes', model: 'CLAUDE_HAIKU', reason: 'Fast and cheap' },
    { task: 'Animation generation', model: 'CLAUDE', reason: 'Good at code generation' },
    { task: 'Video frame analysis', model: 'GEMINI', reason: 'Better at video' },
    { task: 'Accessibility checks', model: 'CLAUDE', reason: 'Best at standards compliance' },
    { task: 'Layout structure', model: 'CLAUDE', reason: 'Better spatial reasoning' },
  ],
  fallbackChain: ['CLAUDE', 'CLAUDE_HAIKU'],
} as const;
