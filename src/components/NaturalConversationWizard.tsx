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

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { AppConcept, Feature, TechnicalRequirements, UIPreferences } from '@/types/appConcept';
import type { DynamicPhasePlan } from '@/types/dynamicPhases';
import type { LayoutManifest } from '@/types/schema';
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
  /** True when user has confirmed the plan (prevents auto-regeneration) */
  planConfirmed?: boolean;
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
  const [importedLayoutManifest, setImportedLayoutManifest] = useState<LayoutManifest | null>(
    initialConcept?.layoutManifest || null
  );

  // Get current layout manifest from store
  const currentLayoutManifest = useAppStore((state) => state.currentLayoutManifest);

  // Message windowing - limit rendered messages for performance
  const MAX_VISIBLE_MESSAGES = 100;

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputAreaRef>(null);

  // Compute needsBackend locally for passing to hooks
  const needsBackend =
    !!wizardState.technical.needsAuth ||
    !!wizardState.technical.needsDatabase ||
    !!wizardState.technical.needsRealtime ||
    !!wizardState.technical.needsRealtime ||
    !!wizardState.technical.needsFileUpload;

  // Fix 3: Architecture Gate Logic
  const isPlanningComplete = useMemo(() => {
    return !!(wizardState.name && wizardState.features?.length > 0 && wizardState.description);
  }, [wizardState]);

  // Memoized callback to prevent infinite loops in hooks
  // (inline arrow functions create new references on each render, causing useCallback deps to change)
  const handleAddMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // Architecture generation hook - defined first so we can reference isGeneratingArchitecture
  // Note: onArchitectureComplete callback is set up after generatePhases is defined
  const { architectureSpec, isGeneratingArchitecture, generateArchitecture, clearArchitecture } =
    useArchitectureGeneration({
      wizardState,
      importedLayoutManifest,
      onShowToast: showToast,
      onAddMessage: handleAddMessage,
    });

  // Phase generation hook with architecture state guards
  const {
    isGeneratingPhases,
    generatePhases,
    buildConversationContext,
    convertRolesToUserRoles,
    extractWorkflowsFromConversation,
  } = usePhaseGeneration({
    wizardState,
    messages,
    importedLayoutManifest,
    phasePlan,
    setPhasePlan,
    onShowToast: showToast,
    onAddMessage: handleAddMessage,
    isGeneratingArchitecture,
    architectureSpec,
    needsBackend,
  });

  // Plan regeneration hook - auto-regenerates when concept changes
  // Also waits for architecture generation to complete
  const { isRegenerating, pendingRegeneration, regenerationReason } = usePlanRegeneration({
    wizardState,
    phasePlan,
    generatePhases,
    architectureSpec,
    isGeneratingPhases,
    isGeneratingArchitecture,
    debounceMs: 500,
  });

  // Auto-trigger phase generation when architecture completes
  // This creates the sequential flow: architecture → plan
  const prevArchitectureRef = useRef<typeof architectureSpec>(null);
  useEffect(() => {
    // Check if architecture just finished generating (transitioned from null to a value)
    // and we don't have a plan yet
    if (architectureSpec && !prevArchitectureRef.current && !phasePlan && !isGeneratingPhases) {
      // Auto-trigger phase generation with the new architecture
      generatePhases(architectureSpec);
    }
    prevArchitectureRef.current = architectureSpec;
  }, [architectureSpec, phasePlan, isGeneratingPhases, generatePhases]);

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
            hasPhasePlan: phasePlan !== null, // For plan locking detection
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

        // SPECIAL TRIGGER: Detect "I'm finished" or similar user intent (Client-side override)
        // This ensures we always show the build button when the user explicitly asks
        const lowerInput = messageText.toLowerCase();
        if (
          lowerInput.includes("i'm finished") ||
          lowerInput.includes('im finished') ||
          lowerInput.includes('i am finished') ||
          lowerInput.includes('done with design') ||
          lowerInput.includes('ready to build')
        ) {
          setSuggestedActions((prev) => {
            const hasBuild = prev.some((a) => a.action === 'start_building');
            if (hasBuild) return prev;
            return [{ label: 'Build App', action: 'start_building' }, ...prev];
          });

          // Auto-trigger phase generation if we don't have a plan yet
          if (!phasePlan && !isGeneratingPhases) {
            generatePhases(architectureSpec || undefined);
          }
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
              // Include imported layout manifest OR current global manifest if not imported
              layoutManifest: importedLayoutManifest || currentLayoutManifest || undefined,
              // Include generated backend architecture for build phase
              architectureSpec: architectureSpec || undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            // Clear drafts since we're completing the wizard
            clearDrafts();
            onComplete(concept, phasePlan);
          } else if (!phasePlan) {
            // If phases aren't ready, generate them first
            showToast({ type: 'info', message: 'Generating implementation plan first...' });
            generatePhases(architectureSpec || undefined).then(() => {
              // We'll need to user to click again, or we can use an effect.
              // For now, simple feedback is better.
              setSuggestedActions([{ label: 'Build App Now', action: 'start_building' }]);
            });
          }
          break;

        case 'adjust_plan':
          // Clear plan confirmation to allow regeneration
          setWizardState((prev) => ({ ...prev, planConfirmed: false }));
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
      importedLayoutManifest,
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
      className={`flex w-full ${isFullPage ? 'h-full' : 'max-w-7xl h-[90vh]'} ${isFullPage ? '' : 'rounded-xl border shadow-2xl'} overflow-hidden`}
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-color)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <WizardHeader
          appName={wizardState.name}
          currentLayoutManifest={currentLayoutManifest}
          importedLayoutManifest={importedLayoutManifest}
          onImportLayout={() => {
            setImportedLayoutManifest(currentLayoutManifest);
            showToast({
              type: 'success',
              message: 'Layout imported! Your app will use these exact styles.',
            });
          }}
          onRemoveLayout={() => {
            setImportedLayoutManifest(null);
            showToast({ type: 'info', message: 'Layout removed' });
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
                className="px-4 py-2 text-sm rounded-lg transition-colors backdrop-blur-sm"
                style={{
                  color: 'var(--text-muted)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
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
              <div
                className="backdrop-blur-sm rounded-lg px-4 py-3"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center gap-3">
                  <LoaderIcon size={18} className="text-garden-500" />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Thinking...
                  </span>
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
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Analyzing backend architecture...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Phase generation indicator */}
          {isGeneratingPhases && !isRegenerating && (
            <div className="flex justify-start">
              <div className="bg-gold-500/10 rounded-lg px-4 py-3 border-l-2 border-gold-500">
                <div className="flex items-center gap-3">
                  <LoaderIcon size={18} className="text-gold-400" />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Generating implementation plan...
                  </span>
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
                  <span style={{ color: 'var(--text-secondary)' }}>
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
              <div
                className="backdrop-blur-sm rounded-lg px-4 py-2 border-l-2"
                style={{
                  background: 'var(--bg-secondary)',
                  borderLeftColor: 'var(--border-color)',
                }}
              >
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Changes detected - plan will update shortly...
                </span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-error-600/10 text-error-300 rounded-lg px-4 py-2 text-sm border border-error-600/30">
                {error}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Fix 3: Architecture Gate - Prominent Call to Action */}
        {isPlanningComplete && needsBackend && !architectureSpec && (
          <div className="px-6 pb-4">
            <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
              <div>
                <h3 className="text-lg font-semibold text-blue-100 flex items-center gap-2">
                  <span className="text-xl">✨</span> App Concept Ready!
                </h3>
                <p className="text-blue-200/80 text-sm mt-1">
                  We have enough details to analyze your backend architecture.
                </p>
              </div>
              <button
                onClick={() => handleAction('generate_architecture')}
                disabled={isGeneratingArchitecture}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {isGeneratingArchitecture ? (
                  <>
                    <LoaderIcon size={18} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Architecture
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

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
