'use client';

import React from 'react';
import type { ChatMessage, StagePlan } from '@/types/aiBuilderTypes';
import { LayersIcon, InfoIcon, TargetIcon, ZapIcon, CheckIcon } from '../ui/Icons';
import { FocusTrap } from '../ui/FocusTrap';

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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={() => {}}
    >
      <FocusTrap>
        <div
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-2xl w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <LayersIcon size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Build in Phases?</h3>
                <p className="text-sm text-zinc-400">
                  Large app detected - suggested phased approach
                </p>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="px-6 py-5">
            <div className="mb-6">
              <label className="text-sm font-medium text-zinc-300 mb-2 block">Your request:</label>
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <p className="text-zinc-100 text-sm leading-relaxed">
                  &quot;{pendingRequest}&quot;
                </p>
              </div>
            </div>

            <div className="bg-zinc-800/50 border-l-2 border-blue-500 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <InfoIcon size={18} className="text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-200 mb-2">Why Build in Phases?</p>
                  <ul className="text-xs text-zinc-400 leading-relaxed space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckIcon size={12} className="text-green-400" /> Each phase gets fully
                      working code you can test
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon size={12} className="text-green-400" /> See progress step-by-step
                      with live previews
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon size={12} className="text-green-400" /> Guide the direction after
                      each phase
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon size={12} className="text-green-400" /> Avoids overwhelming
                      single-build approach
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon size={12} className="text-green-400" /> Better quality - each piece
                      is refined before moving on
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/50 border-l-2 border-purple-500 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <TargetIcon size={18} className="text-purple-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-200 mb-2">How It Works</p>
                  <ol className="text-xs text-zinc-400 leading-relaxed space-y-1.5">
                    <li>1. I&apos;ll analyze and break your request into 2-4 logical phases</li>
                    <li>2. Build Phase 1 (foundation + core features)</li>
                    <li>3. You review, test, and approve before Phase 2</li>
                    <li>4. Repeat until your complete app is ready</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/50 border-l-2 border-green-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ZapIcon size={18} className="text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-zinc-200 mb-1">Or Build All at Once?</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    I can also generate everything in one go. This is faster but gives you less
                    control over the direction, and the result might need more refinement.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
            <button onClick={onBuildAllAtOnce} className="btn-secondary flex-1 py-2.5">
              <ZapIcon size={16} />
              Build All at Once
            </button>
            <button
              onClick={onBuildInPhases}
              className="btn-primary flex-1 py-2.5 bg-purple-600 hover:bg-purple-700"
            >
              <LayersIcon size={16} />
              Build in Phases
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

export default StagingConsentModal;
