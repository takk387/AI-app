'use client';

import React from 'react';
import type { AppVersion, GeneratedComponent } from '@/types/aiBuilderTypes';
import {
  SearchIcon,
  XIcon,
  MapPinIcon,
  ZapIcon,
  RotateCcwIcon,
  ForkIcon,
  InfoIcon,
  CopyIcon,
} from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <FocusTrap onEscape={handleClose}>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <SearchIcon size={20} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Compare Versions</h2>
                  <p className="text-sm text-zinc-400">
                    Version {version1.versionNumber} vs Version {version2.versionNumber}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="btn-icon">
                <XIcon size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 min-h-0 px-6 py-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-6">
              {/* Version 1 */}
              <div className="space-y-3">
                <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPinIcon size={18} className="text-purple-400" />
                    <div>
                      <h3 className="text-zinc-100 font-medium">
                        Version {version1.versionNumber}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {new Date(version1.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300">{version1.description}</p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-zinc-100 font-medium text-sm">Code Preview</h4>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(version1.code);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <CopyIcon size={12} />
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-zinc-300 overflow-auto max-h-[400px] p-3 bg-zinc-900 rounded-lg">
                    <code>{version1.code.substring(0, 1000)}...</code>
                  </pre>
                </div>
              </div>

              {/* Version 2 */}
              <div className="space-y-3">
                <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPinIcon size={18} className="text-blue-400" />
                    <div>
                      <h3 className="text-zinc-100 font-medium">
                        Version {version2.versionNumber}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {new Date(version2.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300">{version2.description}</p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-zinc-100 font-medium text-sm">Code Preview</h4>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(version2.code);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <CopyIcon size={12} />
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-zinc-300 overflow-auto max-h-[400px] p-3 bg-zinc-900 rounded-lg">
                    <code>{version2.code.substring(0, 1000)}...</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              <h4 className="text-zinc-100 font-medium mb-3 flex items-center gap-2">
                <ZapIcon size={16} className="text-zinc-400" />
                Quick Actions
              </h4>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (window.confirm(`Revert to Version ${version1.versionNumber}?`)) {
                      onRevertToVersion(version1);
                      handleClose();
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  <RotateCcwIcon size={16} />
                  Revert to Version {version1.versionNumber}
                </button>
                <button
                  onClick={() => {
                    onForkVersion(version1);
                    handleClose();
                  }}
                  className="btn-secondary flex-1"
                >
                  <ForkIcon size={16} />
                  Fork Version {version1.versionNumber}
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <InfoIcon size={14} />
              <span>Compare code changes between versions</span>
            </div>
            <button onClick={handleClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

export default CompareVersionsModal;
