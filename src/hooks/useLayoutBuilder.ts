/**
 * useLayoutBuilder Hook
 *
 * Manages layout builder state, API calls, and actions.
 * Provides a complete interface for the LayoutBuilderWizard component.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { captureLayoutPreview, containsVisualKeywords } from '@/utils/screenshotCapture';
import { LAYOUT_BUILDER_GREETING } from '@/prompts/layoutBuilderSystemPrompt';
import { defaultLayoutDesign } from '@/types/layoutDesign';
import { useSmartContext } from './useSmartContext';
import {
  determineModelRouting,
  getApiEndpoint,
  type ModelRouting,
  type RoutingDecision,
} from '@/utils/modelRouter';
import type { VisualAnalysis } from '@/services/GeminiLayoutService';
import type {
  LayoutDesign,
  LayoutMessage,
  LayoutChatRequest,
  LayoutChatResponse,
  SuggestedAction,
  DesignChange,
  MessageError,
  DetectedAnimation,
  LayoutWorkflowState,
} from '@/types/layoutDesign';
import type { UIPreferences, AppConcept } from '@/types/appConcept';
import type { ChatMessage } from '@/types/aiBuilderTypes';

// ============================================================================
// CONSTANTS
// ============================================================================

const DRAFT_STORAGE_KEY = 'layoutBuilder_draft';
const VERSION_HISTORY_KEY = 'layoutBuilder_versionHistory';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_HISTORY_SIZE = 50;
const MAX_VERSION_HISTORY_SIZE = 20;

// ============================================================================
// TYPES
// ============================================================================

interface DraftState {
  design: Partial<LayoutDesign>;
  messages: LayoutMessage[];
  referenceImages: string[];
  savedAt: string;
}

/**
 * Version history entry for tracking saved design versions
 */
export interface DesignVersion {
  id: string;
  version: number;
  name: string;
  design: Partial<LayoutDesign>;
  savedAt: string;
  trigger: 'save' | 'apply' | 'manual';
  description?: string;
}

/**
 * Generated background from DALL-E
 */
export interface GeneratedBackground {
  url: string;
  targetElement: string;
  prompt: string;
}

/**
 * Options for the useLayoutBuilder hook
 */
export interface UseLayoutBuilderOptions {
  /** Callback when animations are received from AI chat */
  onAnimationsReceived?: (animations: DetectedAnimation[]) => void;
  /** Callback when backgrounds are generated via DALL-E */
  onBackgroundsGenerated?: (backgrounds: GeneratedBackground[]) => void;
  /** Callback when tools are used by the AI */
  onToolsUsed?: (toolNames: string[]) => void;
  /** Callback when Gemini visual analysis is received (dual-model mode) */
  onGeminiAnalysis?: (analysis: VisualAnalysis) => void;
  /** Enable automatic design analysis after screenshot capture */
  autoAnalyze?: boolean;
}

interface UseLayoutBuilderReturn {
  // State
  messages: LayoutMessage[];
  design: Partial<LayoutDesign>;
  isLoading: boolean;
  selectedElement: string | null;
  referenceImages: string[];
  lastCapture: string | null;
  suggestedActions: SuggestedAction[];
  recentChanges: DesignChange[];
  hasDraftToRecover: boolean;
  canUndo: boolean;
  canRedo: boolean;

  // Dual-Model State
  modelRouting: RoutingDecision | null;
  geminiAnalysis: VisualAnalysis | null;
  lastModelUsed: ModelRouting | null;

  // Version History State
  versionHistory: DesignVersion[];
  currentVersionId: string | null;

  // Actions
  sendMessage: (text: string, includeCapture?: boolean) => Promise<void>;
  setSelectedElement: (elementId: string | null) => void;
  addReferenceImage: (imageData: string) => void;
  removeReferenceImage: (index: number) => void;
  capturePreview: () => Promise<string | null>;
  updateDesign: (updates: Partial<LayoutDesign>) => void;
  resetDesign: () => void;
  saveDesign: (name?: string) => LayoutDesign;
  applyToAppConcept: () => void;
  clearMessages: () => void;
  retryMessage: (messageId: string) => Promise<void>;

  // Draft & History Actions
  recoverDraft: () => void;
  discardDraft: () => void;
  undo: () => void;
  redo: () => void;

  // Export/Import
  exportDesign: (includeMessages?: boolean) => void;
  importDesign: (file: File) => Promise<boolean>;

  // Version History Actions
  createVersionSnapshot: (
    trigger: 'save' | 'apply' | 'manual',
    description?: string
  ) => DesignVersion;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  getVersionById: (versionId: string) => DesignVersion | undefined;

  // Computed
  hasUnsavedChanges: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Save draft to localStorage
 */
function saveDraftToStorage(draft: DraftState): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Failed to save draft to localStorage:', error);
  }
}

/**
 * Load draft from localStorage
 */
function loadDraftFromStorage(): DraftState | null {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      if (parsed.messages && Array.isArray(parsed.messages)) {
        parsed.messages = parsed.messages.map((msg: LayoutMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
      return parsed as DraftState;
    }
  } catch (error) {
    console.warn('Failed to load draft from localStorage:', error);
  }
  return null;
}

/**
 * Clear draft from localStorage
 */
function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear draft from localStorage:', error);
  }
}

/**
 * Save version history to localStorage
 */
function saveVersionHistoryToStorage(versions: DesignVersion[]): void {
  try {
    // Only store version metadata, not full designs (to save space)
    const storableVersions = versions.map((v) => ({
      ...v,
      design: {
        id: v.design.id,
        name: v.design.name,
        version: v.design.version,
        basePreferences: v.design.basePreferences,
        globalStyles: v.design.globalStyles,
        components: v.design.components,
        structure: v.design.structure,
        responsive: v.design.responsive,
      },
    }));
    localStorage.setItem(VERSION_HISTORY_KEY, JSON.stringify(storableVersions));
  } catch (error) {
    console.warn('Failed to save version history to localStorage:', error);
  }
}

/**
 * Load version history from localStorage
 */
function loadVersionHistoryFromStorage(): DesignVersion[] {
  try {
    const stored = localStorage.getItem(VERSION_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored) as DesignVersion[];
    }
  } catch (error) {
    console.warn('Failed to load version history from localStorage:', error);
  }
  return [];
}

/**
 * Generate a unique version ID
 */
function generateVersionId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get human-readable description for version trigger
 */
function getTriggerDescription(trigger: 'save' | 'apply' | 'manual'): string {
  switch (trigger) {
    case 'save':
      return 'Saved design';
    case 'apply':
      return 'Applied to app concept';
    case 'manual':
      return 'Manual snapshot';
    default:
      return 'Unknown trigger';
  }
}

/**
 * Map LayoutDesign to UIPreferences for Apply to App Concept
 */
function mapLayoutDesignToUIPreferences(design: Partial<LayoutDesign>): Partial<UIPreferences> {
  const colors = design.globalStyles?.colors;
  const effects = design.globalStyles?.effects;
  const typography = design.globalStyles?.typography;
  const spacing = design.globalStyles?.spacing;

  return {
    style: design.basePreferences?.style || 'modern',
    colorScheme: design.basePreferences?.colorScheme || 'dark',
    layout: design.basePreferences?.layout || 'single-page',
    primaryColor: colors?.primary,
    secondaryColor: colors?.secondary,
    accentColor: colors?.accent,
    borderRadius: effects?.borderRadius,
    shadowIntensity: effects?.shadows,
    fontFamily: typography?.fontFamily,
    spacing: spacing?.density,
    layoutDesignId: design.id,
    referenceMedia: design.referenceMedia?.map((ref) => ({
      type: ref.type as 'image' | 'video',
      url: ref.source,
      name: ref.name,
    })),
  };
}

/**
 * Generate a unique ID for messages
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Categorize errors and return user-friendly message with retry info
 */
function categorizeError(error: unknown, statusCode?: number): MessageError {
  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection and try again.',
      canRetry: true,
    };
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'TimeoutError') {
    return {
      type: 'timeout',
      message: 'The request took too long to complete. Please try again.',
      canRetry: true,
    };
  }

  // HTTP status code based errors
  if (statusCode) {
    switch (statusCode) {
      case 429:
        return {
          type: 'rate_limit',
          message: 'Too many requests. Please wait a moment before trying again.',
          canRetry: true,
          retryAfter: 30000, // 30 seconds
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'server',
          message: 'The AI service is temporarily unavailable. Please try again in a moment.',
          canRetry: true,
        };
      case 401:
      case 403:
        return {
          type: 'server',
          message: 'Authentication error. Please refresh the page and try again.',
          canRetry: false,
        };
      case 400:
        return {
          type: 'server',
          message: 'Invalid request. Please try rephrasing your message.',
          canRetry: false,
        };
      default:
        if (statusCode >= 400 && statusCode < 500) {
          return {
            type: 'server',
            message: `Request error (${statusCode}). Please try again.`,
            canRetry: true,
          };
        }
        if (statusCode >= 500) {
          return {
            type: 'server',
            message: `Server error (${statusCode}). Please try again later.`,
            canRetry: true,
          };
        }
    }
  }

  // Default unknown error
  return {
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    canRetry: true,
  };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useLayoutBuilder(options: UseLayoutBuilderOptions = {}): UseLayoutBuilderReturn {
  const { onAnimationsReceived, onBackgroundsGenerated, onToolsUsed, onGeminiAnalysis } = options;

  // Store state
  const {
    currentLayoutDesign,
    setCurrentLayoutDesign,
    addSavedLayoutDesign,
    appConcept,
    setAppConcept,
  } = useAppStore();

  // Semantic memory integration (P0-P1 Phase 7b)
  const {
    storeConversationMemories,
    searchMemories,
    isMemoryEnabled,
    isInitialized: isMemoryInitialized,
  } = useSmartContext();

  // Local state
  const [messages, setMessages] = useState<LayoutMessage[]>([
    {
      id: generateMessageId(),
      role: 'assistant',
      content: LAYOUT_BUILDER_GREETING,
      timestamp: new Date(),
    },
  ]);
  const [design, setDesign] = useState<Partial<LayoutDesign>>(
    currentLayoutDesign || { ...defaultLayoutDesign }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [workflowState, setWorkflowState] = useState<LayoutWorkflowState | undefined>(undefined);
  const [recentChanges, setRecentChanges] = useState<DesignChange[]>([]);

  // Dual-model state
  const [modelRouting, setModelRouting] = useState<RoutingDecision | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<VisualAnalysis | null>(null);
  const [lastModelUsed, setLastModelUsed] = useState<ModelRouting | null>(null);

  // Draft recovery state
  const [hasDraftToRecover, setHasDraftToRecover] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftState | null>(null);

  // History state for undo/redo
  const [designHistory, setDesignHistory] = useState<Partial<LayoutDesign>[]>([design]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Track saved state for change detection
  const [changeCount, setChangeCount] = useState(0);
  const [lastSavedChangeCount, setLastSavedChangeCount] = useState(0);

  // Version history state
  const [versionHistory, setVersionHistory] = useState<DesignVersion[]>(() =>
    loadVersionHistoryFromStorage()
  );
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ========================================================================
  // DRAFT RECOVERY & AUTO-SAVE
  // ========================================================================

  // Check for draft on mount
  useEffect(() => {
    const draft = loadDraftFromStorage();
    if (draft) {
      // Check if draft is less than 24 hours old
      const draftAge = Date.now() - new Date(draft.savedAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (draftAge < maxAge) {
        setPendingDraft(draft);
        setHasDraftToRecover(true);
      } else {
        // Draft is too old, clear it
        clearDraftFromStorage();
      }
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set up new auto-save timer
    autoSaveTimerRef.current = setTimeout(() => {
      // Only save if there are unsaved changes
      if (changeCount > lastSavedChangeCount) {
        const draft: DraftState = {
          design,
          messages,
          referenceImages,
          savedAt: new Date().toISOString(),
        };
        saveDraftToStorage(draft);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [design, messages, referenceImages, changeCount, lastSavedChangeCount]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // ========================================================================
  // ACTIONS
  // ========================================================================

  /**
   * Capture the current layout preview as an image
   */
  const capturePreview = useCallback(async (): Promise<string | null> => {
    try {
      const result = await captureLayoutPreview('layout-preview-frame');
      if (result.success && result.dataUrl) {
        setLastCapture(result.dataUrl);
        return result.dataUrl;
      }
    } catch (error) {
      console.error('Failed to capture preview:', error);
    }
    return null;
  }, []);

  /**
   * Send a message to the layout builder AI
   */
  const sendMessage = useCallback(
    async (text: string, includeCapture = false) => {
      if (!text.trim() && !includeCapture) return;

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Determine if we should auto-capture
      let screenshot = lastCapture;
      if (includeCapture || containsVisualKeywords(text) || selectedElement) {
        const newCapture = await capturePreview();
        if (newCapture) {
          screenshot = newCapture;
        }
      }

      // Add user message
      const userMessage: LayoutMessage = {
        id: generateMessageId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
        selectedElement: selectedElement || undefined,
        previewSnapshot: screenshot || undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Search for relevant memories from past sessions (P0-P1 Phase 7b)
        let memoriesContext = '';
        if (isMemoryEnabled && isMemoryInitialized) {
          try {
            memoriesContext = await searchMemories(text);
          } catch (memError) {
            console.warn('[useLayoutBuilder] Failed to search memories:', memError);
          }
        }

        // Determine intelligent model routing
        const hasImages = !!(screenshot || (referenceImages && referenceImages.length > 0));
        const routingDecision = determineModelRouting({
          message: text,
          hasImages,
          currentDesign: design as Record<string, unknown>,
        });
        setModelRouting(routingDecision);

        // Get the appropriate API endpoint based on routing
        const apiEndpoint = getApiEndpoint(routingDecision.route);

        const request: LayoutChatRequest = {
          message: text,
          conversationHistory: messages,
          currentDesign: design,
          selectedElement: selectedElement || undefined,
          previewScreenshot: screenshot || undefined,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          memoriesContext: memoriesContext || undefined, // Include cross-session memories
          workflowState: workflowState, // Include workflow state for multi-step workflows
        };

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: LayoutChatResponse & {
          geminiAnalysis?: VisualAnalysis;
          modelUsed?: ModelRouting;
        } = await response.json();

        // Track which model was used
        if (data.modelUsed) {
          setLastModelUsed(data.modelUsed);
        } else {
          setLastModelUsed(routingDecision.route);
        }

        // Handle Gemini analysis from dual-model pipeline
        if (data.geminiAnalysis) {
          setGeminiAnalysis(data.geminiAnalysis);
          if (onGeminiAnalysis) {
            onGeminiAnalysis(data.geminiAnalysis);
          }
        }

        // Add assistant message
        const assistantMessage: LayoutMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update design with any changes - use updateDesign to track history
        if (data.updatedDesign && Object.keys(data.updatedDesign).length > 0) {
          // Merge updates with current design
          const baseStyles = defaultLayoutDesign.globalStyles;
          const mergedDesign = {
            ...design,
            ...data.updatedDesign,
            globalStyles: {
              ...design.globalStyles,
              ...data.updatedDesign.globalStyles,
              typography: {
                ...baseStyles.typography,
                ...design.globalStyles?.typography,
                ...data.updatedDesign.globalStyles?.typography,
              },
              colors: {
                ...baseStyles.colors,
                ...design.globalStyles?.colors,
                ...data.updatedDesign.globalStyles?.colors,
              },
              spacing: {
                ...baseStyles.spacing,
                ...design.globalStyles?.spacing,
                ...data.updatedDesign.globalStyles?.spacing,
              },
              effects: {
                ...baseStyles.effects,
                ...design.globalStyles?.effects,
                ...data.updatedDesign.globalStyles?.effects,
              },
            },
            components: {
              ...design.components,
              ...data.updatedDesign.components,
            },
            structure: {
              ...design.structure,
              ...data.updatedDesign.structure,
            },
          } as Partial<LayoutDesign>;
          setDesign(mergedDesign);

          // Update history for undo/redo
          setDesignHistory((history) => {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(mergedDesign);
            if (newHistory.length > MAX_HISTORY_SIZE) {
              newHistory.shift();
            }
            return newHistory;
          });
          setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
          setChangeCount((prev) => prev + 1);
        }

        // Update suggested actions
        if (data.suggestedActions) {
          setSuggestedActions(data.suggestedActions);
        }

        // Track recent changes
        if (data.designChanges && data.designChanges.length > 0) {
          setRecentChanges(data.designChanges);
        }

        // Handle tool outputs: animations from AI
        if (data.animations && data.animations.length > 0 && onAnimationsReceived) {
          onAnimationsReceived(data.animations);
        }

        // Handle tool outputs: generated backgrounds from DALL-E
        if (
          data.generatedBackgrounds &&
          data.generatedBackgrounds.length > 0 &&
          onBackgroundsGenerated
        ) {
          onBackgroundsGenerated(data.generatedBackgrounds);
        }

        // Track which tools were used
        if (data.toolsUsed && data.toolsUsed.length > 0 && onToolsUsed) {
          onToolsUsed(data.toolsUsed);
        }

        // Update workflow state if returned
        if (data.workflowState) {
          setWorkflowState(data.workflowState);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled
        }

        console.error('Layout chat error:', error);

        // Extract status code if available
        let statusCode: number | undefined;
        if (error instanceof Error && error.message.includes('API error:')) {
          const match = error.message.match(/API error: (\d+)/);
          if (match) {
            statusCode = parseInt(match[1], 10);
          }
        }

        // Categorize the error
        const errorInfo = categorizeError(error, statusCode);

        // Add error message with retry capability
        const errorMessage: LayoutMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: errorInfo.message,
          timestamp: new Date(),
          error: {
            ...errorInfo,
            originalMessage: text, // Store original message for retry
          },
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      messages,
      design,
      selectedElement,
      referenceImages,
      lastCapture,
      capturePreview,
      historyIndex,
      isMemoryEnabled,
      isMemoryInitialized,
      searchMemories,
      workflowState,
      onAnimationsReceived,
      onBackgroundsGenerated,
      onToolsUsed,
      onGeminiAnalysis,
    ]
  );

  /**
   * Retry a failed message
   */
  const retryMessage = useCallback(
    async (messageId: string) => {
      // Find the error message
      const errorMessageIndex = messages.findIndex((m) => m.id === messageId && m.error);
      if (errorMessageIndex === -1) return;

      const errorMessage = messages[errorMessageIndex];
      if (!errorMessage.error?.originalMessage) return;

      // Check rate limit
      if (errorMessage.error.retryAfter && errorMessage.error.type === 'rate_limit') {
        const timeSinceError = Date.now() - errorMessage.timestamp.getTime();
        if (timeSinceError < errorMessage.error.retryAfter) {
          const waitSeconds = Math.ceil((errorMessage.error.retryAfter - timeSinceError) / 1000);
          // Update message to show wait time
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, content: `Please wait ${waitSeconds} seconds before retrying.` }
                : m
            )
          );
          return;
        }
      }

      // Mark as retrying
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isRetrying: true, content: 'Retrying...' } : m
        )
      );

      // Remove the error message before retrying
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // Retry the original message
      await sendMessage(errorMessage.error.originalMessage, false);
    },
    [messages, sendMessage]
  );

  /**
   * Add a reference image
   */
  const addReferenceImage = useCallback((imageData: string) => {
    setReferenceImages((prev) => [...prev, imageData]);
  }, []);

  /**
   * Remove a reference image
   */
  const removeReferenceImage = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Update design directly with history tracking
   */
  const updateDesign = useCallback(
    (updates: Partial<LayoutDesign>) => {
      setDesign((prev) => {
        const newDesign = { ...prev, ...updates };

        // Add to history (truncate any redo states)
        setDesignHistory((history) => {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newDesign);
          // Limit history size
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
          }
          return newHistory;
        });
        setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));

        // Increment change count
        setChangeCount((prev) => prev + 1);

        return newDesign;
      });
    },
    [historyIndex]
  );

  /**
   * Undo the last design change
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDesign(designHistory[newIndex]);
      setChangeCount((prev) => prev + 1);
    }
  }, [historyIndex, designHistory]);

  /**
   * Redo the last undone change
   */
  const redo = useCallback(() => {
    if (historyIndex < designHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDesign(designHistory[newIndex]);
      setChangeCount((prev) => prev + 1);
    }
  }, [historyIndex, designHistory]);

  /**
   * Recover draft from localStorage
   */
  const recoverDraft = useCallback(() => {
    if (pendingDraft) {
      setDesign(pendingDraft.design);
      setMessages(pendingDraft.messages);
      setReferenceImages(pendingDraft.referenceImages);

      // Reset history with recovered state
      setDesignHistory([pendingDraft.design]);
      setHistoryIndex(0);

      // Mark as having unsaved changes (draft was never saved)
      setChangeCount(1);
      setLastSavedChangeCount(0);

      // Clear draft state
      setPendingDraft(null);
      setHasDraftToRecover(false);
      clearDraftFromStorage();
    }
  }, [pendingDraft]);

  /**
   * Discard draft and continue with fresh state
   */
  const discardDraft = useCallback(() => {
    setPendingDraft(null);
    setHasDraftToRecover(false);
    clearDraftFromStorage();
  }, []);

  /**
   * Reset design to defaults
   */
  const resetDesign = useCallback(() => {
    setDesign({ ...defaultLayoutDesign });
    setRecentChanges([]);
  }, []);

  /**
   * Save the current design
   */
  const saveDesign = useCallback(
    (name?: string): LayoutDesign => {
      const now = new Date().toISOString();
      const savedDesign: LayoutDesign = {
        ...defaultLayoutDesign,
        ...design,
        id: design.id || `ld_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || design.name || 'Untitled Design',
        version: (design.version || 0) + 1,
        createdAt: design.createdAt || now,
        updatedAt: now,
        referenceMedia: referenceImages.map((img, i) => ({
          id: `ref_${i}`,
          type: 'image' as const,
          source: img,
          name: `Reference ${i + 1}`,
          addedAt: now,
        })),
        conversationContext: {
          messageCount: messages.length,
          keyDecisions: recentChanges.map((c) => c.reason),
          userPreferences: [],
          lastUpdated: now,
        },
      } as LayoutDesign;

      // Save to store
      setCurrentLayoutDesign(savedDesign);
      addSavedLayoutDesign(savedDesign);

      // Update local state with ID
      setDesign(savedDesign);

      // Clear draft and mark as saved
      clearDraftFromStorage();
      setLastSavedChangeCount(changeCount);

      // Store conversation memories for cross-session recall (P0-P1 Phase 7b)
      if (isMemoryEnabled && isMemoryInitialized) {
        // Convert LayoutMessage[] to ChatMessage[] format for memory storage
        const chatMessages: ChatMessage[] = messages
          .filter((m) => m.role !== 'system')
          .map((m, index) => ({
            id: m.id || `layout-msg-${index}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          }));
        storeConversationMemories(chatMessages);
      }

      // Create version snapshot
      const versionId = generateVersionId();
      const newVersion: DesignVersion = {
        id: versionId,
        version: versionHistory.length + 1,
        name: savedDesign.name,
        design: savedDesign,
        savedAt: now,
        trigger: 'save',
        description: 'Saved design',
      };
      setVersionHistory((prev) => {
        const updated = [newVersion, ...prev].slice(0, MAX_VERSION_HISTORY_SIZE);
        saveVersionHistoryToStorage(updated);
        return updated;
      });
      setCurrentVersionId(versionId);

      return savedDesign;
    },
    [
      design,
      referenceImages,
      messages,
      recentChanges,
      setCurrentLayoutDesign,
      addSavedLayoutDesign,
      changeCount,
      versionHistory.length,
      isMemoryEnabled,
      isMemoryInitialized,
      storeConversationMemories,
    ]
  );

  /**
   * Apply the current design to the App Concept
   */
  const applyToAppConcept = useCallback(() => {
    // First save the design
    const savedDesign = saveDesign();

    // Map to UIPreferences
    const uiPreferences = mapLayoutDesignToUIPreferences(savedDesign);

    // Update app concept
    if (appConcept) {
      setAppConcept({
        ...appConcept,
        uiPreferences: {
          ...appConcept.uiPreferences,
          ...uiPreferences,
        },
        layoutDesign: savedDesign,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create minimal app concept with just the layout
      const minimalConcept: AppConcept = {
        name: savedDesign.name || 'Untitled App',
        description: '',
        purpose: '',
        targetUsers: '',
        coreFeatures: [],
        uiPreferences: {
          style: uiPreferences.style || 'modern',
          colorScheme: uiPreferences.colorScheme || 'dark',
          layout: uiPreferences.layout || 'single-page',
          ...uiPreferences,
        },
        technical: {
          needsAuth: false,
          needsDatabase: false,
          needsAPI: false,
          needsFileUpload: false,
          needsRealtime: false,
        },
        layoutDesign: savedDesign,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAppConcept(minimalConcept);
    }
  }, [saveDesign, appConcept, setAppConcept]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: generateMessageId(),
        role: 'assistant',
        content: LAYOUT_BUILDER_GREETING,
        timestamp: new Date(),
      },
    ]);
    setRecentChanges([]);
  }, []);

  // ========================================================================
  // EXPORT/IMPORT
  // ========================================================================

  /**
   * Export design to JSON file
   */
  const exportDesign = useCallback(
    (includeMessages: boolean = false) => {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        design: {
          ...design,
          name: design.name || 'Untitled Design',
          version: design.version || 1,
          updatedAt: new Date().toISOString(),
        },
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        messages: includeMessages ? messages.filter((m) => m.role !== 'system') : undefined,
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${design.name || 'layout-design'}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [design, referenceImages, messages]
  );

  /**
   * Import design from JSON file
   */
  const importDesign = useCallback(async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);

          // Basic validation
          if (!importData.design) {
            console.error('Invalid import file: missing design data');
            resolve(false);
            return;
          }

          // Apply the imported design
          const importedDesign = {
            ...importData.design,
            updatedAt: new Date().toISOString(),
          };
          setDesign(importedDesign);

          // Apply reference images if included
          if (importData.referenceImages && Array.isArray(importData.referenceImages)) {
            setReferenceImages(importData.referenceImages);
          }

          // Apply messages if included
          if (importData.messages && Array.isArray(importData.messages)) {
            const restoredMessages = importData.messages.map((msg: LayoutMessage) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }));
            setMessages([
              {
                id: generateMessageId(),
                role: 'assistant',
                content: LAYOUT_BUILDER_GREETING,
                timestamp: new Date(),
              },
              ...restoredMessages,
            ]);
          }

          // Add to history
          setDesignHistory([importedDesign]);
          setHistoryIndex(0);

          // Reset change tracking - imported design is considered "saved"
          setChangeCount(0);
          setLastSavedChangeCount(0);

          resolve(true);
        } catch (error) {
          console.error('Failed to parse import file:', error);
          resolve(false);
        }
      };

      reader.onerror = () => {
        console.error('Failed to read import file');
        resolve(false);
      };

      reader.readAsText(file);
    });
  }, []);

  // ========================================================================
  // VERSION HISTORY
  // ========================================================================

  /**
   * Create a version snapshot of the current design
   */
  const createVersionSnapshot = useCallback(
    (trigger: 'save' | 'apply' | 'manual', description?: string): DesignVersion => {
      const now = new Date().toISOString();
      const versionNumber = versionHistory.length + 1;

      const newVersion: DesignVersion = {
        id: generateVersionId(),
        version: versionNumber,
        name: design.name || `Version ${versionNumber}`,
        design: { ...design },
        savedAt: now,
        trigger,
        description: description || getTriggerDescription(trigger),
      };

      setVersionHistory((prev) => {
        const updated = [newVersion, ...prev].slice(0, MAX_VERSION_HISTORY_SIZE);
        saveVersionHistoryToStorage(updated);
        return updated;
      });

      setCurrentVersionId(newVersion.id);
      return newVersion;
    },
    [design, versionHistory.length]
  );

  /**
   * Restore a previous version of the design
   */
  const restoreVersion = useCallback(
    (versionId: string) => {
      const version = versionHistory.find((v) => v.id === versionId);
      if (!version) {
        console.warn('Version not found:', versionId);
        return;
      }

      // Restore the design
      setDesign(version.design);
      setCurrentVersionId(versionId);

      // Update undo/redo history
      setDesignHistory([version.design]);
      setHistoryIndex(0);

      // Reset change tracking - restored version is considered "saved"
      const nextChangeCount = changeCount + 1;
      setChangeCount(nextChangeCount);
      setLastSavedChangeCount(nextChangeCount);
    },
    [versionHistory, changeCount]
  );

  /**
   * Delete a version from history
   */
  const deleteVersion = useCallback(
    (versionId: string) => {
      setVersionHistory((prev) => {
        const updated = prev.filter((v) => v.id !== versionId);
        saveVersionHistoryToStorage(updated);
        return updated;
      });

      // Clear current version if it was deleted
      if (currentVersionId === versionId) {
        setCurrentVersionId(null);
      }
    },
    [currentVersionId]
  );

  /**
   * Get a specific version by ID
   */
  const getVersionById = useCallback(
    (versionId: string): DesignVersion | undefined => {
      return versionHistory.find((v) => v.id === versionId);
    },
    [versionHistory]
  );

  // ========================================================================
  // COMPUTED
  // ========================================================================

  // Optimized change detection using change counter instead of JSON.stringify
  const hasUnsavedChanges = changeCount > lastSavedChangeCount;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < designHistory.length - 1;

  // ========================================================================
  // RETURN
  // ========================================================================

  return {
    // State
    messages,
    design,
    isLoading,
    selectedElement,
    referenceImages,
    lastCapture,
    suggestedActions,
    recentChanges,
    hasDraftToRecover,
    canUndo,
    canRedo,

    // Dual-Model State
    modelRouting,
    geminiAnalysis,
    lastModelUsed,

    // Version History State
    versionHistory,
    currentVersionId,

    // Actions
    sendMessage,
    setSelectedElement,
    addReferenceImage,
    removeReferenceImage,
    capturePreview,
    updateDesign,
    resetDesign,
    saveDesign,
    applyToAppConcept,
    clearMessages,
    retryMessage,

    // Draft & History Actions
    recoverDraft,
    discardDraft,
    undo,
    redo,

    // Export/Import
    exportDesign,
    importDesign,

    // Version History Actions
    createVersionSnapshot,
    restoreVersion,
    deleteVersion,
    getVersionById,

    // Computed
    hasUnsavedChanges,
  };
}

export default useLayoutBuilder;
