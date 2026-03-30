'use client';

/**
 * Review Empty State - Displayed when required data is missing
 *
 * Shows appropriate message and action based on what's missing.
 */

import { Layers } from 'lucide-react';
import { RocketIcon, WandIcon } from '@/components/ui/Icons';

type EmptyStateType = 'no-concept' | 'no-phases';

interface ReviewEmptyStateProps {
  type: EmptyStateType;
  onAction: () => void;
}

const emptyStateConfig: Record<
  EmptyStateType,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel: string;
  }
> = {
  'no-concept': {
    icon: <RocketIcon size={40} style={{ color: 'var(--text-muted)' }} />,
    title: 'Nothing to Review Yet',
    description:
      'Start with the Wizard to create your app concept and design, then come back here to review before building.',
    actionLabel: 'Start with Wizard',
  },
  'no-phases': {
    icon: <Layers className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />,
    title: 'No Build Plan Generated',
    description:
      'Complete the Wizard to generate a build plan with phases. The plan will appear here for review.',
    actionLabel: 'Go to Wizard',
  },
};

export function ReviewEmptyState({ type, onAction }: ReviewEmptyStateProps) {
  const config = emptyStateConfig[type];

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-center max-w-md px-4">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto"
          style={{
            background: 'color-mix(in srgb, var(--bg-secondary) 50%, transparent)',
            border: '1px solid var(--border-color)',
          }}
        >
          {config.icon}
        </div>
        <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          {config.title}
        </h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          {config.description}
        </p>
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-garden-600 to-garden-500 hover:from-garden-500 hover:to-garden-400 rounded-xl shadow-lg shadow-garden-500/25 hover:shadow-garden-500/40 transition-all"
        >
          <WandIcon size={18} />
          {config.actionLabel}
        </button>
      </div>
    </div>
  );
}

export default ReviewEmptyState;
