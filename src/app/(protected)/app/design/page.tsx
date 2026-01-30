'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Palette } from 'lucide-react';
import { LayoutBuilderView } from '@/components/LayoutBuilderView';
import { useAppStore } from '@/store/useAppStore';

export default function DesignPage() {
  const router = useRouter();
  const appConcept = useAppStore((state) => state.appConcept);
  const currentLayoutManifest = useAppStore((state) => state.currentLayoutManifest);

  const handleContinueToBuild = useCallback(() => {
    // Layout is auto-saved via useLayoutBuilder's saveToWizard
    // Navigate to build step
    router.push('/app/build');
  }, [router]);

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
          onClick={handleContinueToBuild}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Continue to Build
          <ArrowRight className="w-4 h-4" />
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
