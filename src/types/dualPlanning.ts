/**
 * Type definitions for the Dual AI Architecture Planning system.
 *
 * Organized by pipeline stage:
 * Stage 1: Layout Analysis → FrontendBackendNeeds
 * Stage 2: Intelligence Gathering → IntelligenceContext
 * Stage 3: Parallel Architecture Generation → ArchitecturePosition
 * Stage 4: Consensus Negotiation → ConsensusResult
 * Stage 5: Dual Validation → DualValidationResult
 * Output: FinalValidatedArchitecture
 */

import type { AppConcept } from '@/types/appConcept';
import type { LayoutManifest } from '@/types/schema';
import type { AISetupTierKey, ModelId } from '@/constants/aiModels';

// ============================================================================
// STAGE 1: LAYOUT ANALYSIS
// ============================================================================

export interface InferredDataModel {
  name: string;
  fields: string[];
  relationships: string[];
  inferredFrom: string; // Which component/semanticTag triggered inference
}

export interface InferredAPIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  purpose: string;
  triggeredBy: string; // Which component triggered this
}

export interface FrontendBackendNeeds {
  dataModels: InferredDataModel[];
  apiEndpoints: InferredAPIEndpoint[];
  stateManagement: {
    globalState: string[];
    localState: string[];
    complexity: 'simple' | 'moderate' | 'complex';
  };
  features: {
    authRequired: boolean;
    realtimeNeeded: boolean;
    fileUploads: boolean;
    searchNeeded: boolean;
    paginationNeeded: boolean;
    cachingNeeded: boolean;
  };
  performance: {
    expectedDataVolume: 'low' | 'medium' | 'high';
    queryComplexity: 'simple' | 'moderate' | 'complex';
    concurrentUsers: number;
  };
}

// ============================================================================
// STAGE 2: INTELLIGENCE GATHERING
// ============================================================================

export interface AIModelInfo {
  name: string;
  version: string;
  contextWindow: number;
  pricing: {
    input: number; // per million tokens
    output: number; // per million tokens
  };
  capabilities: string[];
  bestFor: string[];
  limitations: string[];
  releasedDate: string;
}

export interface AIModelRecommendation {
  primary: string;
  alternative: string;
  reasoning: string;
  costEstimate: string;
}

export interface FrameworkInfo {
  name: string;
  version: string;
  releaseDate: string;
  newFeatures: string[];
  breakingChanges: string[];
}

export interface LibraryInfo {
  name: string;
  purpose: string;
  version: string;
  popularity: string;
}

export interface AgenticFrameworkInfo {
  name: string;
  description: string;
  bestFor: string[];
  integration: string; // How it integrates with Next.js
  maturity: 'stable' | 'beta' | 'experimental';
}

export interface IntelligenceContext {
  aiModels: {
    byProvider: {
      anthropic: AIModelInfo[];
      openai: AIModelInfo[];
      google: AIModelInfo[];
      meta: AIModelInfo[];
      openSource: AIModelInfo[];
    };
    recommendations: {
      forConceptCreation: AIModelRecommendation;
      forCodeGeneration: AIModelRecommendation;
      forTesting: AIModelRecommendation;
      forReview: AIModelRecommendation;
    };
  };
  frameworks: Record<string, FrameworkInfo>;
  categoryPatterns: {
    category: string;
    modernApproaches: string[];
    recommendedLibraries: LibraryInfo[];
    architecturePatterns: string[];
  };
  agenticFrameworks: AgenticFrameworkInfo[];
  security: {
    vulnerabilities2026: string[];
    bestPractices: string[];
    recommendedPackages: string[];
  };
  performance: {
    optimizationTechniques: string[];
    benchmarkData: Record<string, unknown>;
  };
  gatherTimestamp: string;
}

// ============================================================================
// STAGE 3: PARALLEL ARCHITECTURE GENERATION
// ============================================================================

export interface DatabaseArchitecture {
  provider: string; // 'postgresql', 'mongodb', etc.
  schema?: string; // Prisma schema or equivalent
  models: {
    name: string;
    fields: { name: string; type: string; required: boolean; unique?: boolean }[];
    relations: string[];
  }[];
}

export interface APIArchitecture {
  style: 'REST' | 'GraphQL' | 'tRPC';
  routes: {
    method: string;
    path: string;
    handler: string;
    middleware: string[];
  }[];
}

export interface AuthArchitecture {
  provider: 'NextAuth' | 'Clerk' | 'Auth0' | 'Supabase' | 'custom';
  strategy: 'JWT' | 'session';
  flows: string[]; // 'login', 'signup', 'oauth', 'magic-link'
}

export interface AgenticWorkflow {
  name: string;
  description: string;
  trigger: 'user_action' | 'scheduled' | 'event';
  agents: {
    name: string;
    role: string;
    tools: string[];
  }[];
  orchestration: 'sequential' | 'parallel' | 'conditional';
}

export interface AgenticArchitecture {
  enabled: boolean;
  workflows: AgenticWorkflow[];
  framework: 'LangChain' | 'CrewAI' | 'AutoGen' | 'custom' | 'none';
}

export interface RealtimeArchitecture {
  enabled: boolean;
  technology: 'SSE' | 'WebSocket' | 'none';
  channels: {
    name: string;
    events: string[];
  }[];
}

export interface TechStackArchitecture {
  framework: string; // 'Next.js 15'
  database: string;
  orm: string;
  libraries: string[];
}

export interface ScalingArchitecture {
  caching: {
    strategy: string;
    layers: string[];
  };
  indexing: {
    databaseIndexes: string[];
  };
  optimization: {
    techniques: string[];
  };
}

export interface AISelectionsArchitecture {
  codeGeneration: string; // model ID
  testing: string;
  review: string;
}

/**
 * The architecture position generated by each AI independently.
 * This is NOT phases — it's WHAT to build.
 */
export interface ArchitecturePosition {
  database: DatabaseArchitecture;
  api: APIArchitecture;
  auth: AuthArchitecture;
  agentic: AgenticArchitecture;
  realtime: RealtimeArchitecture;
  techStack: TechStackArchitecture;
  scaling: ScalingArchitecture;
  aiSelections: AISelectionsArchitecture;
}

// ============================================================================
// STAGE 4: CONSENSUS NEGOTIATION
// ============================================================================

export interface Disagreement {
  topic: string;
  claudeStance: string;
  geminiStance: string;
  reasoning: {
    claude: string;
    gemini: string;
  };
}

export interface NegotiationRound {
  round: number;
  claudePosition: ArchitecturePosition;
  geminiPosition: ArchitecturePosition;
  claudeFeedback: string;
  geminiFeedback: string;
  agreements: string[];
  disagreements: Disagreement[];
}

export interface ConsensusReport {
  rounds: number;
  finalAgreements: string[];
  compromises: string[];
}

export interface ConsensusResult {
  reached: boolean;
  rounds: NegotiationRound[];
  finalArchitecture?: UnifiedArchitecture;
  escalationReason?: string;
  divergentIssues?: Disagreement[];
}

// ============================================================================
// STAGE 5: DUAL VALIDATION
// ============================================================================

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  category:
    | 'missing_feature'
    | 'flow_gap'
    | 'scaling'
    | 'security'
    | 'performance'
    | 'agentic_design';
  description: string;
  affectedFeatures: string[];
  suggestedFix: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  coverage: number; // 0-100
  reasoning: string;
}

export interface DualValidationResult {
  claudeValidation: ValidationReport;
  geminiValidation: ValidationReport;
  finalReport: {
    combinedIssues: ValidationIssue[];
    overallCoverage: number;
    needsReplan: boolean;
    approvedForExecution: boolean;
  };
}

// ============================================================================
// OUTPUT: UNIFIED & VALIDATED ARCHITECTURE
// ============================================================================

/**
 * The merged architecture after consensus negotiation.
 * This is the core output before validation.
 */
export interface UnifiedArchitecture extends ArchitecturePosition {
  consensusReport: ConsensusReport;
}

/**
 * The final output of the dual AI planning pipeline.
 * Includes validation metadata on top of the unified architecture.
 */
export interface FinalValidatedArchitecture extends UnifiedArchitecture {
  validation: {
    approvedAt: string;
    coverage: number;
    issuesResolved: number;
    replanAttempts: number;
  };
}

// ============================================================================
// AI SELECTION UI (User Addition)
// ============================================================================

export interface AIFeatureSelection {
  featureId: string;
  featureName: string;
  selectedModels: ModelId[];
  recommendedModels: {
    modelId: ModelId;
    reasoning: string;
  }[];
}

export interface UserAISelection {
  selectedTier: AISetupTierKey;
  featureSelections: AIFeatureSelection[];
  customOverrides: Record<string, ModelId>; // task -> model override
}

// ============================================================================
// ESCALATION DATA
// ============================================================================

export interface EscalationData {
  reason: string;
  divergentIssues: Disagreement[];
  claudeArchitecture: ArchitecturePosition;
  geminiArchitecture: ArchitecturePosition;
  negotiationRounds: number;
}

// ============================================================================
// PIPELINE STATE
// ============================================================================

export type DualPlanStage =
  | 'idle'
  | 'layout-analysis'
  | 'intelligence'
  | 'parallel-generation'
  | 'consensus'
  | 'validation'
  | 'complete'
  | 'error'
  | 'escalated';

export interface DualPlanProgress {
  stage: DualPlanStage;
  percent: number; // 0-100
  message: string;
  negotiationRound?: number;
  maxRounds?: number;
  details?: string;
}

// ============================================================================
// SSE EVENTS
// ============================================================================

export type DualPlanSSEEventType = 'progress' | 'complete' | 'escalation' | 'error';

export interface DualPlanSSEEvent {
  type: DualPlanSSEEventType;
  data: {
    stage: DualPlanStage;
    progress: number;
    message: string;
    details?: string;
    architecture?: FinalValidatedArchitecture;
    escalation?: EscalationData;
    error?: string;
  };
}

// ============================================================================
// PLANNING SESSION (Server-side)
// ============================================================================

export interface PlanningSession {
  id: string;
  concept: AppConcept;
  layoutManifest: LayoutManifest;
  createdAt: number; // timestamp
  status: 'pending' | 'running' | 'complete' | 'error';
  cachedIntelligence?: IntelligenceContext;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface PlanningStartRequest {
  concept: AppConcept;
  layoutManifest: LayoutManifest;
  cachedIntelligence?: IntelligenceContext;
}

export interface PlanningStartResponse {
  sessionId: string;
}

export interface WebSearchRequest {
  query: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
}

export interface AIProxyRequest {
  prompt: string;
  model?: string;
  extendedThinking?: boolean;
}

export interface AIProxyResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
