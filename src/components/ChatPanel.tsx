'use client';

import React, { useRef, useEffect } from 'react';
import type { ChatMessage, StagePlan, Phase } from '../types/aiBuilderTypes';
import type { StreamingProgress as StreamingProgressType } from '../types/streaming';
import { InlineStreamingProgress } from './StreamingProgress';

// ============================================================================
// INTERNAL COMPONENTS
// ============================================================================

interface PhaseProgressCardProps {
  phases: Phase[];
  currentPhase: number;
  onBuildPhase?: (phase: Phase) => void;
}

const PhaseProgressCard: React.FC<PhaseProgressCardProps> = ({
  phases,
  currentPhase,
  onBuildPhase,
}) => (
  <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-4 border border-purple-500/30 mb-4">
    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
      <span>🏗️</span> Build Plan ({phases.length} Phases)
    </h3>
    <div className="space-y-2">
      {phases.map((phase, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-lg border transition-all ${
            phase.status === 'complete'
              ? 'bg-green-500/20 border-green-500/30'
              : phase.status === 'building'
                ? 'bg-blue-500/20 border-blue-500/30 animate-pulse'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-white font-medium text-sm">
              Phase {phase.number}: {phase.name}
            </span>
            <div className="flex items-center gap-2">
              {phase.status === 'pending' && idx === currentPhase && onBuildPhase && (
                <button
                  onClick={() => onBuildPhase(phase)}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all hover:scale-105"
                >
                  Build
                </button>
              )}
              {phase.status === 'complete' && <span className="text-green-400">✅</span>}
              {phase.status === 'building' && (
                <span className="text-blue-400 animate-spin">⏳</span>
              )}
              {phase.status === 'pending' && idx !== currentPhase && (
                <span className="text-slate-500">⏸️</span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">{phase.description}</p>
          {phase.features && phase.features.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {phase.features.slice(0, 3).map((feature, fIdx) => (
                <span key={fIdx} className="text-xs bg-white/10 px-2 py-0.5 rounded text-slate-300">
                  {feature.length > 25 ? feature.substring(0, 25) + '...' : feature}
                </span>
              ))}
              {phase.features.length > 3 && (
                <span className="text-xs text-slate-500">+{phase.features.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface ChatPanelProps {
  // Messages
  messages: ChatMessage[];

  // Generation state
  isGenerating: boolean;
  generationProgress: string;

  // Input state
  userInput: string;
  onUserInputChange: (value: string) => void;
  onSendMessage: () => void;

  // Image upload
  uploadedImage: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;

  // Mode toggle
  currentMode: 'PLAN' | 'ACT';
  onModeChange: (mode: 'PLAN' | 'ACT') => void;

  // Phase progress (optional)
  stagePlan?: StagePlan | null;
  onBuildPhase?: (phase: Phase) => void;

  // View component action
  onViewComponent?: () => void;

  // Streaming progress (optional)
  streamingProgress?: StreamingProgressType;
  isStreamingActive?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isGenerating,
  generationProgress,
  userInput,
  onUserInputChange,
  onSendMessage,
  uploadedImage,
  onImageUpload,
  onRemoveImage,
  currentMode,
  onModeChange,
  stagePlan,
  onBuildPhase,
  onViewComponent,
  streamingProgress,
  isStreamingActive,
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change or streaming progress updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating, isStreamingActive, streamingProgress]);

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden flex flex-col h-full shadow-2xl shadow-black/40">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>💬</span>
            <span>Conversation</span>
          </h2>

          {/* Plan/Act Mode Toggle */}
          <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => onModeChange('PLAN')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentMode === 'PLAN'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Plan Mode: AI discusses and explains (no code changes)"
            >
              💭 Plan
            </button>
            <button
              onClick={() => onModeChange('ACT')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentMode === 'ACT'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Act Mode: AI can modify code"
            >
              ⚡ Act
            </button>
          </div>
        </div>

        {/* Mode Description */}
        <p className="text-sm text-slate-400">
          {currentMode === 'PLAN'
            ? '💭 Plan Mode: AI will discuss and explain (no code changes)'
            : '⚡ Act Mode: AI can modify your app'}
        </p>
      </div>

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Phase Progress Display */}
        {stagePlan && stagePlan.phases && stagePlan.phases.length > 0 && (
          <PhaseProgressCard
            phases={stagePlan.phases}
            currentPhase={Math.max(0, stagePlan.currentPhase - 1)}
            onBuildPhase={onBuildPhase}
          />
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-500/30 hover:shadow-blue-500/50'
                  : message.role === 'system'
                    ? 'glass-panel text-purple-200 border border-purple-500/40 shadow-purple-500/20 hover:shadow-purple-500/40 hover:border-purple-500/60'
                    : 'glass-panel text-slate-200 border border-white/20 hover:border-white/30'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.componentPreview && onViewComponent && (
                <button
                  onClick={onViewComponent}
                  className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                >
                  👁️ View Component
                </button>
              )}
              <p className="text-xs opacity-50 mt-2" suppressHydrationWarning>
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Inline Streaming Progress */}
        {isStreamingActive && streamingProgress && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="glass-panel text-slate-200 border border-white/20 rounded-2xl px-4 py-3 shadow-lg">
              <InlineStreamingProgress progress={streamingProgress} />
            </div>
          </div>
        )}

        {/* Non-streaming generation indicator */}
        {isGenerating && !isStreamingActive && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl px-4 py-3 border border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Generating your app...</div>
                  {generationProgress && (
                    <div className="text-xs text-blue-200 mt-1">{generationProgress}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        {/* Image Preview */}
        {uploadedImage && (
          <div className="mb-3 relative inline-block">
            <img
              src={uploadedImage}
              alt="Uploaded inspiration"
              className="h-20 w-20 object-cover rounded-lg border-2 border-blue-500"
            />
            <button
              onClick={onRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
            >
              ✕
            </button>
            <div className="text-xs text-slate-400 mt-1">
              🎨 AI will use this for design inspiration
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {/* Image Upload Button */}
          <label
            className="px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            title="Upload image for AI-inspired design"
          >
            <span className="text-xl">🖼️</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
              id="chat-panel-image-upload"
              name="chat-panel-image-upload"
            />
          </label>

          <input
            type="text"
            value={userInput}
            onChange={(e) => onUserInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Describe what you want to build or change..."
            disabled={isGenerating}
            className="flex-1 px-4 py-3 rounded-xl glass-panel border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/60 disabled:opacity-50 transition-all duration-300 focus:shadow-xl focus:shadow-blue-500/30 focus:scale-[1.01] hover:border-white/30"
            id="chat-panel-user-message"
            name="chat-panel-user-message"
            autoComplete="off"
          />
          <button
            onClick={onSendMessage}
            disabled={isGenerating || (!userInput.trim() && !uploadedImage)}
            data-send-button="true"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 relative overflow-hidden group"
          >
            <span className="relative z-10">{isGenerating ? '⏳' : '🚀'}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
