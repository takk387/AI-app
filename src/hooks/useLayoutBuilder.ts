/**
 * useLayoutBuilder Hook
 *
 * State management for the Ultimate Layout Builder.
 * Handles:
 * - Layout Design State (Components, Styles)
 * - Selection State (Click-to-Edit)
 * - Interaction with Gemini Service (Analysis, Critique)
 * - Video Keyframe State
 * - Self-Healing Vision Loop (Auto-refinement)
 */

import { useState, useCallback, useRef } from 'react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { extractKeyframes } from '@/utils/videoProcessor';
import { sanitizeComponents } from '@/utils/layoutValidation';
import type { LayoutAnalysisResult } from '@/types/layoutAnalysis';
import type { DesignSpec } from '@/types/designSpec';
import type { VisionLoopProgress, SelfHealingResult } from '@/services/VisionLoopEngine';

interface UseLayoutBuilderReturn {
  // State
  components: DetectedComponentEnhanced[];
  designSpec: DesignSpec | null;
  selectedId: string | null;
  isAnalyzing: boolean;
  analysisErrors: string[];
  analysisWarnings: string[];

  // Self-Healing State
  isHealing: boolean;
  healingProgress: VisionLoopProgress | null;
  lastHealingResult: SelfHealingResult | null;

  // Actions
  setComponents: (components: DetectedComponentEnhanced[]) => void;
  selectComponent: (id: string | null) => void;
  updateComponentStyle: (id: string, newStyle: Record<string, any>) => void;
  deleteComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  applyAIEdit: (id: string, prompt: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
  exportCode: () => void;
  saveToWizard: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearErrors: () => void;

  // AI Actions
  analyzeImage: (file: File, instructions?: string) => Promise<void>;
  analyzeVideo: (file: File, instructions?: string) => Promise<void>;
  triggerCritique: (originalImage: string, canvasElement: HTMLElement) => Promise<void>;
  generatePhasePlan: () => Promise<void>;

  // Self-Healing Actions
  runSelfHealingLoop: (
    originalImage: string,
    renderToHtml: () => string
  ) => Promise<SelfHealingResult | null>;
  cancelHealing: () => void;
}

export function useLayoutBuilder(): UseLayoutBuilderReturn {
  const [components, setComponents] = useState<DetectedComponentEnhanced[]>([]);
  const [designSpec, setDesignSpec] = useState<DesignSpec | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisErrors, setAnalysisErrors] = useState<string[]>([]);
  const [analysisWarnings, setAnalysisWarnings] = useState<string[]>([]);

  // Self-Healing State
  const [isHealing, setIsHealing] = useState(false);
  const [healingProgress, setHealingProgress] = useState<VisionLoopProgress | null>(null);
  const [lastHealingResult, setLastHealingResult] = useState<SelfHealingResult | null>(null);
  const visionLoopEngineRef = useRef<{ abort: () => void } | null>(null);

  const clearErrors = useCallback(() => {
    setAnalysisErrors([]);
    setAnalysisWarnings([]);
  }, []);

  // --- Actions ---

  const selectComponent = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const updateComponentStyle = useCallback((id: string, newStyle: Record<string, any>) => {
    setComponents((prev) =>
      prev.map((comp) =>
        comp.id === id ? { ...comp, style: { ...comp.style, ...newStyle } } : comp
      )
    );
  }, []);

  // --- AI Interactions ---

  const analyzeImage = useCallback(async (file: File, instructions?: string) => {
    setIsAnalyzing(true);
    clearErrors();

    try {
      const base64 = await fileToBase64(file);

      const response = await fetch('/api/layout/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze-image',
          image: base64,
          instructions,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useLayoutBuilder] Analysis failed:', response.status, errorText);
        setAnalysisErrors([`Analysis failed: ${response.status}`]);
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result: LayoutAnalysisResult = await response.json();
      console.log('[useLayoutBuilder] Raw API response:', result);

      // Check for API error response (legacy format)
      if (result && typeof result === 'object' && 'error' in result && !('success' in result)) {
        console.error('[useLayoutBuilder] API returned error:', (result as { error: string }).error);
        setAnalysisErrors([(result as { error: string }).error]);
        throw new Error((result as { error: string }).error);
      }

      // Handle new structured response format
      if ('success' in result) {
        // Store errors and warnings
        if (result.errors && result.errors.length > 0) {
          setAnalysisErrors(result.errors);
          console.error('[useLayoutBuilder] Analysis errors:', result.errors);
        }
        if (result.warnings && result.warnings.length > 0) {
          setAnalysisWarnings(result.warnings);
          console.warn('[useLayoutBuilder] Analysis warnings:', result.warnings);
        }

        // Extract components from the result
        const validatedComponents = result.components || [];
        console.log('[useLayoutBuilder] Received', validatedComponents.length, 'components from API');

        // Store the design spec if available
        if (result.designSpec) {
          setDesignSpec(result.designSpec);
          console.log('[useLayoutBuilder] DesignSpec stored:', {
            primaryColor: result.designSpec.colorPalette?.primary,
            structure: result.designSpec.structure?.type,
          });

          // Also store in global app store for export and other features
          import('@/store/useAppStore').then(({ useAppStore }) => {
            useAppStore.getState().setCurrentDesignSpec?.(result.designSpec);
          }).catch(() => {
            // Store may not have setCurrentDesignSpec yet - that's okay
            console.log('[useLayoutBuilder] setCurrentDesignSpec not available in store yet');
          });
        }

        // Warn if too few components detected
        if (validatedComponents.length > 0 && validatedComponents.length < 10) {
          console.warn(
            '[useLayoutBuilder] ⚠️ Only',
            validatedComponents.length,
            'components detected. Expected 20+ for a typical layout.'
          );
        }

        setComponents(validatedComponents);
      } else {
        // Fallback for legacy array response (backward compatibility)
        const validatedComponents = Array.isArray(result) ? result : [];
        console.log('[useLayoutBuilder] Legacy response format, received', validatedComponents.length, 'components');
        setComponents(validatedComponents);
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      if (error instanceof Error && !analysisErrors.includes(error.message)) {
        setAnalysisErrors((prev) => [...prev, error.message]);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [clearErrors, analysisErrors]);

  const analyzeVideo = useCallback(async (file: File, instructions?: string) => {
    setIsAnalyzing(true);
    try {
      // 1. Extract frames in browser (Client-Side Strategy)
      const frames = await extractKeyframes(file, { keyframeCount: 3 });
      const base64Frames = frames.map((f) => f.image);

      // 2. Send to Gemini for Motion Analysis
      const response = await fetch('/api/layout/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze-video-flow',
          images: base64Frames,
          instructions,
        }),
      });

      if (!response.ok) throw new Error('Video analysis failed');
      const motionData = await response.json();

      console.log('Video Motion Data Received:', motionData);

      // TODO: Map motion data to component props or global animation state
      // For now, we just log it as the "Structure" part comes from the Image/Hybrid flow
    } catch (error) {
      console.error('Video analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const triggerCritique = useCallback(async (originalImage: string, canvasElement: HTMLElement) => {
    setIsAnalyzing(true);
    try {
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(canvasElement);
      const currentScreenshot = canvas.toDataURL('image/jpeg');

      const response = await fetch('/api/layout/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'critique',
          original: originalImage,
          current: currentScreenshot,
        }),
      });

      if (!response.ok) throw new Error('Critique failed');
      const critique = await response.json();

      console.log('AI Critique:', critique);
      // Auto-apply corrections could happen here
    } catch (error) {
      console.error('Critique error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // --- Self-Healing Loop ---

  /**
   * Run the self-healing vision loop to automatically refine the layout
   * Captures: Generate → Render → Capture → Critique → Heal → Verify
   */
  const runSelfHealingLoop = useCallback(
    async (
      originalImage: string,
      renderToHtml: () => string
    ): Promise<SelfHealingResult | null> => {
      if (!designSpec) {
        console.error('[useLayoutBuilder] Cannot run self-healing without designSpec');
        setAnalysisErrors(['Design specification required for self-healing']);
        return null;
      }

      if (components.length === 0) {
        console.error('[useLayoutBuilder] Cannot run self-healing without components');
        setAnalysisErrors(['Components required for self-healing']);
        return null;
      }

      setIsHealing(true);
      setHealingProgress(null);
      setLastHealingResult(null);

      try {
        // Dynamic import VisionLoopEngine to avoid SSR issues
        const { createVisionLoopEngine } = await import('@/services/VisionLoopEngine');

        // Create engine with progress callback
        const engine = createVisionLoopEngine(
          {
            maxIterations: 3,
            targetFidelity: 95,
            minImprovementThreshold: 2,
          },
          (progress) => {
            setHealingProgress(progress);
            console.log('[useLayoutBuilder] Healing progress:', progress);
          }
        );

        // Store reference for cancellation
        visionLoopEngineRef.current = engine;

        // Save pre-healing snapshot to history
        setHistory((h) => [...h, components]);
        console.log('[useLayoutBuilder] Saved pre-healing snapshot');

        // Run the self-healing loop
        const result = await engine.runLoop(
          originalImage,
          components,
          designSpec,
          renderToHtml
        );

        // Apply the final components
        if (result.finalComponents.length > 0) {
          setComponents(result.finalComponents);
          console.log('[useLayoutBuilder] Applied healed components:', {
            iterations: result.iterations,
            finalFidelity: result.finalFidelityScore,
            history: result.history,
          });
        }

        setLastHealingResult(result);
        return result;
      } catch (error) {
        console.error('[useLayoutBuilder] Self-healing error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Self-healing failed';
        setAnalysisErrors((prev) => [...prev, errorMsg]);
        return null;
      } finally {
        setIsHealing(false);
        visionLoopEngineRef.current = null;
      }
    },
    [components, designSpec]
  );

  /**
   * Cancel an in-progress self-healing loop
   */
  const cancelHealing = useCallback(() => {
    if (visionLoopEngineRef.current) {
      visionLoopEngineRef.current.abort();
      console.log('[useLayoutBuilder] Self-healing cancelled by user');
    }
  }, []);

  // --- History State ---
  const [history, setHistory] = useState<DetectedComponentEnhanced[][]>([]);
  const [future, setFuture] = useState<DetectedComponentEnhanced[][]>([]);

  // Helper to push state to history
  const updateComponentsWithHistory = useCallback(
    (
      newComponents:
        | DetectedComponentEnhanced[]
        | ((prev: DetectedComponentEnhanced[]) => DetectedComponentEnhanced[])
    ) => {
      setComponents((prev) => {
        const next = typeof newComponents === 'function' ? newComponents(prev) : newComponents;
        setHistory((h) => [...h, prev]);
        setFuture([]); // Clear future on new action
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const previousState = newHistory.pop()!;

      setComponents((current) => {
        setFuture((f) => [current, ...f]);
        return previousState;
      });

      return newHistory;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const newFuture = [...prev];
      const nextState = newFuture.shift()!;

      setComponents((current) => {
        setHistory((h) => [...h, current]);
        return nextState;
      });

      return newFuture;
    });
  }, []);

  // --- Actions ---

  const exportCode = useCallback(() => {
    // Lazy load or import utility
    import('@/utils/codeExporter').then((mod) => {
      const code = mod.exportToReact(components);
      navigator.clipboard.writeText(code);
      alert('React code copied to clipboard!');
    });
  }, [components]);

  // Override setComponents locally to use history?
  // For simplicity, we expose the direct setter but internal actions use logic.
  // Actually, let's replace the internal calls to use `updateComponentsWithHistory`.

  // --- Edit Actions ---

  const deleteComponent = useCallback(
    (id: string) => {
      updateComponentsWithHistory((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId, updateComponentsWithHistory]
  );

  const duplicateComponent = useCallback(
    (id: string) => {
      updateComponentsWithHistory((prev) => {
        const comp = prev.find((c) => c.id === id);
        if (!comp) return prev;

        const newComp = {
          ...comp,
          id: `${comp.id}-copy-${Date.now()}`,
          bounds: { ...comp.bounds, top: comp.bounds.top + 5, left: comp.bounds.left + 5 },
        };
        return [...prev, newComp];
      });
    },
    [updateComponentsWithHistory]
  );

  const applyAIEdit = useCallback(
    async (id: string, prompt: string) => {
      setIsAnalyzing(true);
      try {
        const component = components.find((c) => c.id === id);
        if (!component) throw new Error('Component not found');

        const response = await fetch('/api/layout/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'edit-component',
            component,
            prompt,
          }),
        });

        if (!response.ok) throw new Error('Edit failed');
        const updatedComponent = await response.json();

        // Validate the updated component before applying
        const { components: validatedComponents } = sanitizeComponents([updatedComponent]);
        if (validatedComponents.length > 0) {
          updateComponentsWithHistory((prev) =>
            prev.map((c) => (c.id === id ? validatedComponents[0] : c))
          );
        }
      } catch (error) {
        console.error('AI Edit error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [components, updateComponentsWithHistory]
  );

  // --- Layout to Wizard Bridge ---

  const saveToWizard = useCallback(() => {
    // Dynamic import to avoid cycles/SSR issues
    import('@/utils/layoutConverter').then(({ convertToLayoutManifest }) => {
      const manifest = convertToLayoutManifest(components, designSpec);

      // Update global store
      // We need to import the store here to separate concerns or pass it as dependency
      // For now, simpler to rely on the component using this hook to have access,
      // BUT proper way is to use the store hook inside this hook if it was a component,
      // or just import the store state getter if outside.
      // Since this is a hook, we can import useAppStore.

      import('@/store/useAppStore').then(({ useAppStore }) => {
        useAppStore.getState().setCurrentLayoutManifest(manifest);
        console.log('[LayoutBuilder] Saved layout to Wizard:', manifest);
        // We could also trigger a toast here if we had one
      });
    });
  }, [components, designSpec]);

  return {
    components,
    designSpec,
    selectedId,
    isAnalyzing,
    analysisErrors,
    analysisWarnings,

    // Self-Healing State
    isHealing,
    healingProgress,
    lastHealingResult,

    setComponents: updateComponentsWithHistory, // Expose history-aware setter
    selectComponent,
    updateComponentStyle,
    deleteComponent,
    duplicateComponent,
    applyAIEdit,
    undo,
    redo,
    exportCode,
    saveToWizard, // Exposed action
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    clearErrors,
    analyzeImage,
    analyzeVideo,
    triggerCritique,

    // Self-Healing Actions
    runSelfHealingLoop,
    cancelHealing,
    // New Action: Generate Phase Plan
    generatePhasePlan: useCallback(async () => {
      setIsAnalyzing(true);
      try {
        // 1. Convert to Manifest (now includes designSpec for accurate colors/fonts)
        const { convertToLayoutManifest } = await import('@/utils/layoutConverter');
        const manifest = convertToLayoutManifest(components, designSpec);

        // 2. Get Current Concept & Update with Manifest
        const { useAppStore } = await import('@/store/useAppStore');
        const store = useAppStore.getState();
        const currentConcept = store.appConcept;

        if (!currentConcept) {
          throw new Error('No App Concept found. Please start from the Wizard.');
        }

        const updatedConcept = {
          ...currentConcept,
          layoutManifest: manifest,
        };

        // 3. Update Store locally first
        store.setAppConcept(updatedConcept);
        store.setCurrentLayoutManifest(manifest);

        // 4. Call API to Generate Phases
        const response = await fetch('/api/wizard/generate-phases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: updatedConcept }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate build plan');
        }

        const { plan } = await response.json();

        // 5. Store the Generated Plan
        store.setDynamicPhasePlan(plan);
        console.log('[LayoutBuilder] Generated Dynamic Phase Plan:', plan);
      } catch (error) {
        console.error('Plan Generation Error:', error);
        throw error; // Re-throw for UI to handle
      } finally {
        setIsAnalyzing(false);
      }
    }, [components, designSpec]),
  };
}

// Helper
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
