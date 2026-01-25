'use client';

import React from 'react';
import type { AppVersion, GeneratedComponent } from '@/types/aiBuilderTypes';
import {
  HistoryIcon,
  XIcon,
  MapPinIcon,
  RocketIcon,
  ZapIcon,
  SparklesIcon,
  ForkIcon,
  RotateCcwIcon,
  SearchIcon,
  InfoIcon,
} from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';

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
    NEW_APP: 'bg-gold-600/20 text-gold-300',
    MAJOR_CHANGE: 'bg-orange-600/20 text-orange-300',
    MINOR_CHANGE: 'bg-success-600/20 text-success-300',
  };

  const ChangeTypeIcon: Record<string, React.FC<{ size: number; className?: string }>> = {
    NEW_APP: RocketIcon,
    MAJOR_CHANGE: ZapIcon,
    MINOR_CHANGE: SparklesIcon,
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <FocusTrap onEscape={onClose}>
        <div
          className="bg-slate-900 rounded-xl border border-slate-800 max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-garden-600/20 flex items-center justify-center">
                  <HistoryIcon size={20} className="text-garden-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Version History</h3>
                  <p className="text-sm text-slate-400">
                    {currentComponent.name} - {currentComponent.versions.length} versions
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="btn-icon">
                <XIcon size={18} />
              </button>
            </div>
          </div>

          {/* Version List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="space-y-3">
              {[...currentComponent.versions].reverse().map((version, idx) => {
                const isCurrentVersion = idx === 0;
                const TypeIcon = ChangeTypeIcon[version.changeType] || SparklesIcon;

                return (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      isCurrentVersion
                        ? 'bg-garden-600/10 border-garden-600/30'
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <MapPinIcon
                          size={20}
                          className={isCurrentVersion ? 'text-garden-400' : 'text-slate-500'}
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-slate-100 font-medium">
                              Version {version.versionNumber}
                            </h4>
                            {isCurrentVersion && (
                              <span className="px-2 py-0.5 rounded-full bg-garden-600 text-white text-xs font-medium">
                                Current
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 ${changeTypeColors[version.changeType]}`}
                            >
                              <TypeIcon size={12} />
                              {version.changeType.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(version.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!isCurrentVersion && (
                          <>
                            <button
                              onClick={() => onForkVersion(currentComponent, version)}
                              className="btn-secondary px-3 py-1.5 text-sm"
                              title="Fork this version"
                            >
                              <ForkIcon size={14} />
                              Fork
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Revert to Version ${version.versionNumber}? Your current version will be saved.`
                                  )
                                ) {
                                  onRevertToVersion(version);
                                }
                              }}
                              className="btn-primary px-3 py-1.5 text-sm"
                            >
                              <RotateCcwIcon size={14} />
                              Revert
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed mb-3">
                      {version.description}
                    </p>

                    {/* Compare button */}
                    {!isCurrentVersion &&
                      currentComponent.versions &&
                      currentComponent.versions.length > 1 && (
                        <button
                          onClick={() => {
                            const currentVer = currentComponent.versions?.find(
                              (v) =>
                                v.versionNumber ===
                                Math.max(
                                  ...(currentComponent.versions?.map((ver) => ver.versionNumber) ||
                                    [])
                                )
                            );
                            if (currentVer) {
                              onCompareVersions(version, currentVer);
                            }
                          }}
                          className="text-xs text-garden-400 hover:text-garden-300 flex items-center gap-1"
                        >
                          <SearchIcon size={12} />
                          Compare with current
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-800">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <InfoIcon size={14} className="text-slate-500" />
              <p>
                Click &quot;Revert&quot; to restore a previous version. Your current version will be
                preserved in history.
              </p>
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

export default VersionHistoryModal;
