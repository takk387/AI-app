"use client";

import React from 'react';
import type { PendingChange } from '@/types/aiBuilderTypes';

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
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={() => {}}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-yellow-500/30 max-w-2xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Approve Changes?</h3>
              <p className="text-sm text-yellow-200/80">Review the proposed modifications to your app</p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-5">
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              What&apos;s changing:
            </label>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
              <p className="text-white text-sm leading-relaxed">
                {pendingChange.changeDescription}
              </p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-sm font-medium text-blue-200 mb-1">
                  Why approval is needed
                </p>
                <p className="text-xs text-blue-200/70 leading-relaxed">
                  This change will modify your existing app. Approving ensures you won&apos;t accidentally lose features you like. 
                  You can reject this change and request something different instead.
                </p>
              </div>
            </div>
          </div>

          {/* Preview of files being changed */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Files affected:
            </label>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-white/10 max-h-32 overflow-y-auto">
              {(() => {
                try {
                  const parsedData = JSON.parse(pendingChange.newCode);
                  return (
                    <div className="space-y-1">
                      {parsedData.files?.map((file: { path: string }, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="text-blue-400">📄</span>
                          <span>{file.path}</span>
                        </div>
                      ))}
                    </div>
                  );
                } catch {
                  return <p className="text-xs text-slate-400">Unable to parse file list</p>;
                }
              })()}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
          >
            ❌ Reject Changes
          </button>
          <button
            onClick={onApprove}
            className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium transition-all shadow-lg"
          >
            ✅ Approve &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApprovalModal;
