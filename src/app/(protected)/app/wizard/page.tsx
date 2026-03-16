'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import NaturalConversationWizard from '@/components/NaturalConversationWizard';
import { useAppStore } from '@/store/useAppStore';
import type { AppConcept } from '@/types/appConcept';

export default function WizardPage() {
  const router = useRouter();

  // Store actions
  const setAppConcept = useAppStore((state) => state.setAppConcept);
  const setCurrentAppId = useAppStore((state) => state.setCurrentAppId);
  const setDynamicPhasePlan = useAppStore((state) => state.setDynamicPhasePlan);
  const setDualArchitectureResult = useAppStore((state) => state.setDualArchitectureResult);
  const setCachedIntelligence = useAppStore((state) => state.setCachedIntelligence);
  const setCurrentComponent = useAppStore((state) => state.setCurrentComponent);
  const setLayoutBuilderFiles = useAppStore((state) => state.setLayoutBuilderFiles);
  const setComponents = useAppStore((state) => state.setComponents);
  const currentAppId = useAppStore((state) => state.currentAppId);

  const handleComplete = useCallback(
    (concept: AppConcept) => {
      // Generate a new appId if we don't have one yet
      // This ID will be used for documentation tracking
      const appId = currentAppId || crypto.randomUUID();
      if (!currentAppId) {
        setCurrentAppId(appId);
      }

      // Clear stale data from previous projects — these will be regenerated
      // downstream (Design → AI Plan → Review) for the new concept.
      setDynamicPhasePlan(null);
      setDualArchitectureResult(null);
      setCachedIntelligence(null);
      // Also clear builder state so stale data doesn't persist
      setCurrentComponent(null);
      setLayoutBuilderFiles(null);
      setComponents([]);

      // Save to store
      setAppConcept(concept);
      // Navigate to next step: Design
      router.push('/app/design');
    },
    [
      router,
      setAppConcept,
      setCurrentAppId,
      setDynamicPhasePlan,
      setDualArchitectureResult,
      setCachedIntelligence,
      setCurrentComponent,
      setLayoutBuilderFiles,
      setComponents,
      currentAppId,
    ]
  );

  const handleCancel = useCallback(() => {
    router.push('/app');
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-56px)] md:h-[calc(100vh-56px)]"
    >
      <NaturalConversationWizard onComplete={handleComplete} onCancel={handleCancel} isFullPage />
    </motion.div>
  );
}
