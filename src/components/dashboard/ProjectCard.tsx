'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ProjectCardData, getStatusConfig, formatRelativeTime } from '@/types/dashboard';

interface ProjectCardProps {
  project: ProjectCardData;
  view: 'grid' | 'list';
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDeploy?: (id: string) => void;
}

export function ProjectCard({ project, view, onDelete, onArchive, onDeploy }: ProjectCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = getStatusConfig(project.status);

  const handleContinue = () => {
    router.push(`/app/builder?appId=${project.appId}`);
  };

  const handleViewDocs = () => {
    router.push(`/app/builder?appId=${project.appId}&showDocs=true`);
  };

  const handleDeploy = () => {
    if (onDeploy) {
      onDeploy(project.id);
    }
  };

  if (view === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-4 p-4 rounded-lg hover:shadow-md transition-shadow"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
      >
        {/* Preview Image */}
        <div
          className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden relative"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          {project.previewImage ? (
            <Image
              src={project.previewImage}
              alt={project.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {project.name}
            </h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <p className="text-sm truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {project.description || 'No description'}
          </p>
          <div
            className="flex items-center gap-4 mt-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{project.featureCount} features</span>
            <span>{formatRelativeTime(project.updatedAt)}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="w-24 flex-shrink-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-muted)' }}>Progress</span>
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              {project.progress}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%`, background: 'var(--accent-primary)' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleContinue}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--accent-primary)' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                'color-mix(in srgb, var(--accent-primary) 10%, transparent)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Continue
          </button>
          <button
            onClick={handleDeploy}
            className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: 'var(--accent-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Deploy
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
            {showMenu && (
              <div
                className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg py-1 z-10"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <button
                  onClick={() => {
                    handleViewDocs();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  View Docs
                </button>
                <button
                  onClick={() => {
                    onArchive?.(project.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Archive
                </button>
                <button
                  onClick={() => {
                    onDelete?.(project.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--error)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      'color-mix(in srgb, var(--error) 10%, transparent)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      {/* Preview Image */}
      <div
        className="aspect-video relative overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        {project.previewImage ? (
          <Image
            src={project.previewImage}
            alt={project.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color} backdrop-blur-sm`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Building Animation */}
        {project.status === 'building' && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {project.name}
        </h3>
        <p className="text-sm line-clamp-2 mt-1 h-10" style={{ color: 'var(--text-muted)' }}>
          {project.description || 'No description'}
        </p>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-muted)' }}>{project.featureCount} features</span>
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              {project.progress}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%`, background: 'var(--accent-primary)' }}
            />
          </div>
        </div>

        {/* Meta */}
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          {formatRelativeTime(project.updatedAt)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleContinue}
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              color: 'var(--accent-primary)',
              border: '1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                'color-mix(in srgb, var(--accent-primary) 10%, transparent)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Continue
          </button>
          <button
            onClick={handleDeploy}
            className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: 'var(--accent-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Deploy
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
            {showMenu && (
              <div
                className="absolute right-0 bottom-full mb-1 w-40 rounded-lg shadow-lg py-1 z-10"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <button
                  onClick={() => {
                    handleViewDocs();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  View Docs
                </button>
                <button
                  onClick={() => {
                    onArchive?.(project.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Archive
                </button>
                <button
                  onClick={() => {
                    onDelete?.(project.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--error)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      'color-mix(in srgb, var(--error) 10%, transparent)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
