'use client';

import type { LayoutMessage } from '@/types/layoutDesign';

interface MessageBubbleProps {
  message: LayoutMessage;
  onRetry?: (messageId: string) => void;
}

/**
 * Message bubble component with error retry support
 */
export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const hasError = message.error && !isUser;
  const canRetry = hasError && message.error?.canRetry;

  if (isSystem) return null;

  // Get error icon based on error type
  const getErrorIcon = () => {
    switch (message.error?.type) {
      case 'network':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        );
      case 'rate_limit':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'server':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : hasError
              ? 'bg-red-500/20 border border-red-500/30 text-slate-100'
              : 'bg-slate-700 text-slate-100'
        }`}
      >
        {/* Show error header if present */}
        {hasError && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-2">
            {getErrorIcon()}
            <span>Error</span>
          </div>
        )}

        {/* Show selected element indicator if present */}
        {message.selectedElement && (
          <div className="text-xs opacity-70 mb-2 flex items-center gap-1">
            <span>Selected:</span>
            <span className="font-medium">{message.selectedElement}</span>
          </div>
        )}

        {/* Show attached snapshot indicator */}
        {message.previewSnapshot && (
          <div className="text-xs opacity-70 mb-2 flex items-center gap-1">
            <span>Attached preview snapshot</span>
          </div>
        )}

        {/* Message content */}
        <div
          className={`text-sm whitespace-pre-wrap leading-relaxed ${hasError ? 'text-red-200' : ''}`}
        >
          {message.isRetrying ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Retrying...
            </span>
          ) : (
            message.content
          )}
        </div>

        {/* Retry button for errors */}
        {canRetry && !message.isRetrying && onRetry && (
          <button
            onClick={() => onRetry(message.id)}
            className="mt-3 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Retry
          </button>
        )}

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${isUser ? 'text-blue-200' : hasError ? 'text-red-300/70' : 'text-slate-400'}`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
