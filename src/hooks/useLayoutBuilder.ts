/**
 * useLayoutBuilder Hook
 *
 * Manages layout builder state, API calls, and actions.
 * Provides a complete interface for the LayoutBuilderWizard component.
 */

import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { captureLayoutPreview, containsVisualKeywords } from '@/utils/screenshotCapture';
import { LAYOUT_BUILDER_GREETING } from '@/prompts/layoutBuilderSystemPrompt';
import { defaultLayoutDesign } from '@/types/layoutDesign';
import type {
  LayoutDesign,
  LayoutMessage,
  LayoutChatRequest,
  LayoutChatResponse,
  SuggestedAction,
  DesignChange,
} from '@/types/layoutDesign';
import type { UIPreferences, AppConcept } from '@/types/appConcept';

// ============================================================================
// TYPES
// ============================================================================

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

  // Computed
  hasUnsavedChanges: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useLayoutBuilder(): UseLayoutBuilderReturn {
  // Store state
  const {
    currentLayoutDesign,
    setCurrentLayoutDesign,
    addSavedLayoutDesign,
    appConcept,
    setAppConcept,
  } = useAppStore();

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
  const [recentChanges, setRecentChanges] = useState<DesignChange[]>([]);
  const [initialDesign] = useState(design);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

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
        const request: LayoutChatRequest = {
          message: text,
          conversationHistory: messages,
          currentDesign: design,
          selectedElement: selectedElement || undefined,
          previewScreenshot: screenshot || undefined,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        };

        const response = await fetch('/api/layout/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: LayoutChatResponse = await response.json();

        // Add assistant message
        const assistantMessage: LayoutMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update design with any changes
        if (data.updatedDesign && Object.keys(data.updatedDesign).length > 0) {
          setDesign((prev) => ({
            ...prev,
            ...data.updatedDesign,
          }));
        }

        // Update suggested actions
        if (data.suggestedActions) {
          setSuggestedActions(data.suggestedActions);
        }

        // Track recent changes
        if (data.designChanges && data.designChanges.length > 0) {
          setRecentChanges(data.designChanges);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled
        }

        console.error('Layout chat error:', error);

        // Add error message
        const errorMessage: LayoutMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, design, selectedElement, referenceImages, lastCapture, capturePreview]
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
   * Update design directly
   */
  const updateDesign = useCallback((updates: Partial<LayoutDesign>) => {
    setDesign((prev) => ({
      ...prev,
      ...updates,
    }));
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

      return savedDesign;
    },
    [
      design,
      referenceImages,
      messages.length,
      recentChanges,
      setCurrentLayoutDesign,
      addSavedLayoutDesign,
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
  // COMPUTED
  // ========================================================================

  const hasUnsavedChanges = JSON.stringify(design) !== JSON.stringify(initialDesign);

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

    // Computed
    hasUnsavedChanges,
  };
}

export default useLayoutBuilder;
