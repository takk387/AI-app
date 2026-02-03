'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppNavigation } from '@/components/AppNavigation';
import { SideDrawer } from '@/components/SideDrawer';
import { ToastProvider } from '@/components/Toast';
import { useAppStore } from '@/store/useAppStore';
import { useDatabaseSync, useAutoSaveOnNavigation } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();

  // Get project info from store
  const currentComponent = useAppStore((state) => state.currentComponent);
  const setCurrentComponent = useAppStore((state) => state.setCurrentComponent);
  const components = useAppStore((state) => state.components);
  const setComponents = useAppStore((state) => state.setComponents);
  const setShowVersionHistory = useAppStore((state) => state.setShowVersionHistory);
  const showVersionHistory = useAppStore((state) => state.showVersionHistory);
  const setShowLibrary = useAppStore((state) => state.setShowLibrary);
  const showLibrary = useAppStore((state) => state.showLibrary);
  const setShowSettings = useAppStore((state) => state.setShowSettings);

  // Get wizard/design data that needs to be synced to currentComponent before save
  const appConcept = useAppStore((state) => state.appConcept);
  const currentLayoutManifest = useAppStore((state) => state.currentLayoutManifest);
  const layoutThumbnail = useAppStore((state) => state.layoutThumbnail);
  const dynamicPhasePlan = useAppStore((state) => state.dynamicPhasePlan);
  const layoutBuilderFiles = useAppStore((state) => state.layoutBuilderFiles);

  // Database sync
  const { saveComponent, isLoading: isSyncing } = useDatabaseSync({
    userId: user?.id || null,
  });

  // Auto-save on page navigation - ensures wizard/design data is persisted when changing pages
  useAutoSaveOnNavigation({
    enabled: !!currentComponent && !!user?.id,
  });

  /**
   * Save with store sync - ensures wizard/design data is synced to currentComponent before saving
   * This fixes the bug where modifications to appConcept, layoutManifest, etc. in wizard/design
   * pages were not being saved because they only updated the Zustand store, not currentComponent.
   */
  const handleSave = useCallback(async () => {
    if (currentComponent) {
      // Sync the latest store state to currentComponent before saving
      const syncedComponent = {
        ...currentComponent,
        appConcept: appConcept ?? currentComponent.appConcept,
        layoutManifest: currentLayoutManifest ?? currentComponent.layoutManifest,
        layoutThumbnail: layoutThumbnail ?? currentComponent.layoutThumbnail,
        dynamicPhasePlan: dynamicPhasePlan ?? currentComponent.dynamicPhasePlan,
        // Determine build status based on what data we have
        buildStatus: appConcept
          ? currentLayoutManifest
            ? currentComponent.code
              ? 'building'
              : 'designing'
            : 'planning'
          : currentComponent.buildStatus,
      };

      // Update currentComponent in store with synced data
      setCurrentComponent(syncedComponent);

      // Also update in components array
      setComponents((prev) =>
        prev.map((comp) => (comp.id === currentComponent.id ? syncedComponent : comp))
      );

      // Save to database
      await saveComponent(syncedComponent);
    }
  }, [
    currentComponent,
    appConcept,
    currentLayoutManifest,
    layoutThumbnail,
    dynamicPhasePlan,
    saveComponent,
    setCurrentComponent,
    setComponents,
  ]);

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
      <div
        className="min-h-screen relative overflow-hidden"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Animated Background Gradients */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-garden-600/10 rounded-full blur-[120px]"
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
            className="absolute top-1/3 -right-1/4 w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[120px]"
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
