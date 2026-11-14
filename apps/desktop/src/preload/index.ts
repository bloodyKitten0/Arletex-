import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  Activity,
  ActivityOrigin,
  ActivityStatus,
  Conversation,
  CreateActivityInput,
  CreateMemoryInput,
  DeviceTelemetry,
  InferenceConfig,
  InferenceHealthResult,
  IPC_CHANNELS,
  IPCResponse,
  Memory,
  Message,
  QueryMemoriesInput,
  StartInferenceStreamInput,
  StreamChunk,
  UpdateActivityInput,
  UpdateMemoryInput,
  VisionInspectResult,
  ApeAppraisal,
  ApeHistoryResponse,
  ApePsychologicalState,
  ApeRelationshipConfig,
  EmotionTaxonomyItem,
  MoodTaxonomyItem,
} from '@arletex/contracts';

export interface ArletexApi {
  listConversations: () => Promise<IPCResponse<Conversation[]>>;
  createConversation: (title?: string, isPinned?: boolean) => Promise<IPCResponse<Conversation>>;
  getConversation: (id: string) => Promise<IPCResponse<Conversation>>;
  updateConversation: (id: string, title?: string, isPinned?: boolean) => Promise<IPCResponse<Conversation>>;
  deleteConversation: (id: string) => Promise<IPCResponse<boolean>>;
  listMessages: (conversationId: string) => Promise<IPCResponse<Message[]>>;
  checkInferenceHealth: () => Promise<IPCResponse<InferenceHealthResult>>;
  updateInferenceConfig: (config: Partial<InferenceConfig>) => Promise<IPCResponse<InferenceConfig>>;
  startInferenceStream: (input: StartInferenceStreamInput) => Promise<IPCResponse<null>>;
  cancelInference: (requestId: string) => Promise<IPCResponse<{ cancelled: boolean }>>;
  onStreamChunk: (callback: (chunk: StreamChunk) => void) => () => void;

  // Memory APIs
  listMemories: (options?: QueryMemoriesInput) => Promise<IPCResponse<Memory[]>>;
  createMemory: (input: CreateMemoryInput) => Promise<IPCResponse<Memory>>;
  updateMemory: (input: UpdateMemoryInput) => Promise<IPCResponse<Memory>>;
  deleteMemory: (id: string) => Promise<IPCResponse<boolean>>;
  mergeMemories: (primaryId: string, secondaryId: string) => Promise<IPCResponse<Memory>>;

  // Activities APIs
  listActivities: (status?: ActivityStatus, origin?: ActivityOrigin) => Promise<IPCResponse<Activity[]>>;
  createActivity: (input: CreateActivityInput) => Promise<IPCResponse<Activity>>;
  updateActivity: (input: UpdateActivityInput) => Promise<IPCResponse<Activity>>;
  deleteActivity: (id: string) => Promise<IPCResponse<boolean>>;

  // Device Telemetry & Preferences
  getTelemetry: () => Promise<IPCResponse<DeviceTelemetry>>;
  getPreferences: () => Promise<IPCResponse<Record<string, string>>>;
  setPreference: (key: string, value: string) => Promise<IPCResponse<boolean>>;

  // Voice & Vision
  transcribeAudio: (audioBase64: string, format?: string) => Promise<IPCResponse<{ transcript: string }>>;
  synthesizeSpeech: (
    text: string,
    voice?: string,
    tone?: string,
    leadPaddingMs?: number,
  ) => Promise<IPCResponse<{ audioBase64: string | null }>>;
  inspectVision: (imageBase64: string, mimeType?: string, prompt?: string) => Promise<IPCResponse<VisionInspectResult>>;

  // APE (Artificial Psychology Engine)
  getApeState: () => Promise<IPCResponse<ApePsychologicalState>>;
  getApeHistory: () => Promise<IPCResponse<ApeHistoryResponse>>;
  getApeTaxonomy: () => Promise<IPCResponse<{ emotions: EmotionTaxonomyItem[]; moods: MoodTaxonomyItem[] }>>;
  processApeEvent: (event: any) => Promise<IPCResponse<{ state: ApePsychologicalState; appraisal?: ApeAppraisal }>>;
  getApeRelationship: () => Promise<IPCResponse<ApeRelationshipConfig>>;
  updateApeRelationship: (config: Partial<ApeRelationshipConfig>) => Promise<IPCResponse<ApeRelationshipConfig>>;
}

const api: ArletexApi = {
  listConversations: () => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_LIST),
  createConversation: (title, isPinned) => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_CREATE, title, isPinned),
  getConversation: (id) => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_GET, id),
  updateConversation: (id, title, isPinned) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_UPDATE, id, title, isPinned),
  deleteConversation: (id) => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_DELETE, id),
  listMessages: (conversationId) => ipcRenderer.invoke(IPC_CHANNELS.MESSAGES_LIST, conversationId),
  checkInferenceHealth: () => ipcRenderer.invoke(IPC_CHANNELS.INFERENCE_HEALTH),
  updateInferenceConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_UPDATE, config),
  startInferenceStream: (input) => ipcRenderer.invoke(IPC_CHANNELS.INFERENCE_STREAM_START, input),
  cancelInference: (requestId) => ipcRenderer.invoke(IPC_CHANNELS.INFERENCE_STREAM_CANCEL, requestId),
  onStreamChunk: (callback: (chunk: StreamChunk) => void) => {
    const subscription = (_: IpcRendererEvent, chunk: StreamChunk) => callback(chunk);
    ipcRenderer.on(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, subscription);
    };
  },

  listMemories: (options) => ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_LIST, options),
  createMemory: (input) => ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_CREATE, input),
  updateMemory: (input) => ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_UPDATE, input),
  deleteMemory: (id) => ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_DELETE, id),
  mergeMemories: (primaryId, secondaryId) =>
    ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_QUERY, { primaryId, secondaryId }),

  listActivities: (status, origin) => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITIES_LIST, status, origin),
  createActivity: (input) => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITIES_CREATE, input),
  updateActivity: (input) => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITIES_UPDATE, input),
  deleteActivity: (id) => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITIES_DELETE, id),

  getTelemetry: () => ipcRenderer.invoke(IPC_CHANNELS.TELEMETRY_GET),
  getPreferences: () => ipcRenderer.invoke(IPC_CHANNELS.PREFERENCES_GET),
  setPreference: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.PREFERENCES_SET, key, value),

  transcribeAudio: (audioBase64, format) =>
    ipcRenderer.invoke(IPC_CHANNELS.VOICE_TRANSCRIBE, { audioBase64, format }),
  synthesizeSpeech: (text, voice, tone, leadPaddingMs) =>
    ipcRenderer.invoke(IPC_CHANNELS.VOICE_SYNTHESIZE, { text, voice, tone, leadPaddingMs }),
  inspectVision: (imageBase64, mimeType, prompt) =>
    ipcRenderer.invoke(IPC_CHANNELS.VISION_INSPECT, { imageBase64, mimeType, prompt }),

  // APE (Artificial Psychology Engine)
  getApeState: () => ipcRenderer.invoke(IPC_CHANNELS.APE_STATE_GET),
  getApeHistory: () => ipcRenderer.invoke(IPC_CHANNELS.APE_HISTORY_GET),
  getApeTaxonomy: () => ipcRenderer.invoke(IPC_CHANNELS.APE_TAXONOMY_GET),
  processApeEvent: (event) => ipcRenderer.invoke(IPC_CHANNELS.APE_EVENT_PROCESS, event),
  getApeRelationship: () => ipcRenderer.invoke(IPC_CHANNELS.APE_RELATIONSHIP_GET),
  updateApeRelationship: (config) => ipcRenderer.invoke(IPC_CHANNELS.APE_RELATIONSHIP_UPDATE, config),
};

contextBridge.exposeInMainWorld('arletexApi', api);
