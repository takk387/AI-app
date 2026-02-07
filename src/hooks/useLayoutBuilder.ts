/**
 * useLayoutBuilder Hook
 *
 * State management for the Universal Visual Editor (Titan Stack).
 * Manages generated code (AppFile[]) as the single source of truth.
 * Communicates with the Titan Pipeline API for all generation tasks.
 *
 * Replaces the old component-array model with code-generation:
 *   - AppFile[] instead of DetectedComponentEnhanced[]
 *   - Pipeline API instead of per-image analysis
 *   - Live Editor for FloatingEditBubble quick edits
 *   - Undo/redo snapshots of generated code files
 */

import { useState, useCallback } from 'react';
import type { AppFile } from '@/types/railway';
import type {
  PipelineProgress,
  PipelineStepName,
  AppContext,
  FileInput,
  VisualManifest,
} from '@/types/titanPipeline';
import { createInitialProgress } from '@/types/titanPipeline';
import type { LayoutManifest } from '@/types/schema';
import { useAppStore } from '@/store/useAppStore';

// ============================================================================
// RETURN TYPE
// ============================================================================

export interface UseLayoutBuilderReturn {
  /** Generated code files from the pipeline */
  generatedFiles: AppFile[];
  /** Whether a pipeline or live-edit is in progress */
  isProcessing: boolean;
  /** Step-by-step progress of the current pipeline run */
  pipelineProgress: PipelineProgress | null;
  /** Fatal errors from pipeline runs */
  errors: string[];
  /** Non-fatal warnings from pipeline runs */
  warnings: string[];
  /** Success message (e.g., "Copied to clipboard") - auto-clears after 3s */
  successMessage: string | null;
  /** Original canvas dimensions from the first manifest (for viewport scaling) */
  canvasSize: { width: number; height: number } | null;

  /**
   * Run the full Titan pipeline.
   * Automatically includes currentCode if generated files exist, enabling
   * the Router to detect EDIT mode without caller intervention.
   */
  runPipeline: (files: File[], instructions: string, appContext?: AppContext) => Promise<void>;

  /**
   * Apply a quick edit to a specific component via the Live Editor.
   * Used by FloatingEditBubble — no full pipeline, just code-in/code-out.
   */
  refineComponent: (dataId: string, prompt: string, outerHTML: string) => Promise<void>;

  /** Undo last code change */
  undo: () => void;
  /** Redo last undone change */
  redo: () => void;
  /** Copy generated code to clipboard */
  exportCode: () => void;
  /** Clear all errors and warnings */
  clearErrors: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Convert a browser File to a pipeline FileInput (base64-encoded). */
function fileToFileInput(file: File): Promise<FileInput> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve({
        base64,
        mimeType: file.type || 'image/png',
        filename: file.name,
      });
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Extract the main component code string from the generated files.
 * Returns the content of /src/App.tsx (or /App.tsx), which is the
 * primary code file the Builder outputs.
 */
function extractMainCode(files: AppFile[]): string | null {
  const appFile = files.find((f) => f.path === '/src/App.tsx' || f.path === '/App.tsx');
  return appFile?.content ?? null;
}

/**
 * Build a simulated "all steps complete" progress snapshot.
 * Used after the pipeline API returns (non-streaming) to show final status.
 */
function buildFinalProgress(hasImages: boolean, hasVideos: boolean): PipelineProgress {
  return {
    currentStep: 'assembling',
    status: 'completed',
    steps: {
      routing: { status: 'completed' },
      surveying: { status: hasImages ? 'completed' : 'idle' },
      architecting: { status: 'completed' },
      physicist: { status: hasVideos ? 'completed' : 'idle' },
      photographer: { status: 'completed' },
      assembling: { status: 'completed' },
    },
  };
}

// ============================================================================
// VISUAL MANIFEST → LAYOUT MANIFEST CONVERSION
// ============================================================================

/**
 * Convert pipeline VisualManifest[] into a LayoutManifest for the store.
 * Extracts design system tokens (colors, fonts) and detected features
 * from the Surveyor output so downstream phases can reference them.
 */
function convertVisualManifestToLayoutManifest(manifests: VisualManifest[]): LayoutManifest {
  // Merge colors from all manifests into a keyed record
  const colorSet = new Map<string, string>();
  const fontSet = new Set<string>();
  const featureSet = new Set<string>();

  for (const manifest of manifests) {
    // Colors
    if (manifest.global_theme?.colors) {
      manifest.global_theme.colors.forEach((color) => {
        // Name colors by index; duplicates are deduped by Map
        const key =
          colorSet.size < 10
            ? ([
                'primary',
                'secondary',
                'accent',
                'background',
                'surface',
                'text',
                'muted',
                'border',
                'success',
                'error',
              ][colorSet.size] ?? `color-${colorSet.size}`)
            : `color-${colorSet.size}`;
        if (!Array.from(colorSet.values()).includes(color)) {
          colorSet.set(key, color);
        }
      });
    }

    // Fonts
    if (manifest.global_theme?.fonts) {
      manifest.global_theme.fonts.forEach((font) => fontSet.add(font));
    }

    // Detected features from measured components
    if (manifest.measured_components) {
      manifest.measured_components.forEach((comp) => {
        if (comp.type) featureSet.add(comp.type);
      });
    }
  }

  const fontsArray = Array.from(fontSet);

  return {
    id: `layout-${Date.now()}`,
    version: '1.0',
    root: {
      id: 'root',
      type: 'container',
      semanticTag: 'main',
      styles: { tailwindClasses: 'min-h-screen' },
      attributes: {},
      children: [],
    },
    definitions: {},
    detectedFeatures: Array.from(featureSet),
    designSystem: {
      colors: Object.fromEntries(colorSet),
      fonts: {
        heading: fontsArray[0] ?? 'Inter',
        body: fontsArray[1] ?? fontsArray[0] ?? 'Inter',
      },
    },
  };
}

/**
 * Create a synthetic LayoutManifest for GENERATE mode.
 * When the pipeline produces files without a Surveyor step (no images analyzed),
 * we still need a LayoutManifest so downstream systems (DynamicPhaseGenerator,
 * MainBuilderView) recognize the layout was built and create a Layout Injection phase.
 */
function createSyntheticLayoutManifest(files: AppFile[], appContext?: AppContext): LayoutManifest {
  // Detect features from file names/paths
  const detectedFeatures: string[] = [];
  for (const file of files) {
    const lower = file.path.toLowerCase();
    if (lower.includes('login') || lower.includes('auth')) detectedFeatures.push('Authentication');
    if (lower.includes('dashboard')) detectedFeatures.push('Dashboard');
    if (lower.includes('nav') || lower.includes('sidebar')) detectedFeatures.push('Navigation');
    if (lower.includes('settings')) detectedFeatures.push('Settings');
    if (lower.includes('profile')) detectedFeatures.push('User Profile');
  }

  // Pull colors from appContext if available
  const colors: Record<string, string> = {};
  if (appContext?.primaryColor) colors.primary = appContext.primaryColor;
  if (appContext?.secondaryColor) colors.secondary = appContext.secondaryColor;
  if (appContext?.accentColor) colors.accent = appContext.accentColor;

  return {
    id: `layout-gen-${Date.now()}`,
    version: '1.0',
    root: {
      id: 'root',
      type: 'container',
      semanticTag: 'main',
      styles: { tailwindClasses: 'min-h-screen' },
      attributes: {},
      children: [],
    },
    definitions: {},
    detectedFeatures: [...new Set(detectedFeatures)],
    designSystem: {
      colors,
      fonts: {
        heading: appContext?.fontFamily ?? 'inherit',
        body: appContext?.fontFamily ?? 'inherit',
      },
    },
  };
}

// ============================================================================
// HOOK
// ============================================================================

// Maximum number of undo snapshots to prevent memory leaks
const MAX_HISTORY_SIZE = 20;

export function useLayoutBuilder(): UseLayoutBuilderReturn {
  // --- Store Actions (persist layout data to Zustand for downstream pipeline) ---
  const setLayoutBuilderFiles = useAppStore((s) => s.setLayoutBuilderFiles);
  const setCurrentLayoutManifest = useAppStore((s) => s.setCurrentLayoutManifest);
  const updateAppConceptField = useAppStore((s) => s.updateAppConceptField);

  // --- Core State ---
  const [generatedFiles, setGeneratedFiles] = useState<AppFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);

  // --- History (undo/redo on AppFile[] snapshots) ---
  const [history, setHistory] = useState<AppFile[][]>([]);
  const [future, setFuture] = useState<AppFile[][]>([]);

  /**
   * Replace generatedFiles with a new set, pushing the current state to history.
   * Clears the redo (future) stack since we're branching off a new timeline.
   * Limits history size to prevent memory leaks.
   */
  const updateFilesWithHistory = useCallback((newFiles: AppFile[]) => {
    setGeneratedFiles((prev) => {
      if (prev.length > 0) {
        setHistory((h) => {
          const newHistory = [...h, prev];
          // Trim history to prevent unbounded memory growth
          if (newHistory.length > MAX_HISTORY_SIZE) {
            return newHistory.slice(-MAX_HISTORY_SIZE);
          }
          return newHistory;
        });
        setFuture([]);
      }
      return newFiles;
    });
  }, []);

  // --- Actions ---

  const clearErrors = useCallback(() => {
    setErrors([]);
    setWarnings([]);
  }, []);

  /**
   * Run the full Titan pipeline.
   *
   * This is the single entry point for ALL generation scenarios:
   *   - Single image upload → CREATE
   *   - Multi-image upload → MERGE
   *   - Image + video → MERGE (layout + motion)
   *   - Text-only (no files) → CREATE or EDIT depending on currentCode
   *   - Files + existing code → EDIT with new reference
   *
   * The Router on the backend determines the mode automatically based on
   * the presence/absence of files[] and currentCode.
   */
  const runPipeline = useCallback(
    async (files: File[], instructions: string, appContext?: AppContext) => {
      if (isProcessing) return;

      setIsProcessing(true);
      clearErrors();

      let progress = createInitialProgress();
      setPipelineProgress(progress);

      try {
        // 1. Convert browser Files → pipeline FileInput[]
        progress = {
          ...progress,
          currentStep: 'routing',
          status: 'running',
          steps: {
            ...progress.steps,
            routing: { status: 'running', message: 'Preparing files...' },
          },
        };
        setPipelineProgress(progress);

        const fileInputs = await Promise.all(files.map(fileToFileInput));

        // 2. Include currentCode if we have previously generated files (enables EDIT)
        const currentCode = extractMainCode(generatedFiles);

        // 3. Update progress to "routing"
        progress = {
          ...progress,
          steps: {
            ...progress.steps,
            routing: { status: 'running', message: 'Routing intent...' },
          },
        };
        setPipelineProgress(progress);

        // 4. Call the Titan Pipeline API
        const response = await fetch('/api/layout/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: fileInputs,
            currentCode,
            instructions,
            appContext,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `Pipeline failed: ${response.status}`);
        }

        const result = await response.json();

        // 5. Build final progress (all steps done)
        const hasImages = fileInputs.some((f) => f.mimeType.startsWith('image/'));
        const hasVideos = fileInputs.some((f) => f.mimeType.startsWith('video/'));
        setPipelineProgress(buildFinalProgress(hasImages, hasVideos));

        // 6. Store generated files
        if (result.files && result.files.length > 0) {
          updateFilesWithHistory(result.files);

          // Persist to Zustand store for downstream pipeline (Review → Builder)
          setLayoutBuilderFiles(result.files);

          // Convert and persist manifest if pipeline returned one
          if (result.manifests && result.manifests.length > 0) {
            const layoutManifest = convertVisualManifestToLayoutManifest(result.manifests);
            setCurrentLayoutManifest(layoutManifest);
            updateAppConceptField('layoutManifest', layoutManifest);

            // Extract canvas size from first manifest for viewport scaling
            const firstCanvas = result.manifests[0]?.canvas;
            if (firstCanvas?.width && firstCanvas?.height) {
              setCanvasSize({ width: firstCanvas.width, height: firstCanvas.height });
            }
          } else {
            // GENERATE mode: pipeline returned files but no manifests (no Surveyor step).
            // Create a synthetic LayoutManifest so downstream systems (DynamicPhaseGenerator,
            // MainBuilderView layout injection) recognize the layout was built.
            const syntheticManifest = createSyntheticLayoutManifest(result.files, appContext);
            setCurrentLayoutManifest(syntheticManifest);
            updateAppConceptField('layoutManifest', syntheticManifest);
          }
        } else {
          setErrors((prev) => [...prev, 'Pipeline completed but returned no files']);
        }

        // 7. Collect warnings
        if (result.warnings && result.warnings.length > 0) {
          setWarnings(result.warnings);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Pipeline failed';
        setErrors((prev) => [...prev, message]);
        console.error('[useLayoutBuilder] Pipeline error:', error);
      } finally {
        setIsProcessing(false);
        // Keep progress visible briefly before clearing
        setTimeout(() => setPipelineProgress(null), 2000);
      }
    },
    [
      isProcessing,
      generatedFiles,
      clearErrors,
      updateFilesWithHistory,
      setLayoutBuilderFiles,
      setCurrentLayoutManifest,
      updateAppConceptField,
    ]
  );

  /**
   * Refine a specific component via the Live Editor prompt.
   * This is a lightweight code-in → code-out operation, NOT a full pipeline run.
   * Used by FloatingEditBubble for edits like "Make this blue".
   */
  const refineComponent = useCallback(
    async (dataId: string, prompt: string, _outerHTML: string) => {
      const currentCode = extractMainCode(generatedFiles);
      if (!currentCode) {
        setErrors(['No generated code to edit']);
        return;
      }

      setIsProcessing(true);
      clearErrors();

      try {
        const response = await fetch('/api/layout/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'live-edit',
            currentCode,
            selectedDataId: dataId,
            instruction: prompt,
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `Live edit failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.updatedCode) {
          // Replace the App.tsx content in generatedFiles
          const newFiles = generatedFiles.map((f) => {
            if (f.path === '/src/App.tsx' || f.path === '/App.tsx') {
              return { ...f, content: result.updatedCode };
            }
            return f;
          });
          updateFilesWithHistory(newFiles);
          // Keep store in sync with refined files
          setLayoutBuilderFiles(newFiles);
        } else {
          throw new Error(result.error || 'Live edit returned no updated code');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Edit failed';
        setErrors((prev) => [...prev, message]);
        console.error('[useLayoutBuilder] Refine error:', error);
      } finally {
        setIsProcessing(false);
      }
    },
    [generatedFiles, clearErrors, updateFilesWithHistory, setLayoutBuilderFiles]
  );

  /** Undo: pop from history, push current to future. */
  const undo = useCallback(() => {
    // Read current state synchronously to avoid race conditions
    if (history.length === 0) return;

    const newHistory = [...history];
    const previousState = newHistory.pop()!;
    const currentState = generatedFiles;

    // Apply all state updates
    setHistory(newHistory);
    setFuture((f) => [currentState, ...f]);
    setGeneratedFiles(previousState);
    setLayoutBuilderFiles(previousState);
  }, [history, generatedFiles, setLayoutBuilderFiles]);

  /** Redo: shift from future, push current to history. */
  const redo = useCallback(() => {
    // Read current state synchronously to avoid race conditions
    if (future.length === 0) return;

    const newFuture = [...future];
    const nextState = newFuture.shift()!;
    const currentState = generatedFiles;

    // Apply all state updates
    setFuture(newFuture);
    setHistory((h) => [...h, currentState]);
    setGeneratedFiles(nextState);
    setLayoutBuilderFiles(nextState);
  }, [future, generatedFiles, setLayoutBuilderFiles]);

  /** Copy all generated code files to clipboard with path headers. */
  const exportCode = useCallback(() => {
    if (generatedFiles.length === 0) return;

    const output = generatedFiles.map((f) => `// === ${f.path} ===\n${f.content}`).join('\n\n');

    navigator.clipboard.writeText(output).then(
      () => {
        console.log('[useLayoutBuilder] Code exported to clipboard');
        setSuccessMessage('Code copied to clipboard!');
        // Auto-clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      (err) => {
        console.error('[useLayoutBuilder] Clipboard write failed:', err);
        setErrors(['Failed to copy code to clipboard']);
      }
    );
  }, [generatedFiles]);

  // --- Return ---

  return {
    generatedFiles,
    isProcessing,
    pipelineProgress,
    errors,
    warnings,
    successMessage,
    canvasSize,

    runPipeline,
    refineComponent,
    undo,
    redo,
    exportCode,
    clearErrors,

    canUndo: history.length > 0,
    canRedo: future.length > 0,
  };
}
