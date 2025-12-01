"use client";

import React from 'react';
import DiffPreview from '../DiffPreview';
import type { PendingDiff } from '@/types/aiBuilderTypes';

export interface DiffPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingDiff: PendingDiff | null;
  onApprove: () => void;
  onReject: () => void;
}

export function DiffPreviewModal({ isOpen, onClose, pendingDiff, onApprove, onReject }: DiffPreviewModalProps) {
  if (!isOpen || !pendingDiff) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={() => {}}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-blue-500/30 max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-blue-500/30 bg-blue-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-3xl">🔍</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Review Changes</h3>
                <p className="text-sm text-blue-200/80">Smart targeted modifications</p>
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
        
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <DiffPreview
            summary={pendingDiff.summary}
            files={pendingDiff.files}
            onApprove={onApprove}
            onReject={onReject}
          />
        </div>
      </div>
    </div>
  );
}

export default DiffPreviewModal;
