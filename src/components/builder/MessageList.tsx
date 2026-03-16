'use client';

import { useRef, useEffect } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';
import { LoaderIcon, CheckCircleIcon } from '@/components/ui/Icons';
import type { ChatMessage } from '@/types/aiBuilderTypes';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end animate-fade-in">
      <div className="max-w-[85%] rounded-lg px-4 py-3 bg-garden-600 text-white">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs opacity-50 mt-2" suppressHydrationWarning>
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className="max-w-[85%] rounded-lg px-4 py-3"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
        }}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

function SystemMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-center animate-fade-in">
      <div
        className="max-w-[90%] rounded-lg px-4 py-2 text-center border-l-2 border-gold-500"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
      >
        <p className="text-xs whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function PhaseCompletionCard({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className="max-w-[85%] rounded-lg px-4 py-3 border border-garden-500/30"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <CheckCircleIcon size={16} className="text-garden-400" />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Phase Complete
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
          {message.content}
        </p>
      </div>
    </div>
  );
}

function StreamingIndicator({ progress }: { progress: string }) {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-lg px-4 py-3"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="flex items-center gap-3">
          <LoaderIcon size={18} className="text-garden-500" />
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Generating...
            </div>
            {progress && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {progress}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE RENDERER
// ============================================================================

function renderMessage(message: ChatMessage, index: number) {
  // Check for phase completion pattern in content
  const isPhaseComplete =
    message.role === 'assistant' && /phase\s+\d+\s*(complete|done|finished)/i.test(message.content);

  if (message.role === 'user') {
    return <UserMessage key={message.id || index} message={message} />;
  }

  if (message.role === 'system') {
    return <SystemMessage key={message.id || index} message={message} />;
  }

  if (isPhaseComplete) {
    return <PhaseCompletionCard key={message.id || index} message={message} />;
  }

  return <AssistantMessage key={message.id || index} message={message} />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MessageList() {
  const { messages, isGenerating, generationProgress } = useBuilder();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isGenerating]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        minHeight: 0,
      }}
    >
      <div className="space-y-4">
        {messages.length === 0 && (
          <div className="flex justify-center py-12">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Describe what you want to build, and I&apos;ll help you create it.
            </p>
          </div>
        )}

        {messages.map((msg, i) => renderMessage(msg, i))}

        {isGenerating && <StreamingIndicator progress={generationProgress} />}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
