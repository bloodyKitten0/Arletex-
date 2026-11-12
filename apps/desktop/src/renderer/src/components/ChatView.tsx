import React, { useEffect, useRef } from 'react';
import { Message } from '@arletex/contracts';
import { Bot, User, AlertCircle } from 'lucide-react';

interface ChatViewProps {
  messages: Message[];
  streamingText: string;
  isGenerating: boolean;
  error: string | null;
  onClearError: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  streamingText,
  isGenerating,
  error,
  onClearError,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Error alert banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: 'var(--danger-muted)',
            border: '1px solid var(--danger)',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="var(--danger)" />
            <span>{error}</span>
          </div>
          <button
            onClick={onClearError}
            style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '2px 6px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages list */}
      {messages.length === 0 && !isGenerating && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
              Arle Prototype Session
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              Send a message to initiate local cognition. Responses are streamed directly from your configured inference provider.
            </div>
          </div>
        </div>
      )}

      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
              gap: '4px',
            }}
          >
            {/* Header label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                padding: '0 4px',
              }}
            >
              {isUser ? <User size={12} /> : <Bot size={12} color="var(--accent)" />}
              <span>{isUser ? 'You' : 'Arle'}</span>
              <span>•</span>
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Content bubble */}
            <div
              style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isUser ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {msg.content}
            </div>
          </div>
        );
      })}

      {/* Live streaming bubble */}
      {isGenerating && streamingText && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              padding: '0 4px',
            }}
          >
            <Bot size={12} color="var(--accent)" />
            <span>Arle</span>
            <span>•</span>
            <span style={{ color: 'var(--accent)' }}>Generating...</span>
          </div>

          <div
            style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-active)',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {streamingText}
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '14px',
                backgroundColor: 'var(--accent)',
                marginLeft: '4px',
                verticalAlign: 'middle',
                animation: 'blink 1s infinite',
              }}
            />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
