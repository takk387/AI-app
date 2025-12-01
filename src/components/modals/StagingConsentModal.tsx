"use client";

import React from 'react';
import type { ChatMessage, StagePlan } from '@/types/aiBuilderTypes';

export interface StagingConsentModalProps {
  isOpen: boolean;
  pendingRequest: string;
  onBuildAllAtOnce: () => void;
  onBuildInPhases: () => void;
  chatMessages?: ChatMessage[];
  setIsGenerating?: (value: boolean) => void;
  setNewAppStagePlan?: (plan: StagePlan) => void;
  setChatMessages?: (setter: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setPendingNewAppRequest?: (value: string) => void;
}

export function StagingConsentModal({
  isOpen,
  pendingRequest,
  onBuildAllAtOnce,
  onBuildInPhases,
}: StagingConsentModalProps) {
  if (!isOpen || !pendingRequest) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={() => {}}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-purple-500/30 max-w-2xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-purple-500/30 bg-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <span className="text-3xl">🏗️</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Build in Phases?</h3>
              <p className="text-sm text-purple-200/80">Large app detected - suggested phased approach</p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-5">
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Your request:
            </label>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-white/10">
              <p className="text-white text-sm leading-relaxed">
                &quot;{pendingRequest}&quot;
              </p>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-sm font-medium text-blue-200 mb-2">
                  Why Build in Phases?
                </p>
                <ul className="text-xs text-blue-200/70 leading-relaxed space-y-1.5">
                  <li>✅ Each phase gets fully working code you can test</li>
                  <li>✅ See progress step-by-step with live previews</li>
                  <li>✅ Guide the direction after each phase</li>
                  <li>✅ Avoids overwhelming single-build approach</li>
                  <li>✅ Better quality - each piece is refined before moving on</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm font-medium text-purple-200 mb-2">
                  How It Works
                </p>
                <ol className="text-xs text-purple-200/70 leading-relaxed space-y-1.5">
                  <li>1. I&apos;ll analyze and break your request into 2-4 logical phases</li>
                  <li>2. Build Phase 1 (foundation + core features)</li>
                  <li>3. You review, test, and approve before Phase 2</li>
                  <li>4. Repeat until your complete app is ready</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="text-sm font-medium text-green-200 mb-1">
                  Or Build All at Once?
                </p>
                <p className="text-xs text-green-200/70 leading-relaxed">
                  I can also generate everything in one go. This is faster but gives you less control over the direction, and the result might need more refinement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex gap-3">
          <button
            onClick={onBuildAllAtOnce}
            className="flex-1 px-4 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
          >
            ⚡ Build All at Once
          </button>
          <button
            onClick={onBuildInPhases}
            className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-medium transition-all shadow-lg"
          >
            🏗️ Build in Phases (Recommended)
          </button>
        </div>
      </div>
    </div>
  );
}

export default StagingConsentModal;
