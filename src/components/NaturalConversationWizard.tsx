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
import type { AppConcept, Feature, TechnicalRequirements, UIPreferences } from '@/types/appConcept';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { LayoutDesign } from '@/types/layoutDesign';
import { useToast } from '@/components/Toast';
import { LoaderIcon } from './ui/Icons';
import { useAppStore } from '@/store/useAppStore';
import { WIZARD_DRAFT_KEYS } from '@/utils/wizardAutoSave';
import {
  compressConversation,
  buildCompressedContext,
  needsCompression,
} from '@/utils/contextCompression';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { usePhaseGeneration } from '@/hooks/usePhaseGeneration';
import { useArchitectureGeneration } from '@/hooks/useArchitectureGeneration';
import { usePlanRegeneration } from '@/hooks/usePlanRegeneration';
import {
  RecoveryPromptDialog,
  MessageBubble,
  SuggestedActionsBar,
  PendingImagesPreview,
  ChatInputArea,
  WizardHeader,
  ConceptSummaryPanel,
  ArchitectureReviewPanel,
} from './conversation-wizard';
import type { ChatInputAreaRef } from './conversation-wizard';

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
  const { showToast } = useToast();

  // Initial state factory
  const createInitialState = useCallback(
    (): WizardState => ({
      name: initialConcept?.name,
      description: initialConcept?.description,
      features: initialConcept?.coreFeatures || [],
      technical: initialConcept?.technical || {},
      uiPreferences: initialConcept?.uiPreferences || {},
      isComplete: false,
      readyForPhases: false,
    }),
    [initialConcept]
  );

  // Create greeting message
  const createGreeting = useCallback(
    (): Message => ({
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
    }),
    []
  );

  // Draft persistence hook
  const {
    messages,
    setMessages,
    wizardState,
    setWizardState,
    phasePlan,
    setPhasePlan,
    isInitialized,
    showRecoveryPrompt,
    draftAge,
    startFresh,
    recover,
    clearDrafts,
  } = useDraftPersistence<WizardState, DynamicPhasePlan>({
    draftKeys: {
      messages: WIZARD_DRAFT_KEYS.CONVERSATION_MESSAGES,
      state: WIZARD_DRAFT_KEYS.CONVERSATION_STATE,
      plan: WIZARD_DRAFT_KEYS.CONVERSATION_PHASE_PLAN,
    },
    initialState: createInitialState(),
    createGreeting,
    onShowToast: showToast,
  });

  // Additional state
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
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
  const chatInputRef = useRef<ChatInputAreaRef>(null);

  // Phase generation hook
  const {
    isGeneratingPhases,
    generatePhases,
    buildConversationContext,
    convertRolesToUserRoles,
    extractWorkflowsFromConversation,
  } = usePhaseGeneration({
    wizardState,
    messages,
    importedLayoutDesign,
    phasePlan,
    setPhasePlan,
    onShowToast: showToast,
    onAddMessage: (message) => setMessages((prev) => [...prev, message]),
  });

  // Architecture generation hook
  const { architectureSpec, isGeneratingArchitecture, generateArchitecture, clearArchitecture } =
    useArchitectureGeneration({
      wizardState,
      importedLayoutDesign,
      onShowToast: showToast,
      onAddMessage: (message) => setMessages((prev) => [...prev, message]),
    });

  // Plan regeneration hook - auto-regenerates when concept changes
  const { isRegenerating, pendingRegeneration, regenerationReason } = usePlanRegeneration({
    wizardState,
    phasePlan,
    generatePhases,
    architectureSpec,
    isGeneratingPhases,
    debounceMs: 500,
  });

  // Update suggested actions when phase plan is generated
  useEffect(() => {
    if (phasePlan && !suggestedActions.find((a) => a.action === 'start_building')) {
      setSuggestedActions([
        { label: 'Start Building', action: 'start_building' },
        { label: 'Adjust Plan', action: 'adjust_plan' },
      ]);
    }
  }, [phasePlan, suggestedActions]);

  // Focus input after initialization
  useEffect(() => {
    if (isInitialized) {
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [isInitialized]);

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
    [messages, wizardState, showToast, setMessages, setWizardState]
  );

  // ============================================================================
  // ACTION HANDLING
  // ============================================================================

  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'generate_architecture':
          generateArchitecture();
          break;

        case 'generate_phases':
          // Pass pre-generated architecture if available
          generatePhases(architectureSpec || undefined);
          break;

        case 'start_building':
          if (phasePlan && wizardState.name) {
            const concept: AppConcept = {
              name: wizardState.name,
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
          // Trigger file input click - handled by ChatInputArea
          break;

        default:
          // Unknown action
          break;
      }
    },
    [
      generateArchitecture,
      architectureSpec,
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

  const handleFileSelect = useCallback(
    (files: FileList) => {
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
    },
    [showToast]
  );

  const removePendingImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show recovery prompt if there's a saved conversation
  if (showRecoveryPrompt) {
    return (
      <RecoveryPromptDialog
        draftAge={draftAge}
        onStartFresh={startFresh}
        onRecover={recover}
        onCancel={onCancel}
      />
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
        <WizardHeader
          appName={wizardState.name}
          currentLayoutDesign={currentLayoutDesign}
          importedLayoutDesign={importedLayoutDesign}
          onImportLayout={() => {
            setImportedLayoutDesign(currentLayoutDesign);
            showToast({
              type: 'success',
              message: 'Layout design imported! Your app will use these exact styles.',
            });
          }}
          onRemoveLayout={() => {
            setImportedLayoutDesign(null);
            showToast({ type: 'info', message: 'Layout design removed' });
          }}
          onCancel={onCancel}
        />

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
            <MessageBubble key={message.id} message={message} />
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

          {/* Architecture generation indicator */}
          {isGeneratingArchitecture && (
            <div className="flex justify-start">
              <div className="bg-emerald-600/10 rounded-lg px-4 py-3 border-l-2 border-emerald-500">
                <div className="flex items-center gap-3">
                  <LoaderIcon size={18} className="text-emerald-400" />
                  <span className="text-zinc-300">Analyzing backend architecture...</span>
                </div>
              </div>
            </div>
          )}

          {/* Phase generation indicator */}
          {isGeneratingPhases && !isRegenerating && (
            <div className="flex justify-start">
              <div className="bg-purple-600/10 rounded-lg px-4 py-3 border-l-2 border-purple-500">
                <div className="flex items-center gap-3">
                  <LoaderIcon size={18} className="text-purple-400" />
                  <span className="text-zinc-300">Generating implementation plan...</span>
                </div>
              </div>
            </div>
          )}

          {/* Plan regeneration indicator */}
          {isRegenerating && (
            <div className="flex justify-start">
              <div className="bg-amber-600/10 rounded-lg px-4 py-3 border-l-2 border-amber-500">
                <div className="flex items-center gap-3">
                  <LoaderIcon size={18} className="text-amber-400" />
                  <span className="text-zinc-300">
                    Updating implementation plan
                    {regenerationReason ? ` (${regenerationReason} changed)` : ''}...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pending regeneration indicator */}
          {pendingRegeneration && !isRegenerating && (
            <div className="flex justify-start">
              <div className="bg-zinc-700/50 rounded-lg px-4 py-2 border-l-2 border-zinc-500">
                <span className="text-zinc-400 text-sm">
                  Changes detected - plan will update shortly...
                </span>
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
        <SuggestedActionsBar
          actions={suggestedActions}
          onAction={handleAction}
          disabled={isLoading || isRegenerating || pendingRegeneration}
        />

        {/* Pending Images Preview */}
        <PendingImagesPreview images={pendingImages} onRemove={removePendingImage} />

        {/* Input Area */}
        <ChatInputArea
          ref={chatInputRef}
          value={userInput}
          onChange={setUserInput}
          onSend={() =>
            sendMessage(userInput, pendingImages.length > 0 ? pendingImages : undefined)
          }
          onFileSelect={handleFileSelect}
          isLoading={isLoading}
          canSend={userInput.trim().length > 0 || pendingImages.length > 0}
        />
      </div>

      {/* Side Panel - Architecture Review or Concept Summary */}
      {architectureSpec && !phasePlan ? (
        <ArchitectureReviewPanel
          architectureSpec={architectureSpec}
          isGenerating={isGeneratingArchitecture}
          onProceed={() => handleAction('generate_phases')}
          onRegenerate={() => {
            clearArchitecture();
            generateArchitecture();
          }}
        />
      ) : (
        <ConceptSummaryPanel
          wizardState={wizardState}
          phasePlan={phasePlan}
          onStartBuilding={() => handleAction('start_building')}
        />
      )}
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
