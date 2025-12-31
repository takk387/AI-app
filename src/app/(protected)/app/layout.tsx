'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppNavigation } from '@/components/AppNavigation';
import { SideDrawer } from '@/components/SideDrawer';
import { ToastProvider } from '@/components/Toast';
import { useAppStore } from '@/store/useAppStore';
import { useDatabaseSync } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();

  // Get project info from store
  const currentComponent = useAppStore((state) => state.currentComponent);
  const components = useAppStore((state) => state.components);
  const setShowVersionHistory = useAppStore((state) => state.setShowVersionHistory);
  const showVersionHistory = useAppStore((state) => state.showVersionHistory);
  const setShowLibrary = useAppStore((state) => state.setShowLibrary);
  const showLibrary = useAppStore((state) => state.showLibrary);
  const setShowSettings = useAppStore((state) => state.setShowSettings);

  // Database sync
  const { saveComponent, isLoading: isSyncing } = useDatabaseSync({
    userId: user?.id || null,
  });

  const handleSave = useCallback(async () => {
    if (currentComponent) {
      await saveComponent(currentComponent);
    }
  }, [currentComponent, saveComponent]);

  const handleShowHistory = useCallback(() => {
    setShowVersionHistory(!showVersionHistory);
  }, [showVersionHistory, setShowVersionHistory]);

  const handleShowLibrary = useCallback(() => {
    setShowLibrary(!showLibrary);
  }, [showLibrary, setShowLibrary]);

  const handleShowSettings = useCallback(() => {
    setShowSettings(true);
    setDrawerOpen(false);
  }, [setShowSettings]);

  const projectName = currentComponent?.name || 'Untitled Project';

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"
            animate={{
              x: [0, 30, 0],
              y: [0, 20, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute top-1/3 -right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]"
            animate={{
              x: [0, -20, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px]"
            animate={{
              x: [0, 25, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Navigation */}
        <AppNavigation
          projectName={projectName}
          onSave={currentComponent ? handleSave : undefined}
          isSaving={isSyncing}
          onMenuClick={() => setDrawerOpen(true)}
        />

        {/* Main Content */}
        <main className="relative pt-14 md:pt-14">{children}</main>

        {/* Side Drawer */}
        <SideDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onShowSettings={handleShowSettings}
          onShowHistory={handleShowHistory}
          onShowLibrary={handleShowLibrary}
          versionCount={currentComponent?.versions?.length || 0}
          appCount={components.length}
        />
      </div>
    </ToastProvider>
  );
}
