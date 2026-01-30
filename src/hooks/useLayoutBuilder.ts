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

import { useState, useCallback, useRef, useEffect } from 'react';
import { DetectedComponentEnhanced } from '@/types/layoutDesign';
import { extractKeyframes } from '@/utils/videoProcessor';
import { sanitizeComponents } from '@/utils/layoutValidation';
import type { LayoutAnalysisResult } from '@/types/layoutAnalysis';
import type { DesignSpec } from '@/types/designSpec';
import type { VisionLoopProgress, SelfHealingResult } from '@/services/VisionLoopEngine';
import {
  groupComponents as groupComponentsUtil,
  ungroupComponent as ungroupComponentUtil,
  reparentComponent as reparentComponentUtil,
} from '@/components/layout-builder/ComponentGroupManager';
import { analyzeVideoEnhanced } from '@/services/EnhancedVideoAnalyzer';
import {
  mapMotionToComponents,
  applyBasicMotion,
  motionToVisualEffects,
} from '@/services/MotionMapper';

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
  originalImage: string | null;

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

  // Component Management Actions (Gap 4)
  groupComponents: (ids: string[]) => void;
  ungroupComponent: (groupId: string) => void;
  reparentComponent: (componentId: string, newParentId: string | null) => void;
  renameComponent: (id: string, name: string) => void;
  toggleComponentVisibility: (id: string) => void;
  toggleComponentLock: (id: string) => void;

  // Direct Manipulation Actions (Gap 3)
  updateComponentBounds: (
    id: string,
    bounds: { top: number; left: number; width: number; height: number }
  ) => void;

  // AI Actions
  analyzeImage: (file: File, instructions?: string, sourceId?: string) => Promise<void>;
  analyzeVideo: (file: File, instructions?: string, sourceId?: string) => Promise<void>;
  triggerCritique: (originalImage: string, canvasElement: HTMLElement) => Promise<void>;
  generatePhasePlan: () => Promise<void>;

  // Self-Healing Actions
  runSelfHealingLoop: (
    originalImage: string,
    renderToHtml: () => string
  ) => Promise<SelfHealingResult | null>;
  cancelHealing: () => void;
  registerRenderToHtml: (callback: (() => string) | null) => void;
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
  const visionLoopEngineRef = useRef<{ abort: () => void; executeStep: any } | null>(null);

  // Step-based healing state for React re-render synchronization
  const [healingState, setHealingState] = useState<{
    isActive: boolean;
    iteration: number;
    maxIterations: number;
    currentFidelity: number;
    previousFidelity: number;
    originalImage: string;
  } | null>(null);
  const renderToHtmlRef = useRef<(() => string) | null>(null);

  // Auto-trigger self-healing state
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [autoHealingTriggered, setAutoHealingTriggered] = useState(false);
  const renderToHtmlCallbackRef = useRef<(() => string) | null>(null);

  // Pending video motion data — applied when image analysis completes
  const pendingMotionRef = useRef<
    import('@/types/motionConfig').EnhancedVideoMotionAnalysis | null
  >(null);

  // Apply deferred motion when components arrive after video was analyzed first
  useEffect(() => {
    if (pendingMotionRef.current && components.length > 0) {
      const pendingMotion = pendingMotionRef.current;
      pendingMotionRef.current = null;
      if (pendingMotion.componentMotions && pendingMotion.componentMotions.length > 0) {
        const withMotion = mapMotionToComponents(pendingMotion, components);
        setComponents(withMotion);
      } else if (pendingMotion.transitions && pendingMotion.transitions.length > 0) {
        const withMotion = applyBasicMotion(pendingMotion, components);
        setComponents(withMotion);
      }
    }
  }, [components]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearErrors = useCallback(() => {
    setAnalysisErrors([]);
    setAnalysisWarnings([]);
  }, []);

  // Allow UI to register the renderToHtml callback for auto-trigger
  const registerRenderToHtml = useCallback((callback: (() => string) | null) => {
    renderToHtmlCallbackRef.current = callback;
  }, []);

  // --- Step-Based Self-Healing Orchestration ---
  // This useEffect triggers the next healing step AFTER React has re-rendered
  // the updated components, ensuring screenshots capture the actual DOM state
  useEffect(() => {
    // Only run if healing is active
    if (!healingState?.isActive || !isHealing) return;

    // Don't run while other analysis is happening
    if (isAnalyzing) return;

    // Check stopping conditions
    if (healingState.iteration >= healingState.maxIterations) {
      console.log('[useLayoutBuilder] Max iterations reached, stopping healing');
      setHealingState(null);
      setIsHealing(false);
      return;
    }

    if (healingState.currentFidelity >= 95) {
      console.log('[useLayoutBuilder] Target fidelity reached, stopping healing');
      setHealingState(null);
      setIsHealing(false);
      return;
    }

    // Check for diminishing returns (after first iteration)
    if (healingState.iteration > 0) {
      const improvement = healingState.currentFidelity - healingState.previousFidelity;
      if (improvement < 2 && improvement >= 0) {
        console.log('[useLayoutBuilder] Diminishing returns, stopping healing');
        setHealingState(null);
        setIsHealing(false);
        return;
      }
    }

    // Execute next step after a small delay to ensure DOM is painted
    const timeoutId = setTimeout(async () => {
      const engine = visionLoopEngineRef.current;
      const renderToHtml = renderToHtmlRef.current;

      if (!engine || !renderToHtml || !designSpec) {
        console.error('[useLayoutBuilder] Missing engine, renderToHtml, or designSpec');
        setHealingState(null);
        setIsHealing(false);
        return;
      }

      try {
        console.log(`[useLayoutBuilder] Executing healing step ${healingState.iteration + 1}`);

        const result = await engine.executeStep(
          healingState.originalImage,
          components,
          designSpec,
          renderToHtml,
          healingState.iteration + 1
        );

        // Update components - this will trigger a re-render
        // The next useEffect run will see the updated healingState
        setComponents(result.components);

        // Update healing state for next iteration
        if (result.shouldContinue) {
          setHealingState((prev) =>
            prev
              ? {
                  ...prev,
                  iteration: prev.iteration + 1,
                  previousFidelity: prev.currentFidelity,
                  currentFidelity: result.fidelityScore,
                }
              : null
          );
        } else {
          // Healing complete
          console.log('[useLayoutBuilder] Healing complete:', result.stopReason);
          setLastHealingResult({
            finalComponents: result.components,
            finalDesignSpec: designSpec,
            iterations: healingState.iteration + 1,
            finalFidelityScore: result.fidelityScore,
            targetReached: result.stopReason === 'target_reached',
            stopReason: result.stopReason || 'max_iterations',
            history: [],
          });
          setHealingState(null);
          setIsHealing(false);
        }
      } catch (error) {
        console.error('[useLayoutBuilder] Healing step error:', error);
        setHealingState(null);
        setIsHealing(false);
      }
    }, 100); // Small delay to ensure DOM paint

    return () => clearTimeout(timeoutId);
  }, [healingState, isHealing, isAnalyzing, components, designSpec]);

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

  // --- Source-Aware Component Application ---

  /**
   * Apply analyzed components: if sourceId is provided, tag them and append
   * (additive merge). Otherwise replace all components (legacy behavior).
   */
  const applyAnalyzedComponents = useCallback(
    (newComponents: DetectedComponentEnhanced[], sourceId?: string) => {
      if (sourceId) {
        // Tag all new components with sourceId
        const tagged = newComponents.map((c) => ({ ...c, sourceId }));
        // Additive: remove old components from this source, then append new
        setComponents((prev) => [...prev.filter((c) => c.sourceId !== sourceId), ...tagged]);
      } else {
        // Legacy: replace all
        setComponents(newComponents);
      }
    },
    []
  );

  // --- AI Interactions ---

  const analyzeImage = useCallback(
    async (file: File, instructions?: string, sourceId?: string) => {
      setIsAnalyzing(true);
      setAutoHealingTriggered(false); // Reset for new image analysis
      clearErrors();

      try {
        const base64 = await fileToBase64(file);
        setOriginalImage(base64); // Store original image for self-healing

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
          console.error(
            '[useLayoutBuilder] API returned error:',
            (result as { error: string }).error
          );
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
          console.log(
            '[useLayoutBuilder] Received',
            validatedComponents.length,
            'components from API'
          );

          // Store the design spec if available
          if (result.designSpec) {
            setDesignSpec(result.designSpec);
            console.log('[useLayoutBuilder] DesignSpec stored:', {
              primaryColor: result.designSpec.colorPalette?.primary,
              structure: result.designSpec.structure?.type,
            });

            // Also store in global app store for export and other features
            import('@/store/useAppStore')
              .then(({ useAppStore }) => {
                useAppStore.getState().setCurrentDesignSpec?.(result.designSpec);
              })
              .catch(() => {
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

          applyAnalyzedComponents(validatedComponents, sourceId);
        } else {
          // Fallback for legacy array response (backward compatibility)
          const validatedComponents = Array.isArray(result) ? result : [];
          console.log(
            '[useLayoutBuilder] Legacy response format, received',
            validatedComponents.length,
            'components'
          );
          applyAnalyzedComponents(validatedComponents, sourceId);
        }
      } catch (error) {
        console.error('Image analysis error:', error);
        if (error instanceof Error && !analysisErrors.includes(error.message)) {
          setAnalysisErrors((prev) => [...prev, error.message]);
        }
      } finally {
        setIsAnalyzing(false);
      }
    },
    [clearErrors, analysisErrors]
  );

  const analyzeVideo = useCallback(
    async (file: File, instructions?: string, sourceId?: string) => {
      setIsAnalyzing(true);
      try {
        // 1. Extract frames in browser (Client-Side Strategy)
        const frames = await extractKeyframes(file, { keyframeCount: 3 });
        const base64Frames = frames.map((f) => f.image);

        // 2. Get existing component types for targeted motion extraction
        const existingTypes = [...new Set(components.map((c) => c.type))];

        // 3. Analyze with enhanced prompt for per-component motion assignments
        const enhancedMotion = await analyzeVideoEnhanced(
          base64Frames,
          existingTypes.length > 0 ? existingTypes : undefined,
          instructions
        );

        console.log('[useLayoutBuilder] Enhanced Video Motion:', enhancedMotion);

        // 4. Apply motion to existing components (setComponents, not history-aware,
        //    since this is an initial AI analysis, not a user edit action)
        // 5. Extract background visual effects (particles, gradient-shift, aurora, waves)
        const bgEffects = motionToVisualEffects(enhancedMotion);

        if (components.length > 0) {
          // Tag components with sourceId if provided (multi-source tracking)
          const tagComponent = (c: DetectedComponentEnhanced): DetectedComponentEnhanced =>
            sourceId ? { ...c, sourceId } : c;

          let result: DetectedComponentEnhanced[];
          if (enhancedMotion.componentMotions && enhancedMotion.componentMotions.length > 0) {
            result = mapMotionToComponents(enhancedMotion, components).map(tagComponent);
          } else if (enhancedMotion.transitions && enhancedMotion.transitions.length > 0) {
            result = applyBasicMotion(enhancedMotion, components).map(tagComponent);
          } else {
            result = components.map(tagComponent);
          }

          // Apply background visual effects to the first root component (hero or first)
          if (bgEffects.length > 0 && result.length > 0) {
            const targetIdx = result.findIndex((c) => c.type === 'hero') ?? 0;
            const idx = targetIdx >= 0 ? targetIdx : 0;
            result = result.map((c, i) =>
              i === idx ? { ...c, visualEffects: [...(c.visualEffects ?? []), ...bgEffects] } : c
            );
          }

          setComponents(result);
        } else {
          // No components yet — store motion data for deferred application
          console.log(
            '[useLayoutBuilder] No components yet. Motion data stored for deferred application.'
          );
          pendingMotionRef.current = enhancedMotion;
        }
      } catch (error) {
        console.error('Video analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [components]
  );

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
   * Uses step-based architecture: each iteration waits for React to re-render
   * before capturing the next screenshot, ensuring DOM state is accurate.
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

      // Prevent starting if already healing
      if (isHealing) {
        console.warn('[useLayoutBuilder] Self-healing already in progress');
        return null;
      }

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

        // Store references for step-based healing
        visionLoopEngineRef.current = engine;
        renderToHtmlRef.current = renderToHtml;

        // Save pre-healing snapshot to history
        setHistory((h) => [...h, components]);
        console.log('[useLayoutBuilder] Saved pre-healing snapshot');

        // Initialize step-based healing state
        // The useEffect will pick this up and run the first step
        setIsHealing(true);
        setHealingProgress(null);
        setLastHealingResult(null);
        setHealingState({
          isActive: true,
          iteration: 0,
          maxIterations: 3,
          currentFidelity: 0,
          previousFidelity: 0,
          originalImage,
        });

        console.log('[useLayoutBuilder] Step-based healing initiated');

        // Return null immediately - the actual result will be set by useEffect
        // when healing completes. This is intentional for step-based architecture.
        return null;
      } catch (error) {
        console.error('[useLayoutBuilder] Self-healing initialization error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Self-healing failed';
        setAnalysisErrors((prev) => [...prev, errorMsg]);
        setIsHealing(false);
        return null;
      }
    },
    [components, designSpec, isHealing]
  );

  /**
   * Cancel an in-progress self-healing loop
   */
  const cancelHealing = useCallback(() => {
    if (visionLoopEngineRef.current) {
      visionLoopEngineRef.current.abort();
    }
    // Clear step-based healing state
    setHealingState(null);
    setIsHealing(false);
    renderToHtmlRef.current = null;
    console.log('[useLayoutBuilder] Self-healing cancelled by user');
  }, []);

  // --- Auto-Trigger Self-Healing After Initial Analysis ---
  // This useEffect automatically triggers the self-healing loop once:
  // - Components have been analyzed
  // - Design spec is available
  // - Original image is stored
  // - UI has registered the renderToHtml callback
  // - Not already analyzing or healing
  useEffect(() => {
    // Diagnostic logging: already triggered check
    if (autoHealingTriggered) {
      // Only log once to avoid spam (check if conditions were met)
      return;
    }

    // Collect missing conditions for diagnostic logging
    const missingConditions: string[] = [];
    if (components.length === 0) missingConditions.push('no components');
    if (!designSpec) missingConditions.push('no designSpec');
    if (!originalImage) missingConditions.push('no originalImage');
    if (!renderToHtmlCallbackRef.current) missingConditions.push('no renderToHtml callback');
    if (isAnalyzing) missingConditions.push('still analyzing');
    if (isHealing) missingConditions.push('already healing');

    // If any conditions are missing, log and return
    if (missingConditions.length > 0) {
      console.log('[useLayoutBuilder] Auto-healing waiting for:', missingConditions.join(', '));
      return;
    }

    // All conditions met - proceed with auto-healing
    console.log('[useLayoutBuilder] Auto-healing: All conditions met, triggering...');
    setAutoHealingTriggered(true);

    // Capture current values to avoid race conditions
    const capturedImage = originalImage;
    const capturedCallback = renderToHtmlCallbackRef.current;

    // Small delay to ensure DOM is painted with initial components
    const timeoutId = setTimeout(() => {
      if (!capturedImage || !capturedCallback) {
        console.warn('[useLayoutBuilder] Auto-healing aborted: values became null');
        return;
      }
      console.log('[useLayoutBuilder] Auto-triggering self-healing loop');
      runSelfHealingLoop(capturedImage, capturedCallback);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    components.length,
    designSpec,
    originalImage,
    isAnalyzing,
    isHealing,
    autoHealingTriggered,
    runSelfHealingLoop,
  ]);

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

  // --- Component Management Actions (Gap 4) ---

  const groupComponents = useCallback(
    (ids: string[]) => {
      updateComponentsWithHistory((prev) => groupComponentsUtil(ids, prev));
    },
    [updateComponentsWithHistory]
  );

  const ungroupComponent = useCallback(
    (groupId: string) => {
      updateComponentsWithHistory((prev) => ungroupComponentUtil(groupId, prev));
    },
    [updateComponentsWithHistory]
  );

  const reparentComponent = useCallback(
    (componentId: string, newParentId: string | null) => {
      updateComponentsWithHistory((prev) => reparentComponentUtil(componentId, newParentId, prev));
    },
    [updateComponentsWithHistory]
  );

  const renameComponent = useCallback(
    (id: string, name: string) => {
      updateComponentsWithHistory((prev) =>
        prev.map((c) => (c.id === id ? { ...c, displayName: name } : c))
      );
    },
    [updateComponentsWithHistory]
  );

  const toggleComponentVisibility = useCallback(
    (id: string) => {
      updateComponentsWithHistory((prev) =>
        prev.map((c) => (c.id === id ? { ...c, visible: c.visible === false } : c))
      );
    },
    [updateComponentsWithHistory]
  );

  const toggleComponentLock = useCallback(
    (id: string) => {
      updateComponentsWithHistory((prev) =>
        prev.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c))
      );
    },
    [updateComponentsWithHistory]
  );

  // --- Direct Manipulation Actions (Gap 3) ---

  const updateComponentBounds = useCallback(
    (id: string, bounds: { top: number; left: number; width: number; height: number }) => {
      updateComponentsWithHistory((prev) =>
        prev.map((c) => (c.id === id ? { ...c, bounds: { ...c.bounds, ...bounds } } : c))
      );
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
    originalImage,

    setComponents: updateComponentsWithHistory, // Expose history-aware setter
    selectComponent,
    updateComponentStyle,
    deleteComponent,
    duplicateComponent,
    applyAIEdit,
    undo,
    redo,
    exportCode,
    saveToWizard,

    // Component Management (Gap 4)
    groupComponents,
    ungroupComponent,
    reparentComponent,
    renameComponent,
    toggleComponentVisibility,
    toggleComponentLock,

    // Direct Manipulation (Gap 3)
    updateComponentBounds,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    clearErrors,
    analyzeImage,
    analyzeVideo,
    triggerCritique,

    // Self-Healing Actions
    runSelfHealingLoop,
    cancelHealing,
    registerRenderToHtml,
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
