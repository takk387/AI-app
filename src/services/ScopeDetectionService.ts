/**
 * Scope Detection Service
 *
 * Analyzes user requests to determine if they require phased execution
 * (for complex app builds) or direct execution (for simple changes).
 *
 * This enables AI-powered intelligent routing of requests.
 */

import type { TechnicalRequirements } from '@/types/appConcept';

// ============================================================================
// TYPES
// ============================================================================

export interface ScopeDetectionResult {
  requiresPhases: boolean;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  suggestedPhaseCount: number;
  detectedFeatures: string[];
  detectedTechnical: Partial<TechnicalRequirements>;
  confidence: number; // 0-1 how confident the detection is
  reason: string; // Human-readable explanation
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// Use a minimal interface that's compatible with the full GeneratedComponent
export interface GeneratedComponentInfo {
  name: string;
  code: string;
}

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

// Patterns indicating full app builds
const FULL_APP_PATTERNS = [
  /build\s+(a|an|me|us)?\s*(complete|full|entire|whole)/i,
  /create\s+(a|an|me)?\s*(complete|full|entire|application|app)/i,
  /full[\s-]?stack/i,
  /production[\s-]?ready/i,
  /from\s+scratch/i,
  /e[\s-]?commerce|marketplace|social\s+media|platform/i,
  /build\s+(a|an|me)?\s+\w+\s+(app|application|website|platform|system)/i,
  /create\s+(a|an|me)?\s+\w+\s+(app|application|website|platform|system)/i,
  /make\s+(a|an|me)?\s+\w+\s+(app|application|website|platform|system)/i,
  /develop\s+(a|an|me)?\s+\w+\s+(app|application|website|platform|system)/i,
];

// Patterns indicating complex features
const COMPLEX_FEATURE_PATTERNS = [
  { pattern: /auth(entication)?|login|signup|sign[\s-]?up|register/i, feature: 'auth', weight: 2 },
  {
    pattern: /database|data\s+persist|store\s+data|mongodb|postgres|mysql|supabase|prisma/i,
    feature: 'database',
    weight: 2,
  },
  { pattern: /real[\s-]?time|live\s+update|websocket|socket\.io/i, feature: 'realtime', weight: 2 },
  { pattern: /upload|file|image|media|storage|s3|cloudinary/i, feature: 'fileUpload', weight: 1.5 },
  { pattern: /payment|stripe|checkout|billing|subscription/i, feature: 'payment', weight: 2 },
  { pattern: /notification|push|email\s+alert|sms/i, feature: 'notification', weight: 1.5 },
  { pattern: /admin|dashboard|analytics|reporting/i, feature: 'admin', weight: 1.5 },
  { pattern: /api|integration|third[\s-]?party|external\s+service/i, feature: 'api', weight: 1 },
  { pattern: /search|elasticsearch|algolia|full[\s-]?text/i, feature: 'search', weight: 1.5 },
  { pattern: /chat|messaging|inbox|conversation/i, feature: 'chat', weight: 1.5 },
  { pattern: /map|location|geolocation|gps/i, feature: 'maps', weight: 1.5 },
  { pattern: /cart|shopping|order|checkout\s+flow/i, feature: 'ecommerce', weight: 2 },
  { pattern: /profile|account|settings|preferences/i, feature: 'userProfile', weight: 1 },
  { pattern: /comment|review|rating|feedback/i, feature: 'socialFeatures', weight: 1 },
];

// Patterns indicating simple modifications
const SIMPLE_MODIFICATION_PATTERNS = [
  /fix\s+(the|this|a)?\s*(bug|issue|error|typo)/i,
  /change\s+(the|this)?\s*(color|text|font|size|style)/i,
  /add\s+(a|an)?\s*(button|link|icon|image)/i,
  /update\s+(the|this)?\s*(text|content|title|heading)/i,
  /remove\s+(the|this)?\s*(element|component|section)/i,
  /move\s+(the|this)?\s*(element|component|section)/i,
  /adjust\s+(the|this)?\s*(spacing|margin|padding|layout)/i,
  /rename/i,
  /refactor\s+(the|this)?\s*(function|method|component)/i,
];

// ============================================================================
// SCOPE DETECTION SERVICE
// ============================================================================

export class ScopeDetectionService {
  /**
   * Main entry point - analyze a user request and determine execution strategy
   */
  analyzeScope(
    prompt: string,
    conversationHistory: ChatMessage[] = [],
    currentComponent: GeneratedComponentInfo | null = null
  ): ScopeDetectionResult {
    // If modifying an existing app, usually simpler execution
    if (currentComponent) {
      return this.analyzeModificationScope(prompt, currentComponent);
    }

    return this.analyzeNewAppScope(prompt, conversationHistory);
  }

  /**
   * Analyze scope for new app creation requests
   */
  private analyzeNewAppScope(
    prompt: string,
    conversationHistory: ChatMessage[]
  ): ScopeDetectionResult {
    const fullConversation = this.buildFullContext(prompt, conversationHistory);

    // Check for full app patterns
    const isFullAppRequest = FULL_APP_PATTERNS.some((p) => p.test(fullConversation));

    // Check for simple modification patterns (if it matches, probably not a new app)
    const isSimpleRequest = SIMPLE_MODIFICATION_PATTERNS.some((p) => p.test(prompt));
    if (isSimpleRequest && !isFullAppRequest) {
      return {
        requiresPhases: false,
        complexity: 'simple',
        suggestedPhaseCount: 0,
        detectedFeatures: [],
        detectedTechnical: {},
        confidence: 0.85,
        reason: 'Simple modification request - direct execution',
      };
    }

    // Detect complex features
    const detectedFeatures: string[] = [];
    const detectedTechnical: Partial<TechnicalRequirements> = {};
    let complexityScore = 0;

    for (const { pattern, feature, weight } of COMPLEX_FEATURE_PATTERNS) {
      if (pattern.test(fullConversation)) {
        if (!detectedFeatures.includes(feature)) {
          detectedFeatures.push(feature);
          complexityScore += weight;
        }

        // Map to technical requirements
        if (feature === 'auth') detectedTechnical.needsAuth = true;
        if (feature === 'database') detectedTechnical.needsDatabase = true;
        if (feature === 'realtime') detectedTechnical.needsRealtime = true;
        if (feature === 'fileUpload') detectedTechnical.needsFileUpload = true;
        if (feature === 'api') detectedTechnical.needsAPI = true;
      }
    }

    // Count words to assess complexity
    const wordCount = prompt.split(/\s+/).length;

    // Determine complexity level
    const complexity = this.determineComplexity(
      detectedFeatures.length,
      wordCount,
      isFullAppRequest,
      complexityScore
    );

    // Calculate suggested phase count
    const suggestedPhaseCount = this.calculatePhaseCount(complexity, detectedFeatures);

    // Determine if phases are needed
    const requiresPhases =
      isFullAppRequest ||
      detectedFeatures.length >= 3 ||
      complexity === 'complex' ||
      complexity === 'enterprise' ||
      complexityScore >= 4 ||
      (wordCount > 50 && detectedFeatures.length >= 2);

    return {
      requiresPhases,
      complexity,
      suggestedPhaseCount,
      detectedFeatures,
      detectedTechnical,
      confidence: this.calculateConfidence(
        isFullAppRequest,
        detectedFeatures.length,
        wordCount,
        complexityScore
      ),
      reason: this.generateReason(requiresPhases, complexity, detectedFeatures, isFullAppRequest),
    };
  }

  /**
   * Analyze scope for modifications to existing apps
   */
  private analyzeModificationScope(
    prompt: string,
    _currentComponent: GeneratedComponentInfo
  ): ScopeDetectionResult {
    // For modifications, only use phases for major rewrites
    const isRewrite = /rewrite|rebuild|completely\s+change|redesign|overhaul|redo\s+from/i.test(
      prompt
    );
    const isAddingMajorFeature = COMPLEX_FEATURE_PATTERNS.some(
      ({ pattern, feature }) =>
        pattern.test(prompt) && ['auth', 'database', 'payment', 'realtime'].includes(feature)
    );

    // Check if adding multiple features at once
    const featureCount = COMPLEX_FEATURE_PATTERNS.filter(({ pattern }) =>
      pattern.test(prompt)
    ).length;

    if (isRewrite) {
      return {
        requiresPhases: true,
        complexity: 'complex',
        suggestedPhaseCount: 5,
        detectedFeatures: [],
        detectedTechnical: {},
        confidence: 0.85,
        reason: 'Major rewrite requiring phased approach',
      };
    }

    if (isAddingMajorFeature || featureCount >= 3) {
      return {
        requiresPhases: true,
        complexity: 'moderate',
        suggestedPhaseCount: Math.min(3 + featureCount, 8),
        detectedFeatures: COMPLEX_FEATURE_PATTERNS.filter(({ pattern }) =>
          pattern.test(prompt)
        ).map(({ feature }) => feature),
        detectedTechnical: {},
        confidence: 0.75,
        reason: `Adding ${featureCount} major feature(s) - phased approach recommended`,
      };
    }

    return {
      requiresPhases: false,
      complexity: 'simple',
      suggestedPhaseCount: 0,
      detectedFeatures: [],
      detectedTechnical: {},
      confidence: 0.9,
      reason: 'Simple modification - direct execution',
    };
  }

  /**
   * Build full context from conversation history
   */
  private buildFullContext(prompt: string, history: ChatMessage[]): string {
    const recentMessages = history.slice(-10);
    return recentMessages.map((m) => m.content).join(' ') + ' ' + prompt;
  }

  /**
   * Determine complexity level based on various factors
   */
  private determineComplexity(
    featureCount: number,
    wordCount: number,
    isFullApp: boolean,
    complexityScore: number
  ): ScopeDetectionResult['complexity'] {
    if ((isFullApp && featureCount >= 5) || complexityScore >= 10) return 'enterprise';
    if (isFullApp || featureCount >= 4 || complexityScore >= 6) return 'complex';
    if (featureCount >= 2 || wordCount > 30 || complexityScore >= 3) return 'moderate';
    return 'simple';
  }

  /**
   * Calculate suggested phase count based on complexity
   */
  private calculatePhaseCount(
    complexity: ScopeDetectionResult['complexity'],
    features: string[]
  ): number {
    switch (complexity) {
      case 'enterprise':
        return Math.min(20, 5 + features.length * 2);
      case 'complex':
        return Math.min(12, 4 + features.length);
      case 'moderate':
        return Math.min(6, 3 + Math.floor(features.length / 2));
      default:
        return 0;
    }
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    isFullApp: boolean,
    featureCount: number,
    wordCount: number,
    complexityScore: number
  ): number {
    if (isFullApp) return 0.95;
    if (complexityScore >= 6) return 0.9;
    if (featureCount >= 3) return 0.85;
    if (wordCount > 50) return 0.75;
    if (featureCount >= 1) return 0.65;
    return 0.5;
  }

  /**
   * Generate human-readable reason
   */
  private generateReason(
    requiresPhases: boolean,
    complexity: string,
    features: string[],
    isFullApp: boolean
  ): string {
    if (!requiresPhases) {
      return 'Request is simple enough for direct execution';
    }

    if (isFullApp) {
      return `Full application build detected - structured phased approach for ${complexity} complexity`;
    }

    if (features.length >= 3) {
      return `Complex request with ${features.length} major features: ${features.slice(0, 4).join(', ')}${features.length > 4 ? '...' : ''}`;
    }

    return `${complexity.charAt(0).toUpperCase() + complexity.slice(1)} complexity requiring structured phased build`;
  }
}

// Export singleton instance
export const scopeDetectionService = new ScopeDetectionService();

export default ScopeDetectionService;
