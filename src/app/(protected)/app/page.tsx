'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MainBuilderView } from '@/components/MainBuilderView';
import { useAppStore } from '@/store/useAppStore';

export default function AppPage() {
  const router = useRouter();
  const appConcept = useAppStore((state) => state.appConcept);
  const currentComponent = useAppStore((state) => state.currentComponent);

  // Redirect new users to wizard if no app concept or saved component exists
  useEffect(() => {
    if (!appConcept && !currentComponent) {
      router.replace('/app/wizard');
    }
  }, [appConcept, currentComponent, router]);

  // Show loading while checking/redirecting
  if (!appConcept && !currentComponent) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <MainBuilderView />
    </motion.div>
  );
}
