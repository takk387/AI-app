'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDashboard } from '@/hooks/useDashboard';
import { StatsCards } from './StatsCards';
import { ProjectFilters } from './ProjectFilters';
import { ProjectList } from './ProjectList';
import { EmptyState } from './EmptyState';
import { RecentActivity } from './RecentActivity';
import { PlusIcon } from '../ui/Icons';
import { UnifiedDeploymentModal } from '../deployment';

export function DashboardView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    projects,
    stats,
    recentActivity,
    isLoading,
    error,
    filters,
    setFilters,
    filteredProjects,
    refetch,
    deleteProject,
    archiveProject,
  } = useDashboard();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeployModal, setShowDeployModal] = useState<string | null>(null);

  // Handle ?deploy=projectId query param from AI Builder redirect
  const deployProjectId = searchParams.get('deploy');
  useEffect(() => {
    if (deployProjectId && projects.length > 0) {
      const project = projects.find((p) => p.id === deployProjectId || p.appId === deployProjectId);
      if (project) {
        setShowDeployModal(project.id);
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('deploy');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, [deployProjectId, projects]);

  const handleNewProject = () => {
    router.push('/app/wizard');
  };

  const handleDeploy = (projectId: string) => {
    setShowDeployModal(projectId);
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setShowDeleteConfirm(null);
    } catch {
      // Error is already set in the hook
    }
  };

  const handleArchive = async (projectId: string) => {
    try {
      await archiveProject(projectId);
    } catch {
      // Error is already set in the hook
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <header
        className="border-b backdrop-blur-sm"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                My Dashboard
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Manage your projects and deployments
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNewProject}
              className="inline-flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg shadow-sm transition-colors"
              style={{ background: 'var(--accent-primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <PlusIcon size={18} />
              New Project
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg border"
            style={{
              background: 'color-mix(in srgb, var(--error) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--error) 30%, transparent)',
            }}
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5"
                style={{ color: 'var(--error)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm" style={{ color: 'var(--error)' }}>
                {error.message}
              </p>
              <button
                onClick={() => refetch()}
                className="ml-auto text-sm font-medium hover:underline"
                style={{ color: 'var(--error)' }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <section className="mb-8">
          <StatsCards stats={stats} isLoading={isLoading} />
        </section>

        {/* Projects Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Projects
          </h2>

          {projects.length === 0 && !isLoading ? (
            <EmptyState onCreateProject={handleNewProject} />
          ) : (
            <>
              <ProjectFilters
                filters={filters}
                onFiltersChange={setFilters}
                projectCount={filteredProjects.length}
              />

              <div className="mt-6">
                <ProjectList
                  projects={filteredProjects}
                  view={filters.view}
                  onDelete={(id) => setShowDeleteConfirm(id)}
                  onArchive={handleArchive}
                  onDeploy={handleDeploy}
                  isLoading={isLoading}
                />
              </div>
            </>
          )}
        </section>

        {/* Recent Activity Section */}
        {recentActivity.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Recent Activity
            </h2>
            <RecentActivity activities={recentActivity} isLoading={isLoading} maxItems={5} />
          </section>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl shadow-xl max-w-md w-full p-6"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Delete Project
            </h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ background: 'var(--error)' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Unified Deployment Modal */}
      {showDeployModal && (
        <UnifiedDeploymentModal
          projectId={showDeployModal}
          projectName={projects.find((p) => p.id === showDeployModal)?.name || 'Untitled Project'}
          isOpen={!!showDeployModal}
          onClose={() => setShowDeployModal(null)}
        />
      )}
    </div>
  );
}
