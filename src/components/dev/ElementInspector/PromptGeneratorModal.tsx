'use client';

/**
 * PromptGeneratorModal - Modal for reviewing and copying the generated prompt
 */

import React, { useState } from 'react';

interface PromptGeneratorModalProps {
  isOpen: boolean;
  prompt: string;
  onClose: () => void;
  onCopy: () => Promise<boolean>;
}

export function PromptGeneratorModal({
  isOpen,
  prompt,
  onClose,
  onCopy,
}: PromptGeneratorModalProps): React.ReactElement | null {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await onCopy();
    setCopyStatus(success ? 'copied' : 'error');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <div
      data-inspector-modal
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-cyan-500/30 max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-cyan-500/30 bg-cyan-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <span className="text-3xl">📋</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Generated Prompt</h3>
                <p className="text-sm text-cyan-200/80">
                  Review and copy to Claude
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
            {prompt}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {prompt.length} characters
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-all"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all
                ${copyStatus === 'copied'
                  ? 'bg-green-500 text-white'
                  : copyStatus === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg'
                }
              `}
            >
              {copyStatus === 'copied' ? '✓ Copied!' : copyStatus === 'error' ? 'Copy Failed' : '📋 Copy to Clipboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromptGeneratorModal;
