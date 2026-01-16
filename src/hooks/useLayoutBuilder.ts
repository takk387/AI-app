/**
 * useLayoutBuilder Hook
 *
 * Manages layout builder state, API calls, and actions.
 * Provides a complete interface for the LayoutBuilderWizard component.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { captureLayoutPreview, containsVisualKeywords } from '@/utils/screenshotCapture';
import { extractColorsFromImage } from '@/utils/colorExtraction';
import { LAYOUT_BUILDER_GREETING } from '@/prompts/layoutBuilderSystemPrompt';
import { defaultLayoutDesign, emptyLayoutDesign } from '@/types/layoutDesign';
import { useSmartContext } from './useSmartContext';
import {
  determineModelRouting,
  getApiEndpoint,
  type ModelRouting,
  type RoutingDecision,
} from '@/utils/modelRouter';
import geminiLayoutService, {
  type VisualAnalysis,
  type ExtractedStyles,
} from '@/services/GeminiLayoutService';
import {
  mapGeminiLayoutToUILayout,
  mapGeminiLayoutToStructureType,
} from '@/utils/layoutTypeMapping';
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
  SelectedElementInfo,
  DeviceView,
  PageReference,
  MultiPageDesign,
  DetectedNavigation,
  InferredRoute,
  MultiPageAnalysisResult,
  DetectedComponentEnhanced,
} from '@/types/layoutDesign';
import type { UIPreferences, AppConcept } from '@/types/appConcept';
import type { ChatMessage } from '@/types/aiBuilderTypes';
import type { DesignOption } from '@/components/layout-builder/DesignOptionsPanel';

// ============================================================================
// CONSTANTS
// ============================================================================

const DRAFT_STORAGE_KEY = 'layoutBuilder_draft';
const VERSION_HISTORY_KEY = 'layoutBuilder_versionHistory';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_HISTORY_SIZE = 50;
const MAX_VERSION_HISTORY_SIZE = 20;

/**
 * Determine if a message needs semantic memory context.
 * Simple styling requests don't need memory search, saving tokens.
 * Memory is needed for: references to past work, user preferences, brand guidelines.
 */
function needsMemoryContext(message: string): boolean {
  // Simple patterns that don't need memory (styling/quick changes)
  const simplePatterns = [
    /^make (it|the|this)/i,
    /^change (the|this)/i,
    /^(add|remove|hide|show)/i,
    /^(bigger|smaller|darker|lighter|bolder)/i,
    /^(more|less) (padding|margin|space|rounded)/i,
    /^set (the )?/i,
    /^(increase|decrease)/i,
  ];

  // Patterns that explicitly need memory (user preferences, past context)
  const memoryTriggers = [
    /remember|previous|last time|before|earlier/i,
    /my (preference|style|brand|usual)/i,
    /like (I|we) (did|had|used)/i,
    /same as/i,
    /keep (it )?consistent/i,
    /brand (color|style|guidelines)/i,
  ];

  const isSimple = simplePatterns.some((p) => p.test(message));
  const needsMemory = memoryTriggers.some((p) => p.test(message));

  // Skip memory for simple requests unless they explicitly need it
  return !isSimple || needsMemory;
}

/**
 * Simple hash function for design state comparison.
 * Uses JSON.stringify for simplicity - fast enough for our needs.
 */
function hashDesign(design: Partial<LayoutDesign>): string {
  try {
    return JSON.stringify(design);
  } catch {
    return '';
  }
}

/**
 * Determine if a hex color is "dark" based on relative luminance.
 * Used to auto-detect colorScheme from extracted background color.
 */
function isColorDark(hexColor: string | undefined): boolean {
  if (!hexColor || !hexColor.startsWith('#')) return true; // Default to dark

  const hex = hexColor.replace('#', '');
  // Handle both 3 and 6 character hex codes
  const fullHex =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  // Calculate relative luminance using sRGB formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance < 0.5;
}

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
  /** Rich element info for Click + Talk mode (includes bounds, type, actions) */
  selectedElement: SelectedElementInfo | null;
  /** Convenience getter for just the element ID */
  selectedElementId: string | null;
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
  /** Set the selected element (pass SelectedElementInfo or null to deselect) */
  setSelectedElement: (element: SelectedElementInfo | null) => void;
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

  // Design Options (Click + Talk)
  /** Generate design options based on user request */
  generateOptions: (request: string, count?: number) => Promise<void>;
  /** Current design options */
  designOptions: DesignOption[];
  /** Whether options are being generated */
  isGeneratingOptions: boolean;
  /** Apply a design option */
  applyDesignOption: (option: DesignOption) => void;
  /** Clear design options */
  clearDesignOptions: () => void;

  // Responsive Design
  /** Current device view for responsive context */
  currentDevice: DeviceView;
  /** Set the current device view */
  setCurrentDevice: (device: DeviceView) => void;

  // Reference-Based Design
  /** Apply extracted styles from a reference image to the design */
  applyReferenceStyles: (styles: ExtractedStyles, options?: { merge?: boolean }) => void;

  // Multi-Page State
  /** All page references in multi-page mode */
  pageReferences: PageReference[];
  /** Currently active page ID */
  currentPageId: string | null;
  /** Full multi-page design with navigation and routes */
  multiPageDesign: MultiPageDesign | null;
  /** Whether multi-page mode is enabled */
  isMultiPageMode: boolean;
  /** Whether pages are being analyzed */
  isAnalyzingPages: boolean;

  // Multi-Page Actions
  /** Add a single page reference */
  addPageReference: (imageData: string, name?: string) => string;
  /** Add multiple page references at once */
  addPageReferences: (pages: Omit<PageReference, 'analysis'>[]) => void;
  /** Remove a page reference */
  removePageReference: (pageId: string) => void;
  /** Reorder pages */
  reorderPages: (sourceIndex: number, destIndex: number) => void;
  /** Update a page's name */
  updatePageName: (pageId: string, name: string) => void;
  /** Set the current active page */
  setCurrentPage: (pageId: string) => void;
  /** Analyze all pending pages */
  analyzeAllPages: () => Promise<void>;
  /** Detect pages from video file */
  addPagesFromVideo: (videoFile: File) => Promise<void>;
  /** Update navigation structure */
  updateNavigation: (navigation: DetectedNavigation) => void;
  /** Export React Router configuration */
  exportReactRouterConfig: () => string;
  /** Toggle multi-page mode */
  toggleMultiPageMode: (enabled: boolean) => void;

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
// VIDEO FRAME EXTRACTION HELPER
// ============================================================================

interface ExtractedFrame {
  index: number;
  timestamp: number;
  imageDataUrl: string;
  isKeyFrame: boolean;
}

/**
 * Extract frames from a video file for page transition analysis
 */
async function extractVideoFrames(
  videoFile: File,
  options: { maxFrames?: number; interval?: number } = {}
): Promise<ExtractedFrame[]> {
  const { maxFrames = 20, interval = 1 } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;

    const frames: ExtractedFrame[] = [];
    let currentTime = 0;
    let frameIndex = 0;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const duration = video.duration;
      const frameInterval = Math.max(interval, duration / maxFrames);

      const captureFrame = () => {
        if (currentTime >= duration || frameIndex >= maxFrames) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        frames.push({
          index: frameIndex,
          timestamp: currentTime,
          imageDataUrl,
          isKeyFrame: frameIndex % 5 === 0, // Mark every 5th frame as key frame
        });

        frameIndex++;
        currentTime += frameInterval;
        captureFrame();
      };

      captureFrame();
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(videoFile);
  });
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
    currentLayoutDesign || { ...emptyLayoutDesign }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [workflowState, setWorkflowState] = useState<LayoutWorkflowState | undefined>(undefined);
  const [recentChanges, setRecentChanges] = useState<DesignChange[]>([]);

  // Design Options state (Click + Talk)
  const [designOptions, setDesignOptions] = useState<DesignOption[]>([]);
  const [isGeneratingOptions, setIsGeneratingOptions] = useState(false);

  // Responsive preview state
  const [currentDevice, setCurrentDevice] = useState<DeviceView>('desktop');

  // Multi-page state
  const [pageReferences, setPageReferences] = useState<PageReference[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [multiPageDesign, setMultiPageDesign] = useState<MultiPageDesign | null>(null);
  const [isMultiPageMode, setIsMultiPageMode] = useState(false);
  const [isAnalyzingPages, setIsAnalyzingPages] = useState(false);

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
  const lastSentDesignHashRef = useRef<string>(''); // Track design hash to avoid redundant sends

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
        // Skip memory search for simple styling requests to save tokens
        let memoriesContext = '';
        if (isMemoryEnabled && isMemoryInitialized && needsMemoryContext(text)) {
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

        // Check if design changed since last request (token optimization)
        const currentDesignHash = hashDesign(design);
        const designChanged = currentDesignHash !== lastSentDesignHashRef.current;

        const request: LayoutChatRequest = {
          message: text,
          conversationHistory: messages,
          // Only send full design if it changed, otherwise signal it's unchanged
          currentDesign: designChanged ? design : undefined,
          designUnchanged: !designChanged, // Signal to API that design hasn't changed
          selectedElement: selectedElement || undefined,
          previewScreenshot: screenshot || undefined,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          memoriesContext: memoriesContext || undefined, // Include cross-session memories
          workflowState: workflowState, // Include workflow state for multi-step workflows
          currentDevice: currentDevice, // Include current device for responsive context
        };

        // Update hash after building request
        if (designChanged) {
          lastSentDesignHashRef.current = currentDesignHash;
        }

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
        } else if (referenceImages.length > 0) {
          // FALLBACK: If Gemini unavailable but we have reference images,
          // extract colors client-side using canvas-based extraction
          try {
            console.log(
              '[useLayoutBuilder] Gemini unavailable, using client-side color extraction'
            );
            const extractionResult = await extractColorsFromImage(referenceImages[0]);

            // Create a synthetic VisualAnalysis from client-side extraction
            const clientSideAnalysis: VisualAnalysis = {
              layoutType: 'single-page',
              colorPalette: {
                primary: extractionResult.palette.primary,
                secondary: extractionResult.palette.secondary,
                accent: extractionResult.palette.accent,
                background: extractionResult.palette.background,
                surface: extractionResult.palette.surface,
                text: extractionResult.palette.text,
                textMuted: extractionResult.palette.textMuted,
              },
              typography: {
                headingStyle: 'Bold sans-serif',
                bodyStyle: 'Regular sans-serif',
                headingWeight: 'bold',
                bodyWeight: 'normal',
                estimatedHeadingFont: 'Inter',
                estimatedBodyFont: 'Inter',
              },
              spacing: {
                density: 'normal',
                sectionPadding: 'md',
                componentGap: 'md',
              },
              components: [],
              effects: {
                borderRadius: 'md',
                shadows: 'subtle',
                hasGradients: false,
                hasBlur: false,
                hasAnimations: false,
              },
              vibe: extractionResult.isDarkImage ? 'Dark and modern' : 'Light and clean',
              vibeKeywords: extractionResult.isDarkImage
                ? ['dark', 'modern', 'sleek']
                : ['light', 'clean', 'minimal'],
              confidence: 0.7,
            };

            setGeminiAnalysis(clientSideAnalysis);
            if (onGeminiAnalysis) {
              onGeminiAnalysis(clientSideAnalysis);
            }

            // Inject the client-side analysis into data so it's applied below
            data.geminiAnalysis = clientSideAnalysis;

            console.log(
              '[useLayoutBuilder] Client-side extracted colors:',
              extractionResult.palette
            );
          } catch (extractError) {
            console.error('[useLayoutBuilder] Client-side color extraction failed:', extractError);
          }
        }

        // Add assistant message
        const assistantMessage: LayoutMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          // Attach Gemini analysis for embedding Creative Director panel in chat
          geminiAnalysis: data.geminiAnalysis,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update design with any changes - use updateDesign to track history
        // Check for either updatedDesign content OR geminiAnalysis (which has colors to apply)
        const hasDesignUpdates = data.updatedDesign && Object.keys(data.updatedDesign).length > 0;
        const hasGeminiColors = data.geminiAnalysis?.colorPalette;

        if (hasDesignUpdates || hasGeminiColors) {
          // Merge updates with current design
          const baseStyles = defaultLayoutDesign.globalStyles;

          // If we have Gemini analysis but no design updates, create colors from Gemini
          const geminiColors = hasGeminiColors
            ? {
                primary: data.geminiAnalysis!.colorPalette.primary,
                secondary: data.geminiAnalysis!.colorPalette.secondary,
                accent: data.geminiAnalysis!.colorPalette.accent,
                background: data.geminiAnalysis!.colorPalette.background,
                surface: data.geminiAnalysis!.colorPalette.surface,
                text: data.geminiAnalysis!.colorPalette.text,
                textMuted: data.geminiAnalysis!.colorPalette.textMuted,
                border: data.geminiAnalysis!.colorPalette.textMuted,
              }
            : undefined;

          // Map Gemini's layoutType to both basePreferences.layout AND structure.type
          // This ensures the preview renders the correct layout component
          const geminiLayoutType = data.geminiAnalysis?.layoutType;
          const mappedLayout = geminiLayoutType
            ? mapGeminiLayoutToUILayout(geminiLayoutType)
            : undefined;
          const mappedStructureType = geminiLayoutType
            ? mapGeminiLayoutToStructureType(geminiLayoutType)
            : undefined;

          // Detect colorScheme from Gemini's extracted background color
          const detectedColorScheme: 'light' | 'dark' | undefined = geminiColors
            ? isColorDark(geminiColors.background)
              ? 'dark'
              : 'light'
            : undefined;

          // DEBUG: Log Gemini design application
          console.log('[useLayoutBuilder] Applying Gemini design:', {
            hasGeminiColors: !!geminiColors,
            extractedBackground: geminiColors?.background,
            extractedPrimary: geminiColors?.primary,
            detectedLayout: mappedLayout,
            detectedStructure: mappedStructureType,
            hasHeader: data.geminiAnalysis?.components?.some((c) => c.type === 'header'),
            hasSidebar: data.geminiAnalysis?.components?.some((c) => c.type === 'sidebar'),
            hasFooter: data.geminiAnalysis?.components?.some((c) => c.type === 'footer'),
          });

          // Use functional state update to avoid stale closure issue
          // This ensures we merge with the LATEST design state, not a stale reference
          setDesign((prevDesign) => {
            const mergedDesign = {
              ...prevDesign,
              ...(data.updatedDesign || {}),
              // Sync basePreferences.layout with Gemini's detected layout type
              basePreferences: {
                ...prevDesign.basePreferences,
                ...(data.updatedDesign?.basePreferences || {}),
                // Use Gemini's detected layout and colorScheme if available
                ...(mappedLayout ? { layout: mappedLayout } : {}),
                ...(detectedColorScheme ? { colorScheme: detectedColorScheme } : {}),
              },
              globalStyles: {
                ...prevDesign.globalStyles,
                ...(data.updatedDesign?.globalStyles || {}),
                typography: {
                  ...baseStyles.typography,
                  ...prevDesign.globalStyles?.typography,
                  ...(data.updatedDesign?.globalStyles?.typography || {}),
                },
                // When Gemini colors exist, use them as the COMPLETE color set (no spreading old values)
                // This prevents old colors from persisting through spread operations
                colors: geminiColors
                  ? {
                      primary: geminiColors.primary,
                      secondary: geminiColors.secondary,
                      accent: geminiColors.accent,
                      background: geminiColors.background,
                      surface: geminiColors.surface,
                      text: geminiColors.text,
                      textMuted: geminiColors.textMuted,
                      border: geminiColors.border,
                    }
                  : {
                      // Only spread when no Gemini colors
                      ...baseStyles.colors,
                      ...prevDesign.globalStyles?.colors,
                      ...(data.updatedDesign?.globalStyles?.colors || {}),
                    },
                spacing: {
                  ...baseStyles.spacing,
                  ...prevDesign.globalStyles?.spacing,
                  ...(data.updatedDesign?.globalStyles?.spacing || {}),
                },
                effects: {
                  ...baseStyles.effects,
                  ...prevDesign.globalStyles?.effects,
                  ...(data.updatedDesign?.globalStyles?.effects || {}),
                },
              },
              components: {
                ...prevDesign.components,
                ...(data.updatedDesign?.components || {}),
              },
              structure: {
                ...prevDesign.structure,
                ...(data.updatedDesign?.structure || {}),
                // If Gemini detected layout type, apply it to structure.type
                ...(mappedStructureType ? { type: mappedStructureType } : {}),
                // If Gemini detected components from reference image, apply them
                ...(data.geminiAnalysis?.components
                  ? {
                      hasHeader: data.geminiAnalysis.components.some((c) => c.type === 'header'),
                      hasSidebar: data.geminiAnalysis.components.some((c) => c.type === 'sidebar'),
                      hasFooter: data.geminiAnalysis.components.some((c) => c.type === 'footer'),
                      // Only pass components for dynamic layout rendering if they have precise bounds
                      // This happens when analyzePageEnhanced() was used (for reference images)
                      // Components from analyzeScreenshot() don't have bounds and shouldn't be passed
                      ...(data.geminiAnalysis.components[0] &&
                      'bounds' in data.geminiAnalysis.components[0]
                        ? {
                            detectedComponents: data.geminiAnalysis
                              .components as unknown as DetectedComponentEnhanced[],
                          }
                        : {}),
                    }
                  : {}),
              },
            } as Partial<LayoutDesign>;

            // Update history inside the callback to ensure we capture the correct state
            setDesignHistory((history) => {
              const newHistory = history.slice(0, historyIndex + 1);
              newHistory.push(mergedDesign);
              if (newHistory.length > MAX_HISTORY_SIZE) {
                newHistory.shift();
              }
              return newHistory;
            });

            return mergedDesign;
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
   * Clears Gemini cache to ensure fresh color analysis for the new image
   */
  const addReferenceImage = useCallback((imageData: string) => {
    // Clear Gemini cache to prevent stale color data from previous images
    geminiLayoutService.clearCache();
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
  // DESIGN OPTIONS (Click + Talk)
  // ========================================================================

  /**
   * Generate design options based on user request
   */
  const generateOptions = useCallback(
    async (request: string, count: number = 3) => {
      setIsGeneratingOptions(true);
      setDesignOptions([]);

      try {
        const response = await fetch('/api/layout/generate-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request,
            element: selectedElement,
            currentDesign: design,
            count,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate options');
        }

        const data = await response.json();
        if (data.options && Array.isArray(data.options)) {
          setDesignOptions(data.options);
        }
      } catch (error) {
        console.error('[useLayoutBuilder] Failed to generate options:', error);
      } finally {
        setIsGeneratingOptions(false);
      }
    },
    [selectedElement, design]
  );

  /**
   * Apply a design option
   */
  const applyDesignOption = useCallback(
    (option: DesignOption) => {
      if (option.changes) {
        updateDesign(option.changes);
      }
      setDesignOptions([]);
    },
    [updateDesign]
  );

  /**
   * Clear design options
   */
  const clearDesignOptions = useCallback(() => {
    setDesignOptions([]);
  }, []);

  /**
   * Apply extracted styles from a reference image to the design
   * Maps ExtractedStyles to LayoutDesign globalStyles structure
   */
  const applyReferenceStyles = useCallback(
    (styles: ExtractedStyles, options?: { merge?: boolean }) => {
      const shouldMerge = options?.merge ?? true;
      const currentStyles = design.globalStyles ?? defaultLayoutDesign.globalStyles;

      // Map bodySize - ExtractedStyles has 'lg' but LayoutDesign only supports xs/sm/base
      const mapBodySize = (
        size?: 'xs' | 'sm' | 'base' | 'lg'
      ): 'xs' | 'sm' | 'base' | undefined => {
        if (!size) return undefined;
        if (size === 'lg') return 'base'; // Map lg to base since LayoutDesign doesn't support lg
        return size;
      };

      // Map blur values from boolean to EffectsSettings blur type
      const mapBlur = (hasBlur?: boolean): 'none' | 'subtle' | undefined => {
        if (hasBlur === undefined) return undefined;
        return hasBlur ? 'subtle' : 'none';
      };

      // Build the merged globalStyles
      const mergedGlobalStyles = {
        colors: {
          ...(shouldMerge ? currentStyles.colors : defaultLayoutDesign.globalStyles.colors),
          ...(styles.colors?.primary && { primary: styles.colors.primary }),
          ...(styles.colors?.secondary && { secondary: styles.colors.secondary }),
          ...(styles.colors?.accent && { accent: styles.colors.accent }),
          ...(styles.colors?.background && { background: styles.colors.background }),
          ...(styles.colors?.surface && { surface: styles.colors.surface }),
          ...(styles.colors?.text && { text: styles.colors.text }),
        },
        typography: {
          ...(shouldMerge ? currentStyles.typography : defaultLayoutDesign.globalStyles.typography),
          ...(styles.typography?.fontFamily && { fontFamily: styles.typography.fontFamily }),
          ...(styles.typography?.headingWeight && {
            headingWeight: styles.typography.headingWeight,
          }),
          ...(mapBodySize(styles.typography?.bodySize) && {
            bodySize: mapBodySize(styles.typography?.bodySize),
          }),
          ...(styles.typography?.lineHeight && { lineHeight: styles.typography.lineHeight }),
        },
        spacing: {
          ...(shouldMerge ? currentStyles.spacing : defaultLayoutDesign.globalStyles.spacing),
          ...(styles.spacing?.density && { density: styles.spacing.density }),
          ...(styles.spacing?.sectionPadding && { sectionPadding: styles.spacing.sectionPadding }),
          ...(styles.spacing?.componentGap && { componentGap: styles.spacing.componentGap }),
        },
        effects: {
          ...(shouldMerge ? currentStyles.effects : defaultLayoutDesign.globalStyles.effects),
          ...(styles.effects?.shadows && { shadows: styles.effects.shadows }),
          ...(styles.effects?.borderRadius && { borderRadius: styles.effects.borderRadius }),
          ...(styles.effects?.hasGradients !== undefined && {
            gradients: styles.effects.hasGradients,
          }),
          ...(mapBlur(styles.effects?.hasBlur) && { blur: mapBlur(styles.effects?.hasBlur) }),
          ...(styles.effects?.backgroundEffect && {
            backgroundEffect: {
              type: styles.effects.backgroundEffect.type,
              enabled: styles.effects.backgroundEffect.type !== 'none',
              intensity: styles.effects.backgroundEffect.intensity || 'medium',
              colors: styles.effects.backgroundEffect.colors,
            },
          }),
        },
      };

      updateDesign({ globalStyles: mergedGlobalStyles });
    },
    [design, updateDesign]
  );

  // ========================================================================
  // MULTI-PAGE ACTIONS
  // ========================================================================

  /**
   * Add a single page reference
   */
  const addPageReference = useCallback(
    (imageData: string, name?: string) => {
      const pageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const pageName = name || `Page ${pageReferences.length + 1}`;
      const slug = pageName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const newPage: PageReference = {
        id: pageId,
        name: pageName,
        slug,
        referenceImage: imageData,
        order: pageReferences.length,
        isMain: pageReferences.length === 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setPageReferences((prev) => [...prev, newPage]);
      setIsMultiPageMode(true);

      // Set as current page if it's the first one
      if (pageReferences.length === 0) {
        setCurrentPageId(pageId);
      }

      return pageId;
    },
    [pageReferences.length]
  );

  /**
   * Add multiple page references at once
   */
  const addPageReferences = useCallback(
    (pages: Omit<PageReference, 'analysis'>[]) => {
      const newPages = pages.map((page, index) => ({
        ...page,
        order: pageReferences.length + index,
        isMain: pageReferences.length === 0 && index === 0,
      }));

      setPageReferences((prev) => [...prev, ...newPages]);
      setIsMultiPageMode(true);

      // Set first page as current if none selected
      if (!currentPageId && newPages.length > 0) {
        setCurrentPageId(newPages[0].id);
      }
    },
    [pageReferences.length, currentPageId]
  );

  /**
   * Remove a page reference
   */
  const removePageReference = useCallback(
    (pageId: string) => {
      setPageReferences((prev) => {
        const filtered = prev.filter((p) => p.id !== pageId);
        // Reorder remaining pages
        return filtered.map((p, i) => ({ ...p, order: i }));
      });

      // Update current page if removed
      if (currentPageId === pageId) {
        setCurrentPageId((prev) => {
          const remaining = pageReferences.filter((p) => p.id !== pageId);
          return remaining.length > 0 ? remaining[0].id : null;
        });
      }

      // Exit multi-page mode if no pages left
      if (pageReferences.length <= 1) {
        setIsMultiPageMode(false);
        setMultiPageDesign(null);
      }
    },
    [currentPageId, pageReferences]
  );

  /**
   * Reorder pages
   */
  const reorderPages = useCallback((sourceIndex: number, destIndex: number) => {
    setPageReferences((prev) => {
      const newPages = [...prev];
      const [moved] = newPages.splice(sourceIndex, 1);
      newPages.splice(destIndex, 0, moved);
      // Update order property
      return newPages.map((p, i) => ({ ...p, order: i }));
    });
  }, []);

  /**
   * Update a page's name
   */
  const updatePageName = useCallback((pageId: string, name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setPageReferences((prev) => prev.map((p) => (p.id === pageId ? { ...p, name, slug } : p)));
  }, []);

  /**
   * Set the current active page
   */
  const setCurrentPage = useCallback((pageId: string) => {
    setCurrentPageId(pageId);
  }, []);

  /**
   * Analyze all pending pages
   */
  const analyzeAllPages = useCallback(async () => {
    const pendingPages = pageReferences.filter((p) => p.status === 'pending');
    if (pendingPages.length === 0) return;

    setIsAnalyzingPages(true);

    // Mark pages as analyzing
    setPageReferences((prev) =>
      prev.map((p) => (p.status === 'pending' ? { ...p, status: 'analyzing' as const } : p))
    );

    try {
      const response = await fetch('/api/layout/analyze-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: pendingPages.map((p) => ({
            id: p.id,
            imageBase64: p.referenceImage,
            name: p.name,
          })),
          existingDesign: multiPageDesign,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result: MultiPageAnalysisResult & { success: boolean } = await response.json();

      if (result.success) {
        // Update page references with analysis results
        setPageReferences((prev) =>
          prev.map((p) => {
            const analyzed = result.pages.find((rp) => rp.id === p.id);
            if (analyzed) {
              return {
                ...p,
                analysis: analyzed.analysis,
                status: 'complete' as const,
              };
            }
            return p;
          })
        );

        // Create/update MultiPageDesign
        const now = new Date().toISOString();
        const newMultiPageDesign: MultiPageDesign = {
          pages: pageReferences.map((p) => {
            const analyzed = result.pages.find((rp) => rp.id === p.id);
            return analyzed || p;
          }),
          sharedDesign: result.sharedDesign,
          navigation: result.navigation,
          pageSpecificOverrides: {},
          inferredRoutes: result.inferredRoutes,
          createdAt: multiPageDesign?.createdAt || now,
          updatedAt: now,
        };
        setMultiPageDesign(newMultiPageDesign);

        // Apply shared design to current design
        if (result.sharedDesign) {
          updateDesign(result.sharedDesign);
        }
      }
    } catch (error) {
      console.error('[useLayoutBuilder] Failed to analyze pages:', error);

      // Mark pages as error
      setPageReferences((prev) =>
        prev.map((p) =>
          p.status === 'analyzing'
            ? {
                ...p,
                status: 'error' as const,
                errorMessage: error instanceof Error ? error.message : 'Analysis failed',
              }
            : p
        )
      );
    } finally {
      setIsAnalyzingPages(false);
    }
  }, [pageReferences, multiPageDesign, updateDesign]);

  /**
   * Detect pages from video file using frame analysis
   */
  const addPagesFromVideo = useCallback(
    async (videoFile: File) => {
      setIsAnalyzingPages(true);

      try {
        // Extract frames from video
        const frames = await extractVideoFrames(videoFile);

        // Send to video-pages API for transition detection
        const response = await fetch('/api/layout/video-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frames,
            metadata: {
              duration: frames.length > 0 ? frames[frames.length - 1].timestamp : 0,
              width: 1920, // Will be updated from actual video
              height: 1080,
              fps: 30,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Video analysis failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.pageFrames) {
          // Add detected pages
          const newPages: PageReference[] = result.pageFrames.map(
            (frame: Partial<PageReference>, index: number) => ({
              id: frame.id || `page_${Date.now()}_${index}`,
              name: frame.name || result.suggestedNames?.[index] || `Page ${index + 1}`,
              slug:
                frame.slug ||
                (result.suggestedNames?.[index] || `page-${index + 1}`)
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-'),
              referenceImage: frame.referenceImage || '',
              order: pageReferences.length + index,
              isMain: pageReferences.length === 0 && index === 0,
              status: 'analyzing' as const, // Start as analyzing since we'll analyze immediately
              createdAt: new Date().toISOString(),
            })
          );

          setPageReferences((prev) => [...prev, ...newPages]);
          setIsMultiPageMode(true);

          if (!currentPageId && newPages.length > 0) {
            setCurrentPageId(newPages[0].id);
          }

          // Immediately analyze the detected pages for layout structure
          // This ensures video pages get the same component detection as image uploads
          const analyzeResponse = await fetch('/api/layout/analyze-pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pages: newPages.map((p) => ({
                id: p.id,
                imageBase64: p.referenceImage,
                name: p.name,
              })),
              existingDesign: multiPageDesign,
            }),
          });

          if (analyzeResponse.ok) {
            const analyzeResult: MultiPageAnalysisResult & { success: boolean } =
              await analyzeResponse.json();

            if (analyzeResult.success) {
              // Update page references with analysis results
              setPageReferences((prev) =>
                prev.map((p) => {
                  const analyzed = analyzeResult.pages.find((rp) => rp.id === p.id);
                  if (analyzed) {
                    return {
                      ...p,
                      analysis: analyzed.analysis,
                      status: 'complete' as const,
                    };
                  }
                  return p;
                })
              );

              // Create/update MultiPageDesign with analysis results
              const now = new Date().toISOString();
              setMultiPageDesign((prev) => ({
                pages: [...(prev?.pages || []), ...analyzeResult.pages],
                sharedDesign: analyzeResult.sharedDesign,
                navigation: analyzeResult.navigation,
                pageSpecificOverrides: prev?.pageSpecificOverrides || {},
                inferredRoutes: analyzeResult.inferredRoutes,
                createdAt: prev?.createdAt || now,
                updatedAt: now,
              }));

              // Apply shared design and structure with detected components
              if (analyzeResult.sharedDesign) {
                updateDesign(analyzeResult.sharedDesign);
              }

              // Also update design.structure.detectedComponents from the first page
              // This ensures DynamicLayoutRenderer can render the layout
              const firstPageAnalysis = analyzeResult.pages[0]?.analysis;
              if (firstPageAnalysis?.components) {
                setDesign((prev) => ({
                  ...prev,
                  structure: {
                    ...prev.structure,
                    type: prev.structure?.type || 'single-page',
                    sidebarPosition: prev.structure?.sidebarPosition || 'left',
                    headerType: prev.structure?.headerType || 'sticky',
                    contentLayout: prev.structure?.contentLayout || 'centered',
                    mainContentWidth: prev.structure?.mainContentWidth || 'standard',
                    hasHeader: firstPageAnalysis.components.some((c) => c.type === 'header'),
                    hasSidebar: firstPageAnalysis.components.some((c) => c.type === 'sidebar'),
                    hasFooter: firstPageAnalysis.components.some((c) => c.type === 'footer'),
                    detectedComponents: firstPageAnalysis.components,
                  },
                }));
              }
            }
          }
        }
      } catch (error) {
        console.error('[useLayoutBuilder] Failed to extract pages from video:', error);
        // Mark any analyzing pages as error
        setPageReferences((prev) =>
          prev.map((p) =>
            p.status === 'analyzing'
              ? {
                  ...p,
                  status: 'error' as const,
                  errorMessage: error instanceof Error ? error.message : 'Analysis failed',
                }
              : p
          )
        );
      } finally {
        setIsAnalyzingPages(false);
      }
    },
    [pageReferences.length, currentPageId, multiPageDesign, updateDesign]
  );

  /**
   * Update navigation structure
   */
  const updateNavigation = useCallback((navigation: DetectedNavigation) => {
    setMultiPageDesign((prev) => {
      if (!prev) return prev;
      return { ...prev, navigation };
    });
  }, []);

  /**
   * Export React Router configuration
   */
  const exportReactRouterConfig = useCallback(() => {
    if (!multiPageDesign) return '';

    const { pages, navigation, inferredRoutes } = multiPageDesign;
    const lines: string[] = [
      '// Generated React Router Configuration',
      "import { createBrowserRouter } from 'react-router-dom';",
      "import { Link } from 'react-router-dom';",
      '',
    ];

    // Generate route imports
    pages.forEach((page) => {
      const componentName = page.name.replace(/[^a-zA-Z0-9]/g, '') + 'Page';
      lines.push(`import { ${componentName} } from './pages/${page.slug}';`);
    });

    lines.push('');
    lines.push('export const router = createBrowserRouter([');

    // Generate routes
    inferredRoutes.forEach((route) => {
      const page = pages.find((p) => p.id === route.pageId);
      if (page) {
        const componentName = page.name.replace(/[^a-zA-Z0-9]/g, '') + 'Page';
        lines.push(`  {`);
        lines.push(`    path: '${route.path}',`);
        lines.push(`    element: <${componentName} />,`);
        if (page.isMain) {
          lines.push(`    index: true,`);
        }
        lines.push(`  },`);
      }
    });

    lines.push(']);');
    lines.push('');

    // Generate Navigation component
    if (navigation && navigation.items.length > 0) {
      lines.push('export function Navigation() {');
      lines.push('  return (');
      lines.push(`    <nav className="navigation navigation--${navigation.style}">`);

      navigation.items.forEach((item) => {
        if (item.targetPageSlug) {
          const route = inferredRoutes.find((r) => {
            const p = pages.find((pg) => pg.id === r.pageId);
            return p?.slug === item.targetPageSlug;
          });
          lines.push(
            `      <Link to="${route?.path || '/' + item.targetPageSlug}">${item.label}</Link>`
          );
        } else {
          lines.push(`      <span>${item.label}</span>`);
        }
      });

      lines.push('    </nav>');
      lines.push('  );');
      lines.push('}');
    }

    const configString = lines.join('\n');

    // Copy to clipboard
    navigator.clipboard.writeText(configString);

    return configString;
  }, [multiPageDesign]);

  /**
   * Toggle multi-page mode
   */
  const toggleMultiPageMode = useCallback((enabled: boolean) => {
    setIsMultiPageMode(enabled);
    if (!enabled) {
      // Clear multi-page state when disabling
      setPageReferences([]);
      setCurrentPageId(null);
      setMultiPageDesign(null);
    }
  }, []);

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
    selectedElementId: selectedElement?.id ?? null,
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

    // Design Options (Click + Talk)
    generateOptions,
    designOptions,
    isGeneratingOptions,
    applyDesignOption,
    clearDesignOptions,

    // Responsive Design
    currentDevice,
    setCurrentDevice,

    // Reference-Based Design
    applyReferenceStyles,

    // Multi-Page State
    pageReferences,
    currentPageId,
    multiPageDesign,
    isMultiPageMode,
    isAnalyzingPages,

    // Multi-Page Actions
    addPageReference,
    addPageReferences,
    removePageReference,
    reorderPages,
    updatePageName,
    setCurrentPage,
    analyzeAllPages,
    addPagesFromVideo,
    updateNavigation,
    exportReactRouterConfig,
    toggleMultiPageMode,

    // Computed
    hasUnsavedChanges,
  };
}

export default useLayoutBuilder;
