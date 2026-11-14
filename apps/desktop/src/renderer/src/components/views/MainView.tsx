import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  Paperclip,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  X,
  Image as ImageIcon,
  Bot,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  Conversation,
  InferenceHealthResult,
  Message,
  CreateMemoryInput,
} from '@arletex/contracts';
import { GenerationStats } from '../ChatView';
import {
  blobToBase64,
  playWavBase64,
  stopCurrentAudio,
  cleanTextForSpeech,
  splitIntoSpeechChunks,
  playSpeechQueue,
} from '../../utils/mediaUtils';

function parseToneAndText(raw: string) {
  const toneMatch = raw.match(/\[tone:\s*([a-zA-Z]+)\]/i);
  const clean = raw.replace(/\[tone:\s*[a-zA-Z]+\]\s*/gi, '').trim();
  const tone = toneMatch ? toneMatch[1]?.toLowerCase() : null;
  return { tone, text: clean || raw };
}

interface MainViewProps {
  conversation: Conversation | null;
  messages: Message[];
  streamingText: string;
  isGenerating: boolean;
  error: string | null;
  onClearError: () => void;
  generationStats: GenerationStats;
  onSendMessage: (content: string, imageBase64?: string) => void;
  onCancelGeneration: () => void;
  health: InferenceHealthResult | null;
  fullScreen: boolean;
  onToggleFullScreen: () => void;
  onCreateMemory?: (input: CreateMemoryInput) => Promise<boolean>;
}

export const MainView: React.FC<MainViewProps> = ({
  conversation,
  messages,
  streamingText,
  isGenerating,
  error,
  onClearError,
  generationStats,
  onSendMessage,
  onCancelGeneration,
  health,
  fullScreen,
  onToggleFullScreen,
  onCreateMemory,
}) => {
  const [inputContent, setInputContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showThoughts, setShowThoughts] = useState(false);
  const [memorySavedId, setMemorySavedId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastSpokenMsgIdRef = useRef<string | null>(null);

  // Load persistent preference for voice
  useEffect(() => {
    const loadPref = async () => {
      if (window.arletexApi?.getPreferences) {
        const res = await window.arletexApi.getPreferences();
        if (res.success && res.data['voice_output_enabled'] === 'true') {
          setVoiceEnabled(true);
        }
      }
    };
    void loadPref();
  }, []);

  // Toggle voice output preference
  const handleToggleVoice = async () => {
    const nextVal = !voiceEnabled;
    setVoiceEnabled(nextVal);
    if (!nextVal) {
      stopCurrentAudio();
      setPlayingMessageId(null);
    }
    if (window.arletexApi?.setPreference) {
      await window.arletexApi.setPreference('voice_output_enabled', String(nextVal));
    }
  };

  const speakText = async (text: string, msgId?: string) => {
    if (!window.arletexApi?.synthesizeSpeech) return;

    // Toggle stop if already playing this message
    if (msgId && playingMessageId === msgId) {
      stopCurrentAudio();
      setPlayingMessageId(null);
      return;
    }

    const chunks = splitIntoSpeechChunks(text);
    if (!chunks.length) return;

    if (msgId) setPlayingMessageId(msgId);

    try {
      await playSpeechQueue(
        chunks,
        async (chunkText, tone, leadPaddingMs) => {
          const res = await window.arletexApi!.synthesizeSpeech(
            chunkText,
            'arlecchino',
            tone,
            leadPaddingMs,
          );
          return res.success && res.data ? res.data : {};
        },
        () => {
          if (msgId) setPlayingMessageId(null);
        },
        (err) => {
          console.warn('[TTS] Synthesis queue note:', err);
          if (msgId) setPlayingMessageId(null);
        },
      );
    } catch (e) {
      console.warn('[TTS] Synthesis failed:', e);
      if (msgId) setPlayingMessageId(null);
    }
  };

  // Play voice when assistant completion arrives if voice enabled
  useEffect(() => {
    if (!voiceEnabled || isGenerating || !messages.length) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg &&
      lastMsg.role === 'assistant' &&
      lastMsg.content &&
      lastSpokenMsgIdRef.current !== lastMsg.id
    ) {
      lastSpokenMsgIdRef.current = lastMsg.id;
      void speakText(lastMsg.content, lastMsg.id);
    }
  }, [messages, isGenerating, voiceEnabled]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputContent]);

  // Handle Image attachment
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await blobToBase64(file);
      setSelectedImage({
        base64,
        mimeType: file.type || 'image/jpeg',
        name: file.name,
      });
    } catch (err) {
      console.error('Failed to read image file', err);
    }
  };

  // Handle Voice Recording (Speech-to-Text via Whisper)
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());
          setIsTranscribing(true);
          try {
            const base64 = await blobToBase64(audioBlob);
            if (window.arletexApi?.transcribeAudio) {
              const res = await window.arletexApi.transcribeAudio(base64, 'webm');
              if (res.success && res.data.transcript) {
                setInputContent((prev) => (prev ? `${prev} ${res.data.transcript}` : res.data.transcript));
              }
            }
          } catch (err) {
            console.error('Transcription error:', err);
          } finally {
            setIsTranscribing(false);
          }
        };

        recorder.start();
        setIsRecording(true);
      } catch (err: any) {
        console.error('Microphone access denied:', err);
        alert(`Microphone access error: ${err.message}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!inputContent.trim() && !selectedImage) || isGenerating) return;
    onSendMessage(inputContent.trim(), selectedImage?.base64);
    setInputContent('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSaveToMemory = async (msg: Message) => {
    if (!onCreateMemory) return;
    const ok = await onCreateMemory({
      type: 'episodic',
      content: msg.content,
      tags: ['conversation', msg.role],
      confidence: 1.0,
      importance: 0.8,
      provenance: `Message from session "${conversation?.title || 'Active Session'}"`,
    });
    if (ok) {
      setMemorySavedId(msg.id);
      setTimeout(() => setMemorySavedId(null), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0 }}>
      {/* Presence & Controls Header */}
      <div
        style={{
          padding: '10px 20px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Presence Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isGenerating ? 'var(--warning)' : 'var(--success)',
              boxShadow: isGenerating ? '0 0 6px var(--warning)' : '0 0 6px var(--success)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {conversation?.title || 'Active Dialogue & Reflection'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Model: {health?.modelLoaded?.split('/').pop()?.replace('.gguf', '') || 'Qwen 3.5-9B Heretic'} • Vulkan 780M
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Voluntary Thoughts Button */}
          <button
            type="button"
            onClick={() => setShowThoughts(!showThoughts)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: showThoughts ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
              color: showThoughts ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Sparkles size={13} />
            <span>Voluntary Thoughts</span>
            {showThoughts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Master Voice Output Toggle */}
          <button
            type="button"
            onClick={handleToggleVoice}
            title={voiceEnabled ? 'Voice Output: Active (Kokoro 82M TTS)' : 'Voice Output: Muted'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: voiceEnabled ? 'rgba(63, 185, 80, 0.15)' : 'var(--bg-tertiary)',
              color: voiceEnabled ? 'var(--success)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}</span>
          </button>

          {/* Full Screen Conversation Toggle */}
          <button
            type="button"
            onClick={onToggleFullScreen}
            title={fullScreen ? 'Exit Full Screen' : 'Full Screen Conversation Mode'}
            style={{
              padding: '6px',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {fullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Voluntary Thoughts Drawer */}
      {showThoughts && (
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={14} color="var(--accent)" />
            <strong style={{ color: 'var(--text-primary)' }}>Shared Reflections</strong>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              (Voluntarily disclosed by Arle; private deliberations remain unexposed)
            </span>
          </div>
          <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            "Continuously observing the environment and integrating experiences. Grounded in my autobiographical memories, independent from token stream."
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--danger-muted)',
            borderBottom: '1px solid var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--danger)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={onClearError} style={{ color: 'var(--danger)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 && !streamingText && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '12px',
              padding: '40px 0',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <Bot size={24} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Arle is present
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Begin a conversation, ask for analysis, or attach an image.
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isArleInitiated = !isUser && msg.metadata && (msg.metadata as any).initiatedByArle;
          const isSaved = memorySavedId === msg.id;

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                width: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '4px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                {isUser ? (
                  <>
                    <span>You</span>
                    <User size={12} />
                  </>
                ) : (
                  <>
                    <Bot size={12} color="var(--accent)" />
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {isArleInitiated ? 'Arle (Initiated)' : 'Arle'}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div
                style={{
                  position: 'relative',
                  maxWidth: '82%',
                  padding: '12px 16px',
                  borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  backgroundColor: isUser ? 'var(--accent-muted)' : 'var(--bg-card)',
                  border: `1px solid ${isUser ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {/* Render attached image thumbnail if message contains an image */}
                {msg.metadata && (msg.metadata as any).imageBase64 && (
                  <div style={{ marginBottom: '8px' }}>
                    <img
                      src={
                        (msg.metadata as any).imageBase64.startsWith('data:')
                          ? (msg.metadata as any).imageBase64
                          : `data:image/jpeg;base64,${(msg.metadata as any).imageBase64}`
                      }
                      alt="User Attachment"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '260px',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        display: 'block',
                        border: '1px solid var(--border-subtle)',
                      }}
                    />
                  </div>
                )}

                {isUser ? (
                  msg.content
                ) : (
                  (() => {
                    const { tone, text: cleanContent } = parseToneAndText(msg.content);
                    return (
                      <div>
                        {tone && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: 'var(--accent)',
                              background: 'rgba(168, 85, 247, 0.12)',
                              border: '1px solid rgba(168, 85, 247, 0.25)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              marginBottom: '8px',
                            }}
                          >
                            <span style={{ fontSize: '8px' }}>◈</span>
                            <span>{tone}</span>
                          </div>
                        )}
                        <div>{cleanContent}</div>
                      </div>
                    );
                  })()
                )}

                {/* Assistant Actions Bar */}
                {!isUser && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '12px',
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    {/* Speak Message Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (playingMessageId === msg.id) {
                          stopCurrentAudio();
                          setPlayingMessageId(null);
                        } else {
                          void speakText(msg.content, msg.id);
                        }
                      }}
                      title="Speak message with local Kokoro 82M voice"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: playingMessageId === msg.id ? 'var(--accent)' : 'var(--text-muted)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'transparent',
                      }}
                    >
                      <Volume2 size={12} />
                      <span>{playingMessageId === msg.id ? 'Speaking...' : 'Speak'}</span>
                    </button>

                    {/* Save to Memory Action */}
                    {onCreateMemory && (
                      <button
                        type="button"
                        onClick={() => handleSaveToMemory(msg)}
                        title="Save this response into Arle's persistent autobiographical memory"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: isSaved ? 'var(--success)' : 'var(--text-muted)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'transparent',
                        }}
                      >
                        <BookmarkPlus size={12} />
                        <span>{isSaved ? 'Saved to Memory' : 'Remember This'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming text */}
        {streamingText && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              <Bot size={12} color="var(--accent)" />
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Arle</span>
              <span>•</span>
              <span style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                {generationStats.tokensPerSecond > 0 ? `${generationStats.tokensPerSecond.toFixed(1)} t/s` : 'generating...'}
              </span>
            </div>
            <div
              style={{
                maxWidth: '82%',
                padding: '12px 16px',
                borderRadius: '12px 12px 12px 2px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {(() => {
                const { tone, text: cleanStream } = parseToneAndText(streamingText);
                return (
                  <div>
                    {tone && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--accent)',
                          background: 'rgba(168, 85, 247, 0.12)',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ fontSize: '8px' }}>◈</span>
                        <span>{tone}</span>
                      </div>
                    )}
                    <span>{cleanStream}</span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '14px',
                        backgroundColor: 'var(--accent)',
                        marginLeft: '4px',
                        animation: 'pulse 1s infinite',
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Area */}
      <div
        style={{
          padding: '12px 20px 16px',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Selected image preview */}
        {selectedImage && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              alignSelf: 'flex-start',
              fontSize: '12px',
            }}
          >
            <ImageIcon size={14} color="var(--accent)" />
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedImage.name}
            </span>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            padding: '8px 12px',
          }}
        >
          {/* File attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image for visual perception"
            style={{
              padding: '6px',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <Paperclip size={18} />
          </button>

          {/* Voice input button */}
          <button
            type="button"
            onClick={handleToggleRecord}
            disabled={isTranscribing}
            title={isRecording ? 'Stop Recording' : 'Dictate with local Whisper STT'}
            style={{
              padding: '6px',
              color: isRecording ? 'var(--danger)' : (isTranscribing ? 'var(--warning)' : 'var(--text-secondary)'),
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isRecording ? 'var(--danger-muted)' : 'transparent',
            }}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? 'Listening to microphone...'
                : (isTranscribing
                  ? 'Transcribing speech via local Whisper...'
                  : (isGenerating ? 'Arle is formulating response...' : 'Message Arle... (Enter to send, Shift+Enter for newline)'))
            }
            disabled={isGenerating || isRecording || isTranscribing}
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

          {/* Send / Stop button */}
          {isGenerating ? (
            <button
              type="button"
              onClick={onCancelGeneration}
              title="Interrupt Generation"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--danger-muted)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputContent.trim() && !selectedImage}
              title="Send Message"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: (!inputContent.trim() && !selectedImage) ? 'var(--bg-tertiary)' : 'var(--accent)',
                color: (!inputContent.trim() && !selectedImage) ? 'var(--text-muted)' : '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
