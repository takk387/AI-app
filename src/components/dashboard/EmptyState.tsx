'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '../ui/Icons';

interface EmptyStateProps {
  onCreateProject?: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  const router = useRouter();

  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      router.push('/app/wizard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Illustration */}
      <div
        className="w-48 h-48 mb-8 rounded-full flex items-center justify-center"
        style={{
          background:
            'linear-gradient(to bottom right, color-mix(in srgb, var(--accent-primary) 10%, transparent), color-mix(in srgb, var(--warning) 10%, transparent))',
        }}
      >
        <svg
          className="w-24 h-24"
          style={{ color: 'var(--accent-primary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>

      {/* Text */}
      <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        No projects yet
      </h2>
      <p className="text-center max-w-md mb-8" style={{ color: 'var(--text-muted)' }}>
        Start building your first app with our AI-powered wizard. Describe your idea and watch it
        come to life.
      </p>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCreateProject}
        className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg shadow-lg transition-colors"
        style={{
          background: 'var(--accent-primary)',
          boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--accent-primary) 25%, transparent)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <PlusIcon size={20} />
        Create Your First Project
      </motion.button>

      {/* Quick tips */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl">
        <div className="text-center">
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--accent-primary) 20%, transparent)' }}
          >
            <span style={{ color: 'var(--accent-primary)' }} className="text-lg font-bold">
              1
            </span>
          </div>
          <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            Describe Your App
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Chat naturally about what you want to build
          </p>
        </div>

        <div className="text-center">
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--warning) 20%, transparent)' }}
          >
            <span style={{ color: 'var(--warning)' }} className="text-lg font-bold">
              2
            </span>
          </div>
          <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            Design Visually
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Use the layout builder for pixel-perfect design
          </p>
        </div>

        <div className="text-center">
          <div
            className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--info) 20%, transparent)' }}
          >
            <span style={{ color: 'var(--info)' }} className="text-lg font-bold">
              3
            </span>
          </div>
          <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            Build & Deploy
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            AI generates code, you deploy with one click
          </p>
        </div>
      </div>
    </motion.div>
  );
}
