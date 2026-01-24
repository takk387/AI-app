/**
 * ProjectDocumentationService
 *
 * Captures, stores, and retrieves project documentation artifacts.
 * Integrates with Supabase for persistence and storage.
 *
 * Features:
 * - CRUD operations for project documentation
 * - Artifact snapshot capture (concept, layout, plan, phases)
 * - Screenshot upload for layout previews
 * - Stats recalculation
 *
 * @example
 * ```typescript
 * import { createClient } from '@/utils/supabase/client';
 * const supabase = createClient();
 * const docService = new ProjectDocumentationService(supabase);
 * const doc = await docService.createDocumentation(appId, userId, 'My App');
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { AppConcept } from '@/types/appConcept';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { ChatMessage } from '@/types/aiBuilderTypes';
import type { LayoutManifest } from '@/types/schema';
import {
  ProjectDocumentation,
  ProjectDocumentationRow,
  ConceptSnapshot,
  LayoutSnapshot,
  PlanSnapshot,
  PhaseExecutionRecord,
  BuildStatus,
  createEmptyStats,
  mapRowToDocumentation,
  mapDocumentationToRow,
  calculateStats,
} from '@/types/projectDocumentation';

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * ProjectDocumentationService - Main service class
 */
export class ProjectDocumentationService {
  private client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Create new documentation for an app
   */
  async createDocumentation(
    appId: string,
    userId: string,
    projectName: string,
    projectDescription?: string
  ): Promise<ServiceResult<ProjectDocumentation>> {
    try {
      const { data, error } = await this.client
        .from('project_documentation')
        .insert({
          app_id: appId,
          user_id: userId,
          project_name: projectName,
          project_description: projectDescription ?? null,
          build_status: 'planning',
          phase_executions: [] as unknown as undefined,
          stats: createEmptyStats() as unknown as undefined,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: mapRowToDocumentation(data as unknown as ProjectDocumentationRow),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get documentation by ID
   */
  async getById(docId: string): Promise<ServiceResult<ProjectDocumentation>> {
    try {
      const { data, error } = await this.client
        .from('project_documentation')
        .select('*')
        .eq('id', docId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Documentation not found' };
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: mapRowToDocumentation(data as unknown as ProjectDocumentationRow),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get documentation by app ID
   */
  async getByAppId(appId: string): Promise<ServiceResult<ProjectDocumentation | null>> {
    try {
      const { data, error } = await this.client
        .from('project_documentation')
        .select('*')
        .eq('app_id', appId)
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data ? mapRowToDocumentation(data as unknown as ProjectDocumentationRow) : null,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all documentation for a user
   */
  async getByUserId(userId: string): Promise<ServiceResult<ProjectDocumentation[]>> {
    try {
      const { data, error } = await this.client
        .from('project_documentation')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: (data || []).map((row) =>
          mapRowToDocumentation(row as unknown as ProjectDocumentationRow)
        ),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Update documentation
   */
  async update(
    docId: string,
    updates: Partial<ProjectDocumentation>
  ): Promise<ServiceResult<ProjectDocumentation>> {
    try {
      const dbUpdates = mapDocumentationToRow(updates);

      const { data, error } = await this.client
        .from('project_documentation')
        // Cast needed: our Row type has typed JSONB fields, Supabase expects Json
        .update(dbUpdates as unknown as Record<string, unknown>)
        .eq('id', docId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: mapRowToDocumentation(data as unknown as ProjectDocumentationRow),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete documentation
   */
  async delete(docId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.client.from('project_documentation').delete().eq('id', docId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // CAPTURE METHODS
  // ============================================================================

  /**
   * Capture concept snapshot from wizard
   * Captures COMPREHENSIVE data including architecture, workflows, roles with permissions
   */
  async captureConceptSnapshot(
    docId: string,
    concept: AppConcept,
    source: 'wizard' | 'builder-chat' = 'wizard',
    options?: {
      conversationContext?: string;
      chatMessages?: ChatMessage[];
      messageCountAtCapture?: number;
    }
  ): Promise<ServiceResult<ConceptSnapshot>> {
    try {
      // Determine full conversation context - prefer concept's own context, fallback to options
      const fullConversationContext = concept.conversationContext || options?.conversationContext;

      const snapshot: ConceptSnapshot = {
        id: crypto.randomUUID(),
        capturedAt: new Date().toISOString(),
        source,

        // === BASIC INFO ===
        name: concept.name,
        description: concept.description,
        purpose: concept.purpose,
        targetUsers: concept.targetUsers,

        // === FEATURES (full Feature[] with id, name, description, priority, dependencies) ===
        features: concept.coreFeatures,

        // === TECHNICAL (full TechnicalRequirements including dataModels, i18n, caching, etc.) ===
        technical: concept.technical,

        // === UI PREFERENCES (full UIPreferences with all design tokens) ===
        uiPreferences: concept.uiPreferences,

        // === ROLES (full UserRole[] with capabilities AND permissions) ===
        roles: concept.roles,

        // === WORKFLOWS (full Workflow[] with description, steps, involvedRoles) ===
        workflows: concept.workflows,

        // === ARCHITECTURE (critical - full ArchitectureSpec) ===
        architectureSpec: concept.architectureSpec,

        // === LAYOUT DESIGN REFERENCE ===
        layoutDesignId: concept.layoutDesign ? 'linked' : undefined,

        // === CONVERSATION CONTEXT ===
        conversationContext: fullConversationContext,
        conversationSummary: fullConversationContext
          ? this.summarizeConversation(fullConversationContext)
          : undefined,
        builderChatHistory: source === 'builder-chat' ? options?.chatMessages : undefined,
        messageCountAtCapture: options?.messageCountAtCapture,

        // === METADATA ===
        originalCreatedAt: concept.createdAt,
        originalUpdatedAt: concept.updatedAt,
      };

      const result = await this.update(docId, { conceptSnapshot: snapshot });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: snapshot };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Capture concept from builder chat (partial concept)
   * Passes through all available fields from partialConcept
   */
  async captureBuilderChatSnapshot(
    docId: string,
    chatMessages: ChatMessage[],
    partialConcept?: Partial<AppConcept>,
    messageCountAtCapture?: number
  ): Promise<ServiceResult<ConceptSnapshot>> {
    try {
      // Build concept from partial, preserving all available fields
      const concept: AppConcept = {
        name: partialConcept?.name || 'Untitled App',
        description: partialConcept?.description || '',
        purpose: partialConcept?.purpose || '',
        targetUsers: partialConcept?.targetUsers || '',
        coreFeatures: partialConcept?.coreFeatures || [],
        technical: partialConcept?.technical || {
          needsAuth: false,
          needsDatabase: false,
          needsAPI: false,
          needsFileUpload: false,
          needsRealtime: false,
        },
        uiPreferences: partialConcept?.uiPreferences || {
          style: 'modern',
          colorScheme: 'light',
          layout: 'single-page',
        },
        // Preserve additional fields from partialConcept
        roles: partialConcept?.roles,
        workflows: partialConcept?.workflows,
        architectureSpec: partialConcept?.architectureSpec,
        layoutDesign: partialConcept?.layoutDesign,
        conversationContext: partialConcept?.conversationContext,
        createdAt: partialConcept?.createdAt || new Date().toISOString(),
        updatedAt: partialConcept?.updatedAt || new Date().toISOString(),
      };

      return this.captureConceptSnapshot(docId, concept, 'builder-chat', {
        chatMessages,
        messageCountAtCapture,
        conversationContext: this.extractConversationContext(chatMessages),
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Capture layout snapshot with preview image
   */
  async captureLayoutSnapshot(
    docId: string,
    manifest: LayoutManifest,
    options?: {
      previewImageUrl?: string;
      designNotes?: string;
      referenceImages?: Array<{ id: string; url: string; description?: string }>;
    }
  ): Promise<ServiceResult<LayoutSnapshot>> {
    try {
      const snapshot: LayoutSnapshot = {
        id: crypto.randomUUID(),
        capturedAt: new Date().toISOString(),
        source: 'layout-builder',
        layoutManifest: manifest,
        previewImageUrl: options?.previewImageUrl,
        designNotes: options?.designNotes,
        referenceImages: options?.referenceImages,
      };

      const result = await this.update(docId, { layoutSnapshot: snapshot });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: snapshot };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Capture plan snapshot
   */
  async capturePlanSnapshot(
    docId: string,
    plan: DynamicPhasePlan
  ): Promise<ServiceResult<PlanSnapshot>> {
    try {
      // Calculate feature breakdown by domain
      const featureBreakdown: Record<string, number> = {};
      for (const phase of plan.phases) {
        featureBreakdown[phase.domain] =
          (featureBreakdown[phase.domain] || 0) + phase.features.length;
      }

      const snapshot: PlanSnapshot = {
        id: crypto.randomUUID(),
        capturedAt: new Date().toISOString(),
        plan,
        totalPhases: plan.totalPhases,
        estimatedTime: plan.estimatedTotalTime,
        complexity: plan.complexity,
        featureBreakdown,
      };

      const result = await this.update(docId, {
        planSnapshot: snapshot,
        buildStatus: 'ready',
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: snapshot };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Record phase execution start
   */
  async recordPhaseStart(
    docId: string,
    phaseNumber: number,
    phaseName: string,
    plannedInfo: {
      domain: string;
      features: string[];
      description: string;
      estimatedTokens: number;
    }
  ): Promise<ServiceResult<void>> {
    try {
      const docResult = await this.getById(docId);
      if (!docResult.success || !docResult.data) {
        return { success: false, error: docResult.error || 'Documentation not found' };
      }

      const doc = docResult.data;
      const executions = [...doc.phaseExecutions];

      // Check if phase already exists
      const existingIndex = executions.findIndex((e) => e.phaseNumber === phaseNumber);

      const record: PhaseExecutionRecord = {
        phaseNumber,
        phaseName,
        domain: plannedInfo.domain,
        plannedFeatures: plannedInfo.features,
        plannedDescription: plannedInfo.description,
        estimatedTokens: plannedInfo.estimatedTokens,
        status: 'in-progress',
        startedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        executions[existingIndex] = record;
      } else {
        executions.push(record);
      }

      await this.update(docId, {
        phaseExecutions: executions,
        buildStatus: 'building',
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Record phase execution completion
   */
  async recordPhaseComplete(
    docId: string,
    phaseNumber: number,
    result: {
      success: boolean;
      generatedCode?: string;
      generatedFiles?: string[];
      implementedFeatures?: string[];
      errors?: string[];
      tokensUsed?: { input: number; output: number };
    }
  ): Promise<ServiceResult<void>> {
    try {
      const docResult = await this.getById(docId);
      if (!docResult.success || !docResult.data) {
        return { success: false, error: docResult.error || 'Documentation not found' };
      }

      const doc = docResult.data;
      const executions = [...doc.phaseExecutions];
      const index = executions.findIndex((e) => e.phaseNumber === phaseNumber);

      if (index < 0) {
        return { success: false, error: `Phase ${phaseNumber} not found in executions` };
      }

      const startedAt = executions[index].startedAt;
      const completedAt = new Date().toISOString();
      const duration = startedAt
        ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
        : undefined;

      executions[index] = {
        ...executions[index],
        status: result.success ? 'completed' : 'failed',
        completedAt,
        duration,
        generatedCode: result.generatedCode,
        generatedFiles: result.generatedFiles,
        implementedFeatures: result.implementedFeatures,
        errors: result.errors,
        tokensUsed: result.tokensUsed,
      };

      await this.update(docId, { phaseExecutions: executions });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // BUILD LIFECYCLE METHODS
  // ============================================================================

  /**
   * Mark build as started
   */
  async startBuild(docId: string): Promise<ServiceResult<void>> {
    try {
      await this.update(docId, {
        buildStatus: 'building',
        buildStartedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Mark build as completed and recalculate stats
   */
  async completeBuild(docId: string): Promise<ServiceResult<void>> {
    try {
      const docResult = await this.getById(docId);
      if (!docResult.success || !docResult.data) {
        return { success: false, error: docResult.error || 'Documentation not found' };
      }

      const doc = docResult.data;
      const stats = calculateStats({
        conceptSnapshot: doc.conceptSnapshot,
        planSnapshot: doc.planSnapshot,
        phaseExecutions: doc.phaseExecutions,
        buildStartedAt: doc.buildStartedAt,
        buildCompletedAt: new Date().toISOString(),
      });

      await this.update(docId, {
        buildStatus: 'completed',
        buildCompletedAt: new Date().toISOString(),
        stats,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Mark build as failed
   */
  async failBuild(docId: string, error?: string): Promise<ServiceResult<void>> {
    try {
      const docResult = await this.getById(docId);
      if (!docResult.success || !docResult.data) {
        return { success: false, error: docResult.error || 'Documentation not found' };
      }

      const doc = docResult.data;
      const stats = calculateStats({
        conceptSnapshot: doc.conceptSnapshot,
        planSnapshot: doc.planSnapshot,
        phaseExecutions: doc.phaseExecutions,
        buildStartedAt: doc.buildStartedAt,
        buildCompletedAt: new Date().toISOString(),
      });

      await this.update(docId, {
        buildStatus: 'failed',
        buildCompletedAt: new Date().toISOString(),
        stats,
        notes: error ? `Build failed: ${error}` : doc.notes,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Update build status
   */
  async updateBuildStatus(docId: string, status: BuildStatus): Promise<ServiceResult<void>> {
    try {
      await this.update(docId, { buildStatus: status });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Summarize conversation context (truncate for storage)
   */
  private summarizeConversation(context: string): string {
    const maxLength = 2000;
    if (context.length <= maxLength) {
      return context;
    }
    return context.substring(0, maxLength - 3) + '...';
  }

  /**
   * Extract conversation context from chat messages
   */
  private extractConversationContext(messages: ChatMessage[]): string {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');
  }

  /**
   * Get or create documentation for an app
   */
  async getOrCreate(
    appId: string,
    userId: string,
    projectName: string
  ): Promise<ServiceResult<ProjectDocumentation>> {
    // Try to get existing
    const existing = await this.getByAppId(appId);
    if (existing.success && existing.data) {
      return { success: true, data: existing.data };
    }

    // Create new
    return this.createDocumentation(appId, userId, projectName);
  }
}
