'use client';

/**
 * ProjectDocumentationPanel
 *
 * Main panel component for viewing project documentation.
 * Displays concept, layout design, implementation plan, and build progress.
 */

import React, { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { XIcon, FileIcon, LayoutIcon, LayersIcon, PlayIcon } from '@/components/ui/Icons';
import { ConceptTab } from './tabs/ConceptTab';
import { DesignTab } from './tabs/DesignTab';
import { PlanTab } from './tabs/PlanTab';
import { ProgressTab } from './tabs/ProgressTab';
import type { ProjectDocumentation } from '@/types/projectDocumentation';

type TabId = 'concept' | 'design' | 'plan' | 'progress';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'concept', label: 'Concept', icon: <FileIcon size={16} /> },
  { id: 'design', label: 'Design', icon: <LayoutIcon size={16} /> },
  { id: 'plan', label: 'Plan', icon: <LayersIcon size={16} /> },
  { id: 'progress', label: 'Progress', icon: <PlayIcon size={16} /> },
];

interface StatusBadgeProps {
  status: ProjectDocumentation['buildStatus'];
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<
    ProjectDocumentation['buildStatus'],
    { label: string; className: string }
  > = {
    planning: { label: 'Planning', className: 'bg-garden-500/20 text-garden-400' },
    ready: { label: 'Ready', className: 'bg-warning-500/20 text-warning-400' },
    building: { label: 'Building', className: 'bg-gold-500/20 text-gold-400' },
    completed: { label: 'Completed', className: 'bg-success-500/20 text-success-400' },
    failed: { label: 'Failed', className: 'bg-error-500/20 text-error-400' },
    paused: { label: 'Paused', className: 'bg-gray-500/20 text-gray-400' },
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

interface StatsSummaryProps {
  documentation: ProjectDocumentation;
}

function StatsSummary({ documentation }: StatsSummaryProps) {
  const { stats } = documentation;

  return (
    <div className="border-t border-slate-800 px-4 py-3 bg-slate-900/50">
      <div className="grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-lg font-semibold text-slate-100">
            {stats.implementedFeatures}/{stats.totalFeatures}
          </div>
          <div className="text-xs text-slate-500">Features</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-100">
            {stats.completedPhases}/{stats.totalPhases}
          </div>
          <div className="text-xs text-slate-500">Phases</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-100">
            {stats.failedPhases > 0 ? (
              <span className="text-error-400">{stats.failedPhases}</span>
            ) : (
              '0'
            )}
          </div>
          <div className="text-xs text-slate-500">Failed</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-100">
            {stats.totalBuildTime ? `${Math.round(stats.totalBuildTime / 60000)}m` : '-'}
          </div>
          <div className="text-xs text-slate-500">Build Time</div>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  tab: TabId;
}

function EmptyState({ tab }: EmptyStateProps) {
  const messages: Record<TabId, { title: string; description: string }> = {
    concept: {
      title: 'No Concept Captured',
      description: 'Start planning your app in the Wizard or Builder to capture your concept.',
    },
    design: {
      title: 'No Design Captured',
      description: 'Use the Layout Builder to design your app and capture the layout.',
    },
    plan: {
      title: 'No Plan Generated',
      description: 'Generate a phase plan to see the implementation strategy.',
    },
    progress: {
      title: 'No Build Progress',
      description: 'Start building to track phase execution progress.',
    },
  };

  const msg = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <div className="text-slate-500 mb-2">{msg.title}</div>
      <div className="text-sm text-slate-600">{msg.description}</div>
    </div>
  );
}

export function ProjectDocumentationPanel() {
  const showDocumentationPanel = useAppStore((state) => state.showDocumentationPanel);
  const documentationPanelTab = useAppStore((state) => state.documentationPanelTab);
  const currentDocumentation = useAppStore((state) => state.currentDocumentation);
  const isLoadingDocumentation = useAppStore((state) => state.isLoadingDocumentation);
  const setShowDocumentationPanel = useAppStore((state) => state.setShowDocumentationPanel);
  const setDocumentationPanelTab = useAppStore((state) => state.setDocumentationPanelTab);

  const handleClose = useCallback(() => {
    setShowDocumentationPanel(false);
  }, [setShowDocumentationPanel]);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setDocumentationPanelTab(tab);
    },
    [setDocumentationPanelTab]
  );

  if (!showDocumentationPanel) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-end"
      onClick={handleClose}
    >
      <div
        className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full overflow-hidden flex flex-col shadow-2xl"
        role="dialog"
        aria-label="Project Documentation"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <FileIcon size={20} className="text-slate-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {currentDocumentation?.projectName || 'Project Documentation'}
              </h2>
              {currentDocumentation && <StatusBadge status={currentDocumentation.buildStatus} />}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close panel"
          >
            <XIcon size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                documentationPanelTab === tab.id
                  ? 'text-garden-400 border-b-2 border-garden-400 bg-garden-500/5'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingDocumentation ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-garden-500" />
            </div>
          ) : !currentDocumentation ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <FileIcon size={48} className="text-slate-600 mb-3" />
              <div className="text-slate-400 mb-2">No Documentation</div>
              <div className="text-sm text-slate-600">
                Documentation will be created automatically when you start planning.
              </div>
            </div>
          ) : (
            <>
              {documentationPanelTab === 'concept' &&
                (currentDocumentation.conceptSnapshot ? (
                  <ConceptTab snapshot={currentDocumentation.conceptSnapshot} />
                ) : (
                  <EmptyState tab="concept" />
                ))}
              {documentationPanelTab === 'design' &&
                (currentDocumentation.layoutSnapshot ? (
                  <DesignTab snapshot={currentDocumentation.layoutSnapshot} />
                ) : (
                  <EmptyState tab="design" />
                ))}
              {documentationPanelTab === 'plan' &&
                (currentDocumentation.planSnapshot ? (
                  <PlanTab snapshot={currentDocumentation.planSnapshot} />
                ) : (
                  <EmptyState tab="plan" />
                ))}
              {documentationPanelTab === 'progress' &&
                (currentDocumentation.phaseExecutions.length > 0 ? (
                  <ProgressTab
                    executions={currentDocumentation.phaseExecutions}
                    buildStatus={currentDocumentation.buildStatus}
                  />
                ) : (
                  <EmptyState tab="progress" />
                ))}
            </>
          )}
        </div>

        {/* Stats Summary */}
        {currentDocumentation && <StatsSummary documentation={currentDocumentation} />}
      </div>
    </div>
  );
}

export default ProjectDocumentationPanel;
