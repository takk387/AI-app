'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Palette, Loader2 } from 'lucide-react';
import { LayoutBuilderView } from '@/components/LayoutBuilderView';
import { useAppStore } from '@/store/useAppStore';
import { captureLayoutPreview } from '@/utils/screenshotCapture';

export default function DesignPage() {
  const router = useRouter();
  const appConcept = useAppStore((state) => state.appConcept);
  const currentLayoutManifest = useAppStore((state) => state.currentLayoutManifest);
  const setLayoutThumbnail = useAppStore((state) => state.setLayoutThumbnail);
  const dynamicPhasePlan = useAppStore((state) => state.dynamicPhasePlan);
  const setDynamicPhasePlan = useAppStore((state) => state.setDynamicPhasePlan);
  const layoutBuilderFiles = useAppStore((state) => state.layoutBuilderFiles);
  const setPhasePlanGeneratedAt = useAppStore((state) => state.setPhasePlanGeneratedAt);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleContinueToReview = useCallback(async () => {
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
    const hasLayoutInjectionPhase = dynamicPhasePlan?.phases.some((p) => p.isLayoutInjection);

    if (appConcept?.layoutManifest && !hasLayoutInjectionPhase) {
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

    // Navigate to review step
    router.push('/app/review');
  }, [
    router,
    setLayoutThumbnail,
    appConcept,
    dynamicPhasePlan,
    layoutBuilderFiles,
    setDynamicPhasePlan,
    setPhasePlanGeneratedAt,
  ]);

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
          </div>
        </div>

        <button
          onClick={handleContinueToReview}
          disabled={isTransitioning}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTransitioning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparing Review...
            </>
          ) : (
            <>
              Continue to Review
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Layout Builder */}
      <div className="flex-1 overflow-hidden">
        <LayoutBuilderView />
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
