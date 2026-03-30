'use client';

import Image from 'next/image';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface MessageBubbleProps {
  message: Message;
}

/**
 * Chat message bubble with markdown-like rendering
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  // Get background and text styles based on role
  const getBubbleStyles = () => {
    if (message.role === 'user') {
      return {
        background: 'var(--garden-600, #059669)',
        color: 'white',
      };
    }
    if (message.role === 'system') {
      return {
        background: 'var(--bg-secondary)',
        borderLeft: '2px solid var(--gold-500, #eab308)',
        color: 'var(--text-primary)',
      };
    }
    // assistant
    return {
      background: 'var(--bg-tertiary)',
      color: 'var(--text-primary)',
    };
  };

  const bubbleStyles = getBubbleStyles();

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%] rounded-lg px-4 py-3" style={bubbleStyles}>
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-2 mb-2">
            {message.attachments.map((img, i) => (
              <Image
                key={`${message.id}-attachment-${i}`}
                src={img}
                alt={`Attachment ${i + 1}`}
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded-lg"
                unoptimized
              />
            ))}
          </div>
        )}

        {/* Content with markdown-like rendering */}
        <div className="prose prose-sm max-w-none">
          {message.content.split('\n').map((line, i) => {
            // Headers
            if (line.startsWith('## ')) {
              return (
                <h2 key={`${message.id}-line-${i}`} className="text-lg font-bold mt-4 mb-2">
                  {line.slice(3)}
                </h2>
              );
            }
            if (line.startsWith('### ')) {
              return (
                <h3 key={`${message.id}-line-${i}`} className="text-base font-semibold mt-3 mb-1">
                  {line.slice(4)}
                </h3>
              );
            }
            // Bold
            if (line.includes('**')) {
              const parts = line.split(/\*\*(.+?)\*\*/g);
              return (
                <p key={`${message.id}-line-${i}`} className="mb-1">
                  {parts.map((part, j) =>
                    j % 2 === 1 ? (
                      <strong key={`${message.id}-part-${i}-${j}`}>{part}</strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            }
            // List items
            if (line.startsWith('- ')) {
              return (
                <li key={`${message.id}-line-${i}`} className="ml-4">
                  {line.slice(2)}
                </li>
              );
            }
            // Horizontal rule
            if (line === '---') {
              return (
                <hr
                  key={`${message.id}-line-${i}`}
                  className="my-3"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              );
            }
            // Tables (simple rendering)
            if (line.startsWith('|')) {
              return (
                <p key={`${message.id}-line-${i}`} className="font-mono text-sm">
                  {line}
                </p>
              );
            }
            // Regular text
            if (line.trim()) {
              return (
                <p key={`${message.id}-line-${i}`} className="mb-1">
                  {line}
                </p>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
