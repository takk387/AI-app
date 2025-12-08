/**
 * Natural Conversation Wizard
 *
 * A complete rewrite of the ConversationalAppWizard that uses actual
 * Claude API calls for natural conversation instead of hardcoded responses.
 *
 * Key differences from old wizard:
 * - Real AI responses (not simulated)
 * - No rigid state machine
 * - Natural conversation flow
 * - Progressive concept building
 * - Dynamic phase generation
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  AppConcept,
  Feature,
  TechnicalRequirements,
  UIPreferences,
  UserRole,
} from '@/types/appConcept';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { LayoutDesign } from '@/types/layoutDesign';
import { useToast } from '@/components/Toast';
import {
  WandIcon,
  ImageIcon,
  SendIcon,
  XIcon,
  LoaderIcon,
  SaveIcon,
  PaletteIcon,
} from './ui/Icons';
import { useAppStore } from '@/store/useAppStore';
import {
  WIZARD_DRAFT_KEYS,
  saveWizardDraft,
  loadWizardDraft,
  deleteDraft,
  getDraftMetadata,
  formatDraftAge,
} from '@/utils/wizardAutoSave';
import {
  compressConversation,
  buildCompressedContext,
  needsCompression,
} from '@/utils/contextCompression';
import { buildStructuredContext, structuredContextToSummary } from '@/utils/structuredExtraction';
import {
  segmentConversation,
  getHighImportanceSegments,
  buildContextFromSegments,
} from '@/utils/conversationSegmentation';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[]; // Base64 images
}

interface WizardState {
  name?: string;
  description?: string;
  purpose?: string;
  targetUsers?: string;
  features: Feature[];
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
}

interface SuggestedAction {
  label: string;
  action: string;
}

interface NaturalConversationWizardProps {
  onComplete: (concept: AppConcept, phasePlan?: DynamicPhasePlan) => void;
  onCancel: () => void;
  initialConcept?: Partial<AppConcept>;
  isFullPage?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NaturalConversationWizard({
  onComplete,
  onCancel,
  initialConcept,
  isFullPage = false,
}: NaturalConversationWizardProps) {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState>({
    name: initialConcept?.name,
    description: initialConcept?.description,
    features: initialConcept?.coreFeatures || [],
    technical: initialConcept?.technical || {},
    uiPreferences: initialConcept?.uiPreferences || {},
    isComplete: false,
    readyForPhases: false,
  });
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [phasePlan, setPhasePlan] = useState<DynamicPhasePlan | null>(null);
  const [isGeneratingPhases, setIsGeneratingPhases] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [draftAge, setDraftAge] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [importedLayoutDesign, setImportedLayoutDesign] = useState<LayoutDesign | null>(
    initialConcept?.layoutDesign || null
  );

  // Get current layout design from store
  const currentLayoutDesign = useAppStore((state) => state.currentLayoutDesign);

  // Message windowing - limit rendered messages for performance
  const MAX_VISIBLE_MESSAGES = 100;

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  // ============================================================================
  // INITIALIZATION & PERSISTENCE
  // ============================================================================

  // Check for existing draft on mount
  useEffect(() => {
    const checkForDraft = () => {
      const messagesMetadata = getDraftMetadata(WIZARD_DRAFT_KEYS.CONVERSATION_MESSAGES);
      const stateMetadata = getDraftMetadata(WIZARD_DRAFT_KEYS.CONVERSATION_STATE);

      // If we have a saved conversation with more than just the greeting
      if (messagesMetadata || stateMetadata) {
        const savedMessages = loadWizardDraft<Message[]>(WIZARD_DRAFT_KEYS.CONVERSATION_MESSAGES);

        // Check if there's actual conversation content (more than just greeting)
        if (savedMessages && savedMessages.length > 1) {
          const timestamp = messagesMetadata?.savedAt || stateMetadata?.savedAt;
          if (timestamp) {
            setDraftAge(formatDraftAge(timestamp));
          }
          setShowRecoveryPrompt(true);
          return;
        }
      }

      // No valid draft found, start fresh
      startFreshConversation();
    };

    checkForDraft();
  }, []);

  /**
   * Start a fresh conversation with greeting
   */
  const startFreshConversation = useCallback(() => {
    // Clear any existing drafts
    deleteDraft(WIZARD_DRAFT_KEYS.CONVERSATION_MESSAGES);
    deleteDraft(WIZARD_DRAFT_KEYS.CONVERSATION_STATE);
    deleteDraft(WIZARD_DRAFT_KEYS.CONVERSATION_PHASE_PLAN);

    const greeting: Message = {
      id: 'greeting',
      role: 'assistant',
      content: `Hi! I'm here to help you plan your application. Tell me about what you want to build.

You can describe your idea in as much or as little detail as you'd like. I'll ask clarifying questions to make sure I understand your vision completely.

**Examples to get started:**
- "I want to build a task management app for remote teams"
- "A mobile app for tracking fitness goals"
- "An e-commerce platform for handmade crafts"

What would you like to build?`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
    setWizardState({
      name: initialConcept?.name,
      description: initialConcept?.description,
      features: initialConcept?.coreFeatures || [],
      technical: initialConcept?.technical || {},
      uiPreferences: initialConcept?.uiPreferences || {},
      isComplete: false,
      readyForPhases: false,
    });
    setPhasePlan(null);
    setSuggestedActions([]);
    setShowRecoveryPrompt(false);
    setIsInitialized(true);

    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [initialConcept]);

  /**
   * Recover saved conversation from localStorage
   */
  const recoverConversation = useCallback(() => {
    const savedMessages = loadWizardDraft<Message[]>(WIZARD_DRAFT_KEYS.CONVERSATION_MESSAGES);
    const savedState = loadWizardDraft<WizardState>(WIZARD_DRAFT_KEYS.CONVERSATION_STATE);
    const savedPhasePlan = loadWizardDraft<DynamicPhasePlan>(
      WIZARD_DRAFT_KEYS.CONVERSATION_PHASE_PLAN
    );

    if (savedMessages && savedMessages.length > 0) {
      // Restore timestamps as Date objects
      const messagesWithDates = savedMessages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(messagesWithDates);
    }

    if (savedState) {
      setWizardState(savedState);
    }

    if (savedPhasePlan) {
      setPhasePlan(savedPhasePlan);
      setSuggestedActions([
        { label: 'Start Building', action: 'start_building' },
        { label: 'Adjust Plan', action: 'adjust_plan' },
      ]);
    }

    setShowRecoveryPrompt(false);
    setIsInitialized(true);

    showToast({
      type: 'success',
      message: 'Previous conversation restored!',
    });

    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [showToast]);

  // Auto-save messages when they change
  useEffect(() => {
    if (!isInitialized || messages.length === 0) return;

    // Debounce save
    const saveTimeout = setTimeout(() => {
      saveWizardDraft(WIZARD_DRAFT_KEYS.CONVERSATION_MESSAGES, messages);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [messages, isInitialized]);

  // Auto-save wizard state when it changes
  useEffect(() => {
    if (!isInitialized) return;

    const saveTimeout = setTimeout(() => {
      saveWizardDraft(WIZARD_DRAFT_KEYS.CONVERSATION_STATE, wizardState);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [wizardState, isInitialized]);

  // Auto-save phase plan when it changes
  useEffect(() => {
    if (!isInitialized || !phasePlan) return;

    saveWizardDraft(WIZARD_DRAFT_KEYS.CONVERSATION_PHASE_PLAN, phasePlan);
  }, [phasePlan, isInitialized]);

  /**
   * Clear all drafts (called on complete or explicit cancel)
   */
  const clearDrafts = useCallback(() => {
    deleteDraft(WIZARD_DRAFT_KEYS.CONVERSATION_MESSAGES);
    deleteDraft(WIZARD_DRAFT_KEYS.CONVERSATION_STATE);
    deleteDraft(WIZARD_DRAFT_KEYS.CONVERSATION_PHASE_PLAN);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  const sendMessage = useCallback(
    async (messageText: string, images?: string[]) => {
      if (!messageText.trim() && !images?.length) return;

      setError(null);
      setIsLoading(true);

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date(),
        attachments: images,
      };
      setMessages((prev) => [...prev, userMessage]);
      setUserInput('');
      setPendingImages([]);

      try {
        // Prepare conversation history for API with compression for large conversations
        const MAX_CONTEXT_TOKENS = 100000;
        let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
        let contextSummary: string | undefined;

        // Filter out system messages and convert to ChatMessage format for compression
        const filteredMessages = messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          }));

        if (needsCompression(filteredMessages, MAX_CONTEXT_TOKENS)) {
          // Compress older messages while preserving recent context
          const compressed = compressConversation(filteredMessages, {
            maxTokens: MAX_CONTEXT_TOKENS,
            preserveLastN: 8,
          });

          conversationHistory = compressed.recentMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

          // Build summary context if messages were compressed
          if (compressed.summary.messageCount > 0) {
            contextSummary = buildCompressedContext(compressed);
          }
        } else {
          conversationHistory = filteredMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
        }

        // Call the wizard chat API
        const response = await fetch('/api/wizard/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            conversationHistory,
            currentState: wizardState,
            referenceImages: images,
            contextSummary, // Include compressed summary if conversation was large
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get response');
        }

        const data = await response.json();

        // Add assistant response
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update state
        if (data.updatedState) {
          setWizardState(data.updatedState);
        }

        // Update suggested actions
        if (data.suggestedActions) {
          setSuggestedActions(data.suggestedActions);
        } else {
          setSuggestedActions([]);
        }
      } catch (err) {
        console.error('Chat error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
        showToast({
          type: 'error',
          message: 'Failed to get response. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, wizardState, showToast]
  );

  // ============================================================================
  // PHASE GENERATION
  // ============================================================================

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

  const generatePhases = useCallback(async () => {
    if (!wizardState.name || wizardState.features.length === 0) {
      showToast({
        type: 'error',
        message: 'Please complete the app concept before generating phases.',
      });
      return;
    }

    setIsGeneratingPhases(true);

    try {
      // Build complete concept with ALL details from the conversation
      const concept: AppConcept = {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: wizardState.name!,
        description: wizardState.description || `A ${wizardState.name} application`,
        purpose: wizardState.purpose || wizardState.description || '',
        targetUsers: wizardState.targetUsers || 'General users',
        coreFeatures: wizardState.features,
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
        // NEW: Preserve roles from wizard conversation
        roles: convertRolesToUserRoles(),
        // NEW: Preserve workflows extracted from conversation
        workflows: extractWorkflowsFromConversation(),
        // NEW: Preserve full conversation context for detail retention
        conversationContext: buildConversationContext(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Call phase generation API
      const response = await fetch('/api/wizard/generate-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate phases');
      }

      const data = await response.json();

      if (data.success && data.plan) {
        setPhasePlan(data.plan);

        // Add message showing the plan
        const planMessage: Message = {
          id: `plan-${Date.now()}`,
          role: 'assistant',
          content: formatPhasePlanMessage(data.plan),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, planMessage]);

        // Update suggested actions
        setSuggestedActions([
          { label: 'Start Building', action: 'start_building' },
          { label: 'Adjust Plan', action: 'adjust_plan' },
        ]);
      }
    } catch (err) {
      console.error('Phase generation error:', err);
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to generate phases',
      });
    } finally {
      setIsGeneratingPhases(false);
    }
  }, [
    wizardState,
    showToast,
    convertRolesToUserRoles,
    extractWorkflowsFromConversation,
    buildConversationContext,
  ]);

  // Auto-trigger phase generation when ready
  useEffect(() => {
    if (wizardState.readyForPhases && !phasePlan && !isGeneratingPhases) {
      generatePhases();
    }
  }, [wizardState.readyForPhases, phasePlan, isGeneratingPhases, generatePhases]);

  /**
   * Format the phase plan as a readable message
   */
  const formatPhasePlanMessage = (plan: DynamicPhasePlan): string => {
    let message = `## Implementation Plan: ${plan.appName}

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
  };

  // ============================================================================
  // ACTION HANDLING
  // ============================================================================

  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'generate_phases':
          generatePhases();
          break;

        case 'start_building':
          if (phasePlan) {
            const concept: AppConcept = {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              name: wizardState.name!,
              description: wizardState.description || '',
              purpose: wizardState.purpose || '',
              targetUsers: wizardState.targetUsers || '',
              coreFeatures: wizardState.features,
              uiPreferences: wizardState.uiPreferences as UIPreferences,
              technical: wizardState.technical as TechnicalRequirements,
              // Preserve roles from wizard conversation
              roles: convertRolesToUserRoles(),
              // Preserve workflows extracted from conversation
              workflows: extractWorkflowsFromConversation(),
              // Preserve full conversation context for detail retention
              conversationContext: buildConversationContext(),
              // Include imported layout design for pixel-perfect styling
              layoutDesign: importedLayoutDesign || undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            // Clear drafts since we're completing the wizard
            clearDrafts();
            onComplete(concept, phasePlan);
          }
          break;

        case 'adjust_plan':
          sendMessage("I'd like to adjust the implementation plan");
          break;

        case 'browse_templates':
          sendMessage('Show me some app templates to get inspired');
          break;

        case 'upload_reference':
          fileInputRef.current?.click();
          break;

        default:
          // Unknown action
          break;
      }
    },
    [
      generatePhases,
      phasePlan,
      wizardState,
      onComplete,
      sendMessage,
      clearDrafts,
      convertRolesToUserRoles,
      extractWorkflowsFromConversation,
      buildConversationContext,
      importedLayoutDesign,
    ]
  );

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        showToast({ type: 'error', message: 'Only images are supported' });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast({ type: 'error', message: 'Image must be under 5MB' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        processed++;

        if (processed === files.length) {
          setPendingImages((prev) => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ============================================================================
  // KEYBOARD HANDLING
  // ============================================================================

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && (userInput.trim() || pendingImages.length > 0)) {
        sendMessage(userInput, pendingImages.length > 0 ? pendingImages : undefined);
      }
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show recovery prompt if there's a saved conversation
  if (showRecoveryPrompt) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <div
          className="bg-zinc-900 text-white rounded-xl border border-zinc-800 shadow-2xl p-8 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-xl bg-blue-600/20 flex items-center justify-center mb-4">
              <SaveIcon size={32} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Resume Previous Session?</h2>
            <p className="text-zinc-400 mb-6">
              You have an unsaved conversation from{' '}
              <span className="text-zinc-100 font-medium">{draftAge}</span>. Would you like to
              continue where you left off?
            </p>
            <div className="flex gap-3">
              <button onClick={startFreshConversation} className="btn-secondary flex-1 py-2.5">
                Start Fresh
              </button>
              <button onClick={recoverConversation} className="btn-primary flex-1 py-2.5">
                Resume
              </button>
            </div>
            <button
              onClick={onCancel}
              className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <div
      className={`flex w-full ${isFullPage ? 'h-full' : 'max-w-7xl h-[90vh]'} bg-zinc-900 text-white ${isFullPage ? '' : 'rounded-xl border border-zinc-800 shadow-2xl'} overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <WandIcon size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="font-semibold text-zinc-100">App Planning Assistant</h1>
              <p className="text-sm text-zinc-400">
                {wizardState.name ? `Planning: ${wizardState.name}` : 'Describe your app idea'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Import Layout Design Button */}
            {currentLayoutDesign && !importedLayoutDesign && (
              <button
                onClick={() => {
                  setImportedLayoutDesign(currentLayoutDesign);
                  showToast({
                    type: 'success',
                    message: 'Layout design imported! Your app will use these exact styles.',
                  });
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 rounded-lg border border-purple-500/30 transition-colors"
              >
                <PaletteIcon size={16} />
                Import Layout
              </button>
            )}
            {/* Show imported layout indicator */}
            {importedLayoutDesign && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600/20 text-green-300 rounded-lg border border-green-500/30">
                <PaletteIcon size={16} />
                <span>{importedLayoutDesign.name || 'Layout'}</span>
                <button
                  onClick={() => {
                    setImportedLayoutDesign(null);
                    showToast({ type: 'info', message: 'Layout design removed' });
                  }}
                  className="ml-1 hover:text-green-100"
                >
                  <XIcon size={14} />
                </button>
              </div>
            )}
            <button onClick={onCancel} className="btn-ghost text-sm">
              Cancel
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {/* Load older messages button - shown when windowing is active */}
          {!showAllMessages && messages.length > MAX_VISIBLE_MESSAGES && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowAllMessages(true)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
              >
                Load {messages.length - MAX_VISIBLE_MESSAGES} older messages
              </button>
            </div>
          )}

          {/* Render messages with optional windowing */}
          {(showAllMessages ? messages : messages.slice(-MAX_VISIBLE_MESSAGES)).map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                      ? 'bg-zinc-900 border-l-2 border-purple-500 text-zinc-300'
                      : 'bg-zinc-800 text-zinc-100'
                }`}
              >
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {message.attachments.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Attachment ${i + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                {/* Content with markdown-like rendering */}
                <div className="prose prose-invert prose-sm max-w-none">
                  {message.content.split('\n').map((line, i) => {
                    // Headers
                    if (line.startsWith('## ')) {
                      return (
                        <h2 key={i} className="text-lg font-bold mt-4 mb-2">
                          {line.slice(3)}
                        </h2>
                      );
                    }
                    if (line.startsWith('### ')) {
                      return (
                        <h3 key={i} className="text-base font-semibold mt-3 mb-1">
                          {line.slice(4)}
                        </h3>
                      );
                    }
                    // Bold
                    if (line.includes('**')) {
                      const parts = line.split(/\*\*(.+?)\*\*/g);
                      return (
                        <p key={i} className="mb-1">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                          )}
                        </p>
                      );
                    }
                    // List items
                    if (line.startsWith('- ')) {
                      return (
                        <li key={i} className="ml-4">
                          {line.slice(2)}
                        </li>
                      );
                    }
                    // Horizontal rule
                    if (line === '---') {
                      return <hr key={i} className="my-3 border-zinc-700" />;
                    }
                    // Tables (simple rendering)
                    if (line.startsWith('|')) {
                      return (
                        <p key={i} className="font-mono text-sm">
                          {line}
                        </p>
                      );
                    }
                    // Regular text
                    if (line.trim()) {
                      return (
                        <p key={i} className="mb-1">
                          {line}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <LoaderIcon size={18} className="text-blue-500" />
                  <span className="text-zinc-400 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Phase generation indicator */}
          {isGeneratingPhases && (
            <div className="flex justify-start">
              <div className="bg-purple-600/10 rounded-lg px-4 py-3 border-l-2 border-purple-500">
                <div className="flex items-center gap-3">
                  <LoaderIcon size={18} className="text-purple-400" />
                  <span className="text-zinc-300">Generating implementation plan...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-600/10 text-red-300 rounded-lg px-4 py-2 text-sm border border-red-600/30">
                {error}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && !isLoading && (
          <div className="px-6 py-2 flex flex-wrap gap-2">
            {suggestedActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action.action)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Pending Images Preview */}
        {pendingImages.length > 0 && (
          <div className="px-6 py-2 flex gap-2">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={img}
                  alt={`Upload ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
                />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center"
                >
                  <XIcon size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <div className="flex items-end gap-3">
            {/* File upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-icon"
              title="Upload design reference"
            >
              <ImageIcon size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your app idea..."
                rows={1}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-100 placeholder-zinc-500 transition-colors"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() =>
                sendMessage(userInput, pendingImages.length > 0 ? pendingImages : undefined)
              }
              disabled={isLoading || (!userInput.trim() && pendingImages.length === 0)}
              className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoaderIcon size={18} /> : <SendIcon size={18} />}
            </button>
          </div>

          <p className="text-xs text-zinc-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Side Panel - Concept Summary */}
      <div className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100">Concept Summary</h2>
          <p className="text-sm text-zinc-400">
            {wizardState.isComplete ? 'Ready to build' : 'In progress...'}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* App Name */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide">App Name</label>
            <p className="mt-1 text-zinc-100">{wizardState.name || '—'}</p>
          </div>

          {/* Description */}
          {wizardState.description && (
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Description</label>
              <p className="mt-1 text-sm text-zinc-300">{wizardState.description}</p>
            </div>
          )}

          {/* Target Users */}
          {wizardState.targetUsers && (
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Target Users</label>
              <p className="mt-1 text-sm text-zinc-300">{wizardState.targetUsers}</p>
            </div>
          )}

          {/* Roles */}
          {wizardState.roles && wizardState.roles.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">User Roles</label>
              <ul className="mt-1 space-y-1">
                {wizardState.roles.map((role, i) => (
                  <li key={i} className="text-sm text-zinc-300">
                    <strong className="text-zinc-100">{role.name}:</strong>{' '}
                    {role.capabilities.slice(0, 2).join(', ')}
                    {role.capabilities.length > 2 && ` +${role.capabilities.length - 2} more`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Features */}
          {wizardState.features.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">
                Features ({wizardState.features.length})
              </label>
              <ul className="mt-1 space-y-1">
                {wizardState.features.slice(0, 6).map((feature, i) => (
                  <li key={i} className="text-sm flex items-center gap-2 text-zinc-300">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        feature.priority === 'high'
                          ? 'bg-red-400'
                          : feature.priority === 'medium'
                            ? 'bg-yellow-400'
                            : 'bg-green-400'
                      }`}
                    />
                    {feature.name}
                  </li>
                ))}
                {wizardState.features.length > 6 && (
                  <li className="text-sm text-zinc-500">
                    +{wizardState.features.length - 6} more features
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Technical */}
          {Object.values(wizardState.technical).some((v) => v !== undefined) && (
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Technical</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {wizardState.technical.needsAuth && (
                  <span className="px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded text-xs">
                    Auth
                  </span>
                )}
                {wizardState.technical.needsDatabase && (
                  <span className="px-2 py-0.5 bg-green-600/20 text-green-300 rounded text-xs">
                    Database
                  </span>
                )}
                {wizardState.technical.needsRealtime && (
                  <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs">
                    Real-time
                  </span>
                )}
                {wizardState.technical.needsFileUpload && (
                  <span className="px-2 py-0.5 bg-orange-600/20 text-orange-300 rounded text-xs">
                    Files
                  </span>
                )}
                {wizardState.technical.needsAPI && (
                  <span className="px-2 py-0.5 bg-pink-600/20 text-pink-300 rounded text-xs">
                    API
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Phase Plan */}
          {phasePlan && (
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wide">
                Implementation Plan ({phasePlan.totalPhases} phases)
              </label>
              <div className="mt-2 space-y-1">
                {phasePlan.phases.slice(0, 5).map((phase) => (
                  <div key={phase.number} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                      {phase.number}
                    </span>
                    <span className="truncate">{phase.name}</span>
                  </div>
                ))}
                {phasePlan.phases.length > 5 && (
                  <p className="text-sm text-zinc-500 pl-7">
                    +{phasePlan.phases.length - 5} more phases
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {phasePlan && (
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={() => handleAction('start_building')}
              className="btn-primary w-full py-2.5"
            >
              Start Building
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Return with or without modal wrapper based on isFullPage
  if (isFullPage) {
    return content;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {content}
    </div>
  );
}
