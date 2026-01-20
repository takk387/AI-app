'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutBuilderWizard } from '@/components/LayoutBuilderWizard';
import { AppConcept } from '@/types/appConcept';

export default function DesignPage() {
  const router = useRouter();
  // For now, create a mock appConcept - in production this would come from your store
  const [appConcept] = useState<AppConcept>({
    name: 'My App',
    description: 'App created with AI',
    purpose: 'To demonstrate layout builder',
    targetUsers: 'General users',
    coreFeatures: [],
    uiPreferences: {
      style: 'modern',
      colorScheme: 'light',
      layout: 'single-page',
    },
    technical: {
      needsAuth: false,
      needsDatabase: false,
      needsAPI: false,
      needsFileUpload: false,
      needsRealtime: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleClose = useCallback(() => {
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
      <LayoutBuilderWizard
        isOpen={true}
        onClose={handleClose}
        appConcept={appConcept}
      />
    </motion.div>
  );
}
