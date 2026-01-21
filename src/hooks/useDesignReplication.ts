/**
 * useDesignReplication Hook
 *
 * Manages the complete design replication workflow including:
 * - Image/video upload and processing
 * - Quick and deep analysis passes
 * - Animation detection from videos
 * - Design spec extraction and export
 */

import { useState, useCallback, useRef } from 'react';
import type {
  CompleteDesignAnalysis,
  QuickAnalysis,
  VideoAnalysisResult,
  DetectedAnimation,
  LayoutDesign,
  ExtractedFrame,
} from '@/types/layoutDesign';
import { defaultGlobalStyles } from '@/types/layoutDesign';
import { useAnalysisProgress } from './useAnalysisProgress';
import { processVideo } from '@/utils/videoProcessor';
import { exportSpecSheet } from '@/utils/specSheetExport';

// Video processing result type (matches processVideo return type)
interface VideoProcessingResult {
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
  };
  frames: ExtractedFrame[];
  keyFrames: ExtractedFrame[];
  basicAnalysis: {
    hasMotion: boolean;
    estimatedAnimations: number;
    frameChanges: unknown[];
  };
}

// ============================================================================
// TYPES
// ============================================================================

export type ReplicationMode = 'standard' | 'pixel-perfect' | 'video-replication';

export interface ReplicationState {
  mode: ReplicationMode;
  referenceImages: string[];
  referenceVideo: File | null;
  quickAnalysis: QuickAnalysis | null;
  deepAnalysis: CompleteDesignAnalysis | null;
  videoAnalysis: VideoAnalysisResult | null;
  generatedDesign: Partial<LayoutDesign> | null;
  error: string | null;
  isProcessing: boolean;
}

export interface UseDesignReplicationOptions {
  onQuickAnalysisComplete?: (analysis: QuickAnalysis) => void;
  onDeepAnalysisComplete?: (analysis: CompleteDesignAnalysis) => void;
  onVideoAnalysisComplete?: (analysis: VideoAnalysisResult) => void;
  onDesignGenerated?: (design: Partial<LayoutDesign>) => void;
  onError?: (error: string) => void;
  autoStartDeepAnalysis?: boolean;
}

export interface UseDesignReplicationReturn {
  // State
  state: ReplicationState;
  analysisProgress: ReturnType<typeof useAnalysisProgress>;

  // Actions
  setMode: (mode: ReplicationMode) => void;
  uploadImage: (imageDataUrl: string) => Promise<void>;
  uploadVideo: (file: File) => Promise<void>;
  removeImage: (index: number) => void;
  removeVideo: () => void;
  startQuickAnalysis: () => Promise<QuickAnalysis | null>;
  startDeepAnalysis: () => Promise<CompleteDesignAnalysis | null>;
  startVideoAnalysis: () => Promise<VideoAnalysisResult | null>;
  applyAnalysisToDesign: (currentDesign: Partial<LayoutDesign>) => Partial<LayoutDesign>;
  exportSpecs: (format: 'json' | 'css' | 'tailwind' | 'figma') => string | null;
  reset: () => void;

  // Computed
  canStartAnalysis: boolean;
  hasAnalysisResults: boolean;
  detectedAnimations: DetectedAnimation[];
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ReplicationState = {
  mode: 'standard',
  referenceImages: [],
  referenceVideo: null,
  quickAnalysis: null,
  deepAnalysis: null,
  videoAnalysis: null,
  generatedDesign: null,
  error: null,
  isProcessing: false,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDesignReplication(
  options: UseDesignReplicationOptions = {}
): UseDesignReplicationReturn {
  const {
    onQuickAnalysisComplete,
    onDeepAnalysisComplete,
    onVideoAnalysisComplete,
    onDesignGenerated,
    onError,
    autoStartDeepAnalysis = false,
  } = options;

  const [state, setState] = useState<ReplicationState>(initialState);
  const analysisProgress = useAnalysisProgress();
  const abortControllerRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // MODE MANAGEMENT
  // -------------------------------------------------------------------------

  const setMode = useCallback((mode: ReplicationMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  // -------------------------------------------------------------------------
  // IMAGE MANAGEMENT
  // -------------------------------------------------------------------------

  const uploadImage = useCallback(
    async (imageDataUrl: string) => {
      setState((prev) => ({
        ...prev,
        referenceImages: [...prev.referenceImages, imageDataUrl],
        error: null,
      }));

      // Auto-switch to pixel-perfect mode when image is uploaded
      if (state.mode === 'standard') {
        setMode('pixel-perfect');
      }
    },
    [state.mode, setMode]
  );

  const removeImage = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((_, i) => i !== index),
    }));
  }, []);

  // -------------------------------------------------------------------------
  // VIDEO MANAGEMENT
  // -------------------------------------------------------------------------

  const uploadVideo = useCallback(
    async (file: File) => {
      setState((prev) => ({
        ...prev,
        referenceVideo: file,
        error: null,
      }));

      // Auto-switch to video-replication mode
      setMode('video-replication');
    },
    [setMode]
  );

  const removeVideo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      referenceVideo: null,
      videoAnalysis: null,
    }));

    // Switch back to standard or pixel-perfect mode
    if (state.referenceImages.length > 0) {
      setMode('pixel-perfect');
    } else {
      setMode('standard');
    }
  }, [state.referenceImages.length, setMode]);

  // -------------------------------------------------------------------------
  // QUICK ANALYSIS
  // -------------------------------------------------------------------------

  // Use ref to avoid stale closure when calling startDeepAnalysis from startQuickAnalysis
  const startDeepAnalysisRef = useRef<(() => Promise<CompleteDesignAnalysis | null>) | null>(null);

  const startQuickAnalysis = useCallback(async (): Promise<QuickAnalysis | null> => {
    if (state.referenceImages.length === 0) {
      const error = 'No reference images to analyze';
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      return null;
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));
    analysisProgress.startAnalysis();
    analysisProgress.startPhase('quick');

    try {
      // Call the API for quick analysis
      const response = await fetch('/api/layout/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Analyze this design reference image',
          conversationHistory: [],
          currentDesign: {},
          referenceImages: [state.referenceImages[0]],
          analysisMode: 'pixel-perfect',
          requestedAnalysis: 'quick',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform quick analysis');
      }

      const data = await response.json();
      const quickAnalysis = data.quickAnalysis as QuickAnalysis;

      setState((prev) => ({
        ...prev,
        quickAnalysis,
        isProcessing: false,
      }));

      analysisProgress.setQuickAnalysis(quickAnalysis);
      analysisProgress.completePhase('quick');
      onQuickAnalysisComplete?.(quickAnalysis);

      // Auto-start deep analysis if enabled (use ref to avoid stale closure)
      if (autoStartDeepAnalysis && startDeepAnalysisRef.current) {
        startDeepAnalysisRef.current();
      }

      return quickAnalysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Quick analysis failed';
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      analysisProgress.setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [
    state.referenceImages,
    analysisProgress,
    onQuickAnalysisComplete,
    onError,
    autoStartDeepAnalysis,
  ]);

  // -------------------------------------------------------------------------
  // DEEP ANALYSIS
  // -------------------------------------------------------------------------

  const startDeepAnalysis = useCallback(async (): Promise<CompleteDesignAnalysis | null> => {
    if (state.referenceImages.length === 0) {
      const error = 'No reference images to analyze';
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      return null;
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));
    analysisProgress.startPhase('deep');

    try {
      // Call the API for full analysis
      const response = await fetch('/api/layout/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Perform a complete pixel-perfect analysis of this design',
          conversationHistory: [],
          currentDesign: {},
          referenceImages: [state.referenceImages[0]],
          analysisMode: 'pixel-perfect',
          requestedAnalysis: 'full',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform deep analysis');
      }

      const data = await response.json();
      const deepAnalysis = data.pixelPerfectAnalysis as CompleteDesignAnalysis;

      setState((prev) => ({
        ...prev,
        deepAnalysis,
        quickAnalysis: data.quickAnalysis || prev.quickAnalysis,
        isProcessing: false,
      }));

      analysisProgress.completePhase('deep');
      analysisProgress.startPhase('generate');
      onDeepAnalysisComplete?.(deepAnalysis);

      return deepAnalysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deep analysis failed';
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      analysisProgress.setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [state.referenceImages, analysisProgress, onDeepAnalysisComplete, onError]);

  // Keep ref in sync with the latest startDeepAnalysis function
  startDeepAnalysisRef.current = startDeepAnalysis;

  // -------------------------------------------------------------------------
  // VIDEO ANALYSIS
  // -------------------------------------------------------------------------

  const startVideoAnalysis = useCallback(async (): Promise<VideoAnalysisResult | null> => {
    if (!state.referenceVideo) {
      const error = 'No video to analyze';
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
      return null;
    }

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));
    analysisProgress.startAnalysis();
    analysisProgress.startPhase('upload');

    try {
      // Process video to extract frames
      const videoResult: VideoProcessingResult = await processVideo(state.referenceVideo, {
        onProgress: (progress) => {
          // Update progress based on video processing stage
          if (progress < 30) {
            analysisProgress.updateSubPhase('upload', 'compress', {
              progress: (progress / 30) * 100,
            });
          }
        },
      });

      analysisProgress.completePhase('upload');
      analysisProgress.startPhase('quick');

      // Send frames to video analysis API
      const response = await fetch('/api/layout/video-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: videoResult.frames,
          keyFrames: videoResult.keyFrames,
          metadata: {
            duration: videoResult.metadata.duration,
            width: videoResult.metadata.width,
            height: videoResult.metadata.height,
            fps: videoResult.metadata.fps,
          },
          analysisMode: 'detailed',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze video');
      }

      const videoAnalysis = (await response.json()) as VideoAnalysisResult;

      setState((prev) => ({
        ...prev,
        videoAnalysis,
        isProcessing: false,
      }));

      analysisProgress.completePhase('quick');
      analysisProgress.completePhase('render');
      onVideoAnalysisComplete?.(videoAnalysis);

      return videoAnalysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Video analysis failed';
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      analysisProgress.setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [state.referenceVideo, analysisProgress, onVideoAnalysisComplete, onError]);

  // -------------------------------------------------------------------------
  // APPLY ANALYSIS TO DESIGN
  // -------------------------------------------------------------------------

  const applyAnalysisToDesign = useCallback(
    (currentDesign: Partial<LayoutDesign>): Partial<LayoutDesign> => {
      const analysis = state.deepAnalysis || state.quickAnalysis;
      const videoDesign = state.videoAnalysis?.designSummary;

      // Return if no analysis results available
      if (!analysis && !videoDesign) return currentDesign;

      const updatedDesign = { ...currentDesign };

      // Apply colors if available from image analysis
      if (analysis && 'colors' in analysis && analysis.colors) {
        const colors = analysis.colors as CompleteDesignAnalysis['colors'];
        const currentStyles = updatedDesign.globalStyles ?? defaultGlobalStyles;
        // Use neutral gray fallbacks - actual colors should come from image analysis
        updatedDesign.globalStyles = {
          ...currentStyles,
          colors: {
            primary: colors.primary || '#6B7280',
            secondary: colors.secondary || '#9CA3AF',
            accent: colors.accent || '#6B7280',
            background: colors.background || '#F9FAFB',
            surface: colors.surface || '#FFFFFF',
            text: colors.text || '#374151',
            textMuted: colors.textMuted || '#6B7280',
            border: colors.border || '#E5E7EB',
            success: colors.success || '#6B7280',
            warning: colors.warning || '#6B7280',
            error: colors.error || '#6B7280',
          },
        };
      }

      // Apply typography if available
      if (analysis && 'typography' in analysis && analysis.typography) {
        const typography = analysis.typography as CompleteDesignAnalysis['typography'];
        const currentStyles = updatedDesign.globalStyles ?? defaultGlobalStyles;
        updatedDesign.globalStyles = {
          ...currentStyles,
          typography: {
            ...currentStyles.typography,
            fontFamily: typography.headingFont?.family || 'Inter',
            headingFont: typography.headingFont?.family,
          },
        };
      }

      // Apply video analysis design summary if available
      if (videoDesign) {
        const currentStyles = updatedDesign.globalStyles ?? defaultGlobalStyles;

        // Apply colors from video analysis
        if (videoDesign.dominantColors && videoDesign.dominantColors.length > 0) {
          const colors = videoDesign.dominantColors;
          updatedDesign.globalStyles = {
            ...currentStyles,
            colors: {
              ...currentStyles.colors,
              primary: colors[0],
              secondary: colors[1] || colors[0],
              accent: colors[2] || colors[0],
              background: colors[3] || currentStyles.colors?.background || '#F9FAFB',
              surface: colors[4] || currentStyles.colors?.surface || '#FFFFFF',
            },
          };
        }

        // Apply fonts from video analysis
        if (videoDesign.detectedFonts && videoDesign.detectedFonts.length > 0) {
          const fonts = videoDesign.detectedFonts;
          const updatedStyles = updatedDesign.globalStyles ?? defaultGlobalStyles;
          updatedDesign.globalStyles = {
            ...updatedStyles,
            typography: {
              ...updatedStyles.typography,
              headingFont: fonts[0],
              fontFamily: fonts[1] || fonts[0], // Body font
            },
          };
        }
      }

      setState((prev) => ({ ...prev, generatedDesign: updatedDesign }));
      onDesignGenerated?.(updatedDesign);

      return updatedDesign;
    },
    [state.deepAnalysis, state.quickAnalysis, state.videoAnalysis, onDesignGenerated]
  );

  // -------------------------------------------------------------------------
  // EXPORT SPECS
  // -------------------------------------------------------------------------

  const exportSpecs = useCallback(
    (format: 'json' | 'css' | 'tailwind' | 'figma'): string | null => {
      const analysis = state.deepAnalysis;
      if (!analysis) return null;

      const specs = exportSpecSheet(analysis);

      switch (format) {
        case 'json':
          return specs.json;
        case 'css':
          return specs.css;
        case 'tailwind':
          return specs.tailwindConfig;
        case 'figma':
          return specs.figmaTokens;
        default:
          return null;
      }
    },
    [state.deepAnalysis]
  );

  // -------------------------------------------------------------------------
  // RESET
  // -------------------------------------------------------------------------

  const reset = useCallback(() => {
    // Abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(initialState);
    analysisProgress.reset();
  }, [analysisProgress]);

  // -------------------------------------------------------------------------
  // COMPUTED VALUES
  // -------------------------------------------------------------------------

  const canStartAnalysis = state.referenceImages.length > 0 || state.referenceVideo !== null;

  const hasAnalysisResults =
    state.quickAnalysis !== null || state.deepAnalysis !== null || state.videoAnalysis !== null;

  const detectedAnimations: DetectedAnimation[] = state.videoAnalysis?.animations || [];

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    state,
    analysisProgress,
    setMode,
    uploadImage,
    uploadVideo,
    removeImage,
    removeVideo,
    startQuickAnalysis,
    startDeepAnalysis,
    startVideoAnalysis,
    applyAnalysisToDesign,
    exportSpecs,
    reset,
    canStartAnalysis,
    hasAnalysisResults,
    detectedAnimations,
  };
}

export default useDesignReplication;
