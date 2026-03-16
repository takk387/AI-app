'use client';

import React from 'react';
import DiffPreview from '../DiffPreview';
import type { PendingDiff } from '@/types/aiBuilderTypes';
import { SearchIcon, XIcon } from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';

export interface DiffPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingDiff: PendingDiff | null;
  onApprove: () => void;
  onReject: () => void;
}

export function DiffPreviewModal({
  isOpen,
  onClose,
  pendingDiff,
  onApprove,
  onReject,
}: DiffPreviewModalProps) {
  if (!isOpen || !pendingDiff) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={() => {}}
    >
      <FocusTrap onEscape={onClose}>
        <div
          className="rounded-xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-garden-600/20 flex items-center justify-center">
                  <SearchIcon size={20} className="text-garden-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Review Changes</h3>
                  <p className="text-sm text-slate-400">Smart targeted modifications</p>
                </div>
              </div>
              <button onClick={onClose} className="btn-icon">
                <XIcon size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-6 overflow-y-auto">
            <DiffPreview
              summary={pendingDiff.summary}
              files={pendingDiff.files}
              onApprove={onApprove}
              onReject={onReject}
            />
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

export default DiffPreviewModal;
