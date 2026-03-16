'use client';

import { useState, useRef, useCallback } from 'react';
import { useBuilder } from '@/contexts/BuilderContext';
import { SendIcon, ImageIcon, LoaderIcon } from '@/components/ui/Icons';

export function InputBar() {
  const { sendMessage, uploadImage, isGenerating } = useBuilder();
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() || isGenerating) return;
    sendMessage(text.trim());
    setText('');
  }, [text, isGenerating, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadImage(file);
      }
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [uploadImage]
  );

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
      }}
    >
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isGenerating}
        style={{
          background: 'none',
          border: 'none',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          padding: '8px',
          borderRadius: '6px',
          color: 'var(--text-muted)',
          opacity: isGenerating ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
        }}
        title="Upload image"
      >
        <ImageIcon size={18} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        id="builder-image-upload"
        name="builder-image-upload"
      />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything, or tell me what to build..."
        disabled={isGenerating}
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          lineHeight: '1.5',
          outline: 'none',
          opacity: isGenerating ? 0.5 : 1,
          fontFamily: 'inherit',
        }}
      />

      <button
        onClick={handleSend}
        disabled={!text.trim() || isGenerating}
        className="btn-primary"
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          opacity: !text.trim() || isGenerating ? 0.5 : 1,
          cursor: !text.trim() || isGenerating ? 'not-allowed' : 'pointer',
        }}
        title="Send message"
      >
        {isGenerating ? <LoaderIcon size={18} /> : <SendIcon size={18} />}
      </button>
    </div>
  );
}
