import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onCancel: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onCancel,
  isGenerating,
  disabled,
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!content.trim() || isGenerating || disabled) return;
    onSend(content.trim());
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div
      style={{
        padding: '16px 24px 20px',
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          padding: '8px 12px',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={() => {
          const el = document.getElementById('input-container');
          if (el) el.style.borderColor = 'var(--accent)';
        }}
        id="input-container"
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGenerating ? 'Arle is responding...' : 'Message Arle... (Enter to send, Shift+Enter for newline)'}
          disabled={disabled || isGenerating}
          rows={1}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '14px',
            resize: 'none',
            lineHeight: '1.5',
            maxHeight: '160px',
            minHeight: '24px',
          }}
        />

        {isGenerating ? (
          <button
            onClick={onCancel}
            title="Stop generating"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--danger-muted)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
              flexShrink: 0,
            }}
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || disabled}
            title="Send message"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: content.trim() && !disabled ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: content.trim() && !disabled ? '#000' : 'var(--text-muted)',
              flexShrink: 0,
              cursor: content.trim() && !disabled ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={14} />
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>Host: Local Llama Runtime</span>
        <span>Identity: Arle (Candidate Qwen3.5 9B)</span>
      </div>
    </div>
  );
};
