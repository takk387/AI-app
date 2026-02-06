/**
 * LiveIntelligenceGatherer Service
 *
 * Stage 2 of the Dual AI Planning pipeline.
 * Gathers current information via web search about AI models, frameworks,
 * security practices, and category-specific patterns.
 *
 * Server-side only — calls /api/web-search and /api/ai/claude proxy routes.
 * Includes agentic framework detection when concept requires workflow automation.
 */

import type { AppConcept } from '@/types/appConcept';
import type {
  IntelligenceContext,
  AIModelInfo,
  FrameworkInfo,
  LibraryInfo,
  AgenticFrameworkInfo,
  WebSearchResult,
} from '@/types/dualPlanning';
import { MODEL_IDS } from '@/constants/aiModels';

// ============================================================================
// AGENTIC DETECTION KEYWORDS
// ============================================================================

const AGENTIC_KEYWORDS = [
  'automation',
  'processing',
  'moderation',
  'routing',
  'orchestration',
  'pipeline',
  'workflow',
  'agent',
  'ai-powered',
  'intelligent',
  'chatbot',
  'assistant',
  'recommendation',
  'classification',
  'content generation',
  'analysis',
  'monitoring',
  'scheduling',
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

class LiveIntelligenceGathererService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? '';
  }

  /**
   * Main entry point: gather all intelligence in parallel.
   */
  async gather(appConcept: AppConcept): Promise<IntelligenceContext> {
    const needsAgentic = this.detectAgenticNeeds(appConcept);
    const category = this.inferCategory(appConcept);

    // Run all searches in parallel
    const [aiModelsData, frameworkData, categoryData, securityData, performanceData, agenticData] =
      await Promise.all([
        this.searchAIModels(),
        this.searchFrameworks(),
        this.searchCategoryPatterns(category),
        this.searchSecurityPractices(),
        this.searchPerformanceOptimizations(),
        needsAgentic ? this.searchAgenticFrameworks() : Promise.resolve([]),
      ]);

    // Synthesize recommendations using Claude Sonnet
    const recommendations = await this.synthesizeRecommendations(
      aiModelsData,
      appConcept,
      needsAgentic
    );

    return {
      aiModels: {
        byProvider: aiModelsData,
        recommendations,
      },
      frameworks: frameworkData,
      categoryPatterns: categoryData,
      agenticFrameworks: agenticData,
      security: securityData,
      performance: performanceData,
      gatherTimestamp: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // AGENTIC DETECTION
  // ==========================================================================

  private detectAgenticNeeds(concept: AppConcept): boolean {
    const searchText = [
      concept.description,
      concept.purpose,
      ...(concept.coreFeatures?.map((f) => `${f.name} ${f.description}`) ?? []),
      ...(concept.workflows?.map((w) => `${w.name} ${w.description ?? ''} ${w.steps.join(' ')}`) ??
        []),
    ]
      .join(' ')
      .toLowerCase();

    return AGENTIC_KEYWORDS.some((kw) => searchText.includes(kw));
  }

  // ==========================================================================
  // SEARCH FUNCTIONS
  // ==========================================================================

  private async searchAIModels(): Promise<IntelligenceContext['aiModels']['byProvider']> {
    const queries = [
      'latest AI language models February 2026 pricing capabilities',
      'Claude Opus 4.6 vs GPT-5 vs Gemini 3 Pro comparison 2026',
      'best AI models for code generation 2026',
      'AI model context window sizes pricing 2026',
    ];

    const results = await this.batchWebSearch(queries);
    return this.parseAIModelResults(results);
  }

  private async searchFrameworks(): Promise<Record<string, FrameworkInfo>> {
    const queries = [
      'Next.js latest version February 2026 features',
      'React 19 new features hooks 2026',
      'TypeScript latest version 2026',
      'Tailwind CSS latest version 2026',
    ];

    const results = await this.batchWebSearch(queries);
    return this.parseFrameworkResults(results);
  }

  private async searchCategoryPatterns(
    category: string
  ): Promise<IntelligenceContext['categoryPatterns']> {
    const queries = [
      `modern ${category} app architecture best practices 2026`,
      `${category} app recommended libraries npm packages 2026`,
      `scalable ${category} application patterns Next.js`,
    ];

    const results = await this.batchWebSearch(queries);
    return this.parseCategoryResults(results, category);
  }

  private async searchSecurityPractices(): Promise<IntelligenceContext['security']> {
    const queries = [
      'web application security vulnerabilities OWASP 2026',
      'Next.js security best practices authentication 2026',
      'secure coding practices React TypeScript 2026',
    ];

    const results = await this.batchWebSearch(queries);
    return this.parseSecurityResults(results);
  }

  private async searchPerformanceOptimizations(): Promise<IntelligenceContext['performance']> {
    const queries = [
      'React performance optimization techniques 2026',
      'Next.js app router performance best practices',
      'web vitals optimization core web vitals 2026',
    ];

    const results = await this.batchWebSearch(queries);
    return this.parsePerformanceResults(results);
  }

  private async searchAgenticFrameworks(): Promise<AgenticFrameworkInfo[]> {
    const queries = [
      'LangChain.js CrewAI AutoGen agentic frameworks 2026',
      'best AI agent orchestration tools TypeScript 2026',
      'agentic workflow patterns Next.js integration 2026',
    ];

    const results = await this.batchWebSearch(queries);
    return this.parseAgenticResults(results);
  }

  // ==========================================================================
  // AI SYNTHESIS
  // ==========================================================================

  private async synthesizeRecommendations(
    aiModelsData: IntelligenceContext['aiModels']['byProvider'],
    concept: AppConcept,
    needsAgentic: boolean
  ): Promise<IntelligenceContext['aiModels']['recommendations']> {
    const prompt = `You are an AI model selection expert. Based on the gathered intelligence about current AI models and this app concept, recommend the BEST AI model for each development task.

AVAILABLE AI MODELS (gathered from web search):
${JSON.stringify(aiModelsData, null, 2)}

APP CONCEPT:
- Name: ${concept.name}
- Description: ${concept.description}
- Purpose: ${concept.purpose}
- Features: ${concept.coreFeatures?.map((f) => f.name).join(', ')}
- Needs agentic workflows: ${needsAgentic}

For each task below, recommend a primary model and a cost-effective alternative:
1. Concept refinement and planning
2. Code generation (main development)
3. Code testing and validation
4. Code review and quality assurance

Return ONLY valid JSON (no markdown) in this exact format:
{
  "forConceptCreation": { "primary": "model-id", "alternative": "model-id", "reasoning": "why", "costEstimate": "$X per generation" },
  "forCodeGeneration": { "primary": "model-id", "alternative": "model-id", "reasoning": "why", "costEstimate": "$X per generation" },
  "forTesting": { "primary": "model-id", "alternative": "model-id", "reasoning": "why", "costEstimate": "$X per generation" },
  "forReview": { "primary": "model-id", "alternative": "model-id", "reasoning": "why", "costEstimate": "$X per generation" }
}`;

    try {
      const response = await this.callAI('claude', prompt, MODEL_IDS.CLAUDE_SONNET);
      return this.parseJSONResponse<IntelligenceContext['aiModels']['recommendations']>(
        response,
        this.getDefaultRecommendations()
      );
    } catch {
      return this.getDefaultRecommendations();
    }
  }

  // ==========================================================================
  // CATEGORY INFERENCE
  // ==========================================================================

  private inferCategory(concept: AppConcept): string {
    const text =
      `${concept.description ?? ''} ${concept.purpose ?? ''} ${concept.name ?? ''}`.toLowerCase();

    const categories: [string, string[]][] = [
      [
        'ecommerce',
        ['ecommerce', 'e-commerce', 'shop', 'store', 'marketplace', 'cart', 'checkout', 'product'],
      ],
      ['social', ['social', 'chat', 'messaging', 'community', 'forum', 'feed', 'follow', 'friend']],
      [
        'analytics',
        ['dashboard', 'analytics', 'reporting', 'metrics', 'monitor', 'visualization', 'data'],
      ],
      [
        'productivity',
        ['task', 'project', 'todo', 'kanban', 'workflow', 'calendar', 'schedule', 'productivity'],
      ],
      [
        'education',
        ['learn', 'course', 'education', 'tutorial', 'quiz', 'student', 'teacher', 'lms'],
      ],
      [
        'healthcare',
        ['health', 'medical', 'patient', 'doctor', 'hospital', 'appointment', 'wellness'],
      ],
      [
        'finance',
        ['finance', 'banking', 'payment', 'invoice', 'budget', 'accounting', 'crypto', 'trading'],
      ],
      ['cms', ['blog', 'cms', 'content', 'article', 'publish', 'editor', 'page builder']],
    ];

    for (const [category, keywords] of categories) {
      if (keywords.some((kw) => text.includes(kw))) {
        return category;
      }
    }

    return 'general';
  }

  // ==========================================================================
  // WEB SEARCH & AI HELPERS
  // ==========================================================================

  private async batchWebSearch(queries: string[]): Promise<WebSearchResult[][]> {
    const results = await Promise.allSettled(queries.map((query) => this.webSearch(query)));

    return results.map((r) => (r.status === 'fulfilled' ? r.value : []));
  }

  private async webSearch(query: string): Promise<WebSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/web-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.results ?? [];
    } catch {
      // Graceful degradation: pipeline continues without web search
      return [];
    }
  }

  private async callAI(
    provider: 'claude' | 'gemini',
    prompt: string,
    model?: string
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/ai/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
    });

    if (!response.ok) {
      throw new Error(`AI call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content ?? '';
  }

  // ==========================================================================
  // RESULT PARSERS
  // ==========================================================================

  private parseAIModelResults(
    results: WebSearchResult[][]
  ): IntelligenceContext['aiModels']['byProvider'] {
    // Extract structured data from search results
    // In production, we'd parse the snippets more thoroughly.
    // For now, return a reasonable structure that the AI synthesis step will enrich.
    const allSnippets = results
      .flat()
      .map((r) => r.snippet)
      .join('\n');

    return {
      anthropic: this.extractModelsFromText(allSnippets, 'anthropic'),
      openai: this.extractModelsFromText(allSnippets, 'openai'),
      google: this.extractModelsFromText(allSnippets, 'google'),
      meta: this.extractModelsFromText(allSnippets, 'meta'),
      openSource: this.extractModelsFromText(allSnippets, 'open-source'),
    };
  }

  private extractModelsFromText(text: string, provider: string): AIModelInfo[] {
    // This is a best-effort extraction. The AI synthesis step will refine.
    // We provide baseline data that the synthesis prompt can work with.
    const models: AIModelInfo[] = [];

    // Provider-specific known models as baseline
    const knownModels: Record<string, Partial<AIModelInfo>[]> = {
      anthropic: [
        {
          name: 'Claude Opus 4.6',
          version: '4.6',
          contextWindow: 200000,
          bestFor: ['architecture', 'complex reasoning'],
        },
        {
          name: 'Claude Sonnet 4.5',
          version: '4.5',
          contextWindow: 200000,
          bestFor: ['code generation', 'fast analysis'],
        },
      ],
      google: [
        {
          name: 'Gemini 3 Pro',
          version: '3.0',
          contextWindow: 1000000,
          bestFor: ['agentic workflows', 'vision'],
        },
      ],
      openai: [
        {
          name: 'GPT-4o',
          version: '4o',
          contextWindow: 128000,
          bestFor: ['general tasks', 'multimodal'],
        },
      ],
      meta: [],
      'open-source': [],
    };

    for (const known of knownModels[provider] ?? []) {
      models.push({
        name: known.name ?? '',
        version: known.version ?? '',
        contextWindow: known.contextWindow ?? 0,
        pricing: { input: 0, output: 0 },
        capabilities: [],
        bestFor: known.bestFor ?? [],
        limitations: [],
        releasedDate: '',
      });
    }

    return models;
  }

  private parseFrameworkResults(results: WebSearchResult[][]): Record<string, FrameworkInfo> {
    return {
      nextjs: {
        name: 'Next.js',
        version: '15.x',
        releaseDate: '',
        newFeatures: this.extractFeaturesFromResults(results[0] ?? []),
        breakingChanges: [],
      },
      react: {
        name: 'React',
        version: '19.x',
        releaseDate: '',
        newFeatures: this.extractFeaturesFromResults(results[1] ?? []),
        breakingChanges: [],
      },
      typescript: {
        name: 'TypeScript',
        version: '5.x',
        releaseDate: '',
        newFeatures: this.extractFeaturesFromResults(results[2] ?? []),
        breakingChanges: [],
      },
      tailwind: {
        name: 'Tailwind CSS',
        version: '4.x',
        releaseDate: '',
        newFeatures: this.extractFeaturesFromResults(results[3] ?? []),
        breakingChanges: [],
      },
    };
  }

  private parseCategoryResults(
    results: WebSearchResult[][],
    category: string
  ): IntelligenceContext['categoryPatterns'] {
    const allSnippets = results.flat().map((r) => r.snippet);
    return {
      category,
      modernApproaches: allSnippets.slice(0, 5),
      recommendedLibraries: this.extractLibraries(results.flat()),
      architecturePatterns: allSnippets.slice(5, 10),
    };
  }

  private parseSecurityResults(results: WebSearchResult[][]): IntelligenceContext['security'] {
    const allSnippets = results.flat().map((r) => r.snippet);
    return {
      vulnerabilities2026: allSnippets
        .filter((s) => s.toLowerCase().includes('vulnerab'))
        .slice(0, 5),
      bestPractices: allSnippets.filter((s) => s.toLowerCase().includes('practice')).slice(0, 5),
      recommendedPackages: [],
    };
  }

  private parsePerformanceResults(
    results: WebSearchResult[][]
  ): IntelligenceContext['performance'] {
    const allSnippets = results.flat().map((r) => r.snippet);
    return {
      optimizationTechniques: allSnippets.slice(0, 5),
      benchmarkData: {},
    };
  }

  private parseAgenticResults(results: WebSearchResult[][]): AgenticFrameworkInfo[] {
    const frameworks: AgenticFrameworkInfo[] = [
      {
        name: 'LangChain.js',
        description: 'Framework for building AI-powered applications with chains and agents',
        bestFor: ['Complex AI pipelines', 'RAG applications', 'Multi-step reasoning'],
        integration: 'npm package, works with Next.js API routes',
        maturity: 'stable',
      },
      {
        name: 'CrewAI',
        description: 'Framework for orchestrating role-playing AI agents',
        bestFor: ['Multi-agent collaboration', 'Task delegation', 'Autonomous workflows'],
        integration: 'Python backend, API bridge to Next.js',
        maturity: 'stable',
      },
      {
        name: 'AutoGen',
        description: 'Microsoft framework for multi-agent conversations',
        bestFor: ['Agent conversations', 'Code generation pipelines', 'Research tasks'],
        integration: 'Python backend, WebSocket bridge to Next.js',
        maturity: 'beta',
      },
    ];

    // Enrich with search results if available
    const allSnippets = results
      .flat()
      .map((r) => r.snippet)
      .join(' ');
    if (allSnippets.includes('vercel ai sdk')) {
      frameworks.push({
        name: 'Vercel AI SDK',
        description: 'Streaming AI responses with React Server Components support',
        bestFor: ['Streaming responses', 'React integration', 'Edge runtime'],
        integration: 'Native Next.js integration',
        maturity: 'stable',
      });
    }

    return frameworks;
  }

  // ==========================================================================
  // UTILITY PARSERS
  // ==========================================================================

  private extractFeaturesFromResults(results: WebSearchResult[]): string[] {
    return results
      .map((r) => r.snippet)
      .filter((s) => s.length > 10)
      .slice(0, 5);
  }

  private extractLibraries(results: WebSearchResult[]): LibraryInfo[] {
    // Extract library mentions from search snippets
    const libs: LibraryInfo[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      const text = result.snippet;
      // Look for npm package patterns
      const packageMentions = text.match(
        /(?:@[\w-]+\/)?[\w-]+(?=\s*(?:npm|package|library|v?\d))/gi
      );
      if (packageMentions) {
        for (const pkg of packageMentions) {
          const name = pkg.trim();
          if (name.length > 2 && name.length < 40 && !seen.has(name)) {
            seen.add(name);
            libs.push({
              name,
              purpose: result.snippet.slice(0, 100),
              version: '',
              popularity: '',
            });
          }
        }
      }
    }

    return libs.slice(0, 10);
  }

  private parseJSONResponse<T>(text: string, fallback: T): T {
    try {
      // Try to extract JSON from the response (may have markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  private getDefaultRecommendations(): IntelligenceContext['aiModels']['recommendations'] {
    return {
      forConceptCreation: {
        primary: MODEL_IDS.CLAUDE_OPUS,
        alternative: MODEL_IDS.CLAUDE_SONNET,
        reasoning: 'Claude Opus 4.6 provides the deepest reasoning for architecture planning',
        costEstimate: '$0.50-$2.00 per planning session',
      },
      forCodeGeneration: {
        primary: MODEL_IDS.CLAUDE_SONNET,
        alternative: MODEL_IDS.GEMINI_PRO,
        reasoning: 'Claude Sonnet 4.5 balances quality and speed for code generation',
        costEstimate: '$0.10-$0.50 per generation',
      },
      forTesting: {
        primary: MODEL_IDS.GEMINI_PRO,
        alternative: MODEL_IDS.CLAUDE_SONNET,
        reasoning: 'Gemini 3 Pro with large context window excels at test validation',
        costEstimate: '$0.05-$0.20 per validation',
      },
      forReview: {
        primary: MODEL_IDS.CLAUDE_OPUS,
        alternative: MODEL_IDS.GEMINI_PRO,
        reasoning: 'Claude Opus 4.6 with extended thinking provides thorough code review',
        costEstimate: '$0.30-$1.00 per review',
      },
    };
  }
}

// Singleton export
export const liveIntelligenceGatherer = new LiveIntelligenceGathererService();
export { LiveIntelligenceGathererService };
