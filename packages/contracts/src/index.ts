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

  // Memory Channels
  MEMORIES_LIST: 'arletex:memories:list',
  MEMORIES_GET: 'arletex:memories:get',
  MEMORIES_CREATE: 'arletex:memories:create',
  MEMORIES_UPDATE: 'arletex:memories:update',
  MEMORIES_DELETE: 'arletex:memories:delete',
  MEMORIES_QUERY: 'arletex:memories:query',

  // Activities Channels
  ACTIVITIES_LIST: 'arletex:activities:list',
  ACTIVITIES_CREATE: 'arletex:activities:create',
  ACTIVITIES_UPDATE: 'arletex:activities:update',
  ACTIVITIES_DELETE: 'arletex:activities:delete',

  // Device Telemetry
  TELEMETRY_GET: 'arletex:telemetry:get',

  // Voice Pipeline (Whisper & Kokoro)
  VOICE_TRANSCRIBE: 'arletex:voice:transcribe',
  VOICE_SYNTHESIZE: 'arletex:voice:synthesize',

  // Preferences & Vision
  PREFERENCES_GET: 'arletex:preferences:get',
  PREFERENCES_SET: 'arletex:preferences:set',
  VISION_INSPECT: 'arletex:vision:inspect',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// ==========================================
// Conversation Schemas & Types
// ==========================================
export const ConversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  isPinned: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).default({}),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const CreateConversationInputSchema = z.object({
  title: z.string().min(1).max(255).default('New Conversation'),
  isPinned: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateConversationInput = z.input<typeof CreateConversationInputSchema>;

export const UpdateConversationInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  isPinned: z.boolean().optional(),
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
// Memory Schemas & Types
// ==========================================
export const MemoryTypeSchema = z.enum([
  'episodic',
  'semantic',
  'procedural',
  'relationship',
  'emotional',
  'developmental',
]);
export type MemoryType = z.infer<typeof MemoryTypeSchema>;

export const MemoryCorrectionSchema = z.object({
  timestamp: z.string(),
  previousContent: z.string(),
  reason: z.string().optional(),
});

export type MemoryCorrection = z.infer<typeof MemoryCorrectionSchema>;

export const MemorySchema = z.object({
  id: z.string().uuid(),
  type: MemoryTypeSchema,
  content: z.string().min(1),
  rawObservation: z.string().nullable().default(null),
  interpretation: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(1.0),
  importance: z.number().min(0).max(1).default(0.5),
  timestamp: z.string(),
  provenance: z.string().default('interaction'),
  sourceConversationId: z.string().uuid().nullable().default(null),
  sourceMessageId: z.string().uuid().nullable().default(null),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  correctionHistory: z.array(MemoryCorrectionSchema).default([]),
  isArchived: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  similarityScore: z.number().optional(),
});

export type Memory = z.infer<typeof MemorySchema>;

export const CreateMemoryInputSchema = z.object({
  type: MemoryTypeSchema.default('episodic'),
  content: z.string().min(1),
  rawObservation: z.string().optional(),
  interpretation: z.string().optional(),
  confidence: z.number().min(0).max(1).optional().default(1.0),
  importance: z.number().min(0).max(1).optional().default(0.5),
  timestamp: z.string().optional(),
  provenance: z.string().optional().default('interaction'),
  sourceConversationId: z.string().uuid().optional(),
  sourceMessageId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateMemoryInput = z.input<typeof CreateMemoryInputSchema>;

export const UpdateMemoryInputSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).optional(),
  interpretation: z.string().optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  reason: z.string().optional(),
});

export type UpdateMemoryInput = z.infer<typeof UpdateMemoryInputSchema>;

export const QueryMemoriesInputSchema = z.object({
  query: z.string().optional(),
  type: MemoryTypeSchema.optional(),
  limit: z.number().int().positive().optional(),
  minImportance: z.number().min(0).max(1).optional(),
  includeArchived: z.boolean().optional(),
});

export type QueryMemoriesInput = z.infer<typeof QueryMemoriesInputSchema>;

// ==========================================
// Activities Schemas & Types
// ==========================================
export const ActivityOriginSchema = z.enum(['arle_initiated', 'user_assigned']);
export type ActivityOrigin = z.infer<typeof ActivityOriginSchema>;

export const ActivityStatusSchema = z.enum([
  'planned',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
]);
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  objective: z.string().min(1),
  origin: ActivityOriginSchema,
  status: ActivityStatusSchema,
  progress: z.number().min(0).max(1).default(0.0),
  associatedMemories: z.array(z.string()).default([]),
  relevantActions: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Activity = z.infer<typeof ActivitySchema>;

export const CreateActivityInputSchema = z.object({
  title: z.string().min(1).max(255),
  objective: z.string().min(1),
  origin: ActivityOriginSchema.default('user_assigned'),
  status: ActivityStatusSchema.default('planned'),
  progress: z.number().min(0).max(1).default(0.0),
  associatedMemories: z.array(z.string()).optional().default([]),
  relevantActions: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateActivityInput = z.input<typeof CreateActivityInputSchema>;

export const UpdateActivityInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  objective: z.string().min(1).optional(),
  status: ActivityStatusSchema.optional(),
  progress: z.number().min(0).max(1).optional(),
  associatedMemories: z.array(z.string()).optional(),
  relevantActions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>;

// ==========================================
// Telemetry Schemas & Types
// ==========================================
export const DeviceTelemetrySchema = z.object({
  timestamp: z.string(),
  cpu: z.object({
    usagePercent: z.number().nullable(),
    frequencyMhz: z.number().nullable(),
    temperatureC: z.number().nullable(),
    model: z.string().nullable(),
  }),
  memory: z.object({
    totalBytes: z.number(),
    usedBytes: z.number(),
    freeBytes: z.number(),
    availableBytes: z.number(),
    usagePercent: z.number(),
    swapTotalBytes: z.number(),
    swapUsedBytes: z.number(),
  }),
  gpu: z.object({
    available: z.boolean(),
    name: z.string().nullable(),
    usagePercent: z.number().nullable(),
    temperatureC: z.number().nullable(),
    vramTotalBytes: z.number().nullable(),
    vramUsedBytes: z.number().nullable(),
    vramFreeBytes: z.number().nullable(),
  }),
  storage: z.object({
    totalBytes: z.number(),
    usedBytes: z.number(),
    freeBytes: z.number(),
    usagePercent: z.number(),
  }),
  battery: z.object({
    available: z.boolean(),
    percent: z.number().nullable(),
    isCharging: z.boolean().nullable(),
    powerWatts: z.number().nullable(),
  }),
  inference: z.object({
    activeModel: z.string().nullable(),
    provider: z.string().nullable(),
    lastTtftMs: z.number().nullable(),
    lastTps: z.number().nullable(),
    isGenerating: z.boolean(),
  }),
  services: z.object({
    backend: z.boolean(),
    database: z.boolean(),
    llamaServer: z.boolean(),
    embeddingGemma: z.boolean(),
    whisper: z.boolean(),
    kokoro: z.boolean(),
  }),
});

export type DeviceTelemetry = z.infer<typeof DeviceTelemetrySchema>;

// ==========================================
// Voice & Vision Schemas & Types
// ==========================================
export const TranscribeAudioInputSchema = z.object({
  audioBase64: z.string(),
  format: z.string().default('webm'),
});

export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

export const SynthesizeSpeechInputSchema = z.object({
  text: z.string().min(1),
  voice: z.string().optional().default('arlecchino'),
  speed: z.number().min(0.5).max(2.0).optional().default(0.93),
  tone: z.string().optional(),
  leadPaddingMs: z.number().optional().default(0),
});

export type SynthesizeSpeechInput = z.infer<typeof SynthesizeSpeechInputSchema>;

export const VisionInspectInputSchema = z.object({
  imageBase64: z.string(),
  mimeType: z.string().default('image/png'),
  prompt: z.string().optional(),
});

export type VisionInspectInput = z.infer<typeof VisionInspectInputSchema>;

export const VisionInspectResultSchema = z.object({
  description: z.string(),
  extractedText: z.string().nullable(),
  objects: z.array(z.string()).default([]),
  confidence: z.number().default(1.0),
});

export type VisionInspectResult = z.infer<typeof VisionInspectResultSchema>;

// ==========================================
// Inference Schemas & Types
// ==========================================
export const InferenceProviderTypeSchema = z.enum(['colibri', 'llama.cpp']);
export type InferenceProviderType = z.infer<typeof InferenceProviderTypeSchema>;

export const SpecialistCodingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: InferenceProviderTypeSchema.default('llama.cpp'),
  serverUrl: z.string().url().default('http://127.0.0.1:8080'),
  modelId: z.string().default('Qwen3.5-9B-Heretic-Q4_K_M'),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().positive().default(4096),
});

export type SpecialistCodingConfig = z.infer<typeof SpecialistCodingConfigSchema>;

export const InferenceConfigSchema = z.object({
  provider: InferenceProviderTypeSchema.default('llama.cpp'),
  serverUrl: z.string().url().default('http://127.0.0.1:8080'),
  defaultModelId: z.string().default('Qwen3.5-9B-Heretic-Q4_K_M'),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(0.9),
  maxTokens: z.number().int().positive().default(2048),
  stopSequences: z.array(z.string()).default([]),
  contextSize: z.number().int().positive().default(8192),

  specialistCoding: SpecialistCodingConfigSchema.default({
    enabled: false,
    provider: 'llama.cpp',
    serverUrl: 'http://127.0.0.1:8080',
    modelId: 'Qwen3.5-9B-Heretic-Q4_K_M',
    temperature: 0.2,
    maxTokens: 4096,
  }),

  fallbackEnabled: z.boolean().default(false),
  fallbackProvider: InferenceProviderTypeSchema.default('llama.cpp'),
  fallbackServerUrl: z.string().url().default('http://127.0.0.1:8080'),
  fallbackModelId: z.string().default('Qwen3.5-9B-Heretic-Q4_K_M'),
});

export type InferenceConfig = z.infer<typeof InferenceConfigSchema>;

export const UpdateInferenceConfigInputSchema = InferenceConfigSchema.partial();
export type UpdateInferenceConfigInput = z.infer<typeof UpdateInferenceConfigInputSchema>;

export const ServerHealthStatusSchema = z.enum(['connected', 'disconnected', 'checking', 'error']);
export type ServerHealthStatus = z.infer<typeof ServerHealthStatusSchema>;

export const InferenceHealthResultSchema = z.object({
  status: ServerHealthStatusSchema,
  provider: InferenceProviderTypeSchema.default('llama.cpp'),
  url: z.string(),
  latencyMs: z.number().nullable(),
  modelLoaded: z.string().nullable(),
  error: z.string().nullable(),
  isFallback: z.boolean().default(false),
  specialistCoding: z
    .object({
      status: ServerHealthStatusSchema,
      url: z.string(),
      modelLoaded: z.string().nullable(),
      latencyMs: z.number().nullable(),
    })
    .optional(),
});

export type InferenceHealthResult = z.infer<typeof InferenceHealthResultSchema>;

export const StartInferenceStreamInputSchema = z.object({
  requestId: z.string().uuid().optional(),
  conversationId: z.string().uuid(),
  userMessageContent: z.string().min(1),
  imageBase64: z.string().optional(),
  systemPromptOverride: z.string().optional(),
  temperatureOverride: z.number().min(0).max(2).optional(),
});

export type StartInferenceStreamInput = z.infer<typeof StartInferenceStreamInputSchema>;

export const CancelInferenceInputSchema = z.object({
  requestId: z.string().uuid(),
});

export type CancelInferenceInput = z.infer<typeof CancelInferenceInputSchema>;

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
  specialistStage: z.enum(['central', 'coding_specialist', 'synthesis']).optional(),
  specialistModel: z.string().optional(),
  ttftMs: z.number().optional(),
  tokensPerSecond: z.number().optional(),
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

export type IPCResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
