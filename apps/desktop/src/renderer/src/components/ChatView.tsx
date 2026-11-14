import React, { useEffect, useRef } from 'react';
import { Message } from '@arletex/contracts';
import { Bot, User, AlertCircle, Zap, Loader2 } from 'lucide-react';

export interface GenerationStats {
  startTime: number | null;
  firstTokenTime: number | null;
  tokenCount: number;
  tokensPerSecond: number;
  elapsedSeconds: number;
  stage: 'central' | 'coding_specialist' | 'synthesis' | 'thinking';
}

interface ChatViewProps {
  messages: Message[];
  streamingText: string;
  isGenerating: boolean;
  error: string | null;
  onClearError: () => void;
  generationStats?: GenerationStats;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  streamingText,
  isGenerating,
  error,
  onClearError,
  generationStats = {
    startTime: null,
    firstTokenTime: null,
    tokenCount: 0,
    tokensPerSecond: 0,
    elapsedSeconds: 0,
    stage: 'thinking',
  },
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

      {/* Pre-generation / Thinking state */}
      {isGenerating && !streamingText && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            maxWidth: '520px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Arle is thinking & evaluating context...
            </span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent)',
                backgroundColor: 'rgba(0, 255, 170, 0.12)',
                padding: '2px 7px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              {generationStats.elapsedSeconds}s
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {generationStats.elapsedSeconds > 15
              ? 'CPU MoE expert weights streaming from NVMe SSD (~0.4 t/s). Evaluating deep multi-turn context...'
              : 'Loading attention weights & computing prompt representation on local engine...'}
          </div>

          {generationStats.elapsedSeconds > 8 && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--accent)',
                backgroundColor: 'rgba(0, 255, 170, 0.08)',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid rgba(0, 255, 170, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                lineHeight: '1.4',
              }}
            >
              <Zap size={13} style={{ flexShrink: 0 }} />
              <span>
                Tip: For instant (~4s) answers on GPU, click <strong>⚡ Fast Mode (9B Vulkan)</strong> in the top bar.
              </span>
            </div>
          )}

          {/* Pulse progress bar */}
          <div
            style={{
              width: '100%',
              height: '3px',
              borderRadius: '2px',
              backgroundColor: 'var(--bg-tertiary)',
              overflow: 'hidden',
              position: 'relative',
              marginTop: '4px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '45%',
                backgroundColor: 'var(--accent)',
                borderRadius: '2px',
                boxShadow: '0 0 8px var(--accent)',
                animation: 'pulse 1.2s infinite alternate',
              }}
            />
          </div>
        </div>
      )}

      {/* Live streaming bubble with Tokens Per Second bar */}
      {isGenerating && streamingText && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          {/* TOKENS PER SECOND BAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 255, 170, 0.08)',
              border: '1px solid rgba(0, 255, 170, 0.25)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Zap size={14} style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 4px var(--accent))' }} />
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                {generationStats.tokensPerSecond > 0 ? `${generationStats.tokensPerSecond} t/s` : 'streaming...'}
              </span>
            </div>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>{generationStats.tokenCount} tokens</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>{generationStats.elapsedSeconds}s</span>
          </div>

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
            <span style={{ color: 'var(--accent)' }}>Streaming live...</span>
          </div>

          <div
            style={{
              maxWidth: '85%',
              padding: '14px 18px',
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
