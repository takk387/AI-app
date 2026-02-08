'use client';

/**
 * Review Page - Read-only confirmation before Builder
 *
 * This page displays:
 * - App concept summary
 * - Layout thumbnail
 * - Features list
 * - Phase plan overview
 * - Build settings
 *
 * User confirms everything before proceeding to Builder.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { LoaderIcon } from '@/components/ui/Icons';
import { useAppStore } from '@/store/useAppStore';
import { useDatabaseSync } from '@/hooks/useDatabaseSync';
import { useAuth } from '@/contexts/AuthContext';
import type { GeneratedComponent } from '@/types/aiBuilderTypes';
import {
  ConceptCard,
  LayoutCard,
  FeaturesCard,
  PhasesCard,
  SettingsCard,
  ReviewEmptyState,
  AIPlanCard,
} from '@/components/review';

export default function ReviewPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Database sync for saving component before navigation
  const { saveComponent } = useDatabaseSync({
    userId: user?.id || null,
    onError: (error) => console.error('Failed to save app:', error),
  });

  // Get state from store
  const appConcept = useAppStore((state) => state.appConcept);
  const dynamicPhasePlan = useAppStore((state) => state.dynamicPhasePlan);
  const layoutThumbnail = useAppStore((state) => state.layoutThumbnail);
  const currentLayoutManifest = useAppStore((state) => state.currentLayoutManifest);
  const layoutBuilderFiles = useAppStore((state) => state.layoutBuilderFiles);
  const buildSettings = useAppStore((state) => state.buildSettings);
  const dualArchitectureResult = useAppStore((state) => state.dualArchitectureResult);
  const userAISelection = useAppStore((state) => state.userAISelection);
  const currentAppId = useAppStore((state) => state.currentAppId);
  const setIsReviewed = useAppStore((state) => state.setIsReviewed);
  const setBuildSettings = useAppStore((state) => state.setBuildSettings);
  const setCurrentComponent = useAppStore((state) => state.setCurrentComponent);
  const setCurrentAppId = useAppStore((state) => state.setCurrentAppId);
  const setCurrentMode = useAppStore((state) => state.setCurrentMode);
  const setDynamicPhasePlan = useAppStore((state) => state.setDynamicPhasePlan);

  const [isRegeneratingPhases, setIsRegeneratingPhases] = useState(false);
  const [isSavingApp, setIsSavingApp] = useState(false);
  const hasTriggeredRegen = useRef(false);

  // Regenerate phases with architecture context when dualArchitectureResult arrives
  useEffect(() => {
    if (!dualArchitectureResult || !appConcept) return;
    if (dynamicPhasePlan?.hasArchitectureContext) return;
    if (hasTriggeredRegen.current) return;

    hasTriggeredRegen.current = true;
    setIsRegeneratingPhases(true);

    fetch('/api/wizard/generate-phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept: appConcept,
        dualArchitectureResult,
        layoutBuilderFiles: layoutBuilderFiles ?? undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.plan) {
          data.plan.layoutBuilderFiles = layoutBuilderFiles ?? undefined;
          data.plan.hasArchitectureContext = true;
          setDynamicPhasePlan(data.plan);
        }
      })
      .catch((err) => {
        console.warn('Failed to regenerate phases with architecture context:', err);
        // Allow retry on error
        hasTriggeredRegen.current = false;
      })
      .finally(() => setIsRegeneratingPhases(false));
  }, [
    dualArchitectureResult,
    appConcept,
    dynamicPhasePlan?.hasArchitectureContext,
    layoutBuilderFiles,
    setDynamicPhasePlan,
  ]);

  // Fallback: Generate phases from concept alone when AI Plan step was skipped
  useEffect(() => {
    if (dualArchitectureResult) return; // Let the architecture-aware effect handle it
    if (!appConcept) return;
    if (dynamicPhasePlan) return; // Already have a plan
    if (hasTriggeredRegen.current) return;

    hasTriggeredRegen.current = true;
    setIsRegeneratingPhases(true);

    fetch('/api/wizard/generate-phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept: appConcept,
        layoutBuilderFiles: layoutBuilderFiles ?? undefined,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.plan) {
          data.plan.layoutBuilderFiles = layoutBuilderFiles ?? undefined;
          setDynamicPhasePlan(data.plan);
        }
      })
      .catch((err) => {
        console.warn('Failed to generate phases:', err);
        hasTriggeredRegen.current = false;
      })
      .finally(() => setIsRegeneratingPhases(false));
  }, [
    appConcept,
    dualArchitectureResult,
    dynamicPhasePlan,
    layoutBuilderFiles,
    setDynamicPhasePlan,
  ]);

  const handleProceedToBuilder = useCallback(async () => {
    // Generate or use existing app ID
    const componentId = currentAppId || crypto.randomUUID();

    // Create GeneratedComponent from wizard data
    const newComponent: GeneratedComponent = {
      id: componentId,
      name: appConcept?.name || 'Untitled App',
      code: '', // Will be populated by layout injection or AI generation
      description: appConcept?.description || appConcept?.purpose || '',
      timestamp: new Date().toISOString(),
      isFavorite: false,
      conversationHistory: [],
      versions: [],
      // Link all wizard data to the component
      appConcept: appConcept ?? undefined,
      dynamicPhasePlan: dynamicPhasePlan ?? undefined,
      layoutManifest: currentLayoutManifest ?? undefined,
      layoutThumbnail: layoutThumbnail ?? undefined,
      buildStatus: 'building',
    };

    // Set in store first
    setCurrentComponent(newComponent);
    if (!currentAppId) {
      setCurrentAppId(componentId);
    }

    // CRITICAL: Save to database BEFORE navigating
    // This ensures data is persisted even if Builder fails to load
    setIsSavingApp(true);
    try {
      await saveComponent(newComponent);
      // Also save app ID to localStorage for refresh persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_app_id', componentId);
      }
    } catch (error) {
      console.error('Failed to save app before navigation:', error);
      // Continue anyway - data is in memory, will auto-save in Builder
    } finally {
      setIsSavingApp(false);
    }

    // Set mode to ACT for builder
    setCurrentMode('ACT');

    // Mark as reviewed
    setIsReviewed(true);

    // Navigate to builder
    router.push('/app');
  }, [
    router,
    setIsReviewed,
    setCurrentComponent,
    setCurrentAppId,
    setCurrentMode,
    saveComponent,
    currentAppId,
    appConcept,
    dynamicPhasePlan,
    currentLayoutManifest,
    layoutThumbnail,
  ]);

  const handleGoToWizard = useCallback(() => {
    router.push('/app/wizard');
  }, [router]);

  const handleGoToDesign = useCallback(() => {
    router.push('/app/design');
  }, [router]);

  const handleGoToAIPlan = useCallback(() => {
    router.push('/app/ai-plan');
  }, [router]);

  // If no concept exists, show empty state
  if (!appConcept) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-[calc(100vh-56px)] flex flex-col"
        style={{ background: 'var(--bg-primary)' }}
      >
        <ReviewEmptyState type="no-concept" onAction={handleGoToWizard} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-56px)] flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Review: {appConcept.name}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Confirm your app configuration before building
            </p>
          </div>
        </div>

        <button
          onClick={handleProceedToBuilder}
          disabled={!dynamicPhasePlan || isRegeneratingPhases || isSavingApp}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegeneratingPhases ? (
            <>
              <LoaderIcon size={16} className="opacity-70" />
              Generating Plan...
            </>
          ) : isSavingApp ? (
            <>
              <LoaderIcon size={16} className="opacity-70" />
              Saving App...
            </>
          ) : (
            <>
              Proceed to Builder
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          {/* Two-column grid for concept and layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ConceptCard concept={appConcept} onEdit={handleGoToWizard} />
            <LayoutCard
              thumbnail={layoutThumbnail}
              layoutManifest={currentLayoutManifest}
              fileCount={layoutBuilderFiles?.length ?? 0}
              onEdit={handleGoToDesign}
            />
          </div>

          {/* AI Architecture Plan */}
          {dualArchitectureResult && (
            <div className="mb-6">
              <AIPlanCard
                architecture={dualArchitectureResult}
                aiSelection={userAISelection}
                onEdit={handleGoToAIPlan}
              />
            </div>
          )}

          {/* Features */}
          <div className="mb-6">
            <FeaturesCard features={appConcept.coreFeatures} />
          </div>

          {/* Two-column grid for phases and settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dynamicPhasePlan ? (
              <PhasesCard
                phases={dynamicPhasePlan.phases}
                estimatedTotalTime={dynamicPhasePlan.estimatedTotalTime}
                isLoading={isRegeneratingPhases}
              />
            ) : isRegeneratingPhases ? (
              <div
                className="p-6 rounded-xl"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center gap-3 py-8 justify-center">
                  <LoaderIcon size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Generating build plan...</span>
                </div>
              </div>
            ) : (
              <div
                className="p-6 rounded-xl"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <ReviewEmptyState type="no-phases" onAction={handleGoToWizard} />
              </div>
            )}
            <SettingsCard settings={buildSettings} onChange={setBuildSettings} />
          </div>
        </div>
      </div>

      {/* Footer with proceed button (mobile) */}
      <div
        className="flex-shrink-0 px-6 py-4 border-t md:hidden"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <button
          onClick={handleProceedToBuilder}
          disabled={!dynamicPhasePlan || isRegeneratingPhases || isSavingApp}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegeneratingPhases ? (
            <>
              <LoaderIcon size={16} className="opacity-70" />
              Generating Plan...
            </>
          ) : isSavingApp ? (
            <>
              <LoaderIcon size={16} className="opacity-70" />
              Saving App...
            </>
          ) : (
            <>
              Proceed to Builder
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
