'use client';

import React, { useRef, useEffect } from 'react';
import type { ChatMessage, StagePlan, Phase } from '../types/aiBuilderTypes';
import type { StreamingProgress as StreamingProgressType } from '../types/streaming';
import { InlineStreamingProgress } from './StreamingProgress';
import {
  MessageSquareIcon,
  SendIcon,
  ImageIcon,
  XIcon,
  BrainIcon,
  ZapIcon,
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
  LayersIcon,
  EyeIcon,
  CameraIcon,
  UndoIcon,
  RedoIcon,
} from './ui/Icons';

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
  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 mb-4">
    <h3 className="text-zinc-100 font-medium text-sm mb-3 flex items-center gap-2">
      <LayersIcon size={16} className="text-purple-400" />
      Build Plan ({phases.length} Phases)
    </h3>
    <div className="space-y-2">
      {phases.map((phase, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-lg border transition-colors ${
            phase.status === 'complete'
              ? 'bg-green-500/10 border-green-500/30'
              : phase.status === 'building'
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-100 font-medium text-sm">
              Phase {phase.number}: {phase.name}
            </span>
            <div className="flex items-center gap-2">
              {phase.status === 'pending' && idx === currentPhase && onBuildPhase && (
                <button
                  onClick={() => onBuildPhase(phase)}
                  className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                >
                  Build
                </button>
              )}
              {phase.status === 'complete' && (
                <CheckCircleIcon size={16} className="text-green-400" />
              )}
              {phase.status === 'building' && <LoaderIcon size={16} className="text-blue-400" />}
              {phase.status === 'pending' && idx !== currentPhase && (
                <ClockIcon size={16} className="text-zinc-500" />
              )}
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{phase.description}</p>
          {phase.features && phase.features.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {phase.features.slice(0, 3).map((feature, fIdx) => (
                <span
                  key={fIdx}
                  className="text-xs bg-zinc-700/50 px-2 py-0.5 rounded text-zinc-300"
                >
                  {feature.length > 25 ? feature.substring(0, 25) + '...' : feature}
                </span>
              ))}
              {phase.features.length > 3 && (
                <span className="text-xs text-zinc-500">+{phase.features.length - 3} more</span>
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

  // Design mode capture (optional)
  hasLayoutDesign?: boolean;
  onCapturePreview?: () => Promise<void>;

  // Undo/Redo (optional)
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
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
  hasLayoutDesign,
  onCapturePreview,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
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
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
            <MessageSquareIcon size={16} className="text-zinc-400" />
            Chat
          </h2>

          {/* Plan/Act Mode Toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => onModeChange('PLAN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentMode === 'PLAN'
                  ? 'bg-purple-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Plan Mode: AI discusses and explains (no code changes)"
            >
              <BrainIcon size={14} />
              Plan
            </button>
            <button
              onClick={() => onModeChange('ACT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentMode === 'ACT'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Act Mode: AI can modify code"
            >
              <ZapIcon size={14} />
              Act
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
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
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                    ? 'bg-zinc-900 border-l-2 border-purple-500 text-zinc-300'
                    : 'bg-zinc-800 text-zinc-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.componentPreview && onViewComponent && (
                <button
                  onClick={onViewComponent}
                  className="mt-3 text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5"
                >
                  <EyeIcon size={12} />
                  View Component
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
          <div className="flex justify-start animate-fade-in">
            <div className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg px-4 py-3">
              <InlineStreamingProgress progress={streamingProgress} />
            </div>
          </div>
        )}

        {/* Non-streaming generation indicator */}
        {isGenerating && !isStreamingActive && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg px-4 py-3 border border-zinc-700">
              <div className="flex items-center gap-3">
                <LoaderIcon size={18} className="text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-zinc-200">Generating...</div>
                  {generationProgress && (
                    <div className="text-xs text-zinc-400 mt-0.5">{generationProgress}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Undo/Redo Bar - appears after modifications */}
      {(canUndo || canRedo) && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-800/50 flex items-center justify-center gap-2">
          <span className="text-xs text-zinc-500 mr-2">Recent change:</span>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon size={14} />
            Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <RedoIcon size={14} />
            Redo
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        {/* Image Preview */}
        {uploadedImage && (
          <div className="mb-3 relative inline-block">
            <img
              src={uploadedImage}
              alt="Uploaded inspiration"
              className="h-20 w-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={onRemoveImage}
              className="absolute -top-1.5 -right-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-full p-1 transition-colors"
            >
              <XIcon size={12} />
            </button>
            <div className="text-xs text-zinc-500 mt-1">Design reference attached</div>
          </div>
        )}

        <div className="flex gap-2">
          {/* Image Upload Button */}
          <label className="btn-icon cursor-pointer" title="Upload image">
            <ImageIcon size={18} />
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

          {/* Capture Preview Button - shown when layout design exists */}
          {hasLayoutDesign && onCapturePreview && (
            <button
              onClick={onCapturePreview}
              className="btn-icon"
              title="Capture current preview for design feedback"
              disabled={isGenerating}
            >
              <CameraIcon size={18} />
            </button>
          )}

          <input
            type="text"
            value={userInput}
            onChange={(e) => onUserInputChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Describe what you want to build..."
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-colors"
            id="chat-panel-user-message"
            name="chat-panel-user-message"
            autoComplete="off"
          />
          <button
            onClick={onSendMessage}
            disabled={isGenerating || (!userInput.trim() && !uploadedImage)}
            data-send-button="true"
            className="btn-primary px-4"
          >
            {isGenerating ? <LoaderIcon size={18} /> : <SendIcon size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
