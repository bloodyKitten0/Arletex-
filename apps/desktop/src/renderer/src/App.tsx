import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Conversation, InferenceHealthResult, Message, StreamChunk } from '@arletex/contracts';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { ChatView } from './components/ChatView';
import { MessageInput } from './components/MessageInput';
import { ArletexApi } from '../../preload';

declare global {
  interface Window {
    arletexApi?: ArletexApi;
  }
}

export const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [health, setHealth] = useState<InferenceHealthResult | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeRequestIdRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;

  const api = window.arletexApi;

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.listConversations();
      console.log('[Arletex] listConversations result:', res);
      if (res.success) {
        setConversations(res.data);
        if (res.data.length > 0 && !activeConversationId) {
          setActiveConversationId(res.data[0]!.id);
        }
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      console.error('[Arletex] listConversations error:', err);
      setError(err.message || 'Failed to load conversations');
    }
  }, [api, activeConversationId]);

  // Load messages for active conversation
  const loadMessages = useCallback(
    async (convId: string) => {
      if (!api) return;
      try {
        const res = await api.listMessages(convId);
        if (res.success) {
          setMessages(res.data);
        } else {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load messages');
      }
    },
    [api],
  );

  // Check inference health
  const checkHealth = useCallback(async () => {
    if (!api) return;
    setCheckingHealth(true);
    try {
      const res = await api.checkInferenceHealth();
      console.log('[Arletex] checkInferenceHealth result:', res);
      if (res.success) {
        setHealth(res.data);
      } else {
        setHealth({
          status: 'error',
          provider: 'colibri',
          url: 'http://127.0.0.1:8080',
          latencyMs: null,
          modelLoaded: null,
          error: res.error,
          isFallback: false,
        });
      }
    } catch (err: any) {
      setHealth({
        status: 'disconnected',
        provider: 'colibri',
        url: 'http://127.0.0.1:8080',
        latencyMs: null,
        modelLoaded: null,
        error: err.message,
        isFallback: false,
      });
    } finally {
      setCheckingHealth(false);
    }
  }, [api]);

  // Initial mount
  useEffect(() => {
    console.log('[Arletex] UI Mounted. arletexApi available:', !!window.arletexApi);
    void loadConversations();
    void checkHealth();

    const interval = setInterval(() => {
      void checkHealth();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadConversations, checkHealth]);

  // When active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      void loadMessages(activeConversationId);
      setStreamingText('');
      setIsGenerating(false);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages]);

  // Listen to streaming chunks from Electron preload IPC
  useEffect(() => {
    if (!api) return;

    const unsubscribe = api.onStreamChunk((chunk: StreamChunk) => {
      if (chunk.error) {
        setError(chunk.error);
        setIsGenerating(false);
        setStreamingText('');
        return;
      }

      if (chunk.isDone) {
        setIsGenerating(false);
        setStreamingText('');
        activeRequestIdRef.current = null;
        const targetId = chunk.conversationId || activeConversationIdRef.current;
        if (targetId && targetId === activeConversationIdRef.current) {
          void loadMessages(targetId);
        }
        return;
      }

      if (chunk.fullContent) {
        setStreamingText(chunk.fullContent);
      }
    });

    return unsubscribe;
  }, [api, loadMessages]);

  // Create conversation
  const handleCreateConversation = async () => {
    console.log('[Arletex] Create conversation clicked. API available:', !!api);
    if (!api) {
      setError('API bridge not connected. Please rebuild or restart the app.');
      return;
    }
    try {
      const res = await api.createConversation('New Session');
      console.log('[Arletex] createConversation result:', res);
      if (res.success) {
        setConversations((prev) => [res.data, ...prev]);
        setActiveConversationId(res.data.id);
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      console.error('[Arletex] createConversation error:', err);
      setError(err.message);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    if (!api) return;
    try {
      const res = await api.deleteConversation(id);
      if (res.success) {
        const next = conversations.filter((c) => c.id !== id);
        setConversations(next);
        if (activeConversationId === id) {
          setActiveConversationId(next.length > 0 ? next[0]!.id : null);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!api) return;

    let targetConvId: string;
    if (!activeConversationId) {
      const res = await api.createConversation('New Session');
      if (!res.success) {
        setError(res.error);
        return;
      }
      setConversations((prev) => [res.data, ...prev]);
      targetConvId = res.data.id;
      setActiveConversationId(targetConvId);
    } else {
      targetConvId = activeConversationId;
    }

    // Optimistic UI update
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: targetConvId,
      role: 'user',
      content,
      tokenCount: null,
      createdAt: new Date().toISOString(),
      metadata: {},
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setIsGenerating(true);
    setStreamingText('');
    setError(null);

    const requestId = crypto.randomUUID();
    activeRequestIdRef.current = requestId;

    // Fire-and-forget: IPC handler returns immediately and streams
    // chunks via the INFERENCE_STREAM_CHUNK channel, so no need to
    // await the full generation. Errors are delivered as isDone chunks.
    api.startInferenceStream({
      conversationId: targetConvId,
      userMessageContent: content,
    }).then((res) => {
      if (!res.success) {
        setError(res.error);
        setIsGenerating(false);
      }
    }).catch((err: any) => {
      setError(err.message);
      setIsGenerating(false);
    });
  };

  // Cancel generation
  const handleCancelGeneration = async () => {
    if (!api || !activeRequestIdRef.current) return;
    try {
      await api.cancelInference(activeRequestIdRef.current);
    } finally {
      setIsGenerating(false);
      setStreamingText('');
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onCreate={handleCreateConversation}
        onDelete={handleDeleteConversation}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        <StatusBar health={health} checking={checkingHealth} onRefresh={() => void checkHealth()} />

        <ChatView
          messages={messages}
          streamingText={streamingText}
          isGenerating={isGenerating}
          error={error}
          onClearError={() => setError(null)}
        />

        <MessageInput
          onSend={handleSendMessage}
          onCancel={handleCancelGeneration}
          isGenerating={isGenerating}
          disabled={isGenerating}
        />
      </main>
    </div>
  );
};
