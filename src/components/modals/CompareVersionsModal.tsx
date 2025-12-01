"use client";

import React from 'react';
import type { AppVersion, GeneratedComponent } from '@/types/aiBuilderTypes';

export interface CompareVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  version1: AppVersion | null;
  version2: AppVersion | null;
  onRevertToVersion: (version: AppVersion) => void;
  onForkVersion: (version: AppVersion) => void;
  currentComponent?: GeneratedComponent | null;
}

export function CompareVersionsModal({
  isOpen,
  onClose,
  version1,
  version2,
  onRevertToVersion,
  onForkVersion,
}: CompareVersionsModalProps) {
  if (!isOpen || !version1 || !version2) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔍</span>
              <div>
                <h2 className="text-2xl font-bold text-white">Compare Versions</h2>
                <p className="text-sm text-slate-300 mt-1">
                  Version {version1.versionNumber} vs Version {version2.versionNumber}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-6">
            {/* Version 1 */}
            <div className="space-y-3">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📌</span>
                  <div>
                    <h3 className="text-white font-semibold">Version {version1.versionNumber}</h3>
                    <p className="text-xs text-slate-400">
                      {new Date(version1.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{version1.description}</p>
              </div>
              
              <div className="bg-black/20 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold text-sm">Code Preview</h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(version1.code);
                      alert('Code copied to clipboard!');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Copy
                  </button>
                </div>
                <pre className="text-xs text-slate-300 overflow-auto max-h-[400px] p-3 bg-black/40 rounded-lg">
                  <code>{version1.code.substring(0, 1000)}...</code>
                </pre>
              </div>
            </div>

            {/* Version 2 */}
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📍</span>
                  <div>
                    <h3 className="text-white font-semibold">Version {version2.versionNumber}</h3>
                    <p className="text-xs text-slate-400">
                      {new Date(version2.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{version2.description}</p>
              </div>
              
              <div className="bg-black/20 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold text-sm">Code Preview</h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(version2.code);
                      alert('Code copied to clipboard!');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Copy
                  </button>
                </div>
                <pre className="text-xs text-slate-300 overflow-auto max-h-[400px] p-3 bg-black/40 rounded-lg">
                  <code>{version2.code.substring(0, 1000)}...</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>⚡</span> Quick Actions
            </h4>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (window.confirm(`Revert to Version ${version1.versionNumber}?`)) {
                    onRevertToVersion(version1);
                    handleClose();
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all"
              >
                🔄 Revert to Version {version1.versionNumber}
              </button>
              <button
                onClick={() => {
                  onForkVersion(version1);
                  handleClose();
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium transition-all"
              >
                🍴 Fork Version {version1.versionNumber}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>💡</span>
            <span>Compare code changes between versions</span>
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompareVersionsModal;
