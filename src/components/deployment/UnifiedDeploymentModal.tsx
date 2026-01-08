'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DeploymentPlatform } from '@/types/deployment/unified';
import { useUnifiedDeployment } from '@/hooks/useUnifiedDeployment';
import { DeploymentProgress } from './DeploymentProgress';
import { WebDeployPanel } from './WebDeployPanel';
import { MobileDeployPanel } from './MobileDeployPanel';
import { DesktopDeployPanel } from './DesktopDeployPanel';

interface UnifiedDeploymentModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'web' | 'mobile' | 'desktop';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  platforms: DeploymentPlatform[];
}

const tabs: Tab[] = [
  {
    id: 'web',
    label: 'Web',
    platforms: ['web'],
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
    ),
  },
  {
    id: 'mobile',
    label: 'Mobile',
    platforms: ['ios', 'android'],
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: 'desktop',
    label: 'Desktop',
    platforms: ['windows', 'macos', 'linux'],
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export function UnifiedDeploymentModal({
  projectId,
  projectName,
  isOpen,
  onClose,
}: UnifiedDeploymentModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('web');
  const deployment = useUnifiedDeployment(projectId);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      deployment.reset();
      setActiveTab('web');
    }
    // deployment.reset is stable (memoized with useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deployment.isDeploying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, deployment.isDeploying, onClose]);

  if (!isOpen) return null;

  const isDeploying = deployment.isDeploying;
  const showProgress = isDeploying || deployment.progress.status !== 'idle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Deploy Project
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isDeploying}
            className="p-2 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              if (!isDeploying) e.currentTarget.style.background = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs - Only show when not deploying */}
        {!showProgress && (
          <div
            className="flex border-b px-6"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px"
                style={{
                  borderColor: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {showProgress ? (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DeploymentProgress
                  progress={deployment.progress}
                  onCancel={deployment.cancel}
                  onReset={deployment.reset}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'web' && (
                  <WebDeployPanel
                    config={deployment.webConfig}
                    onConfigChange={deployment.updateWebConfig}
                    onDeploy={() => deployment.deploy('web')}
                    isValid={deployment.isConfigValid('web')}
                    error={deployment.error}
                  />
                )}
                {activeTab === 'mobile' && (
                  <MobileDeployPanel
                    config={deployment.mobileConfig}
                    onConfigChange={deployment.updateMobileConfig}
                    onDeploy={(platform) => deployment.deploy(platform)}
                    isValid={deployment.isConfigValid}
                    error={deployment.error}
                  />
                )}
                {activeTab === 'desktop' && (
                  <DesktopDeployPanel
                    config={deployment.desktopConfig}
                    onConfigChange={deployment.updateDesktopConfig}
                    onDeploy={(platform) => deployment.deploy(platform)}
                    isValid={deployment.isConfigValid}
                    error={deployment.error}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
