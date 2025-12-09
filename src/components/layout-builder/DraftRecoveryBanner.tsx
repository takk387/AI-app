'use client';

interface DraftRecoveryBannerProps {
  onRecover: () => void;
  onDiscard: () => void;
}

/**
 * Draft recovery banner
 */
export function DraftRecoveryBanner({ onRecover, onDiscard }: DraftRecoveryBannerProps) {
  return (
    <div className="bg-blue-500/20 border-b border-blue-500/30 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-blue-400"
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
        <span className="text-sm text-blue-200">
          You have an unsaved draft from a previous session
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDiscard}
          className="px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors"
        >
          Discard
        </button>
        <button
          onClick={onRecover}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Recover Draft
        </button>
      </div>
    </div>
  );
}

export default DraftRecoveryBanner;
