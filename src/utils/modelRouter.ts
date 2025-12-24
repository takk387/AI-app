/**
 * Model Router
 *
 * Intelligent routing logic to determine which AI model(s) to use
 * in the Layout Builder's dual-model pipeline.
 *
 * Routing Strategy:
 * - DUAL: Both Gemini (visual) → Claude (structural) for clone/replicate requests with images
 * - GEMINI: Preferred for visual tasks, vibes, colors, simple requests
 * - CLAUDE: Required for structural tasks, accessibility, adding components
 */

// ============================================================================
// Types
// ============================================================================

export type ModelRouting = 'gemini' | 'claude' | 'dual';

export interface RoutingDecision {
  route: ModelRouting;
  reason: string;
  confidence: number;
  detectedPatterns: string[];
}

export interface RoutingContext {
  message: string;
  hasImages: boolean;
  hasVideo?: boolean;
  currentDesign?: Record<string, unknown>;
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * Patterns that trigger DUAL mode (Gemini → Claude pipeline)
 * These require both visual analysis AND structural refinement
 */
const DUAL_MODE_PATTERNS = [
  /\b(clone|replicate|copy|recreate|match|reproduce)\b.*\b(this|the|that)\b.*\b(design|layout|style|look|ui|interface)\b/i,
  /\b(make|create|build)\b.*\b(exactly|precisely)\b.*\b(like|as)\b/i,
  /\b(pixel.?perfect|exact\s+copy)\b/i,
  /\bclone\s+this\b/i,
  /\breplicate\s+this\b/i,
  /\bcopy\s+this\s+(design|layout|style)\b/i,
  /\bmatch\s+this\s+(design|layout|style)\b/i,
];

/**
 * Patterns that prefer GEMINI (visual/creative tasks)
 * These are best handled by Gemini's visual intuition
 */
const GEMINI_PREFERRED_PATTERNS = [
  // Color requests
  /\b(change|update|set|make)\b.*\b(color|colours?|palette)\b/i,
  /\b(primary|secondary|accent|background)\s+color\b/i,
  /\b(warmer|cooler|brighter|darker|softer)\s+colors?\b/i,
  /\b(more|less)\s+contrast\b/i,

  // Vibe/style requests
  /\b(make|feel|look)\b.*\b(modern|minimal|playful|professional|premium|elegant|clean)\b/i,
  /\b(more|less)\b.*\b(modern|minimal|playful|professional)\b/i,
  /\bmake\s+it\s+(pop|stand\s+out|vibrant)\b/i,
  /\b(vibe|aesthetic|mood|feel)\b/i,

  // Typography simple changes
  /\b(bigger|smaller|bolder|lighter)\s+(text|font|heading)\b/i,
  /\b(font|typography)\s+(size|weight)\b/i,

  // Simple visual adjustments
  /\b(more|less)\s+(shadow|rounded|blur|spacing)\b/i,
  /\b(increase|decrease)\s+(padding|margin|gap)\b/i,

  // Analysis requests (without modification)
  /\b(analyze|analyse|describe|what)\b.*\b(screenshot|image|design)\b/i,
  /\bwhat\s+(colors?|fonts?|style)\b/i,

  // Dark/light mode
  /\b(dark|light)\s+mode\b/i,
  /\b(switch|toggle)\s+to\s+(dark|light)\b/i,
];

/**
 * Patterns that require CLAUDE (structural tasks)
 * These need Claude's technical reasoning and tool execution
 */
const CLAUDE_REQUIRED_PATTERNS = [
  // Accessibility
  /\b(accessibility|a11y|wcag|aria|screen\s+reader)\b/i,
  /\b(fix|improve|check)\b.*\b(accessibility|contrast)\b/i,

  // Structural component changes
  /\b(add|remove|create)\s+(a\s+)?(sidebar|header|footer|navigation|nav)\b/i,
  /\b(add|insert)\s+(a\s+)?(component|section|element)\b/i,

  // Semantic/technical
  /\b(semantic|html|structure|grid|layout\s+system)\b/i,
  /\b(responsive|breakpoint|mobile|tablet|desktop)\s+(layout|grid|behavior)\b/i,

  // Tool-specific requests
  /\b(generate|create)\s+(icon|animation|background\s+image)\b/i,
  /\b(audit|review|validate)\b/i,

  // Complex animations (need Claude's animation tools)
  /\b(keyframe|animation\s+sequence|complex\s+animation)\b/i,

  // Export/code generation
  /\b(export|generate|code|css|tailwind)\b/i,
];

/**
 * Keywords that strongly indicate image/clone intent even without patterns
 */
const CLONE_INTENT_KEYWORDS = [
  'clone',
  'replicate',
  'copy',
  'match',
  'recreate',
  'reproduce',
  'exact',
  'pixel-perfect',
  'like this',
  'same as',
];

/**
 * Keywords indicating visual/creative intent
 */
const VISUAL_INTENT_KEYWORDS = [
  'color',
  'vibe',
  'feel',
  'look',
  'aesthetic',
  'modern',
  'minimal',
  'playful',
  'professional',
  'elegant',
  'warmer',
  'cooler',
  'brighter',
  'darker',
  'pop',
  'contrast',
];

/**
 * Keywords indicating structural intent
 */
const STRUCTURAL_INTENT_KEYWORDS = [
  'accessibility',
  'semantic',
  'add sidebar',
  'add header',
  'add footer',
  'add component',
  'remove',
  'responsive',
  'breakpoint',
  'grid',
  'structure',
  'export',
  'generate code',
];

// ============================================================================
// Main Router Function
// ============================================================================

/**
 * Determine the optimal model routing for a given request
 */
export function determineModelRouting(context: RoutingContext): RoutingDecision {
  const { message, hasImages, hasVideo } = context;
  const lowerMessage = message.toLowerCase();
  const detectedPatterns: string[] = [];

  // -------------------------------------------------------------------------
  // Check for DUAL mode triggers (highest priority when images present)
  // -------------------------------------------------------------------------

  if (hasImages || hasVideo) {
    // Check explicit clone/replicate patterns
    for (const pattern of DUAL_MODE_PATTERNS) {
      if (pattern.test(message)) {
        detectedPatterns.push(`dual_pattern: ${pattern.source.slice(0, 30)}...`);
        return {
          route: 'dual',
          reason: 'Clone/replicate request with image detected - using both models',
          confidence: 0.95,
          detectedPatterns,
        };
      }
    }

    // Check for clone intent keywords with image
    for (const keyword of CLONE_INTENT_KEYWORDS) {
      if (lowerMessage.includes(keyword)) {
        detectedPatterns.push(`clone_keyword: ${keyword}`);
        return {
          route: 'dual',
          reason: `Clone intent keyword "${keyword}" with image - using both models`,
          confidence: 0.9,
          detectedPatterns,
        };
      }
    }

    // Image with vague request → default to DUAL for safety
    if (message.length < 50 || /^(this|analyze|look|check|see)/i.test(message.trim())) {
      detectedPatterns.push('vague_with_image');
      return {
        route: 'dual',
        reason: 'Image with vague request - using both models for comprehensive analysis',
        confidence: 0.75,
        detectedPatterns,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Check for CLAUDE required patterns
  // -------------------------------------------------------------------------

  for (const pattern of CLAUDE_REQUIRED_PATTERNS) {
    if (pattern.test(message)) {
      detectedPatterns.push(`claude_pattern: ${pattern.source.slice(0, 30)}...`);
      return {
        route: 'claude',
        reason: 'Structural/technical task detected - using Claude',
        confidence: 0.9,
        detectedPatterns,
      };
    }
  }

  // Check structural intent keywords
  for (const keyword of STRUCTURAL_INTENT_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      detectedPatterns.push(`structural_keyword: ${keyword}`);
      return {
        route: 'claude',
        reason: `Structural intent keyword "${keyword}" - using Claude`,
        confidence: 0.85,
        detectedPatterns,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Check for GEMINI preferred patterns
  // -------------------------------------------------------------------------

  for (const pattern of GEMINI_PREFERRED_PATTERNS) {
    if (pattern.test(message)) {
      detectedPatterns.push(`gemini_pattern: ${pattern.source.slice(0, 30)}...`);
      return {
        route: 'gemini',
        reason: 'Visual/creative task detected - using Gemini',
        confidence: 0.85,
        detectedPatterns,
      };
    }
  }

  // Check visual intent keywords
  for (const keyword of VISUAL_INTENT_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      detectedPatterns.push(`visual_keyword: ${keyword}`);
      return {
        route: 'gemini',
        reason: `Visual intent keyword "${keyword}" - using Gemini`,
        confidence: 0.8,
        detectedPatterns,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Default behavior
  // -------------------------------------------------------------------------

  // If image present but no specific patterns → use DUAL
  if (hasImages || hasVideo) {
    detectedPatterns.push('image_default');
    return {
      route: 'dual',
      reason: 'Image present with no specific pattern - defaulting to dual for safety',
      confidence: 0.7,
      detectedPatterns,
    };
  }

  // Default to GEMINI for general requests (faster, good for vibes)
  detectedPatterns.push('default_gemini');
  return {
    route: 'gemini',
    reason: 'No specific pattern detected - defaulting to Gemini (faster, visual intuition)',
    confidence: 0.6,
    detectedPatterns,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple routing function for quick checks
 */
export function getModelRoute(message: string, hasImages: boolean = false): ModelRouting {
  return determineModelRouting({ message, hasImages }).route;
}

/**
 * Check if a message should trigger dual mode
 */
export function shouldUseDualMode(message: string, hasImages: boolean): boolean {
  return determineModelRouting({ message, hasImages }).route === 'dual';
}

/**
 * Check if a message requires Claude specifically
 */
export function requiresClaude(message: string): boolean {
  return determineModelRouting({ message, hasImages: false }).route === 'claude';
}

/**
 * Check if a message is best handled by Gemini
 */
export function prefersGemini(message: string): boolean {
  const decision = determineModelRouting({ message, hasImages: false });
  return decision.route === 'gemini';
}

/**
 * Get API endpoint based on routing decision
 */
export function getApiEndpoint(routing: ModelRouting): string {
  switch (routing) {
    case 'dual':
      return '/api/layout/chat-dual';
    case 'gemini':
      return '/api/layout/chat-gemini';
    case 'claude':
    default:
      return '/api/layout/chat';
  }
}

/**
 * Get human-readable description of routing decision
 */
export function getRoutingDescription(routing: ModelRouting): string {
  switch (routing) {
    case 'dual':
      return 'Using Gemini for visual analysis → Claude for structural refinement';
    case 'gemini':
      return 'Using Gemini for visual/creative task';
    case 'claude':
      return 'Using Claude for structural/technical task';
    default:
      return 'Unknown routing';
  }
}

/**
 * Get model indicator emoji/label
 */
export function getModelIndicator(routing: ModelRouting): { emoji: string; label: string } {
  switch (routing) {
    case 'dual':
      return { emoji: '🎨→🔧', label: 'Gemini + Claude' };
    case 'gemini':
      return { emoji: '🎨', label: 'Gemini' };
    case 'claude':
      return { emoji: '🔧', label: 'Claude' };
    default:
      return { emoji: '🤖', label: 'AI' };
  }
}

// ============================================================================
// Exports
// ============================================================================

const modelRouter = {
  determineModelRouting,
  getModelRoute,
  shouldUseDualMode,
  requiresClaude,
  prefersGemini,
  getApiEndpoint,
  getRoutingDescription,
  getModelIndicator,
};

export default modelRouter;
