/**
 * AI Model Constants & Configuration
 *
 * Single source of truth for all AI model IDs, capabilities, and tier configurations.
 * Used by the Dual AI Planning system and AI Selection Panel.
 */

// ============================================================================
// MODEL ID CONSTANTS
// ============================================================================

export const MODEL_IDS = {
  // Claude models
  CLAUDE_OPUS: 'claude-opus-4-6',
  CLAUDE_SONNET: 'claude-sonnet-4-6',

  // Gemini models
  GEMINI_PRO: 'gemini-3-pro-preview',

  // OpenAI models (proxy/embeddings only)
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
} as const;

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

// ============================================================================
// AI PROVIDER
// ============================================================================

export type AIProvider = 'anthropic' | 'google' | 'openai';

// ============================================================================
// MODEL CATALOG
// ============================================================================

export interface AIModelOption {
  id: ModelId;
  provider: AIProvider;
  name: string;
  tier: 'premium' | 'standard' | 'economy';
  capabilities: string[];
  costTier: 'high' | 'medium' | 'low';
  contextWindow: number;
  bestFor: string[];
}

export const MODEL_CATALOG: AIModelOption[] = [
  {
    id: MODEL_IDS.CLAUDE_OPUS,
    provider: 'anthropic',
    name: 'Claude Opus 4.6',
    tier: 'premium',
    capabilities: ['extended-thinking', 'code-generation', 'architecture', 'review', 'reasoning'],
    costTier: 'high',
    contextWindow: 200_000,
    bestFor: ['Architecture planning', 'Complex reasoning', 'Code review', 'Extended analysis'],
  },
  {
    id: MODEL_IDS.CLAUDE_SONNET,
    provider: 'anthropic',
    name: 'Claude Sonnet 4.6',
    tier: 'standard',
    capabilities: ['code-generation', 'synthesis', 'analysis', 'fast-response'],
    costTier: 'medium',
    contextWindow: 200_000,
    bestFor: ['Code generation', 'Data synthesis', 'Fast analysis', 'General tasks'],
  },
  {
    id: MODEL_IDS.GEMINI_PRO,
    provider: 'google',
    name: 'Gemini 3 Pro',
    tier: 'standard',
    capabilities: ['agentic-workflows', 'architecture', 'code-generation', 'vision'],
    costTier: 'medium',
    contextWindow: 1_000_000,
    bestFor: [
      'Agentic workflow design',
      'Architecture planning',
      'Vision analysis',
      'Large context',
    ],
  },
  {
    id: MODEL_IDS.GPT_4O,
    provider: 'openai',
    name: 'GPT-4o',
    tier: 'standard',
    capabilities: ['code-generation', 'analysis', 'multimodal'],
    costTier: 'medium',
    contextWindow: 128_000,
    bestFor: ['General code generation', 'Multimodal tasks', 'Broad knowledge'],
  },
  {
    id: MODEL_IDS.GPT_4O_MINI,
    provider: 'openai',
    name: 'GPT-4o Mini',
    tier: 'economy',
    capabilities: ['code-generation', 'fast-response'],
    costTier: 'low',
    contextWindow: 128_000,
    bestFor: ['Quick tasks', 'Cost-sensitive operations', 'Simple code generation'],
  },
] as const;

// ============================================================================
// AI SETUP TIERS
// ============================================================================

export type AISetupTierKey = 'cost-effective' | 'high-quality' | 'hybrid';

export interface AISetupTierConfig {
  key: AISetupTierKey;
  label: string;
  description: string;
  models: {
    architecturePlanning: ModelId;
    codeGeneration: ModelId;
    codeReview: ModelId;
    testing: ModelId;
    synthesis: ModelId;
  };
  estimatedCostMultiplier: number; // 1.0 = baseline
}

export const AI_SETUP_TIERS: Record<AISetupTierKey, AISetupTierConfig> = {
  'cost-effective': {
    key: 'cost-effective',
    label: 'Cost Effective',
    description:
      'Optimized for budget. Uses lighter models where possible without sacrificing core quality.',
    models: {
      architecturePlanning: MODEL_IDS.CLAUDE_SONNET,
      codeGeneration: MODEL_IDS.CLAUDE_SONNET,
      codeReview: MODEL_IDS.GPT_4O_MINI,
      testing: MODEL_IDS.GPT_4O_MINI,
      synthesis: MODEL_IDS.CLAUDE_SONNET,
    },
    estimatedCostMultiplier: 0.4,
  },
  'high-quality': {
    key: 'high-quality',
    label: 'High Quality',
    description: 'Maximum quality. Uses the most capable models for every task.',
    models: {
      architecturePlanning: MODEL_IDS.CLAUDE_OPUS,
      codeGeneration: MODEL_IDS.CLAUDE_OPUS,
      codeReview: MODEL_IDS.CLAUDE_OPUS,
      testing: MODEL_IDS.GEMINI_PRO,
      synthesis: MODEL_IDS.CLAUDE_OPUS,
    },
    estimatedCostMultiplier: 1.0,
  },
  hybrid: {
    key: 'hybrid',
    label: 'Hybrid',
    description:
      'Best balance of quality and cost. Premium models for critical tasks, standard for the rest.',
    models: {
      architecturePlanning: MODEL_IDS.CLAUDE_OPUS,
      codeGeneration: MODEL_IDS.CLAUDE_SONNET,
      codeReview: MODEL_IDS.GEMINI_PRO,
      testing: MODEL_IDS.CLAUDE_SONNET,
      synthesis: MODEL_IDS.CLAUDE_SONNET,
    },
    estimatedCostMultiplier: 0.65,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getModelById(id: ModelId): AIModelOption | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function getModelsByProvider(provider: AIProvider): AIModelOption[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider);
}

export function getModelsByTier(tier: AIModelOption['tier']): AIModelOption[] {
  return MODEL_CATALOG.filter((m) => m.tier === tier);
}
