'use client';

import React from 'react';
import type { PendingChange } from '@/types/aiBuilderTypes';
import { AlertTriangleIcon, FileIcon, InfoIcon, XIcon, CheckIcon } from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';

export interface ApprovalModalProps {
  isOpen: boolean;
  pendingChange: PendingChange | null;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalModal({ isOpen, pendingChange, onApprove, onReject }: ApprovalModalProps) {
  if (!isOpen || !pendingChange) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={() => {}}
    >
      <FocusTrap onEscape={onReject}>
        <div
          className="bg-slate-900 rounded-xl border border-slate-800 max-w-2xl w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-600/20 flex items-center justify-center">
                <AlertTriangleIcon size={20} className="text-warning-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Approve Changes?</h3>
                <p className="text-sm text-slate-400">
                  Review the proposed modifications to your app
                </p>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="px-6 py-5">
            <div className="mb-6">
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                What&apos;s changing:
              </label>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-100 text-sm leading-relaxed">
                  {pendingChange.changeDescription}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 border-l-2 border-garden-500 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <InfoIcon size={18} className="text-garden-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-200 mb-1">Why approval is needed</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This change will modify your existing app. Approving ensures you won&apos;t
                    accidentally lose features you like. You can reject this change and request
                    something different instead.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview of files being changed */}
            <div className="mb-6">
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Files affected:
              </label>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 max-h-32 overflow-y-auto">
                {(() => {
                  try {
                    const parsedData = JSON.parse(pendingChange.newCode);
                    return (
                      <div className="space-y-1">
                        {parsedData.files?.map((file: { path: string }, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                            <FileIcon size={12} className="text-garden-400" />
                            <span>{file.path}</span>
                          </div>
                        ))}
                      </div>
                    );
                  } catch {
                    return <p className="text-xs text-slate-500">Unable to parse file list</p>;
                  }
                })()}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
            <button onClick={onReject} className="btn-secondary flex-1 py-2.5">
              <XIcon size={16} />
              Reject Changes
            </button>
            <button
              onClick={onApprove}
              className="btn-primary flex-1 py-2.5 bg-success-600 hover:bg-success-700"
            >
              <CheckIcon size={16} />
              Approve &amp; Apply
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

export default ApprovalModal;
