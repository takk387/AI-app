"use client";

import React from 'react';
import type { AppVersion, GeneratedComponent } from '@/types/aiBuilderTypes';

export interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentComponent: GeneratedComponent | null;
  onRevertToVersion: (version: AppVersion) => void;
  onForkVersion: (component: GeneratedComponent, version: AppVersion) => void;
  onCompareVersions: (v1: AppVersion, v2: AppVersion) => void;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  currentComponent,
  onRevertToVersion,
  onForkVersion,
  onCompareVersions,
}: VersionHistoryModalProps) {
  if (!isOpen || !currentComponent || !currentComponent.versions) return null;

  const changeTypeColors: Record<string, string> = {
    NEW_APP: 'bg-purple-500/20 border-purple-500/30 text-purple-200',
    MAJOR_CHANGE: 'bg-orange-500/20 border-orange-500/30 text-orange-200',
    MINOR_CHANGE: 'bg-green-500/20 border-green-500/30 text-green-200'
  };

  const changeTypeIcons: Record<string, string> = {
    NEW_APP: '🚀',
    MAJOR_CHANGE: '⚡',
    MINOR_CHANGE: '✨'
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-blue-500/30 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-blue-500/30 bg-blue-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-3xl">🕒</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Version History</h3>
                <p className="text-sm text-blue-200/80">{currentComponent.name} - {currentComponent.versions.length} versions</p>
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

        {/* Version List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {[...currentComponent.versions].reverse().map((version, idx) => {
              const isCurrentVersion = idx === 0;
              
              return (
                <div
                  key={version.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrentVersion
                      ? 'bg-blue-500/20 border-blue-500/40'
                      : 'bg-slate-800/50 border-white/10 hover:bg-slate-800 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {isCurrentVersion ? '📍' : '📌'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-semibold">
                            Version {version.versionNumber}
                          </h4>
                          {isCurrentVersion && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                              Current
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${changeTypeColors[version.changeType]}`}>
                            {changeTypeIcons[version.changeType]} {version.changeType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(version.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!isCurrentVersion && (
                        <>
                          <button
                            onClick={() => onForkVersion(currentComponent, version)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-all"
                            title="Fork this version"
                          >
                            🍴 Fork
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Revert to Version ${version.versionNumber}? Your current version will be saved.`)) {
                                onRevertToVersion(version);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
                          >
                            🔄 Revert
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    {version.description}
                  </p>
                  
                  {/* Compare button */}
                  {!isCurrentVersion && currentComponent.versions && currentComponent.versions.length > 1 && (
                    <button
                      onClick={() => {
                        const currentVer = currentComponent.versions?.find(v => 
                          v.versionNumber === Math.max(...(currentComponent.versions?.map(ver => ver.versionNumber) || []))
                        );
                        if (currentVer) {
                          onCompareVersions(version, currentVer);
                        }
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      🔍 Compare with current
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>💡</span>
            <p>
              Click &quot;Revert&quot; to restore a previous version. Your current version will be preserved in history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryModal;
