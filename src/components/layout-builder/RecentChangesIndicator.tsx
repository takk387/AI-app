'use client';

import type { DesignChange } from '@/types/layoutDesign';

interface RecentChangesIndicatorProps {
  changes: DesignChange[];
}

/**
 * Recent changes indicator
 */
export function RecentChangesIndicator({ changes }: RecentChangesIndicatorProps) {
  if (changes.length === 0) return null;

  return (
    <div className="px-4 py-2 bg-green-500/10 border-t border-green-500/20">
      <div className="text-xs text-green-400 font-medium mb-1">Recent Changes:</div>
      <div className="space-y-1">
        {changes.slice(0, 3).map((change) => (
          <div
            key={`${change.property}-${String(change.oldValue)}-${String(change.newValue)}`}
            className="text-xs text-green-300/80"
          >
            {change.property}: {String(change.oldValue)} → {String(change.newValue)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentChangesIndicator;
