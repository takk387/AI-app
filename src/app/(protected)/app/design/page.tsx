'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Palette, Loader2, Zap, Brain, CheckCircle2 } from 'lucide-react';
import { LayoutBuilderView } from '@/components/LayoutBuilderView';
import type { LayoutBuilderViewHandle } from '@/components/LayoutBuilderView';
import { useAppStore } from '@/store/useAppStore';
import { useBackgroundIntelligence } from '@/hooks/useBackgroundIntelligence';
import { captureLayoutPreview } from '@/utils/screenshotCapture';

export default function DesignPage() {
  const router = useRouter();
  const layoutBuilderRef = useRef<LayoutBuilderViewHandle>(null);
  const appConcept = useAppStore((state) => state.appConcept);
  const currentLayoutManifest = useAppStore((state) => state.currentLayoutManifest);
  const setLayoutThumbnail = useAppStore((state) => state.setLayoutThumbnail);
  const dynamicPhasePlan = useAppStore((state) => state.dynamicPhasePlan);
  const setDynamicPhasePlan = useAppStore((state) => state.setDynamicPhasePlan);
  const layoutBuilderFiles = useAppStore((state) => state.layoutBuilderFiles);
  const setPhasePlanGeneratedAt = useAppStore((state) => state.setPhasePlanGeneratedAt);

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Start intelligence gathering in background while user designs layout
  const { isGathering, hasCache } = useBackgroundIntelligence();

  const handleGenerateFullLayout = useCallback(() => {
    layoutBuilderRef.current?.generateFullLayout();
  }, []);

  const handleContinueToAIPlan = useCallback(async () => {
    setIsTransitioning(true);

    // Capture layout thumbnail for review page
    try {
      const result = await captureLayoutPreview('layout-builder-preview');
      if (result?.success && result.dataUrl) {
        setLayoutThumbnail({
          dataUrl: result.dataUrl,
          capturedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Failed to capture layout thumbnail:', e);
    }

    // Regenerate phase plan with layout context if layout was built
    // (kept as fallback for non-dual-AI path)
    const hasLayoutInjectionPhase = dynamicPhasePlan?.phases.some((p) => p.isLayoutInjection);

    if ((appConcept?.layoutManifest || layoutBuilderFiles?.length) && !hasLayoutInjectionPhase) {
      try {
        const response = await fetch('/api/wizard/generate-phases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: appConcept }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.plan) {
            // Attach layout builder files to the plan for downstream injection
            data.plan.layoutBuilderFiles = layoutBuilderFiles ?? undefined;
            setDynamicPhasePlan(data.plan);
            setPhasePlanGeneratedAt(new Date().toISOString());
          }
        } else {
          console.warn('Failed to regenerate phase plan:', response.status);
        }
      } catch (e) {
        console.warn('Failed to regenerate phase plan:', e);
      }
    } else if (dynamicPhasePlan && layoutBuilderFiles) {
      // Plan already has layout injection, just update the files reference
      setDynamicPhasePlan({
        ...dynamicPhasePlan,
        layoutBuilderFiles,
      });
    }

    setIsTransitioning(false);

    // Navigate to AI Plan step (dual AI architecture planning)
    router.push('/app/ai-plan');
  }, [
    router,
    setLayoutThumbnail,
    appConcept,
    dynamicPhasePlan,
    layoutBuilderFiles,
    setDynamicPhasePlan,
    setPhasePlanGeneratedAt,
  ]);

  const hasFeatures = (appConcept?.coreFeatures?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-56px)] md:h-[calc(100vh-56px)] flex flex-col"
    >
      {/* Header with app context and navigation */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Palette className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {appConcept?.name ? `Design: ${appConcept.name}` : 'Design Your Layout'}
            </h1>
            {appConcept?.description && (
              <p className="text-sm text-gray-500 truncate max-w-md">{appConcept.description}</p>
            )}
            {/* Background intelligence status */}
            {isGathering && (
              <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                <Brain className="w-3 h-3 animate-pulse" />
                Gathering AI intelligence...
              </p>
            )}
            {!isGathering && hasCache && (
              <p className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                Intelligence ready
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Generate Full Layout button — shown when concept has features and no layout yet */}
          {hasFeatures && !currentLayoutManifest && (
            <button
              onClick={handleGenerateFullLayout}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              <Zap className="w-4 h-4" />
              Generate Full Layout
            </button>
          )}

          <button
            onClick={handleContinueToAIPlan}
            disabled={isTransitioning}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTransitioning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparing AI Plan...
              </>
            ) : (
              <>
                Continue to AI Plan
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Layout Builder */}
      <div className="flex-1 overflow-hidden">
        <LayoutBuilderView ref={layoutBuilderRef} />
      </div>

      {/* Optional: Show layout status */}
      {currentLayoutManifest && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Layout saved: {currentLayoutManifest.detectedFeatures?.length || 0} features detected
          </p>
        </div>
      )}
    </motion.div>
  );
}
