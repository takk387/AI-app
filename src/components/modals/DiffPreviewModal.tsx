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
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <SearchIcon size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">Review Changes</h3>
                  <p className="text-sm text-zinc-400">Smart targeted modifications</p>
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
