'use client';

/**
 * LayoutBuilderWizard Component
 *
 * A modal-based layout builder with conversational AI that can "see" the layout
 * through screenshots and provide visual design feedback.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLayoutBuilder } from '@/hooks/useLayoutBuilder';
import { useToast } from '@/hooks/useToast';
import { useAnalysisProgress } from '@/hooks/useAnalysisProgress';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { LayoutPreview } from '@/components/LayoutPreview';
import { AnalysisProgressIndicator } from '@/components/AnalysisProgressIndicator';
import { DesignComparison } from '@/components/DesignComparison';
import { ToastContainer } from '@/components/ui/Toast';
import { CodePreviewPanel } from '@/components/CodePreviewPanel';
import { KeyboardShortcutsPanel } from '@/components/KeyboardShortcutsPanel';
import type {
  EffectsSettings,
  ColorSettings,
  LayoutDesign,
  CompleteDesignAnalysis,
  DetectedAnimation,
  TypographySettings,
  SpacingSettings,
} from '@/types/layoutDesign';
import { defaultGlobalStyles } from '@/types/layoutDesign';
import type { UIPreferences } from '@/types/appConcept';
import {
  mapArchitectureToLayout,
  generateArchitecturePrompt,
} from '@/data/architectureTemplateMapping';
import { VersionHistoryPanel } from '@/components/VersionHistoryPanel';
import { ComponentLibraryPanel } from '@/components/ComponentLibraryPanel';
import { ArchitectureTemplatePicker } from '@/components/ArchitectureTemplatePicker';
import type { ComponentPattern } from '@/data/componentPatterns';
import type { FullTemplate } from '@/types/architectureTemplates';
import { extractColorsFromImage, type ExtractionResult } from '@/utils/colorExtraction';
import {
  exportToCSSVariables,
  exportToTailwindConfig,
  exportToFigmaTokens,
  exportToReactComponent,
  exportToShadcnTheme,
  downloadExport,
  copyToClipboard,
} from '@/utils/layoutExport';
import { importDesignTokens, mergeDesigns } from '@/utils/layoutImport';
import { generateDesignDocs, downloadDocs } from '@/utils/designSystemDocs';
import { exportSpecSheet, downloadSpecSheet } from '@/utils/specSheetExport';
import {
  validateVideoFile,
  processVideo,
  createVideoThumbnail,
  VIDEO_CONFIG,
} from '@/utils/videoProcessor';
import { AnimationTimeline } from '@/components/AnimationTimeline';
import { BreakpointEditor } from '@/components/BreakpointEditor';
import {
  ResponsivePropertyEditor,
  type ResponsiveProperties,
} from '@/components/ResponsivePropertyEditor';
import { DarkModeEditor } from '@/components/DarkModeEditor';
import { LayerPanel } from '@/components/LayerPanel';
import { PerformanceReport } from '@/components/PerformanceReport';
import { DEFAULT_LAYERS, type LayerDefinition } from '@/utils/layerUtils';
import { DEFAULT_BREAKPOINTS } from '@/hooks/useResponsivePreview';
import type { CustomAnimation } from '@/utils/keyframeUtils';
import type { PerformanceReport as PerformanceReportType } from '@/types/aiBuilderTypes';
import {
  ExtractedColorsPanel,
  ConfirmDialog,
  DraftRecoveryBanner,
  MessageBubble,
  SuggestedActionsBar,
  ChatInput,
  TemplatesMenu,
  ToolsMenu,
  DesignSidePanel,
  MediaUploadZone,
} from '@/components/layout-builder';
import { MultiPageUploadZone } from '@/components/layout-builder/MultiPageUploadZone';
import { PageNavigator } from '@/components/layout-builder/PageNavigator';
import { NavigationStructurePanel } from '@/components/layout-builder/NavigationStructurePanel';
import { mapStructureTypeToLayout } from '@/utils/layoutTypeMapping';
// GeminiAnalysisPanel import removed - now embedded in MessageBubble component
import { useLayoutPanelStore } from '@/stores/useLayoutPanelStore';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Number of messages to show initially and load incrementally */
const MESSAGES_PAGE_SIZE = 20;

/** Maximum messages to render at once for performance */
const MAX_RENDERED_MESSAGES = 100;

/** Maximum dimensions for reference images (higher for better AI vision accuracy) */
const MAX_IMAGE_DIMENSION = 1600;

/** JPEG quality for non-PNG images (0-1) - only used when input is not PNG */
const JPEG_QUALITY = 0.95;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Process an image file for AI vision analysis
 * Preserves PNG format for color accuracy, resizes if needed
 * @param file - The image file to process
 * @param maxDimension - Maximum width/height
 * @returns Promise with processed base64 data URL and size info
 */
async function compressImage(
  file: File,
  maxDimension: number = MAX_IMAGE_DIMENSION
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Determine if input is PNG (preserve lossless format for color accuracy)
    const isPng = file.type === 'image/png';

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      // Set canvas size and draw image
      canvas.width = width;
      canvas.height = height;

      // Only fill white background for JPEG (which doesn't support transparency)
      // PNG keeps transparency for accurate color representation
      if (!isPng) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Preserve PNG format for lossless color accuracy
      // Use high-quality JPEG only for non-PNG inputs
      const dataUrl = isPng
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', JPEG_QUALITY);

      // Calculate approximate compressed size (base64 is ~33% larger than binary)
      const compressedSize = Math.round((dataUrl.length * 3) / 4);

      resolve({
        dataUrl,
        originalSize: file.size,
        compressedSize,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================================
// TYPES
// ============================================================================

interface LayoutBuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToAppConcept?: () => void;
  isFullPage?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map LayoutStructure.type to valid UIPreferences.layout types
 * This is now imported from centralized utility - keeping alias for backwards compatibility
 */
const getLayoutFromStructure = mapStructureTypeToLayout;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LayoutBuilderWizard({
  isOpen,
  onClose,
  onApplyToAppConcept,
  isFullPage = true,
}: LayoutBuilderWizardProps) {
  // State for generated backgrounds (from DALL-E) - declared early for handler reference
  const [generatedBackgrounds, setGeneratedBackgrounds] = useState<
    Array<{ url: string; targetElement: string; prompt: string }>
  >([]);

  // Animation detection data - declared early for handler reference
  const [detectedAnimations, setDetectedAnimations] = useState<DetectedAnimation[]>([]);

  // Toast notifications - declared early for handler reference
  const { toasts, success, error, info, dismiss } = useToast();

  // Handlers for tool outputs from AI chat
  const handleAnimationsReceived = useCallback((animations: DetectedAnimation[]) => {
    setDetectedAnimations((prev) => {
      // Merge new animations, avoiding duplicates by ID
      const existingIds = new Set(prev.map((a) => a.id));
      const newAnimations = animations.filter((a) => !existingIds.has(a.id));
      return [...prev, ...newAnimations];
    });
  }, []);

  const handleBackgroundsGenerated = useCallback(
    (backgrounds: Array<{ url: string; targetElement: string; prompt: string }>) => {
      setGeneratedBackgrounds((prev) => [...prev, ...backgrounds]);
      // Show a success toast for each background
      backgrounds.forEach((bg) => {
        success(`Background generated for ${bg.targetElement}`);
      });
    },
    [success]
  );

  const handleToolsUsed = useCallback(
    (toolNames: string[]) => {
      // Log tools used for debugging/analytics
      if (toolNames.includes('generate_background')) {
        info('Generating background image...');
      }
      if (toolNames.includes('apply_animation')) {
        info('Applying animation...');
      }
    },
    [info]
  );

  const {
    messages,
    design,
    isLoading,
    selectedElement,
    selectedElementId,
    referenceImages,
    suggestedActions,
    recentChanges,
    hasDraftToRecover,
    canUndo,
    canRedo,
    versionHistory,
    currentVersionId,
    // Dual-model state
    geminiAnalysis,
    lastModelUsed,
    modelRouting,
    sendMessage,
    setSelectedElement,
    addReferenceImage,
    removeReferenceImage,
    capturePreview,
    updateDesign,
    saveDesign,
    applyToAppConcept,
    recoverDraft,
    discardDraft,
    undo,
    redo,
    retryMessage,
    exportDesign,
    importDesign,
    restoreVersion,
    deleteVersion,
    hasUnsavedChanges,
    // Multi-page state and actions
    pageReferences,
    currentPageId,
    multiPageDesign,
    isMultiPageMode,
    isAnalyzingPages,
    addPageReferences,
    removePageReference,
    reorderPages,
    updatePageName,
    setCurrentPage,
    analyzeAllPages,
    updateNavigation,
    exportReactRouterConfig,
    toggleMultiPageMode,
  } = useLayoutBuilder({
    onAnimationsReceived: handleAnimationsReceived,
    onBackgroundsGenerated: handleBackgroundsGenerated,
    onToolsUsed: handleToolsUsed,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Panel visibility state (from Zustand store)
  const {
    showCloseConfirm,
    showApplyConfirm,
    showExtractedColors,
    showVersionHistory,
    showComparisonView,
    showGridOverlay,
    showKeyboardShortcuts,
    showCodePreview,
    showComponentLibrary,
    showArchitectureTemplates,
    showAnimationTimeline,
    showBreakpointEditor,
    showDarkModeEditor,
    showLayerPanel,
    showPerformanceReport,
    isAdvancedMode,
    setPanel,
    toggleAdvancedMode,
  } = useLayoutPanelStore();

  // Convenience setters using store actions
  const setShowCloseConfirm = (v: boolean) => setPanel('closeConfirm', v);
  const setShowApplyConfirm = (v: boolean) => setPanel('applyConfirm', v);
  const setShowExtractedColors = (v: boolean) => setPanel('extractedColors', v);
  const setShowVersionHistory = (v: boolean) => setPanel('versionHistory', v);
  const setShowExportMenu = (v: boolean) => setPanel('exportMenu', v);
  const setShowComparisonView = (v: boolean) => setPanel('comparisonView', v);
  const setShowAnimationPanel = (v: boolean) => setPanel('animationPanel', v);
  // useCallback for setters passed as props to child components
  const setShowGridOverlay = useCallback((v: boolean) => setPanel('gridOverlay', v), [setPanel]);
  const setShowKeyboardShortcuts = (v: boolean) => setPanel('keyboardShortcuts', v);
  const setShowCodePreview = (v: boolean) => setPanel('codePreview', v);
  const setShowComponentLibrary = (v: boolean) => setPanel('componentLibrary', v);
  const setShowArchitectureTemplates = (v: boolean) => setPanel('architectureTemplates', v);
  const setShowAnimationTimeline = (v: boolean) => setPanel('animationTimeline', v);
  const setShowBreakpointEditor = (v: boolean) => setPanel('breakpointEditor', v);
  const setShowDarkModeEditor = (v: boolean) => setPanel('darkModeEditor', v);
  const setShowLayerPanel = (v: boolean) => setPanel('layerPanel', v);
  const setShowPerformanceReport = (v: boolean) => setPanel('performanceReport', v);

  // Loading states for async operations
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Extracted colors from reference image
  const [extractedColors, setExtractedColors] = useState<ExtractionResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Pixel-perfect mode state
  const [analysisMode, setAnalysisMode] = useState<'standard' | 'pixel-perfect'>('standard');
  const [pixelPerfectAnalysis, _setPixelPerfectAnalysis] = useState<CompleteDesignAnalysis | null>(
    null
  );

  // Video upload state (values stored for future video preview feature)
  const [_uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [_videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  // Reference media panel state
  const [showReferenceMediaPanel, _setShowReferenceMediaPanel] = useState(true);
  const [showDesignSidePanel, setShowDesignSidePanel] = useState(isAdvancedMode);
  // Note: showGeminiAnalysis state removed - Creative Director Analysis is now embedded in chat via MessageBubble

  // Navigation structure panel state (multi-page mode)
  const [showNavigationPanel, setShowNavigationPanel] = useState(false);

  // Data states for advanced features
  const [customAnimation, setCustomAnimation] = useState<CustomAnimation | null>(null);
  const [layers, setLayers] = useState<LayerDefinition[]>(DEFAULT_LAYERS);
  const [darkColors, setDarkColors] = useState<Partial<ColorSettings> | null>(null);
  const [responsiveProperties, setResponsiveProperties] = useState<ResponsiveProperties>({});
  const [performanceReport, _setPerformanceReport] = useState<PerformanceReportType | null>(null);
  const [breakpoints, setBreakpoints] = useState(DEFAULT_BREAKPOINTS);
  const [previewWidth, setPreviewWidth] = useState(1280);
  const [currentBreakpoint, _setCurrentBreakpoint] = useState('lg');

  // Analysis progress hook
  const analysisProgress = useAnalysisProgress();

  // Video file input ref
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Message windowing state for virtualization
  const [visibleMessageCount, setVisibleMessageCount] = useState(MESSAGES_PAGE_SIZE);

  // Calculate visible messages with windowing
  const { visibleMessages, hasMoreMessages, totalMessages } = useMemo(() => {
    const total = messages.length;
    const startIndex = Math.max(0, total - Math.min(visibleMessageCount, MAX_RENDERED_MESSAGES));
    const visible = messages.slice(startIndex);
    return {
      visibleMessages: visible,
      hasMoreMessages: startIndex > 0,
      totalMessages: total,
    };
  }, [messages, visibleMessageCount]);

  // Load more messages handler
  const loadMoreMessages = useCallback(() => {
    setVisibleMessageCount((prev) => Math.min(prev + MESSAGES_PAGE_SIZE, MAX_RENDERED_MESSAGES));
  }, []);

  // Reset visible count when messages significantly change (e.g., clear)
  useEffect(() => {
    if (messages.length <= MESSAGES_PAGE_SIZE) {
      setVisibleMessageCount(MESSAGES_PAGE_SIZE);
    }
  }, [messages.length]);

  // Sync DesignSidePanel visibility with advanced mode
  useEffect(() => {
    setShowDesignSidePanel(isAdvancedMode);
  }, [isAdvancedMode]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 300));
      saveDesign();
      success('Design saved!');
    } catch {
      error('Failed to save design');
    } finally {
      setIsSaving(false);
    }
  }, [saveDesign, success, error]);

  // Handle save and close
  const handleSaveAndClose = useCallback(async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      saveDesign();
      success('Design saved successfully!');
      setShowCloseConfirm(false);
      onClose();
    } catch {
      error('Failed to save design');
    } finally {
      setIsSaving(false);
    }
  }, [saveDesign, onClose, success, error]);

  // Handle discard and close
  const handleDiscardAndClose = useCallback(() => {
    setShowCloseConfirm(false);
    onClose();
  }, [onClose]);

  // Handle apply with confirmation
  const handleApplyClick = useCallback(() => {
    setShowApplyConfirm(true);
  }, []);

  // Confirm apply to app concept
  const handleConfirmApply = useCallback(async () => {
    setIsApplying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      applyToAppConcept();
      setShowApplyConfirm(false);
      success('Design applied to app concept!');
      onApplyToAppConcept?.();
    } catch {
      error('Failed to apply design');
    } finally {
      setIsApplying(false);
    }
  }, [applyToAppConcept, onApplyToAppConcept, success, error]);

  // Handle capture preview
  const handleCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      const result = await capturePreview();
      if (result) {
        success('Preview captured!');
      } else {
        error('Failed to capture preview');
      }
    } catch {
      error('Failed to capture preview');
    } finally {
      setIsCapturing(false);
    }
  }, [capturePreview, success, error]);

  // Comprehensive keyboard shortcuts using the hook
  // Handles all shortcuts documented in KeyboardShortcutsPanel
  const handleEscape = useCallback(() => {
    if (showKeyboardShortcuts) {
      setShowKeyboardShortcuts(false);
    } else if (showCodePreview) {
      setShowCodePreview(false);
    } else if (showGridOverlay) {
      setShowGridOverlay(false);
    } else if (showVersionHistory) {
      setShowVersionHistory(false);
    } else if (showComponentLibrary) {
      setPanel('componentLibrary', false);
    } else if (showArchitectureTemplates) {
      setPanel('architectureTemplates', false);
    }
  }, [
    showKeyboardShortcuts,
    showCodePreview,
    showGridOverlay,
    showVersionHistory,
    showComponentLibrary,
    showArchitectureTemplates,
    setShowKeyboardShortcuts,
    setShowCodePreview,
    setShowGridOverlay,
    setShowVersionHistory,
    setPanel,
  ]);

  useKeyboardShortcuts({
    // General shortcuts
    onUndo: undo,
    onRedo: redo,
    onSave: saveDesign,
    onExport: () => setShowExportMenu(true),
    onShowShortcuts: () => setShowKeyboardShortcuts(!showKeyboardShortcuts),
    onEscape: handleEscape,

    // View shortcuts - breakpoints
    onMobileView: () => setPreviewWidth(breakpoints.sm), // 640px
    onTabletView: () => setPreviewWidth(breakpoints.md), // 768px
    onDesktopView: () => setPreviewWidth(breakpoints.lg), // 1024px
    onLargeDesktopView: () => setPreviewWidth(breakpoints.xl), // 1280px
    onExtraLargeView: () => setPreviewWidth(breakpoints['2xl']), // 1536px
    onCustomBreakpoint: () => setShowBreakpointEditor(true),

    // View shortcuts - toggles
    onToggleGrid: () => setShowGridOverlay(!showGridOverlay),
    onCodePreview: () => setShowCodePreview(!showCodePreview),

    // Only enabled when layout builder is open
    enabled: isOpen,
    context: 'layout',
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build UIPreferences from design for LayoutPreview
  // Uses helper function to map structure.type to valid UIPreferences.layout
  const previewPreferences: UIPreferences = {
    style: design.basePreferences?.style || 'modern',
    colorScheme: design.basePreferences?.colorScheme || 'dark',
    layout: design.basePreferences?.layout || getLayoutFromStructure(design.structure?.type),
    primaryColor: design.globalStyles?.colors?.primary || '#3B82F6',
  };

  // DEBUG: Log design changes to verify Gemini analysis is being applied
  useEffect(() => {
    console.log('[LayoutBuilderWizard] Design updated:', {
      colors: design.globalStyles?.colors,
      structure: design.structure,
      layout: previewPreferences.layout,
      colorScheme: previewPreferences.colorScheme,
    });
  }, [
    design.globalStyles?.colors,
    design.structure,
    previewPreferences.layout,
    previewPreferences.colorScheme,
  ]);

  // Handle suggested action clicks
  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'capture_preview':
          capturePreview();
          break;
        case 'upload_reference':
          fileInputRef.current?.click();
          break;
        case 'toggle_theme':
          updateDesign({
            basePreferences: {
              ...design.basePreferences,
              colorScheme: design.basePreferences?.colorScheme === 'dark' ? 'light' : 'dark',
            } as typeof design.basePreferences,
          });
          break;
        case 'save_design':
          saveDesign();
          break;
        case 'apply_to_concept':
          applyToAppConcept();
          onApplyToAppConcept?.();
          break;
      }
    },
    [capturePreview, updateDesign, design, saveDesign, applyToAppConcept, onApplyToAppConcept]
  );

  // Handle element selection from LayoutPreview (receives string ID, creates minimal SelectedElementInfo)
  const handleElementSelect = useCallback(
    (elementId: string | null) => {
      if (elementId === null) {
        setSelectedElement(null);
      } else {
        // Create minimal SelectedElementInfo from just the ID
        // Full info will be populated when Click + Talk overlay is used
        setSelectedElement({
          id: elementId,
          type: 'custom',
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          currentProperties: {},
          allowedActions: [],
          displayName: elementId,
        });
      }
    },
    [setSelectedElement]
  );

  // Handle effects settings change from DesignControlPanel
  const handleEffectsChange = useCallback(
    (effects: Partial<EffectsSettings>) => {
      const currentStyles = design.globalStyles ?? defaultGlobalStyles;
      updateDesign({
        globalStyles: {
          ...currentStyles,
          effects: {
            ...currentStyles.effects,
            ...effects,
          } as EffectsSettings,
        },
      });
    },
    [updateDesign, design.globalStyles]
  );

  // Handle color settings change from DesignControlPanel
  const handleColorSettingsChange = useCallback(
    (colors: Partial<ColorSettings>) => {
      const currentStyles = design.globalStyles ?? defaultGlobalStyles;
      updateDesign({
        globalStyles: {
          ...currentStyles,
          colors: {
            ...currentStyles.colors,
            ...colors,
          } as ColorSettings,
        },
      });
    },
    [updateDesign, design.globalStyles]
  );

  // Handle primary color change from DesignControlPanel
  const handlePrimaryColorChange = useCallback(
    (color: string) => {
      const currentStyles = design.globalStyles ?? defaultGlobalStyles;
      updateDesign({
        globalStyles: {
          ...currentStyles,
          colors: {
            ...currentStyles.colors,
            primary: color,
          } as ColorSettings,
        },
      });
    },
    [updateDesign, design.globalStyles]
  );

  // Handle typography settings change from DesignControlPanel
  const handleTypographyChange = useCallback(
    (typography: Partial<TypographySettings>) => {
      const currentStyles = design.globalStyles ?? defaultGlobalStyles;
      updateDesign({
        globalStyles: {
          ...currentStyles,
          typography: {
            ...currentStyles.typography,
            ...typography,
          } as TypographySettings,
        },
      });
    },
    [updateDesign, design.globalStyles]
  );

  // Handle spacing settings change from DesignControlPanel
  const handleSpacingChange = useCallback(
    (spacing: Partial<SpacingSettings>) => {
      const currentStyles = design.globalStyles ?? defaultGlobalStyles;
      updateDesign({
        globalStyles: {
          ...currentStyles,
          spacing: {
            ...currentStyles.spacing,
            ...spacing,
          } as SpacingSettings,
        },
      });
    },
    [updateDesign, design.globalStyles]
  );

  // Handle accessibility auto-fix
  const handleAccessibilityFix = useCallback(
    (fixes: Partial<ColorSettings>) => {
      const currentStyles = design.globalStyles ?? defaultGlobalStyles;
      updateDesign({
        globalStyles: {
          ...currentStyles,
          colors: {
            ...currentStyles.colors,
            ...fixes,
          } as ColorSettings,
        },
      });
      success('Accessibility fixes applied');
    },
    [updateDesign, design.globalStyles, success]
  );

  // Handle reference image upload with compression
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        error('Please select an image file');
        e.target.value = '';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        error('Image must be less than 10MB');
        e.target.value = '';
        return;
      }

      try {
        // Compress the image
        const { dataUrl, originalSize, compressedSize } = await compressImage(file);

        addReferenceImage(dataUrl);

        // Extract colors from the reference image
        try {
          const colorResult = await extractColorsFromImage(dataUrl);
          setExtractedColors(colorResult);
          setShowExtractedColors(true);
        } catch {
          // Non-critical - continue without extracted colors
        }

        // Show compression info if significant size reduction
        const reduction = ((originalSize - compressedSize) / originalSize) * 100;
        if (reduction > 10) {
          success(
            `Image added (${formatBytes(originalSize)} → ${formatBytes(compressedSize)}, ${Math.round(reduction)}% smaller)`
          );
        } else {
          success('Reference image added');
        }
      } catch {
        error('Failed to process image. Please try another file.');
      }

      // Reset input
      e.target.value = '';
    },
    [addReferenceImage, error, success]
  );

  // Apply extracted colors to design
  const handleApplyExtractedColors = useCallback(() => {
    if (!extractedColors) return;

    const { palette } = extractedColors;
    const currentStyles = design.globalStyles ?? defaultGlobalStyles;

    updateDesign({
      globalStyles: {
        ...currentStyles,
        colors: {
          ...currentStyles.colors,
          primary: palette.primary,
          secondary: palette.secondary,
          accent: palette.accent,
          background: palette.background,
          surface: palette.surface,
          text: palette.text,
          textMuted: palette.textMuted,
          border: palette.border,
        },
      },
    });

    setShowExtractedColors(false);
    success('Applied extracted colors from reference image');
  }, [extractedColors, updateDesign, design.globalStyles, success]);

  // Handle architecture template selection (from App Concept blueprints)
  const handleArchitectureTemplateSelect = useCallback(
    (template: FullTemplate) => {
      // Map the architecture template to layout design
      const layoutDesign = mapArchitectureToLayout(template);
      updateDesign(layoutDesign as Partial<LayoutDesign>);
      setShowArchitectureTemplates(false);

      // Generate and send an initial message based on the template
      const initialPrompt = generateArchitecturePrompt(template);
      sendMessage(initialPrompt);

      success(`Applied "${template.name}" architecture blueprint`);
    },
    [updateDesign, sendMessage, success]
  );

  // Handle component pattern selection (sends suggested message to chat)
  const handleComponentPatternSelect = useCallback(
    (pattern: ComponentPattern) => {
      // Send the suggested message to the chat
      sendMessage(pattern.suggestedMessage);
      setShowComponentLibrary(false);
    },
    [sendMessage]
  );

  // Handle export - JSON (original)
  const handleExportJSON = useCallback(() => {
    exportDesign(false);
    success('Design exported as JSON');
    setShowExportMenu(false);
  }, [exportDesign, success]);

  // Handle export - CSS Variables
  const handleExportCSS = useCallback(() => {
    const css = exportToCSSVariables(design as LayoutDesign);
    downloadExport(css, `${design.name || 'design'}-variables.css`, 'text/css');
    success('CSS variables exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - Tailwind Config
  const handleExportTailwind = useCallback(() => {
    const config = exportToTailwindConfig(design as LayoutDesign);
    downloadExport(config, 'tailwind.config.js', 'application/javascript');
    success('Tailwind config exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - React Component
  const handleExportReact = useCallback(() => {
    const component = exportToReactComponent(design as LayoutDesign);
    const filename = `${(design.name || 'Layout').replace(/[^a-zA-Z0-9]/g, '')}.tsx`;
    downloadExport(component, filename, 'text/typescript');
    success('React component exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - Design Tokens
  const handleExportTokens = useCallback(() => {
    const tokens = exportToFigmaTokens(design as LayoutDesign);
    downloadExport(JSON.stringify(tokens, null, 2), 'design-tokens.json', 'application/json');
    success('Design tokens exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - shadcn/ui Theme
  const handleExportShadcn = useCallback(() => {
    const shadcnTheme = exportToShadcnTheme(design as LayoutDesign);
    downloadExport(shadcnTheme, 'globals.css', 'text/css');
    success('shadcn/ui theme exported');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - Documentation (Markdown)
  const handleExportDocsMarkdown = useCallback(() => {
    const docs = generateDesignDocs(design, 'markdown');
    downloadDocs(docs, `${design.name || 'design-system'}.md`);
    success('Documentation exported as Markdown');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle export - Documentation (HTML)
  const handleExportDocsHtml = useCallback(() => {
    const docs = generateDesignDocs(design, 'html');
    downloadDocs(docs, `${design.name || 'design-system'}.html`);
    success('Documentation exported as HTML');
    setShowExportMenu(false);
  }, [design, success]);

  // Handle copy CSS to clipboard
  const handleCopyCSS = useCallback(async () => {
    const css = exportToCSSVariables(design as LayoutDesign);
    const copied = await copyToClipboard(css);
    if (copied) {
      success('CSS variables copied to clipboard');
    } else {
      error('Failed to copy to clipboard');
    }
    setShowExportMenu(false);
  }, [design, success, error]);

  // Handle import file selection
  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();

      // Handle full design JSON import (original behavior)
      if (fileName.endsWith('.json') && !fileName.includes('components')) {
        const result = await importDesign(file);
        if (result) {
          success('Design imported successfully');
        } else {
          error('Failed to import design. Please check the file format.');
        }
        e.target.value = '';
        return;
      }

      // Handle design token imports (CSS, Tailwind, shadcn)
      try {
        const content = await file.text();
        const importResult = importDesignTokens(content);

        if (importResult.success) {
          // Merge imported tokens with current design
          const mergedDesign = mergeDesigns(design, importResult.design);
          updateDesign(mergedDesign);

          const formatName =
            importResult.format === 'css'
              ? 'CSS variables'
              : importResult.format === 'tailwind'
                ? 'Tailwind config'
                : importResult.format === 'shadcn'
                  ? 'shadcn/ui config'
                  : 'design tokens';

          success(`Imported ${formatName} successfully`);

          // Show warnings if any
          if (importResult.warnings.length > 0) {
            console.info('Import warnings:', importResult.warnings);
          }
        } else {
          error(importResult.warnings[0] || 'Failed to import design tokens');
        }
      } catch (err) {
        error('Failed to read file');
        console.error('Import error:', err);
      }

      e.target.value = '';
    },
    [importDesign, design, updateDesign, success, error]
  );

  // Handle version restore
  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      restoreVersion(versionId);
      success('Version restored successfully');
      setShowVersionHistory(false);
    },
    [restoreVersion, success]
  );

  // Handle version delete
  const handleDeleteVersion = useCallback(
    (versionId: string) => {
      deleteVersion(versionId);
      info('Version deleted');
    },
    [deleteVersion, info]
  );

  // Handle preference changes from preview
  const handlePreferenceChange = useCallback(
    (prefs: Partial<UIPreferences>) => {
      updateDesign({
        basePreferences: {
          ...design.basePreferences,
          style: prefs.style || design.basePreferences?.style,
          colorScheme: prefs.colorScheme || design.basePreferences?.colorScheme,
          layout: prefs.layout || design.basePreferences?.layout,
        } as typeof design.basePreferences,
        globalStyles: {
          ...design.globalStyles,
          colors: {
            ...design.globalStyles?.colors,
            primary: prefs.primaryColor || design.globalStyles?.colors?.primary,
          },
        } as typeof design.globalStyles,
      });
    },
    [design, updateDesign]
  );

  // Process video file directly (accepts File object)
  const processVideoFile = useCallback(
    async (file: File) => {
      // Validate video
      const validation = validateVideoFile(file);
      if (!validation.valid) {
        error(validation.error || 'Invalid video file');
        return;
      }

      setUploadedVideo(file);
      setIsProcessingVideo(true);
      analysisProgress.startAnalysis();

      try {
        // Create thumbnail
        const thumbnail = await createVideoThumbnail(file);
        setVideoThumbnail(thumbnail);
        analysisProgress.completePhase('upload');

        // Process video frames
        analysisProgress.startPhase('quick');
        const result = await processVideo(file, {
          onProgress: (progress) => {
            analysisProgress.updatePhase('quick', { progress });
          },
        });

        analysisProgress.completePhase('quick');
        success(`Video processed: ${result.frames.length} frames extracted`);

        // Send frames to video analysis API
        analysisProgress.startPhase('deep');
        const response = await fetch('/api/layout/video-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frames: result.frames.slice(0, 10).map((f) => ({
              index: f.index,
              timestamp: f.timestamp,
              imageDataUrl: f.imageDataUrl,
              isKeyFrame: f.isKeyFrame,
            })),
            keyFrames: result.keyFrames.map((f) => ({
              index: f.index,
              timestamp: f.timestamp,
              imageDataUrl: f.imageDataUrl,
              isKeyFrame: f.isKeyFrame,
            })),
            metadata: result.metadata,
            analysisMode: 'detailed',
          }),
        });

        if (response.ok) {
          const videoAnalysis = await response.json();
          analysisProgress.completePhase('deep');
          analysisProgress.completePhase('generate');
          analysisProgress.completePhase('render');

          // Store detected animations and show panel if any found
          if (videoAnalysis.animations && videoAnalysis.animations.length > 0) {
            setDetectedAnimations(videoAnalysis.animations);
            setShowAnimationPanel(true);
            success(
              `Detected ${videoAnalysis.animations.length} animations - view in Animation Panel`
            );
          } else {
            success('Video analyzed - no animations detected');
          }

          // Apply design summary if available (colors, fonts, layout type)
          if (videoAnalysis.designSummary) {
            const { dominantColors, detectedFonts, layoutType } = videoAnalysis.designSummary;
            const currentStyles = design.globalStyles ?? defaultGlobalStyles;

            // Apply extracted colors to colorSettings
            if (dominantColors && dominantColors.length > 0) {
              updateDesign({
                globalStyles: {
                  ...currentStyles,
                  colors: {
                    ...currentStyles.colors,
                    primary: dominantColors[0],
                    secondary: dominantColors[1] || dominantColors[0],
                    accent: dominantColors[2] || dominantColors[0],
                    background: dominantColors[3] || currentStyles.colors?.background || '#1a1a2e',
                    surface: dominantColors[4] || currentStyles.colors?.surface || '#16213e',
                  } as ColorSettings,
                },
              });
              info(`Applied ${dominantColors.length} colors from video`);
            }

            // Apply detected fonts to typography
            if (detectedFonts && detectedFonts.length > 0) {
              const updatedStyles = design.globalStyles ?? defaultGlobalStyles;
              updateDesign({
                globalStyles: {
                  ...updatedStyles,
                  typography: {
                    ...updatedStyles.typography,
                    headingFont: detectedFonts[0],
                    fontFamily: detectedFonts[1] || detectedFonts[0], // Body font
                  } as TypographySettings,
                },
              });
            }

            // Update layout type if detected
            if (layoutType) {
              const layoutMapping: Record<string, 'single-page' | 'multi-page' | 'dashboard'> = {
                'landing page': 'single-page',
                landing: 'single-page',
                dashboard: 'dashboard',
                'e-commerce': 'multi-page',
                portfolio: 'single-page',
                blog: 'multi-page',
                saas: 'dashboard',
              };
              const mappedLayout = layoutMapping[layoutType.toLowerCase()] || 'single-page';
              updateDesign({
                basePreferences: {
                  ...design.basePreferences,
                  layout: mappedLayout,
                } as typeof design.basePreferences,
              });
            }
          }

          // Auto-enable pixel-perfect mode with video
          setAnalysisMode('pixel-perfect');
        } else {
          throw new Error('Video analysis failed');
        }
      } catch (err) {
        analysisProgress.setError(err instanceof Error ? err.message : 'Video processing failed');
        error('Failed to process video');
      } finally {
        setIsProcessingVideo(false);
      }
    },
    [success, error, info, analysisProgress, design, updateDesign]
  );

  // Handle video file upload from input element
  const handleVideoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = ''; // Reset input
      await processVideoFile(file);
    },
    [processVideoFile]
  );

  // Handle spec sheet export
  const handleExportSpecSheet = useCallback(
    (format: 'css' | 'tailwind' | 'json' | 'figma' | 'summary') => {
      if (!pixelPerfectAnalysis) {
        error('No analysis available to export');
        return;
      }

      const specs = exportSpecSheet(pixelPerfectAnalysis);

      switch (format) {
        case 'css':
          downloadSpecSheet(specs.css, 'design-variables.css', 'text/css');
          break;
        case 'tailwind':
          downloadSpecSheet(specs.tailwindConfig, 'tailwind.config.js', 'application/javascript');
          break;
        case 'json':
          downloadSpecSheet(specs.json, 'design-analysis.json', 'application/json');
          break;
        case 'figma':
          downloadSpecSheet(specs.figmaTokens, 'design-tokens.json', 'application/json');
          break;
        case 'summary':
          downloadSpecSheet(specs.summary, 'design-specs.md', 'text/markdown');
          break;
      }

      success(`Exported ${format.toUpperCase()} spec sheet`);
      setShowExportMenu(false);
    },
    [pixelPerfectAnalysis, success, error]
  );

  // Toggle pixel-perfect mode
  const handleTogglePixelPerfectMode = useCallback(() => {
    const newMode = analysisMode === 'standard' ? 'pixel-perfect' : 'standard';
    setAnalysisMode(newMode);

    if (newMode === 'pixel-perfect') {
      info('Pixel-perfect mode enabled. Upload a reference image for detailed analysis.');
    } else {
      setShowComparisonView(false);
      info('Standard mode enabled.');
    }
  }, [analysisMode, info]);

  // Handle adjustment request from comparison view
  const handleAdjustmentRequest = useCallback(
    (element: string, property: string, description: string) => {
      // Send adjustment request as a chat message
      sendMessage(`Please adjust the ${element}: ${description}`, false);
    },
    [sendMessage]
  );

  if (!isOpen) return null;

  const content = (
    <div
      className={`${isFullPage ? 'w-full h-full' : 'w-[95vw] h-[90vh] max-w-[1600px]'} rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
        borderWidth: '1px',
      }}
    >
      {/* Draft recovery banner */}
      {hasDraftToRecover && (
        <DraftRecoveryBanner onRecover={recoverDraft} onDiscard={discardDraft} />
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Layout Builder
          </h2>
          {hasUnsavedChanges && (
            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
              Unsaved changes
            </span>
          )}
          {/* Multi-Page Mode Toggle */}
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => toggleMultiPageMode(false)}
              className={`px-2 py-1 text-xs rounded-l-md transition-colors ${
                !isMultiPageMode
                  ? 'bg-gold-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => toggleMultiPageMode(true)}
              className={`px-2 py-1 text-xs rounded-r-md transition-colors ${
                isMultiPageMode
                  ? 'bg-gold-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Multi-Page
            </button>
          </div>
          {isMultiPageMode && pageReferences.length > 0 && (
            <>
              <span className="text-xs text-slate-400">
                {pageReferences.length} page{pageReferences.length !== 1 ? 's' : ''}
              </span>
              {multiPageDesign?.navigation && (
                <button
                  onClick={() => setShowNavigationPanel(true)}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h7"
                    />
                  </svg>
                  Navigation
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Advanced Mode Tools */}
          {isAdvancedMode && (
            <>
              {/* Templates Dropdown Menu */}
              <TemplatesMenu
                onOpenBlueprints={() => setShowArchitectureTemplates(true)}
                onOpenHistory={() => setShowVersionHistory(true)}
                historyCount={versionHistory.length}
              />

              {/* Tools Dropdown Menu */}
              <ToolsMenu
                onExportJSON={handleExportJSON}
                onExportCSS={handleExportCSS}
                onExportTailwind={handleExportTailwind}
                onExportReact={handleExportReact}
                onExportTokens={handleExportTokens}
                onExportShadcn={handleExportShadcn}
                onExportDocsMarkdown={handleExportDocsMarkdown}
                onExportDocsHtml={handleExportDocsHtml}
                onCopyCSS={handleCopyCSS}
                onImport={() => importInputRef.current?.click()}
                onOpenCodePreview={() => setShowCodePreview(true)}
                onOpenShortcuts={() => setShowKeyboardShortcuts(true)}
                onOpenAnimationTimeline={() => setShowAnimationTimeline(true)}
                onOpenLayerPanel={() => setShowLayerPanel(true)}
                onOpenDarkModeEditor={() => setShowDarkModeEditor(true)}
              />
            </>
          )}

          {/* Hidden file inputs */}
          <input
            ref={videoInputRef}
            type="file"
            accept={VIDEO_CONFIG.supportedFormats.join(',')}
            onChange={handleVideoUpload}
            className="hidden"
          />

          {/* Comparison View Toggle (only in advanced + pixel-perfect mode with reference) */}
          {isAdvancedMode && analysisMode === 'pixel-perfect' && referenceImages.length > 0 && (
            <button
              onClick={() => setShowComparisonView(!showComparisonView)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                showComparisonView
                  ? 'bg-garden-600 text-white'
                  : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/50'
              }`}
              title="Toggle side-by-side comparison view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
              Compare
            </button>
          )}

          {/* Design Panel Toggle (advanced mode only) */}
          {isAdvancedMode && (
            <button
              onClick={() => setShowDesignSidePanel(!showDesignSidePanel)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                showDesignSidePanel
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/50'
              }`}
              title="Toggle design panel"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              Design
            </button>
          )}

          {/* Hidden import file input - accepts JSON, CSS, JS/TS configs */}
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.css,.js,.ts,.mjs,.cjs"
            onChange={handleImportFile}
            className="hidden"
          />

          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"
                />
              </svg>
            </button>
          </div>

          {/* Advanced Mode Toggle */}
          <button
            onClick={toggleAdvancedMode}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
              isAdvancedMode
                ? 'bg-gold-500 text-white'
                : 'text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/50'
            }`}
            title={isAdvancedMode ? 'Switch to Basic Mode' : 'Show Advanced Tools'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            {isAdvancedMode ? 'Basic' : 'Advanced'}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              'Save Design'
            )}
          </button>
          <button
            onClick={handleApplyClick}
            disabled={isApplying}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Applying...
              </>
            ) : (
              'Apply to App Concept'
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Chat panel (left) */}
        <div
          className="w-1/2 min-h-0 flex flex-col border-r relative"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {/* Architecture Template Picker Overlay */}
          <ArchitectureTemplatePicker
            isOpen={showArchitectureTemplates}
            onSelect={handleArchitectureTemplateSelect}
            onClose={() => setShowArchitectureTemplates(false)}
          />

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Load more button for older messages */}
            {hasMoreMessages && (
              <div className="flex justify-center mb-2">
                <button
                  type="button"
                  onClick={loadMoreMessages}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Load {Math.min(MESSAGES_PAGE_SIZE, totalMessages - visibleMessages.length)} older
                  messages
                  <span className="text-slate-500">
                    ({visibleMessages.length} of {totalMessages})
                  </span>
                </button>
              </div>
            )}
            {visibleMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onRetry={retryMessage} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-slate-700 rounded-2xl px-4 py-3 text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-garden-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-garden-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-garden-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested actions */}
          <SuggestedActionsBar
            actions={suggestedActions}
            onAction={handleAction}
            selectedElement={selectedElement}
            onSendMessage={(msg) => sendMessage(msg, false)}
          />

          {/* Component Library Panel */}
          {showComponentLibrary && (
            <ComponentLibraryPanel
              onSelectPattern={handleComponentPatternSelect}
              onClose={() => setShowComponentLibrary(false)}
            />
          )}

          {/* Component Library Toggle (when collapsed) */}
          {!showComponentLibrary && (
            <div className="px-4 py-2 border-t border-white/5">
              <button
                onClick={() => setShowComponentLibrary(true)}
                className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-900/30 hover:bg-slate-800/50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                Browse Component Patterns
              </button>
            </div>
          )}

          {/* Unified Media Upload Zone - Auto-detects image/video with mode selector */}
          {showReferenceMediaPanel && (
            <div className="border-t border-white/10">
              {isMultiPageMode ? (
                <div className="p-3">
                  <MultiPageUploadZone
                    pages={pageReferences}
                    onPagesAdd={addPageReferences}
                    onPageRemove={removePageReference}
                    onPagesReorder={reorderPages}
                    onPageNameChange={updatePageName}
                    onAnalyzeAllPages={analyzeAllPages}
                    isAnalyzing={isAnalyzingPages}
                    maxPages={10}
                  />
                </div>
              ) : (
                <MediaUploadZone
                  onImageUpload={(dataUrl) => {
                    addReferenceImage(dataUrl);
                    // Auto-enable pixel-perfect mode when image is added
                    if (analysisMode === 'standard') {
                      setAnalysisMode('pixel-perfect');
                    }
                  }}
                  onVideoUpload={(file, mode) => {
                    // Set analysis mode based on user selection, then process
                    setAnalysisMode(mode);
                    processVideoFile(file);
                  }}
                  analysisMode={analysisMode}
                  onAnalysisModeChange={setAnalysisMode}
                  compact={true}
                />
              )}
              {/* Reference Images Preview */}
              {referenceImages.length > 0 && (
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-400">
                      Reference Images ({referenceImages.length})
                    </span>
                    <button
                      onClick={() => {
                        // Clear all reference images
                        referenceImages.forEach((_, i) => removeReferenceImage(i));
                      }}
                      className="text-xs text-slate-500 hover:text-red-400"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {referenceImages.map((img, i) => (
                      <div key={i} className="relative group flex-shrink-0">
                        <img
                          src={img}
                          alt={`Reference ${i + 1}`}
                          className="w-16 h-12 object-cover rounded border border-slate-600"
                        />
                        <button
                          onClick={() => removeReferenceImage(i)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Hidden file inputs for fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            onCapture={handleCapture}
            isLoading={isLoading}
            isCapturing={isCapturing}
            hasSelection={!!selectedElement}
            lastModelUsed={lastModelUsed}
            hasImages={referenceImages.length > 0}
          />
        </div>

        {/* Preview panel (right) */}
        <div
          className="w-1/2 min-h-0 flex flex-col relative"
          style={{ background: 'var(--bg-primary)' }}
        >
          {/* Page Navigator (Multi-Page Mode) */}
          {isMultiPageMode && pageReferences.length > 0 && (
            <div className="border-b border-white/10">
              <PageNavigator
                pages={pageReferences}
                currentPageId={currentPageId}
                onPageSelect={setCurrentPage}
                onPageRemove={removePageReference}
                onAddPage={() => {
                  // Trigger file upload dialog
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                      const newPages = await Promise.all(
                        Array.from(files).map(async (file, i) => {
                          const dataUrl = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          });
                          const baseName = file.name.replace(/\.[^/.]+$/, '');
                          const pageName =
                            baseName
                              .replace(/[-_]/g, ' ')
                              .replace(/\b\w/g, (l) => l.toUpperCase())
                              .trim() || `Page ${pageReferences.length + i + 1}`;
                          return {
                            id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                            name: pageName,
                            slug: pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                            referenceImage: dataUrl,
                            order: pageReferences.length + i,
                            isMain: false,
                            status: 'pending' as const,
                            createdAt: new Date().toISOString(),
                          };
                        })
                      );
                      addPageReferences(newPages);
                    }
                  };
                  input.click();
                }}
                onPagesReorder={reorderPages}
                compact={true}
                showAddButton={pageReferences.length < 10}
                allowRemove={true}
              />
            </div>
          )}

          {/* Compact Analysis Progress Indicator */}
          {analysisProgress.state.isAnalyzing && (
            <div className="p-2 border-b border-white/10">
              <AnalysisProgressIndicator
                state={analysisProgress.state}
                onCancel={analysisProgress.cancel}
                showDetails={false}
                compact={true}
              />
            </div>
          )}

          {/* Creative Director Analysis is now embedded in chat messages via MessageBubble */}
          {/* The floating popup has been removed - analysis appears inline with Gemini's response */}

          {/* Layout Preview - FULL SPACE */}
          <div className="flex-1 min-h-0 overflow-hidden relative" id="layout-preview-container">
            {showComparisonView && referenceImages.length > 0 ? (
              <DesignComparison
                referenceImage={referenceImages[0]}
                generatedPreview={
                  <LayoutPreview
                    preferences={previewPreferences}
                    className="h-full"
                    onPreferenceChange={handlePreferenceChange}
                    onElementSelect={handleElementSelect}
                    selectedElement={selectedElementId}
                    componentDesign={{
                      effectsSettings: design.globalStyles?.effects,
                      colorSettings: design.globalStyles?.colors,
                      headerDesign: design.components?.header,
                      sidebarDesign: design.components?.sidebar,
                      cardDesign: design.components?.cards,
                      navDesign: design.components?.navigation,
                      structure: design.structure,
                      detectedComponents: design.structure?.detectedComponents,
                    }}
                    showGridOverlay={showGridOverlay}
                    onGridOverlayToggle={setShowGridOverlay}
                  />
                }
                analysis={pixelPerfectAnalysis}
                onRequestAdjustment={handleAdjustmentRequest}
                className="h-full"
              />
            ) : (
              <div id="layout-preview-frame" className="h-full overflow-y-auto p-4">
                <LayoutPreview
                  preferences={previewPreferences}
                  className="h-full"
                  onPreferenceChange={handlePreferenceChange}
                  onElementSelect={handleElementSelect}
                  selectedElement={selectedElementId}
                  componentDesign={{
                    effectsSettings: design.globalStyles?.effects,
                    colorSettings: design.globalStyles?.colors,
                    headerDesign: design.components?.header,
                    sidebarDesign: design.components?.sidebar,
                    cardDesign: design.components?.cards,
                    navDesign: design.components?.navigation,
                    structure: design.structure,
                    detectedComponents: design.structure?.detectedComponents,
                  }}
                  showGridOverlay={showGridOverlay}
                  onGridOverlayToggle={setShowGridOverlay}
                />
              </div>
            )}

            {/* Design Side Panel - positioned on right edge */}
            {!showComparisonView && (
              <DesignSidePanel
                isOpen={showDesignSidePanel}
                onToggle={() => setShowDesignSidePanel(!showDesignSidePanel)}
                effectsSettings={design.globalStyles?.effects}
                colorSettings={design.globalStyles?.colors}
                onEffectsChange={handleEffectsChange}
                onColorChange={handleColorSettingsChange}
                primaryColor={design.globalStyles?.colors?.primary}
                onPrimaryColorChange={handlePrimaryColorChange}
                typographySettings={design.globalStyles?.typography}
                onTypographyChange={handleTypographyChange}
                spacingSettings={design.globalStyles?.spacing}
                onSpacingChange={handleSpacingChange}
                showGridOverlay={showGridOverlay}
                onGridOverlayToggle={setShowGridOverlay}
                layoutDesign={design as LayoutDesign}
                onAccessibilityFix={handleAccessibilityFix}
                detectedAnimations={detectedAnimations}
                onEditAnimation={(id, updates) => {
                  setDetectedAnimations((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
                  );
                }}
                onApplyAnimation={(animation, targetElement) => {
                  success(`Applied ${animation.type} animation to ${targetElement || 'element'}`);
                }}
                onRemoveAnimation={(id) => {
                  setDetectedAnimations((prev) => prev.filter((a) => a.id !== id));
                }}
                pixelPerfectAnalysis={pixelPerfectAnalysis}
                onExportSpecSheet={handleExportSpecSheet}
                selectedElement={selectedElementId}
                onClearSelection={() => setSelectedElement(null)}
                analysisMode={analysisMode}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const dialogs = (
    <>
      {/* Close confirmation dialog */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="Unsaved Changes"
        message="You have unsaved changes. Would you like to save before closing?"
        confirmLabel="Save & Close"
        cancelLabel="Discard"
        onConfirm={handleSaveAndClose}
        onCancel={handleDiscardAndClose}
        variant="warning"
      />

      {/* Apply confirmation dialog */}
      <ConfirmDialog
        isOpen={showApplyConfirm}
        title="Apply to App Concept"
        message="This will update your app concept with the current layout design. Any existing layout preferences will be overwritten."
        confirmLabel="Apply"
        cancelLabel="Cancel"
        onConfirm={handleConfirmApply}
        onCancel={() => setShowApplyConfirm(false)}
        variant="info"
      />

      {/* Version History Panel */}
      {showVersionHistory && (
        <VersionHistoryPanel
          versions={versionHistory}
          currentVersionId={currentVersionId}
          currentDesign={design}
          onRestore={handleRestoreVersion}
          onDelete={handleDeleteVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Code Preview Panel (slide-over) */}
      {showCodePreview && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCodePreview(false)}
          />
          {/* Panel */}
          <div
            className="fixed inset-y-0 right-0 w-[600px] max-w-full shadow-2xl z-50 flex flex-col"
            style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Code Preview</h2>
              <button
                type="button"
                onClick={() => setShowCodePreview(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900/50 rounded-lg transition-colors"
                aria-label="Close code preview"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <CodePreviewPanel design={design as LayoutDesign} />
            </div>
          </div>
        </>
      )}

      {/* Extracted Colors Panel - shows when reference image is uploaded */}
      <ExtractedColorsPanel
        isOpen={showExtractedColors}
        colors={extractedColors}
        onApply={handleApplyExtractedColors}
        onDismiss={() => setShowExtractedColors(false)}
      />

      {/* Navigation Structure Panel (Multi-Page Mode) */}
      {showNavigationPanel && isMultiPageMode && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowNavigationPanel(false)}
          />
          <div
            className="fixed inset-y-0 right-0 w-[500px] max-w-full shadow-2xl z-50 flex flex-col"
            style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Navigation Structure</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const config = exportReactRouterConfig();
                    if (config) {
                      success('Router config copied to clipboard');
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-gold-500 hover:bg-gold-600 text-white rounded-lg transition-colors"
                >
                  Export Config
                </button>
                <button
                  type="button"
                  onClick={() => setShowNavigationPanel(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-900/50 rounded-lg transition-colors"
                  aria-label="Close navigation panel"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <NavigationStructurePanel
                navigation={multiPageDesign?.navigation || null}
                pages={pageReferences}
                routes={multiPageDesign?.inferredRoutes || []}
                onNavigationUpdate={updateNavigation}
                onExportRouterConfig={() => {
                  const config = exportReactRouterConfig();
                  if (config) {
                    success('Router config copied to clipboard');
                  }
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Animation Timeline Panel (slide-over) */}
      {showAnimationTimeline && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAnimationTimeline(false)}
          />
          <div
            className="fixed inset-y-0 right-0 w-[700px] max-w-full shadow-2xl z-50 flex flex-col"
            style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Animation Timeline</h2>
              <button
                type="button"
                onClick={() => setShowAnimationTimeline(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900/50 rounded-lg transition-colors"
                aria-label="Close animation timeline"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <AnimationTimeline
                animation={customAnimation ?? undefined}
                onChange={setCustomAnimation}
                onExport={(css) => {
                  copyToClipboard(css);
                  success('Animation CSS copied to clipboard');
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Layer Panel (slide-over from left) */}
      {showLayerPanel && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowLayerPanel(false)}
          />
          <div
            className="fixed inset-y-0 left-0 w-[350px] max-w-full shadow-2xl z-50 flex flex-col"
            style={{
              background: 'var(--bg-primary)',
              borderRight: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Layer Stack</h2>
              <button
                type="button"
                onClick={() => setShowLayerPanel(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900/50 rounded-lg transition-colors"
                aria-label="Close layer panel"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <LayerPanel layers={layers} onChange={setLayers} className="h-full" />
            </div>
          </div>
        </>
      )}

      {/* Dark Mode Editor Modal */}
      {showDarkModeEditor && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowDarkModeEditor(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="rounded-xl w-[800px] max-w-full max-h-[90vh] overflow-hidden flex flex-col"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Dark Mode Colors</h2>
                <button
                  type="button"
                  onClick={() => setShowDarkModeEditor(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-900/50 rounded-lg transition-colors"
                  aria-label="Close dark mode editor"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <DarkModeEditor
                  lightColors={design.globalStyles?.colors || {}}
                  darkColors={darkColors ?? undefined}
                  onChange={setDarkColors}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Breakpoint Editor Modal */}
      {showBreakpointEditor && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowBreakpointEditor(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="rounded-xl w-[1000px] max-w-full max-h-[90vh] overflow-hidden flex flex-col"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Responsive Breakpoints</h2>
                <button
                  type="button"
                  onClick={() => setShowBreakpointEditor(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-900/50 rounded-lg transition-colors"
                  aria-label="Close breakpoint editor"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      Breakpoint Configuration
                    </h3>
                    <BreakpointEditor
                      breakpoints={breakpoints}
                      currentWidth={previewWidth}
                      onChange={setBreakpoints}
                      onWidthChange={setPreviewWidth}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      Responsive Properties
                    </h3>
                    <ResponsivePropertyEditor
                      properties={responsiveProperties}
                      breakpoints={breakpoints}
                      currentBreakpoint={currentBreakpoint}
                      onChange={setResponsiveProperties}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Performance Report Modal */}
      <PerformanceReport
        isOpen={showPerformanceReport}
        onClose={() => setShowPerformanceReport(false)}
        report={performanceReport}
        onRunBenchmark={() => {
          // Placeholder - would need API endpoint to generate report
          info('Performance benchmarking is not yet implemented');
        }}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position="top-right" />
    </>
  );

  if (isFullPage) {
    return (
      <>
        {content}
        {dialogs}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {content}
      {dialogs}
    </div>
  );
}

export default LayoutBuilderWizard;
