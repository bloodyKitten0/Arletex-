import { z } from 'zod';

// ==========================================
// IPC Channels
// ==========================================
export const IPC_CHANNELS = {
  CONVERSATIONS_LIST: 'arletex:conversations:list',
  CONVERSATIONS_GET: 'arletex:conversations:get',
  CONVERSATIONS_CREATE: 'arletex:conversations:create',
  CONVERSATIONS_UPDATE: 'arletex:conversations:update',
  CONVERSATIONS_DELETE: 'arletex:conversations:delete',
  MESSAGES_LIST: 'arletex:messages:list',
  INFERENCE_HEALTH: 'arletex:inference:health',
  INFERENCE_STREAM_START: 'arletex:inference:stream:start',
  INFERENCE_STREAM_CHUNK: 'arletex:inference:stream:chunk',
  INFERENCE_STREAM_CANCEL: 'arletex:inference:stream:cancel',
  CONFIG_GET: 'arletex:config:get',
  CONFIG_UPDATE: 'arletex:config:update',
  AUDIT_LOG_LIST: 'arletex:audit:list',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// ==========================================
// Conversation Schemas & Types
// ==========================================
export const ConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).default({}),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const CreateConversationInputSchema = z.object({
  title: z.string().min(1).max(255).default('New Conversation'),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;

export const UpdateConversationInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateConversationInput = z.infer<typeof UpdateConversationInputSchema>;

// ==========================================
// Message Schemas & Types
// ==========================================
export const MessageRoleSchema = z.enum(['system', 'user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  tokenCount: z.number().int().nonnegative().nullable().default(null),
  createdAt: z.string().datetime(),
  metadata: z.record(z.unknown()).default({}),
});

export type Message = z.infer<typeof MessageSchema>;

export const CreateMessageInputSchema = z.object({
  conversationId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;

// ==========================================
// Inference Schemas & Types
// ==========================================
export const InferenceProviderTypeSchema = z.enum(['colibri', 'llama.cpp']);
export type InferenceProviderType = z.infer<typeof InferenceProviderTypeSchema>;

export const InferenceConfigSchema = z.object({
  provider: InferenceProviderTypeSchema.default('colibri'),
  serverUrl: z.string().url().default('http://127.0.0.1:8000'),
  defaultModelId: z.string().default('qwen3.6-colibri'),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(0.9),
  maxTokens: z.number().int().positive().default(2048),
  stopSequences: z.array(z.string()).default([]),
  contextSize: z.number().int().positive().default(8192),

  // Fallback resilience
  fallbackEnabled: z.boolean().default(true),
  fallbackProvider: InferenceProviderTypeSchema.default('llama.cpp'),
  fallbackServerUrl: z.string().url().default('http://127.0.0.1:8080'),
  fallbackModelId: z.string().default('Qwen3.5-9B-Heretic-Q4_K_M'),
});

export type InferenceConfig = z.infer<typeof InferenceConfigSchema>;

export const ServerHealthStatusSchema = z.enum(['connected', 'disconnected', 'checking', 'error']);
export type ServerHealthStatus = z.infer<typeof ServerHealthStatusSchema>;

export const InferenceHealthResultSchema = z.object({
  status: ServerHealthStatusSchema,
  provider: InferenceProviderTypeSchema.default('colibri'),
  url: z.string(),
  latencyMs: z.number().nullable(),
  modelLoaded: z.string().nullable(),
  error: z.string().nullable(),
  isFallback: z.boolean().default(false),
});

export type InferenceHealthResult = z.infer<typeof InferenceHealthResultSchema>;

export const StartInferenceStreamInputSchema = z.object({
  conversationId: z.string().uuid(),
  userMessageContent: z.string().min(1),
  systemPromptOverride: z.string().optional(),
  temperatureOverride: z.number().min(0).max(2).optional(),
});

export type StartInferenceStreamInput = z.infer<typeof StartInferenceStreamInputSchema>;

export const StreamChunkSchema = z.object({
  requestId: z.string().uuid(),
  conversationId: z.string().uuid(),
  delta: z.string(),
  reasoningDelta: z.string().optional(),
  fullContent: z.string(),
  fullReasoning: z.string().optional(),
  isDone: z.boolean(),
  error: z.string().nullable().default(null),
  finishReason: z.string().nullable().default(null),
  usage: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
});

export type StreamChunk = z.infer<typeof StreamChunkSchema>;

// ==========================================
// Application Configuration & Audit
// ==========================================
export const AppConfigSchema = z.object({
  databasePath: z.string(),
  inference: InferenceConfigSchema,
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  dataDirectory: z.string(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  actor: z.string(),
  action: z.string(),
  details: z.string(),
  status: z.enum(['success', 'denied', 'error']),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// API Response wrapper for IPC calls
export type IPCResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
