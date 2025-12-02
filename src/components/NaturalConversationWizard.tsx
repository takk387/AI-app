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
import { useToast } from '@/components/Toast';
import {
  WIZARD_DRAFT_KEYS,
  saveWizardDraft,
  loadWizardDraft,
  deleteDraft,
  getDraftMetadata,
  formatDraftAge,
} from '@/utils/wizardAutoSave';

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
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NaturalConversationWizard({
  onComplete,
  onCancel,
  initialConcept,
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
    const savedPhasePlan = loadWizardDraft<DynamicPhasePlan>(WIZARD_DRAFT_KEYS.CONVERSATION_PHASE_PLAN);

    if (savedMessages && savedMessages.length > 0) {
      // Restore timestamps as Date objects
      const messagesWithDates = savedMessages.map(m => ({
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

  const sendMessage = useCallback(async (messageText: string, images?: string[]) => {
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
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setPendingImages([]);

    try {
      // Prepare conversation history for API
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Call the wizard chat API
      const response = await fetch('/api/wizard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationHistory,
          currentState: wizardState,
          referenceImages: images,
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
      setMessages(prev => [...prev, assistantMessage]);

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
  }, [messages, wizardState, showToast]);

  // ============================================================================
  // PHASE GENERATION
  // ============================================================================

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
      // Build complete concept
      const concept: AppConcept = {
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
        setMessages(prev => [...prev, planMessage]);

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
  }, [wizardState, showToast]);

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

  const handleAction = useCallback((action: string) => {
    switch (action) {
      case 'generate_phases':
        generatePhases();
        break;

      case 'start_building':
        if (phasePlan) {
          const concept: AppConcept = {
            name: wizardState.name!,
            description: wizardState.description || '',
            purpose: wizardState.purpose || '',
            targetUsers: wizardState.targetUsers || '',
            coreFeatures: wizardState.features,
            uiPreferences: wizardState.uiPreferences as UIPreferences,
            technical: wizardState.technical as TechnicalRequirements,
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
        sendMessage("Show me some app templates to get inspired");
        break;

      case 'upload_reference':
        fileInputRef.current?.click();
        break;

      default:
        console.warn('Unknown action:', action);
    }
  }, [generatePhases, phasePlan, wizardState, onComplete, sendMessage, clearDrafts]);

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    let processed = 0;

    Array.from(files).forEach(file => {
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
          setPendingImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
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
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <div
          className="bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl p-8 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl mb-4">
              <span role="img" aria-label="restore">&#128190;</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Resume Previous Session?</h2>
            <p className="text-slate-400 mb-6">
              You have an unsaved conversation from <span className="text-white font-medium">{draftAge}</span>.
              Would you like to continue where you left off?
            </p>
            <div className="flex gap-3">
              <button
                onClick={startFreshConversation}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={recoverConversation}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium transition-colors"
              >
                Resume
              </button>
            </div>
            <button
              onClick={onCancel}
              className="mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-7xl h-[90vh] bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
              <span role="img" aria-label="wizard">&#129497;</span>
            </div>
            <div>
              <h1 className="font-semibold">App Planning Assistant</h1>
              <p className="text-sm text-slate-400">
                {wizardState.name
                  ? `Planning: ${wizardState.name}`
                  : 'Describe your app idea'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/50'
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
                      return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(3)}</h2>;
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h3>;
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
                      return <li key={i} className="ml-4">{line.slice(2)}</li>;
                    }
                    // Horizontal rule
                    if (line === '---') {
                      return <hr key={i} className="my-3 border-slate-600" />;
                    }
                    // Tables (simple rendering)
                    if (line.startsWith('|')) {
                      return <p key={i} className="font-mono text-sm">{line}</p>;
                    }
                    // Regular text
                    if (line.trim()) {
                      return <p key={i} className="mb-1">{line}</p>;
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
              <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-slate-400 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Phase generation indicator */}
          {isGeneratingPhases && (
            <div className="flex justify-start">
              <div className="bg-purple-600/20 rounded-2xl px-4 py-3 border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-purple-200">Generating implementation plan...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/20 text-red-200 rounded-lg px-4 py-2 text-sm">
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full text-sm transition-colors"
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
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-slate-700/50">
          <div className="flex items-end gap-3">
            {/* File upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Upload design reference"
            >
              <span role="img" aria-label="image">&#128444;</span>
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
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => sendMessage(userInput, pendingImages.length > 0 ? pendingImages : undefined)}
              disabled={isLoading || (!userInput.trim() && pendingImages.length === 0)}
              className={`p-3 rounded-xl transition-all ${
                isLoading || (!userInput.trim() && pendingImages.length === 0)
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span role="img" aria-label="send">&#128640;</span>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Side Panel - Concept Summary */}
      <div className="w-80 border-l border-slate-700/50 flex flex-col">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="font-semibold">Concept Summary</h2>
          <p className="text-sm text-slate-400">
            {wizardState.isComplete ? 'Ready to build' : 'In progress...'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* App Name */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide">App Name</label>
            <p className="mt-1">{wizardState.name || '—'}</p>
          </div>

          {/* Description */}
          {wizardState.description && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide">Description</label>
              <p className="mt-1 text-sm">{wizardState.description}</p>
            </div>
          )}

          {/* Target Users */}
          {wizardState.targetUsers && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide">Target Users</label>
              <p className="mt-1 text-sm">{wizardState.targetUsers}</p>
            </div>
          )}

          {/* Roles */}
          {wizardState.roles && wizardState.roles.length > 0 && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide">User Roles</label>
              <ul className="mt-1 space-y-1">
                {wizardState.roles.map((role, i) => (
                  <li key={i} className="text-sm">
                    <strong>{role.name}:</strong> {role.capabilities.slice(0, 2).join(', ')}
                    {role.capabilities.length > 2 && ` +${role.capabilities.length - 2} more`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Features */}
          {wizardState.features.length > 0 && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide">
                Features ({wizardState.features.length})
              </label>
              <ul className="mt-1 space-y-1">
                {wizardState.features.slice(0, 6).map((feature, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      feature.priority === 'high' ? 'bg-red-400' :
                      feature.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    {feature.name}
                  </li>
                ))}
                {wizardState.features.length > 6 && (
                  <li className="text-sm text-slate-400">
                    +{wizardState.features.length - 6} more features
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Technical */}
          {Object.values(wizardState.technical).some(v => v !== undefined) && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide">Technical</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {wizardState.technical.needsAuth && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">Auth</span>
                )}
                {wizardState.technical.needsDatabase && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs">Database</span>
                )}
                {wizardState.technical.needsRealtime && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">Real-time</span>
                )}
                {wizardState.technical.needsFileUpload && (
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded text-xs">Files</span>
                )}
                {wizardState.technical.needsAPI && (
                  <span className="px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded text-xs">API</span>
                )}
              </div>
            </div>
          )}

          {/* Phase Plan */}
          {phasePlan && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide">
                Implementation Plan ({phasePlan.totalPhases} phases)
              </label>
              <div className="mt-2 space-y-1">
                {phasePlan.phases.slice(0, 5).map(phase => (
                  <div key={phase.number} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                      {phase.number}
                    </span>
                    <span className="truncate">{phase.name}</span>
                  </div>
                ))}
                {phasePlan.phases.length > 5 && (
                  <p className="text-sm text-slate-400 pl-7">
                    +{phasePlan.phases.length - 5} more phases
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {phasePlan && (
          <div className="p-4 border-t border-slate-700/50">
            <button
              onClick={() => handleAction('start_building')}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-medium transition-all"
            >
              Start Building
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
