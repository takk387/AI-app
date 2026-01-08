'use client';

import { ProjectCard } from './ProjectCard';
import type { ProjectCardData, FilterState } from '@/types/dashboard';

interface ProjectListProps {
  projects: ProjectCardData[];
  view: FilterState['view'];
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDeploy?: (id: string) => void;
  isLoading?: boolean;
}

function LoadingSkeleton({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-lg animate-pulse"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="w-16 h-16 rounded-lg" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-3 w-2/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
            <div className="w-24 h-6 rounded" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden animate-pulse"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        >
          <div className="aspect-video" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="p-4 space-y-3">
            <div className="h-4 w-2/3 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-3 w-full rounded" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-1.5 w-full rounded" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="flex gap-2 mt-4">
              <div className="h-9 flex-1 rounded" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-9 flex-1 rounded" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectList({
  projects,
  view,
  onDelete,
  onArchive,
  onDeploy,
  isLoading,
}: ProjectListProps) {
  if (isLoading) {
    return <LoadingSkeleton view={view} />;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p style={{ color: 'var(--text-muted)' }}>No projects match your filters.</p>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            view="list"
            onDelete={onDelete}
            onArchive={onArchive}
            onDeploy={onDeploy}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          view="grid"
          onDelete={onDelete}
          onArchive={onArchive}
          onDeploy={onDeploy}
        />
      ))}
    </div>
  );
}
