/**
 * Layout Builder Chat Panel
 *
 * A simplified chat panel for the layout builder that allows users to:
 * - Upload multiple images/videos for AI analysis
 * - Send text instructions to modify layouts
 * - View chat history with AI responses
 *
 * Unlike the main ChatPanel, this does NOT have Plan/Act mode toggle.
 * AI only acts when the user explicitly requests analysis or edits.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { PipelineProgress, PipelineStepName, PipelineStepStatus } from '@/types/titanPipeline';
import { PIPELINE_STEP_LABELS } from '@/types/titanPipeline';

// ============================================================================
// TYPES
// ============================================================================

export interface LayoutChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mediaUrls?: string[]; // Base64 URLs for uploaded media
}

export interface UploadedMedia {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

export interface LayoutBuilderChatPanelProps {
  messages: LayoutChatMessage[];
  onSendMessage: (message: string, media: UploadedMedia[]) => void;
  isAnalyzing: boolean;
  onAnalyzeMedia?: (media: UploadedMedia[], instructions?: string) => Promise<void>;
  /** Pipeline step progress (shown in loading indicator) */
  pipelineProgress?: PipelineProgress | null;
  /** Callback to generate full layout from concept (shown as quick action) */
  onGenerateFullLayout?: () => void;
}

// ============================================================================
// ICONS (inline SVG for simplicity)
// ============================================================================

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

const LoaderIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LayoutBuilderChatPanel: React.FC<LayoutBuilderChatPanelProps> = ({
  messages,
  onSendMessage,
  isAnalyzing,
  onAnalyzeMedia,
  pipelineProgress,
  onGenerateFullLayout,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isAnalyzing]);

  // Cleanup Object URLs on unmount to prevent memory leaks
  // Using a ref to track URLs that need cleanup
  const uploadedMediaRef = React.useRef<UploadedMedia[]>([]);
  uploadedMediaRef.current = uploadedMedia;

  useEffect(() => {
    return () => {
      uploadedMediaRef.current.forEach((media) => {
        URL.revokeObjectURL(media.previewUrl);
      });
    };
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: UploadedMedia[] = [];

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isImage || isVideo) {
        const previewUrl = URL.createObjectURL(file);
        newMedia.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          previewUrl,
          type: isVideo ? 'video' : 'image',
        });
      }
    });

    setUploadedMedia((prev) => [...prev, ...newMedia]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove uploaded media
  const handleRemoveMedia = (id: string) => {
    setUploadedMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  // Handle send message
  const handleSend = () => {
    if (!inputValue.trim() && uploadedMedia.length === 0) return;

    onSendMessage(inputValue, uploadedMedia);
    setInputValue('');
    setUploadedMedia([]);
  };

  // Handle analyze button click
  const handleAnalyze = async () => {
    if (uploadedMedia.length === 0) return;

    if (onAnalyzeMedia) {
      await onAnalyzeMedia(uploadedMedia, inputValue.trim() || undefined);
      setInputValue('');
      setUploadedMedia([]);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (uploadedMedia.length > 0) {
        handleAnalyze();
      } else {
        handleSend();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <SparklesIcon />
          <h2 className="font-semibold text-sm text-gray-800">Layout Builder</h2>
        </div>
        <span className="text-xs text-gray-500">Upload media to analyze</span>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <ImageIcon />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Welcome to Layout Builder</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Upload images or videos and I&apos;ll analyze them to create a replica layout. You can
              also type instructions to customize the result.
            </p>
          </div>
        )}

        {/* Generate Full Layout quick action */}
        {onGenerateFullLayout && messages.length <= 1 && !isAnalyzing && (
          <div className="flex justify-center py-2">
            <button
              onClick={onGenerateFullLayout}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Generate Full Layout from Concept
            </button>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-4 py-3',
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                    : 'bg-gray-100 text-gray-800'
              )}
            >
              {/* Media previews in message */}
              {message.mediaUrls && message.mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {message.mediaUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Uploaded media"
                      className="w-16 h-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-60 mt-2" suppressHydrationWarning>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator with pipeline progress */}
        {isAnalyzing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 mb-1">
                <LoaderIcon />
                <span className="text-sm text-gray-600">
                  {(pipelineProgress &&
                    pipelineProgress.steps[pipelineProgress.currentStep]?.message) ||
                    'Processing...'}
                </span>
              </div>
              {pipelineProgress && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {(
                    Object.entries(pipelineProgress.steps) as [
                      PipelineStepName,
                      { status: PipelineStepStatus; message?: string },
                    ][]
                  ).map(([step, stepData]) => (
                    <div key={step} className="flex items-center gap-1">
                      {stepData.status === 'running' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      )}
                      {stepData.status === 'completed' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                      )}
                      {stepData.status === 'error' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      )}
                      {stepData.status === 'idle' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                      )}
                      <span
                        className={cn(
                          'text-xs',
                          stepData.status === 'running' && 'text-blue-700 font-medium',
                          stepData.status === 'completed' && 'text-green-700',
                          stepData.status === 'error' && 'text-red-700',
                          stepData.status === 'idle' && 'text-gray-400'
                        )}
                      >
                        {PIPELINE_STEP_LABELS[step]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media Preview Area */}
      {uploadedMedia.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {uploadedMedia.map((media) => (
              <div key={media.id} className="relative group">
                {media.type === 'image' ? (
                  <img
                    src={media.previewUrl}
                    alt="Upload preview"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg border border-gray-200 flex items-center justify-center">
                    <VideoIcon />
                  </div>
                )}
                <button
                  onClick={() => handleRemoveMedia(media.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          {/* File Upload Button */}
          <label
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 cursor-pointer transition-colors',
              'hover:bg-gray-50 hover:border-gray-400',
              isAnalyzing && 'opacity-50 cursor-not-allowed'
            )}
            title="Upload images or videos"
          >
            <ImageIcon />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={isAnalyzing}
            />
          </label>

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              uploadedMedia.length > 0
                ? 'Add instructions (optional)...'
                : 'Type a message or upload media...'
            }
            disabled={isAnalyzing}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
          />

          {/* Send/Analyze Button */}
          {uploadedMedia.length > 0 ? (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                'bg-blue-600 text-white hover:bg-blue-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isAnalyzing ? <LoaderIcon /> : <SparklesIcon />}
              Analyze
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={isAnalyzing || !inputValue.trim()}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                'bg-blue-600 text-white hover:bg-blue-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isAnalyzing ? <LoaderIcon /> : <SendIcon />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutBuilderChatPanel;
