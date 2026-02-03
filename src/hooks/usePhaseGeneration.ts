import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AppConcept,
  TechnicalRequirements,
  UIPreferences,
  UserRole,
} from '@/types/appConcept';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { LayoutManifest } from '@/types/schema';
import type { ArchitectureSpec } from '@/types/architectureSpec';
import {
  segmentConversation,
  getHighImportanceSegments,
  buildContextFromSegments,
} from '@/utils/conversationSegmentation';
import { buildStructuredContext, structuredContextToSummary } from '@/utils/structuredExtraction';

/**
 * Phase generation hook for wizard components
 * Handles building context and generating implementation phases
 */

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface WizardState {
  name?: string;
  description?: string;
  purpose?: string;
  targetUsers?: string;
  features: Array<{ name: string; description?: string; priority: 'high' | 'medium' | 'low' }>;
  technical: Partial<TechnicalRequirements>;
  uiPreferences: Partial<UIPreferences>;
  roles?: Array<{ name: string; capabilities: string[] }>;
  workflows?: Array<{
    name: string;
    description?: string;
    steps: string[];
    involvedRoles: string[];
  }>;
  isComplete: boolean;
  readyForPhases: boolean;
  /** True when user has confirmed the plan (prevents auto-regeneration) */
  planConfirmed?: boolean;
}

interface UsePhaseGenerationOptions {
  wizardState: WizardState;
  messages: Message[];
  importedLayoutManifest: LayoutManifest | null;
  phasePlan: DynamicPhasePlan | null;
  setPhasePlan: React.Dispatch<React.SetStateAction<DynamicPhasePlan | null>>;
  onShowToast: (opts: { type: 'success' | 'info' | 'error'; message: string }) => void;
  onAddMessage: (message: Message) => void;
  // Architecture state for sequential generation
  isGeneratingArchitecture?: boolean;
  architectureSpec?: ArchitectureSpec | null;
  needsBackend?: boolean;
}

interface UsePhaseGenerationReturn {
  isGeneratingPhases: boolean;
  isRegeneration: boolean;
  previousPlan: DynamicPhasePlan | null;
  generatePhases: (preGeneratedArchitecture?: ArchitectureSpec) => Promise<void>;
  buildConversationContext: () => string;
  convertRolesToUserRoles: () => UserRole[] | undefined;
  extractWorkflowsFromConversation: () => WizardState['workflows'] | undefined;
  formatPhasePlanMessage: (plan: DynamicPhasePlan, isUpdate?: boolean) => string;
}

export function usePhaseGeneration({
  wizardState,
  messages,
  importedLayoutManifest,
  phasePlan,
  setPhasePlan,
  onShowToast,
  onAddMessage,
  isGeneratingArchitecture = false,
  architectureSpec = null,
  needsBackend = false,
}: UsePhaseGenerationOptions): UsePhaseGenerationReturn {
  const [isGeneratingPhases, setIsGeneratingPhases] = useState(false);
  const [isRegeneration, setIsRegeneration] = useState(false);
  const [previousPlan, setPreviousPlan] = useState<DynamicPhasePlan | null>(null);

  // Track if auto-generation has been triggered to prevent duplicate calls
  const autoGenerateTriggeredRef = useRef(false);

  // Ref-based guard to prevent concurrent generatePhases calls
  // (React batches state updates, so isGeneratingPhases may not update immediately)
  const isGeneratingRef = useRef(false);

  /**
   * Build conversation context summary for phase generation
   * Uses structured extraction and segmentation for rich detail preservation
   */
  const buildConversationContext = useCallback((): string => {
    const relevantMessages = messages.filter((m) => m.role !== 'system');
    if (relevantMessages.length === 0) return '';

    // Convert to ChatMessage format for extraction
    const chatMessages = relevantMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    }));

    const contextParts: string[] = [];

    // For large conversations, use segmentation to preserve important context
    if (chatMessages.length > 20) {
      const segmentationResult = segmentConversation(chatMessages);
      const highImportanceSegments = getHighImportanceSegments(segmentationResult);

      if (highImportanceSegments.length > 0) {
        const segmentContext = buildContextFromSegments(highImportanceSegments, 2000);
        contextParts.push('=== KEY CONVERSATION SEGMENTS ===');
        contextParts.push(segmentContext);
        contextParts.push('');
      }
    }

    // Build structured context with rich feature/role/workflow extraction
    const structuredContext = buildStructuredContext(chatMessages);
    const structuredSummary = structuredContextToSummary(structuredContext);

    // Add structured extraction
    if (structuredSummary) {
      contextParts.push('=== STRUCTURED REQUIREMENTS ===');
      contextParts.push(structuredSummary);
      contextParts.push('');
    }

    // Also include condensed recent conversation for immediate context
    const conversationSummary = relevantMessages
      .slice(-10) // Focus on most recent messages
      .map(
        (m) =>
          `${m.role.toUpperCase()}: ${m.content.slice(0, 250)}${m.content.length > 250 ? '...' : ''}`
      )
      .join('\n\n');

    contextParts.push('=== RECENT CONVERSATION ===');
    contextParts.push(conversationSummary);

    return contextParts.join('\n');
  }, [messages]);

  /**
   * Convert wizard roles to AppConcept UserRole format
   */
  const convertRolesToUserRoles = useCallback((): UserRole[] | undefined => {
    if (!wizardState.roles || wizardState.roles.length === 0) return undefined;

    return wizardState.roles.map((role) => ({
      name: role.name,
      capabilities: role.capabilities,
    }));
  }, [wizardState.roles]);

  /**
   * Extract workflows from conversation messages for AppConcept
   */
  const extractWorkflowsFromConversation = useCallback(() => {
    const relevantMessages = messages.filter((m) => m.role !== 'system');
    if (relevantMessages.length === 0) return undefined;

    const chatMessages = relevantMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.timestamp.toISOString(),
    }));

    const structuredContext = buildStructuredContext(chatMessages);

    if (structuredContext.workflows.length === 0) return undefined;

    return structuredContext.workflows.map((w) => ({
      name: w.name,
      description: w.description || w.triggerCondition,
      steps: w.steps.map((s) => s.action),
      involvedRoles: w.involvedRoles,
    }));
  }, [messages]);

  /**
   * Format the phase plan as a readable message
   */
  const formatPhasePlanMessage = useCallback(
    (plan: DynamicPhasePlan, isUpdate?: boolean): string => {
      const header = isUpdate
        ? `## Plan Updated: ${plan.appName}`
        : `## Implementation Plan: ${plan.appName}`;

      let message = `${header}

**Complexity:** ${plan.complexity}
**Total Phases:** ${plan.totalPhases}
**Estimated Time:** ${plan.estimatedTotalTime}

---

### Phases:

`;

      for (const phase of plan.phases) {
        message += `**Phase ${phase.number}: ${phase.name}** (${phase.estimatedTime})
${phase.description}
`;
        if (phase.features.length > 0 && phase.features.length <= 5) {
          message += `- ${phase.features.join('\n- ')}\n`;
        }
        message += '\n';
      }

      message += `---

Does this look good? You can:
- **Start building** to begin with Phase 1
- Ask me to **adjust** any phases
- Add or remove features before starting`;

      return message;
    },
    []
  );

  /**
   * Generate implementation phases
   * @param preGeneratedArchitecture - Optional pre-generated architecture spec to skip architecture generation
   */
  const generatePhases = useCallback(
    async (preGeneratedArchitecture?: ArchitectureSpec) => {
      // Prevent concurrent calls (React batches state updates, so we use a ref)
      if (isGeneratingRef.current) {
        console.log('[usePhaseGeneration] Already generating phases, skipping duplicate call');
        return;
      }
      isGeneratingRef.current = true;

      if (!wizardState.name || wizardState.features.length === 0) {
        isGeneratingRef.current = false;
        onShowToast({
          type: 'error',
          message: 'Please complete the app concept before generating phases.',
        });
        return;
      }

      // Track if this is a regeneration (plan already exists)
      const isRegen = phasePlan !== null;
      setIsRegeneration(isRegen);
      if (isRegen) {
        setPreviousPlan(phasePlan);
      }

      setIsGeneratingPhases(true);

      try {
        // Build complete concept with ALL details from the conversation
        const concept: AppConcept = {
          name: wizardState.name,
          description: wizardState.description || `A ${wizardState.name} application`,
          purpose: wizardState.purpose || wizardState.description || '',
          targetUsers: wizardState.targetUsers || 'General users',
          coreFeatures: wizardState.features.map((f, i) => ({
            id: `feature-${i}`,
            name: f.name,
            description: f.description || '',
            priority: f.priority,
          })),
          uiPreferences: {
            style: 'modern',
            colorScheme: 'auto',
            layout: 'single-page',
            ...wizardState.uiPreferences,
          } as UIPreferences,
          technical: {
            needsAuth: false,
            needsDatabase: false,
            needsAPI: false,
            needsFileUpload: false,
            needsRealtime: false,
            ...wizardState.technical,
          } as TechnicalRequirements,
          roles: convertRolesToUserRoles(),
          workflows: extractWorkflowsFromConversation(),
          conversationContext: buildConversationContext(),
          layoutManifest: importedLayoutManifest || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Convert messages to ChatMessage format for phase context extraction
        const conversationMessages = messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        }));

        // Call phase generation API with conversation for context extraction
        // Pass pre-generated architecture if available (skips architecture generation in API)
        const response = await fetch('/api/wizard/generate-phases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concept,
            conversationMessages,
            architectureSpec: preGeneratedArchitecture,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate phases');
        }

        const data = await response.json();

        if (data.success && data.plan) {
          setPhasePlan(data.plan);

          // Add message showing the plan (with update indicator if regenerating)
          const planMessage: Message = {
            id: `plan-${Date.now()}`,
            role: 'assistant',
            content: formatPhasePlanMessage(data.plan, isRegen),
            timestamp: new Date(),
          };
          onAddMessage(planMessage);
        } else if (data.success && !data.plan) {
          // API returned success but no plan - this is a bug, show error
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'system',
            content:
              '❌ **Phase generation failed**\n\nThe server returned success but no plan was generated. Please try again.',
            timestamp: new Date(),
          };
          onAddMessage(errorMessage);
          onShowToast({
            type: 'error',
            message: 'Phase plan generation failed - no plan returned. Please try again.',
          });
        } else if (!data.success) {
          // API returned failure
          throw new Error(data.error || 'Phase generation failed');
        }
      } catch (err) {
        console.error('Phase generation error:', err);
        onShowToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to generate phases',
        });
      } finally {
        setIsGeneratingPhases(false);
        isGeneratingRef.current = false;
      }
    },
    [
      wizardState,
      messages,
      importedLayoutManifest,
      phasePlan,
      setPhasePlan,
      onShowToast,
      onAddMessage,
      convertRolesToUserRoles,
      extractWorkflowsFromConversation,
      buildConversationContext,
      formatPhasePlanMessage,
    ]
  );

  // Auto-trigger phase generation when ready
  // Guards: wait for architecture if backend is needed
  useEffect(() => {
    // Skip if not ready for phases or already have a plan
    if (!wizardState.readyForPhases || phasePlan || isGeneratingPhases) {
      return;
    }

    // Skip if architecture is being generated - wait for it to complete
    if (isGeneratingArchitecture) {
      return;
    }

    // Skip if backend is needed but no architecture exists yet
    // User must click "Generate Architecture" first
    if (needsBackend && !architectureSpec) {
      return;
    }

    // Prevent duplicate auto-generation calls
    if (autoGenerateTriggeredRef.current) {
      return;
    }

    autoGenerateTriggeredRef.current = true;
    generatePhases(architectureSpec || undefined);
  }, [
    wizardState.readyForPhases,
    phasePlan,
    isGeneratingPhases,
    isGeneratingArchitecture,
    needsBackend,
    architectureSpec,
    generatePhases,
  ]);

  // Reset auto-generate flag when plan is cleared
  useEffect(() => {
    if (!phasePlan) {
      autoGenerateTriggeredRef.current = false;
    }
  }, [phasePlan]);

  return {
    isGeneratingPhases,
    isRegeneration,
    previousPlan,
    generatePhases,
    buildConversationContext,
    convertRolesToUserRoles,
    extractWorkflowsFromConversation,
    formatPhasePlanMessage,
  };
}
