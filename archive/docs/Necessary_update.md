# Dual AI Planning Architecture - Complete Implementation Plan

**Status**: Ready for Implementation
**Last Updated**: February 2026
**Purpose**: Eliminate planning issues through consensus-based dual AI architecture with live intelligence gathering

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Complete Flow Diagram](#complete-flow-diagram)
3. [Service Implementations](#service-implementations)
4. [API Routes](#api-routes)
5. [UI Components](#ui-components)
6. [Integration Guide](#integration-guide)
7. [File Checklist](#file-checklist)

---

## Architecture Overview

### Core Principles

1. **No Arbitration Bias**: Neither AI decides for the other - they must reach consensus
2. **Live Intelligence**: Web search for latest AI models, frameworks, and best practices
3. **Transparent Process**: Users see negotiation progress while working on layout
4. **Non-Blocking**: Runs in background during layout design
5. **Consensus Required**: AIs negotiate until they agree (max 5 rounds)
6. **Self-Validating**: Both AIs independently validate the final plan

### Key Design Decisions

- **Layout is Phase 1**: Already designed by user, AIs don't plan it
- **AIs need LayoutManifest**: To extract backend requirements and ensure alignment
- **Automatic Execution**: Runs automatically (no user choice to skip)
- **Negotiation Until Consensus**: AIs keep refining until agreement or escalation
- **Code Generation**: Remains Claude Opus 4.5 only (not dual AI)

---

## Complete Flow Diagram

```
User Concept Created (Claude Sonnet 4.5)
          ↓
User Designs Layout (Gemini 3 system)
          ↓
     LayoutManifest created
          ↓
┌─────────────────────────────────────────────────────────────┐
│ TRIGGER: Dual AI Planning (Background Process)              │
│                                                              │
│ Inputs:                                                      │
│ - AppConcept (what they want)                                │
│ - LayoutManifest (what the UI looks like)                    │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: LAYOUT ANALYSIS (0-5%)                             │
│                                                              │
│  LayoutBackendAnalyzer Service:                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Extracts from LayoutManifest:                          │ │
│  │ - Required data models                                 │ │
│  │ - API endpoints needed                                 │ │
│  │ - Auth requirements                                    │ │
│  │ - Real-time features                                   │ │
│  │ - File upload needs                                    │ │
│  │ - Search functionality                                 │ │
│  │ - State management complexity                          │ │
│  │ - Performance requirements                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Output: FrontendBackendNeeds                                │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: LIVE INTELLIGENCE GATHERING (5-20%)                │
│                                                              │
│  LiveIntelligenceGatherer Service:                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Parallel Web Searches:                                 │ │
│  │                                                        │ │
│  │ 1. Latest AI Models (Feb 2026)                        │ │
│  │    - "latest AI language models February 2026"        │ │
│  │    - "Claude vs GPT-5 vs Gemini comparison 2026"      │ │
│  │    - "best AI for code generation 2026"               │ │
│  │    - "AI model context windows 2026"                  │ │
│  │    - "cheapest AI API costs 2026"                     │ │
│  │                                                        │ │
│  │ 2. Framework Versions                                 │ │
│  │    - "Next.js latest version February 2026"           │ │
│  │    - "React 19 new features"                          │ │
│  │    - "TypeScript latest version 2026"                 │ │
│  │    - "Tailwind CSS latest 2026"                       │ │
│  │                                                        │ │
│  │ 3. Category-Specific Patterns                         │ │
│  │    - "modern [category] app architecture 2026"        │ │
│  │    - "[category] recommended libraries 2026"          │ │
│  │    - "scalable [category] patterns"                   │ │
│  │                                                        │ │
│  │ 4. Security Best Practices                            │ │
│  │    - "web security vulnerabilities 2026"              │ │
│  │    - "OWASP top 10 2026"                              │ │
│  │    - "NextAuth security best practices"               │ │
│  │                                                        │ │
│  │ 5. Performance Optimization                           │ │
│  │    - "React performance optimization 2026"            │ │
│  │    - "Next.js app performance practices"              │ │
│  │    - "web vitals optimization 2026"                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  AI Synthesis (Claude Sonnet 4.5):                          │
│  - Analyzes gathered data                                   │
│  - Recommends best AI models for each phase                 │
│  - Identifies optimal frameworks/libraries                  │
│                                                              │
│  Output: IntelligenceContext                                │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: PARALLEL PLAN GENERATION (20-40%)                  │
│                                                              │
│  Both AIs receive same context:                             │
│  - AppConcept                                                │
│  - LayoutManifest                                            │
│  - FrontendBackendNeeds                                      │
│  - IntelligenceContext                                       │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │ Claude Opus 4.5      │    │ Gemini Pro 3         │      │
│  │ (Extended Thinking)  │    │                      │      │
│  ├──────────────────────┤    ├──────────────────────┤      │
│  │ Generates:           │    │ Generates:           │      │
│  │ - Architecture       │    │ - Architecture       │      │
│  │ - Phase breakdown    │    │ - Phase breakdown    │      │
│  │ - AI selections      │    │ - AI selections      │      │
│  │ - Tech decisions     │    │ - Tech decisions     │      │
│  │ - Scaling strategy   │    │ - Scaling strategy   │      │
│  └──────────────────────┘    └──────────────────────┘      │
│           ↓                            ↓                     │
│      Plan A                        Plan B                    │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: ITERATIVE CONSENSUS NEGOTIATION (40-80%)           │
│                                                              │
│  ConsensusNegotiator Service (Max 5 rounds):                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ROUND 1:                                               │ │
│  │                                                        │ │
│  │ Claude reviews Gemini's plan:                         │ │
│  │ "I agree with X, Y, Z because..."                     │ │
│  │ "I disagree with A because... my approach is better"  │ │
│  │ "You caught B that I missed"                          │ │
│  │ "We should compromise on C"                           │ │
│  │         ↕                                              │ │
│  │ Gemini reviews Claude's plan:                         │ │
│  │ (Same structured feedback)                            │ │
│  │                                                        │ │
│  │ Output: Agreements list + Disagreements list          │ │
│  └────────────────────────────────────────────────────────┘ │
│          ↓                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Both AIs adjust plans based on feedback               │ │
│  │ - Incorporate valid points from other AI              │ │
│  │ - Strengthen reasoning for disagreements              │ │
│  │ - Propose compromises                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│          ↓                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ROUND 2: (Repeat review process)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│          ↓                                                   │
│       ... continues ...                                      │
│          ↓                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Consensus Checker (neutral validator):                │ │
│  │                                                        │ │
│  │ IF disagreements.length === 0:                        │ │
│  │   → CONSENSUS REACHED                                 │ │
│  │                                                        │ │
│  │ ELSE IF round >= 5:                                   │ │
│  │   → ESCALATE TO USER (show both plans)                │ │
│  │                                                        │ │
│  │ ELSE IF not converging:                               │ │
│  │   → ESCALATE TO USER (irreconcilable differences)     │ │
│  │                                                        │ │
│  │ ELSE:                                                 │ │
│  │   → CONTINUE TO NEXT ROUND                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Output: UnifiedPlan (co-authored) OR EscalationRequest      │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 5: DUAL CONCEPT VALIDATION (80-100%)                  │
│                                                              │
│  DualValidationOrchestrator Service:                        │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │ Claude validates:    │    │ Gemini validates:    │      │
│  ├──────────────────────┤    ├──────────────────────┤      │
│  │ Plan vs Concept      │    │ Plan vs Concept      │      │
│  │                      │    │                      │      │
│  │ Checks for:          │    │ Checks for:          │      │
│  │ - Missing features   │    │ - Missing features   │      │
│  │ - Flow gaps          │    │ - Flow gaps          │      │
│  │ - Scaling issues     │    │ - Scaling issues     │      │
│  │ - Security holes     │    │ - Security holes     │      │
│  │ - Performance risks  │    │ - Performance risks  │      │
│  └──────────────────────┘    └──────────────────────┘      │
│           ↓                            ↓                     │
│    Validation Report A          Validation Report B          │
│           ↓                            ↓                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Merge Validation Results:                              │ │
│  │                                                        │ │
│  │ IF both approve with 0 critical issues:               │ │
│  │   → APPROVED FOR EXECUTION                            │ │
│  │                                                        │ │
│  │ ELSE IF issues found:                                 │ │
│  │   → REPLAN (back to Stage 4 with feedback)            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Output: FinalValidatedPlan                                  │
└─────────────────────────────────────────────────────────────┘
          ↓
     Planning Complete!
          ↓
User finishes layout → Sees approved plan → Starts code generation
          ↓
Code Generation (Claude Opus 4.5 - single AI)
- Phase 1: Layout code (from LayoutManifest)
- Phases 2-N: Features (from FinalValidatedPlan)
```

---

## Service Implementations

### 1. LayoutBackendAnalyzer Service

**File**: `src/services/LayoutBackendAnalyzer.ts`

```typescript
import type { LayoutManifest, DetectedComponentEnhanced } from '@/types/schema';

/**
 * Frontend-Backend requirements extracted from layout
 */
interface FrontendBackendNeeds {
  // Data models required
  dataModels: {
    name: string;
    fields: string[];
    relationships: string[];
    inferredFrom: string; // Which component/section
  }[];

  // API endpoints required
  apiEndpoints: {
    method: string;
    path: string;
    purpose: string;
    triggeredBy: string; // Which component
  }[];

  // State management needs
  stateManagement: {
    globalState: string[];
    localState: string[];
    complexity: 'simple' | 'moderate' | 'complex';
  };

  // Special features
  features: {
    authRequired: boolean;
    realtimeNeeded: boolean;
    fileUploads: boolean;
    searchNeeded: boolean;
    paginationNeeded: boolean;
    cachingNeeded: boolean;
  };

  // Performance considerations
  performance: {
    expectedDataVolume: 'low' | 'medium' | 'high';
    queryComplexity: 'simple' | 'moderate' | 'complex';
    concurrentUsers: number; // estimated
  };
}

/**
 * Analyzes LayoutManifest to extract backend requirements
 * This ensures the backend architecture perfectly supports the frontend
 */
export class LayoutBackendAnalyzer {
  extractBackendNeeds(layout: LayoutManifest): FrontendBackendNeeds {
    const needs: FrontendBackendNeeds = {
      dataModels: [],
      apiEndpoints: [],
      stateManagement: {
        globalState: [],
        localState: [],
        complexity: 'simple',
      },
      features: {
        authRequired: false,
        realtimeNeeded: false,
        fileUploads: false,
        searchNeeded: false,
        paginationNeeded: false,
        cachingNeeded: false,
      },
      performance: {
        expectedDataVolume: 'low',
        queryComplexity: 'simple',
        concurrentUsers: 100,
      },
    };

    // Analyze each component
    for (const component of layout.components) {
      // Check for auth components
      if (this.isAuthComponent(component)) {
        needs.features.authRequired = true;
        needs.apiEndpoints.push({
          method: 'POST',
          path: '/api/auth/login',
          purpose: 'User authentication',
          triggeredBy: component.id,
        });
        needs.dataModels.push({
          name: 'User',
          fields: ['email', 'password', 'profile'],
          relationships: [],
          inferredFrom: component.id,
        });
      }

      // Check for data display components
      if (this.isDataDisplayComponent(component)) {
        const modelName = this.inferModelName(component);
        needs.dataModels.push({
          name: modelName,
          fields: this.inferFields(component),
          relationships: [],
          inferredFrom: component.id,
        });
        needs.apiEndpoints.push({
          method: 'GET',
          path: `/api/${modelName.toLowerCase()}`,
          purpose: `Fetch ${modelName} data`,
          triggeredBy: component.id,
        });
      }

      // Check for forms (CRUD operations)
      if (this.isFormComponent(component)) {
        const modelName = this.inferModelName(component);
        needs.apiEndpoints.push(
          {
            method: 'POST',
            path: `/api/${modelName.toLowerCase()}`,
            purpose: `Create ${modelName}`,
            triggeredBy: component.id,
          },
          {
            method: 'PUT',
            path: `/api/${modelName.toLowerCase()}/:id`,
            purpose: `Update ${modelName}`,
            triggeredBy: component.id,
          }
        );
      }

      // Check for file upload
      if (this.hasFileUpload(component)) {
        needs.features.fileUploads = true;
        needs.apiEndpoints.push({
          method: 'POST',
          path: '/api/upload',
          purpose: 'Handle file uploads',
          triggeredBy: component.id,
        });
      }

      // Check for search
      if (this.hasSearch(component)) {
        needs.features.searchNeeded = true;
        needs.apiEndpoints.push({
          method: 'GET',
          path: '/api/search',
          purpose: 'Search functionality',
          triggeredBy: component.id,
        });
      }

      // Check for real-time features
      if (this.isRealtimeComponent(component)) {
        needs.features.realtimeNeeded = true;
      }

      // Check for pagination
      if (this.hasPagination(component)) {
        needs.features.paginationNeeded = true;
      }
    }

    // Analyze complexity
    needs.stateManagement.complexity = this.assessStateComplexity(layout);
    needs.performance = this.assessPerformanceNeeds(layout);

    return needs;
  }

  private isAuthComponent(component: DetectedComponentEnhanced): boolean {
    const authKeywords = ['login', 'signup', 'register', 'auth', 'sign in'];
    return authKeywords.some(
      (kw) =>
        component.type.toLowerCase().includes(kw) || component.content?.toLowerCase().includes(kw)
    );
  }

  private isDataDisplayComponent(component: DetectedComponentEnhanced): boolean {
    const displayTypes = ['table', 'list', 'grid', 'card', 'chart'];
    return displayTypes.some((type) => component.type.toLowerCase().includes(type));
  }

  private isFormComponent(component: DetectedComponentEnhanced): boolean {
    return (
      component.type.toLowerCase().includes('form') ||
      component.children?.some((child) => child.type.includes('input'))
    );
  }

  private hasFileUpload(component: DetectedComponentEnhanced): boolean {
    return (
      component.type.toLowerCase().includes('upload') ||
      component.type.toLowerCase().includes('file')
    );
  }

  private hasSearch(component: DetectedComponentEnhanced): boolean {
    return component.type.toLowerCase().includes('search');
  }

  private isRealtimeComponent(component: DetectedComponentEnhanced): boolean {
    const realtimeKeywords = ['chat', 'message', 'notification', 'live', 'real-time'];
    return realtimeKeywords.some((kw) => component.type.toLowerCase().includes(kw));
  }

  private hasPagination(component: DetectedComponentEnhanced): boolean {
    return (
      component.type.toLowerCase().includes('pagination') ||
      component.children?.some((child) => child.type.toLowerCase().includes('pagination'))
    );
  }

  private inferModelName(component: DetectedComponentEnhanced): string {
    // Smart inference from component structure
    // e.g., "product-table" → "Product"
    // e.g., "user-profile-card" → "User"

    const name = component.id || component.type;
    const words = name.split(/[-_]/);
    const modelWords = words.filter(
      (w) => !['table', 'list', 'grid', 'card', 'form', 'display'].includes(w.toLowerCase())
    );

    return modelWords[0]?.charAt(0).toUpperCase() + modelWords[0]?.slice(1) || 'Data';
  }

  private inferFields(component: DetectedComponentEnhanced): string[] {
    const fields: string[] = [];

    // Extract from table columns
    if (component.type.includes('table')) {
      fields.push(...this.extractTableColumns(component));
    }

    // Extract from form inputs
    if (component.type.includes('form')) {
      fields.push(...this.extractFormFields(component));
    }

    // Extract from card content
    if (component.type.includes('card')) {
      fields.push(...this.extractCardFields(component));
    }

    return fields;
  }

  private extractTableColumns(component: DetectedComponentEnhanced): string[] {
    // Look for column headers in children
    const columns: string[] = [];
    // Implementation depends on component structure
    return columns;
  }

  private extractFormFields(component: DetectedComponentEnhanced): string[] {
    const fields: string[] = [];
    if (component.children) {
      for (const child of component.children) {
        if (child.type.includes('input') || child.type.includes('field')) {
          fields.push(child.id || child.type);
        }
      }
    }
    return fields;
  }

  private extractCardFields(component: DetectedComponentEnhanced): string[] {
    // Extract text content as potential fields
    return [];
  }

  private assessStateComplexity(layout: LayoutManifest): 'simple' | 'moderate' | 'complex' {
    const componentCount = layout.components.length;
    const interactiveComponents = layout.components.filter((c) => this.isInteractive(c)).length;

    if (interactiveComponents > 10) return 'complex';
    if (interactiveComponents > 5) return 'moderate';
    return 'simple';
  }

  private isInteractive(component: DetectedComponentEnhanced): boolean {
    const interactiveTypes = ['button', 'input', 'form', 'select', 'checkbox', 'radio'];
    return interactiveTypes.some((type) => component.type.toLowerCase().includes(type));
  }

  private assessPerformanceNeeds(layout: LayoutManifest): any {
    // Estimate data volume based on component types
    const hasTables = layout.components.some((c) => c.type.includes('table'));
    const hasCharts = layout.components.some((c) => c.type.includes('chart'));

    return {
      expectedDataVolume: hasTables || hasCharts ? 'high' : 'medium',
      queryComplexity: hasTables ? 'complex' : 'simple',
      concurrentUsers: 1000, // Default estimate
    };
  }
}
```

---

### 2. LiveIntelligenceGatherer Service

**File**: `src/services/LiveIntelligenceGatherer.ts`

```typescript
import type { AppConcept } from '@/types/appConcept';

interface AIModelInfo {
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

interface AIModelRecommendation {
  primary: string;
  alternative: string;
  reasoning: string;
  costEstimate: string;
}

interface FrameworkInfo {
  name: string;
  version: string;
  releaseDate: string;
  newFeatures: string[];
  breakingChanges: string[];
}

interface LibraryInfo {
  name: string;
  purpose: string;
  version: string;
  popularity: string;
}

interface IntelligenceContext {
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
  frameworks: {
    nextjs: FrameworkInfo;
    react: FrameworkInfo;
    typescript: FrameworkInfo;
    tailwind: FrameworkInfo;
    [key: string]: FrameworkInfo;
  };
  categoryPatterns: {
    category: string; // e.g., "e-commerce", "social media"
    modernApproaches: string[];
    recommendedLibraries: LibraryInfo[];
    architecturePatterns: string[];
  };
  security: {
    vulnerabilities2026: string[];
    bestPractices: string[];
    recommendedPackages: string[];
  };
  performance: {
    optimizationTechniques: string[];
    benchmarkData: any;
  };
  gatherTimestamp: string;
}

/**
 * Gathers live intelligence from the web about:
 * - Latest AI models and their capabilities
 * - Framework versions and best practices
 * - Security vulnerabilities and fixes
 * - Performance optimization techniques
 * - Category-specific patterns
 */
export class LiveIntelligenceGatherer {
  async gather(appConcept: AppConcept): Promise<IntelligenceContext> {
    console.log('[Intelligence] Starting live intelligence gathering...');

    // Parallel web searches
    const [aiModelsData, frameworkData, categoryData, securityData, performanceData] =
      await Promise.all([
        this.searchAIModels(),
        this.searchFrameworks(),
        this.searchCategoryPatterns(appConcept),
        this.searchSecurityPractices(),
        this.searchPerformanceOptimizations(),
      ]);

    // Synthesize recommendations
    const recommendations = await this.synthesizeRecommendations(aiModelsData, appConcept);

    return {
      aiModels: {
        byProvider: aiModelsData,
        recommendations,
      },
      frameworks: frameworkData,
      categoryPatterns: categoryData,
      security: securityData,
      performance: performanceData,
      gatherTimestamp: new Date().toISOString(),
    };
  }

  private async searchAIModels(): Promise<any> {
    console.log('[Intelligence] Searching for latest AI models...');

    const searches = [
      'latest AI language models February 2026 pricing capabilities',
      'Claude Opus 4.5 vs GPT-5 vs Gemini Pro 3 comparison 2026',
      'best AI models for code generation 2026',
      'AI model context window sizes 2026',
      'cheapest AI API costs per token 2026',
    ];

    const results = await Promise.all(searches.map((query) => this.webSearch(query)));

    return this.parseAIModelData(results);
  }

  private async searchFrameworks(): Promise<any> {
    console.log('[Intelligence] Searching for framework versions...');

    const searches = [
      'Next.js latest version February 2026',
      'React 19 new features',
      'TypeScript 5.x latest version',
      'Tailwind CSS latest version 2026',
    ];

    const results = await Promise.all(searches.map((query) => this.webSearch(query)));

    return this.parseFrameworkData(results);
  }

  private async searchCategoryPatterns(concept: AppConcept): Promise<any> {
    console.log('[Intelligence] Searching for category-specific patterns...');

    // Determine app category from concept
    const category = this.inferCategory(concept);

    const searches = [
      `modern ${category} app architecture best practices 2026`,
      `${category} app recommended libraries 2026`,
      `scalable ${category} application patterns`,
      `${category} app performance optimization`,
    ];

    const results = await Promise.all(searches.map((query) => this.webSearch(query)));

    return this.parseCategoryData(results, category);
  }

  private async searchSecurityPractices(): Promise<any> {
    console.log('[Intelligence] Searching for security practices...');

    const searches = [
      'web application security vulnerabilities 2026',
      'OWASP top 10 2026',
      'secure coding practices Next.js 2026',
      'authentication best practices 2026',
    ];

    const results = await Promise.all(searches.map((query) => this.webSearch(query)));

    return this.parseSecurityData(results);
  }

  private async searchPerformanceOptimizations(): Promise<any> {
    console.log('[Intelligence] Searching for performance optimizations...');

    const searches = [
      'React performance optimization techniques 2026',
      'Next.js app performance best practices',
      'web vitals optimization 2026',
      'code splitting strategies 2026',
    ];

    const results = await Promise.all(searches.map((query) => this.webSearch(query)));

    return this.parsePerformanceData(results);
  }

  private async synthesizeRecommendations(aiModelsData: any, appConcept: AppConcept): Promise<any> {
    console.log('[Intelligence] Synthesizing AI model recommendations...');

    // Use Claude Sonnet 4.5 to analyze gathered data and recommend
    // which AI models should be used for different phases

    const prompt = `
Based on this intelligence about current AI models and this app concept,
recommend the BEST AI models for each phase of development.

AVAILABLE AI MODELS:
${JSON.stringify(aiModelsData, null, 2)}

APP CONCEPT:
${JSON.stringify(appConcept, null, 2)}

Recommend:
1. Best model for user concept refinement
2. Best model for code generation (balance quality/cost)
3. Best model for code review
4. Best model for testing/validation

For each, explain:
- Why this model is best for this task
- Cost estimate for this app
- Alternative if cost is a concern

Return structured JSON with recommendations.
`;

    const response = await this.callClaude(prompt);
    return this.parseRecommendations(response);
  }

  private inferCategory(concept: AppConcept): string {
    // Simple category inference from app description
    const description = concept.description?.toLowerCase() || '';

    if (description.includes('ecommerce') || description.includes('shop')) {
      return 'ecommerce';
    }
    if (description.includes('social') || description.includes('chat')) {
      return 'social';
    }
    if (description.includes('dashboard') || description.includes('analytics')) {
      return 'analytics';
    }

    return 'general';
  }

  private async webSearch(query: string): Promise<any> {
    // Call web_search tool
    const response = await fetch('/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return response.json();
  }

  private async callClaude(prompt: string): Promise<any> {
    const response = await fetch('/api/ai/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'claude-sonnet-4-20250514',
      }),
    });
    return response.json();
  }

  private parseAIModelData(results: any[]): any {
    // Parse web search results into structured AIModelInfo
    // Implementation depends on actual search result format
    return {
      anthropic: [],
      openai: [],
      google: [],
      meta: [],
      openSource: [],
    };
  }

  private parseFrameworkData(results: any[]): any {
    // Parse framework information
    return {
      nextjs: {
        name: 'Next.js',
        version: '15.x',
        releaseDate: '',
        newFeatures: [],
        breakingChanges: [],
      },
      react: {
        name: 'React',
        version: '19.x',
        releaseDate: '',
        newFeatures: [],
        breakingChanges: [],
      },
      typescript: {
        name: 'TypeScript',
        version: '5.x',
        releaseDate: '',
        newFeatures: [],
        breakingChanges: [],
      },
      tailwind: {
        name: 'Tailwind',
        version: '4.x',
        releaseDate: '',
        newFeatures: [],
        breakingChanges: [],
      },
    };
  }

  private parseCategoryData(results: any[], category: string): any {
    return {
      category,
      modernApproaches: [],
      recommendedLibraries: [],
      architecturePatterns: [],
    };
  }

  private parseSecurityData(results: any[]): any {
    return {
      vulnerabilities2026: [],
      bestPractices: [],
      recommendedPackages: [],
    };
  }

  private parsePerformanceData(results: any[]): any {
    return {
      optimizationTechniques: [],
      benchmarkData: {},
    };
  }

  private parseRecommendations(response: any): any {
    return {
      forConceptCreation: { primary: '', alternative: '', reasoning: '', costEstimate: '' },
      forCodeGeneration: { primary: '', alternative: '', reasoning: '', costEstimate: '' },
      forTesting: { primary: '', alternative: '', reasoning: '', costEstimate: '' },
      forReview: { primary: '', alternative: '', reasoning: '', costEstimate: '' },
    };
  }
}
```

---

### 3. ConsensusNegotiator Service

**File**: `src/services/ConsensusNegotiator.ts`

```typescript
import type { AppConcept } from '@/types/appConcept';
import type { IntelligenceContext } from './LiveIntelligenceGatherer';

interface PlanPosition {
  architecture: any;
  phases: any[];
  aiSelections: any;
  techDecisions: any;
  scalingStrategy: any;
}

interface Disagreement {
  topic: string;
  claudeStance: string;
  geminiStance: string;
  reasoning: {
    claude: string;
    gemini: string;
  };
}

interface NegotiationRound {
  round: number;
  claudePosition: PlanPosition;
  geminiPosition: PlanPosition;
  claudeFeedback: string;
  geminiFeedback: string;
  agreements: string[];
  disagreements: Disagreement[];
}

interface UnifiedPlan {
  architecture: any;
  phases: any[];
  aiSelections: any;
  techDecisions: any;
  scalingStrategy: any;
  consensusReport: {
    rounds: number;
    finalAgreements: string[];
    compromises: string[];
  };
}

interface ConsensusResult {
  reached: boolean;
  rounds: NegotiationRound[];
  finalPlan?: UnifiedPlan;
  escalationReason?: string;
  divergentIssues?: Disagreement[];
}

export class ConsensusFailureError extends Error {
  constructor(public result: ConsensusResult) {
    super('AIs unable to reach consensus');
  }
}

/**
 * Negotiates between Claude and Gemini until they reach consensus
 * Maximum 5 rounds of negotiation before escalating to user
 */
export class ConsensusNegotiator {
  private maxRounds = 5;
  private roundCompleteCallbacks: ((round: number, total: number) => void)[] = [];

  onRoundComplete(callback: (round: number, total: number) => void) {
    this.roundCompleteCallbacks.push(callback);
  }

  async negotiate(
    claudePlan: PlanPosition,
    geminiPlan: PlanPosition,
    appConcept: AppConcept,
    intelligence: IntelligenceContext
  ): Promise<ConsensusResult> {
    const rounds: NegotiationRound[] = [];
    let currentClaudePlan = claudePlan;
    let currentGeminiPlan = geminiPlan;

    for (let round = 1; round <= this.maxRounds; round++) {
      console.log(`[Consensus] Starting negotiation round ${round}...`);

      // Both AIs review each other's plans in parallel
      const [claudeReview, geminiReview] = await Promise.all([
        this.claudeReviewsGemini(currentGeminiPlan, currentClaudePlan, appConcept, intelligence),
        this.geminiReviewsClaude(currentClaudePlan, currentGeminiPlan, appConcept, intelligence),
      ]);

      // Record this round
      const roundData: NegotiationRound = {
        round,
        claudePosition: currentClaudePlan,
        geminiPosition: currentGeminiPlan,
        claudeFeedback: claudeReview.feedback,
        geminiFeedback: geminiReview.feedback,
        agreements: this.findAgreements(claudeReview, geminiReview),
        disagreements: this.findDisagreements(claudeReview, geminiReview),
      };

      rounds.push(roundData);

      // Notify progress
      for (const callback of this.roundCompleteCallbacks) {
        callback(round, this.maxRounds);
      }

      // Check for consensus
      if (roundData.disagreements.length === 0) {
        console.log(`[Consensus] Reached consensus in round ${round}!`);
        return {
          reached: true,
          rounds,
          finalPlan: this.mergePlans(currentClaudePlan, currentGeminiPlan, roundData.agreements),
        };
      }

      // Both AIs adjust their plans based on feedback
      const [updatedClaudePlan, updatedGeminiPlan] = await Promise.all([
        this.claudeAdjustsPlan(currentClaudePlan, geminiReview, roundData.disagreements),
        this.geminiAdjustsPlan(currentGeminiPlan, claudeReview, roundData.disagreements),
      ]);

      currentClaudePlan = updatedClaudePlan;
      currentGeminiPlan = updatedGeminiPlan;

      // Check if they're converging
      if (!this.isConverging(rounds)) {
        console.warn('[Consensus] Negotiation not converging, escalating to user...');
        return {
          reached: false,
          rounds,
          escalationReason: 'AIs unable to reach consensus after substantive negotiation',
          divergentIssues: roundData.disagreements,
        };
      }
    }

    // Max rounds reached without consensus
    console.warn('[Consensus] Max rounds reached, escalating to user...');
    return {
      reached: false,
      rounds,
      escalationReason: `Unable to reach consensus after ${this.maxRounds} rounds`,
      divergentIssues: rounds[rounds.length - 1].disagreements,
    };
  }

  private async claudeReviewsGemini(
    geminiPlan: PlanPosition,
    ownPlan: PlanPosition,
    concept: AppConcept,
    intelligence: IntelligenceContext
  ) {
    const prompt = `
You and Gemini Pro 3 are collaborating to create the best possible implementation plan.

YOUR CURRENT PLAN:
${JSON.stringify(ownPlan, null, 2)}

GEMINI'S CURRENT PLAN:
${JSON.stringify(geminiPlan, null, 2)}

APP CONCEPT:
${JSON.stringify(concept, null, 2)}

LATEST INTELLIGENCE (AI models, frameworks, best practices):
${JSON.stringify(intelligence, null, 2)}

Your task is to review Gemini's plan and provide constructive feedback:

1. What do you AGREE with in Gemini's plan? (Be specific)
2. What do you DISAGREE with? (Explain why your approach is better)
3. What did Gemini catch that you missed? (Be honest)
4. Where should you both compromise?

Be objective. The goal is the BEST plan, not winning the argument.
If Gemini's approach is better for something, say so and adjust your plan.

Response format:
{
  "agreements": ["aspect 1", "aspect 2", ...],
  "disagreements": [
    {
      "topic": "database choice",
      "myStance": "PostgreSQL",
      "geminiStance": "MongoDB",
      "myReasoning": "...",
      "willingToCompromise": true/false
    }
  ],
  "proposedAdjustments": {
    // Your updated plan incorporating good ideas from Gemini
  }
}
`;

    const response = await this.callClaude(prompt, { extendedThinking: true });
    return this.parseReviewResponse(response);
  }

  private async geminiReviewsClaude(
    claudePlan: PlanPosition,
    ownPlan: PlanPosition,
    concept: AppConcept,
    intelligence: IntelligenceContext
  ) {
    const prompt = `
You and Claude Opus 4.5 are collaborating to create the best possible implementation plan.

YOUR CURRENT PLAN:
${JSON.stringify(ownPlan, null, 2)}

CLAUDE'S CURRENT PLAN:
${JSON.stringify(claudePlan, null, 2)}

APP CONCEPT:
${JSON.stringify(concept, null, 2)}

LATEST INTELLIGENCE (AI models, frameworks, best practices):
${JSON.stringify(intelligence, null, 2)}

Your task is to review Claude's plan and provide constructive feedback:

1. What do you AGREE with in Claude's plan? (Be specific)
2. What do you DISAGREE with? (Explain why your approach is better)
3. What did Claude catch that you missed? (Be honest)
4. Where should you both compromise?

Be objective. The goal is the BEST plan, not winning the argument.
If Claude's approach is better for something, say so and adjust your plan.

[Same response format]
`;

    const response = await this.callGemini(prompt);
    return this.parseReviewResponse(response);
  }

  private findAgreements(claudeReview: any, geminiReview: any): string[] {
    // Find aspects both AIs agree on
    const agreements: string[] = [];

    for (const claudeAgreement of claudeReview.agreements) {
      if (geminiReview.agreements.some((g) => this.isSimilar(g, claudeAgreement))) {
        agreements.push(claudeAgreement);
      }
    }

    return agreements;
  }

  private findDisagreements(claudeReview: any, geminiReview: any): Disagreement[] {
    const disagreements: Disagreement[] = [];

    // Cross-reference disagreements from both sides
    for (const claudeDisagreement of claudeReview.disagreements) {
      const matchingGeminiDisagreement = geminiReview.disagreements.find((g) =>
        this.isSameTopic(g.topic, claudeDisagreement.topic)
      );

      if (matchingGeminiDisagreement) {
        disagreements.push({
          topic: claudeDisagreement.topic,
          claudeStance: claudeDisagreement.myStance,
          geminiStance: matchingGeminiDisagreement.myStance,
          reasoning: {
            claude: claudeDisagreement.myReasoning,
            gemini: matchingGeminiDisagreement.myReasoning,
          },
        });
      }
    }

    return disagreements;
  }

  private async claudeAdjustsPlan(
    currentPlan: PlanPosition,
    geminiReview: any,
    disagreements: Disagreement[]
  ): Promise<PlanPosition> {
    const prompt = `
Based on Gemini's feedback, adjust your plan.

YOUR CURRENT PLAN:
${JSON.stringify(currentPlan, null, 2)}

GEMINI'S FEEDBACK:
${JSON.stringify(geminiReview, null, 2)}

REMAINING DISAGREEMENTS:
${JSON.stringify(disagreements, null, 2)}

Update your plan to:
1. Incorporate Gemini's valid points
2. Provide stronger reasoning for areas you still disagree
3. Propose compromises where possible

Return the UPDATED plan.
`;

    const response = await this.callClaude(prompt, { extendedThinking: true });
    return this.parseUpdatedPlan(response);
  }

  private async geminiAdjustsPlan(
    currentPlan: PlanPosition,
    claudeReview: any,
    disagreements: Disagreement[]
  ): Promise<PlanPosition> {
    const prompt = `
Based on Claude's feedback, adjust your plan.

YOUR CURRENT PLAN:
${JSON.stringify(currentPlan, null, 2)}

CLAUDE'S FEEDBACK:
${JSON.stringify(claudeReview, null, 2)}

REMAINING DISAGREEMENTS:
${JSON.stringify(disagreements, null, 2)}

Update your plan to:
1. Incorporate Claude's valid points
2. Provide stronger reasoning for areas you still disagree
3. Propose compromises where possible

Return the UPDATED plan.
`;

    const response = await this.callGemini(prompt);
    return this.parseUpdatedPlan(response);
  }

  private isConverging(rounds: NegotiationRound[]): boolean {
    if (rounds.length < 2) return true;

    const previousRound = rounds[rounds.length - 2];
    const currentRound = rounds[rounds.length - 1];

    // Check if disagreements are decreasing
    return currentRound.disagreements.length < previousRound.disagreements.length;
  }

  private mergePlans(
    claudePlan: PlanPosition,
    geminiPlan: PlanPosition,
    agreements: string[]
  ): UnifiedPlan {
    // Merge the two plans into one unified plan
    // Since they've reached consensus, they should be nearly identical
    return {
      architecture: claudePlan.architecture,
      phases: claudePlan.phases,
      aiSelections: claudePlan.aiSelections,
      techDecisions: claudePlan.techDecisions,
      scalingStrategy: claudePlan.scalingStrategy,
      consensusReport: {
        rounds: 0, // Will be set by caller
        finalAgreements: agreements,
        compromises: [],
      },
    };
  }

  private isSimilar(a: string, b: string): boolean {
    // Simple similarity check
    return a.toLowerCase() === b.toLowerCase();
  }

  private isSameTopic(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
  }

  private async callClaude(prompt: string, options?: any): Promise<any> {
    const response = await fetch('/api/ai/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'claude-opus-4-20250514',
        extendedThinking: options?.extendedThinking || false,
      }),
    });
    return response.json();
  }

  private async callGemini(prompt: string): Promise<any> {
    const response = await fetch('/api/ai/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'gemini-pro-3',
      }),
    });
    return response.json();
  }

  private parseReviewResponse(response: any): any {
    // Parse AI response into structured review
    return {
      feedback: '',
      agreements: [],
      disagreements: [],
      proposedAdjustments: {},
    };
  }

  private parseUpdatedPlan(response: any): PlanPosition {
    // Parse AI response into updated plan
    return {
      architecture: {},
      phases: [],
      aiSelections: {},
      techDecisions: {},
      scalingStrategy: {},
    };
  }
}
```

---

### 4. DualValidationOrchestrator Service

**File**: `src/services/DualValidationOrchestrator.ts`

```typescript
import type { AppConcept } from '@/types/appConcept';
import type { UnifiedPlan } from './ConsensusNegotiator';

interface ValidationIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  category: 'missing_feature' | 'flow_gap' | 'scaling' | 'security' | 'performance';
  description: string;
  affectedFeatures: string[];
  suggestedFix: string;
}

interface ValidationReport {
  issues: ValidationIssue[];
  coverage: number; // 0-100%
  reasoning: string;
}

interface DualValidationResult {
  claudeValidation: ValidationReport;
  geminiValidation: ValidationReport;
  finalReport: {
    combinedIssues: ValidationIssue[];
    overallCoverage: number;
    needsReplan: boolean;
    approvedForExecution: boolean;
  };
}

/**
 * Both AIs independently validate the plan against the concept
 * If critical issues found, triggers replanning
 */
export class DualValidationOrchestrator {
  async validate(plan: UnifiedPlan, appConcept: AppConcept): Promise<DualValidationResult> {
    console.log('[Validation] Starting dual validation...');

    // Both AIs validate in parallel
    const [claudeValidation, geminiValidation] = await Promise.all([
      this.claudeValidate(plan, appConcept),
      this.geminiValidate(plan, appConcept),
    ]);

    // Merge validation results
    const finalReport = this.mergeValidations(claudeValidation, geminiValidation);

    return { claudeValidation, geminiValidation, finalReport };
  }

  private async claudeValidate(plan: UnifiedPlan, concept: AppConcept): Promise<ValidationReport> {
    const prompt = `
You are reviewing an implementation plan against the user's original concept.
Your job is to find ANYTHING that was missed, misunderstood, or could cause problems.

IMPLEMENTATION PLAN:
${JSON.stringify(plan, null, 2)}

ORIGINAL APP CONCEPT:
${JSON.stringify(concept, null, 2)}

Review the plan and identify:
1. Missing features from the concept
2. Gaps in user flows or workflows
3. Scaling bottlenecks
4. Security vulnerabilities
5. Performance issues
6. Anything that doesn't match what the user asked for

Be thorough. If the plan is perfect, say so. If not, list every issue.

Return structured JSON:
{
  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "category": "missing_feature" | "flow_gap" | "scaling" | "security" | "performance",
      "description": "...",
      "affectedFeatures": [...],
      "suggestedFix": "..."
    }
  ],
  "coverage": 0-100, // What % of concept is covered
  "reasoning": "Overall assessment"
}
`;

    const response = await this.callClaude(prompt, { extendedThinking: true });
    return this.parseValidationReport(response);
  }

  private async geminiValidate(plan: UnifiedPlan, concept: AppConcept): Promise<ValidationReport> {
    // Same prompt as Claude
    const prompt = `
You are reviewing an implementation plan against the user's original concept.
Your job is to find ANYTHING that was missed, misunderstood, or could cause problems.

IMPLEMENTATION PLAN:
${JSON.stringify(plan, null, 2)}

ORIGINAL APP CONCEPT:
${JSON.stringify(concept, null, 2)}

Review the plan and identify:
1. Missing features from the concept
2. Gaps in user flows or workflows
3. Scaling bottlenecks
4. Security vulnerabilities
5. Performance issues
6. Anything that doesn't match what the user asked for

Be thorough. If the plan is perfect, say so. If not, list every issue.

[Same response format]
`;

    const response = await this.callGemini(prompt);
    return this.parseValidationReport(response);
  }

  private mergeValidations(claudeReport: ValidationReport, geminiReport: ValidationReport) {
    // Combine issues from both reports
    const allIssues = [...claudeReport.issues, ...geminiReport.issues];

    // Deduplicate similar issues
    const uniqueIssues = this.deduplicateIssues(allIssues);

    // Check if any critical issues exist
    const hasCriticalIssues = uniqueIssues.some((i) => i.severity === 'critical');

    // Calculate overall coverage (average of both)
    const overallCoverage = (claudeReport.coverage + geminiReport.coverage) / 2;

    return {
      combinedIssues: uniqueIssues,
      overallCoverage,
      needsReplan: hasCriticalIssues,
      approvedForExecution: !hasCriticalIssues && overallCoverage >= 95,
    };
  }

  private deduplicateIssues(issues: ValidationIssue[]): ValidationIssue[] {
    const unique: ValidationIssue[] = [];

    for (const issue of issues) {
      const exists = unique.some(
        (u) => u.description.toLowerCase() === issue.description.toLowerCase()
      );
      if (!exists) {
        unique.push(issue);
      }
    }

    return unique;
  }

  private async callClaude(prompt: string, options?: any): Promise<any> {
    const response = await fetch('/api/ai/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'claude-opus-4-20250514',
        extendedThinking: options?.extendedThinking || false,
      }),
    });
    return response.json();
  }

  private async callGemini(prompt: string): Promise<any> {
    const response = await fetch('/api/ai/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'gemini-pro-3',
      }),
    });
    return response.json();
  }

  private parseValidationReport(response: any): ValidationReport {
    // Parse AI response into structured validation report
    return {
      issues: [],
      coverage: 0,
      reasoning: '',
    };
  }
}
```

---

<!-- TRUNCATION NOTE: Content was truncated at this point due to message size limits. -->
<!-- The following sections from the original document need to be appended: -->
<!-- - Remaining service implementations -->
<!-- - API Routes -->
<!-- - UI Components -->
<!-- - Integration Guide -->
<!-- - File Checklist -->
