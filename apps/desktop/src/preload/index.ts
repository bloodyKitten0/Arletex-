import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  Conversation,
  InferenceHealthResult,
  IPC_CHANNELS,
  IPCResponse,
  Message,
  StartInferenceStreamInput,
  StreamChunk,
} from '@arletex/contracts';

export interface ArletexApi {
  listConversations: () => Promise<IPCResponse<Conversation[]>>;
  createConversation: (title?: string) => Promise<IPCResponse<Conversation>>;
  getConversation: (id: string) => Promise<IPCResponse<Conversation>>;
  updateConversation: (id: string, title?: string) => Promise<IPCResponse<Conversation>>;
  deleteConversation: (id: string) => Promise<IPCResponse<boolean>>;
  listMessages: (conversationId: string) => Promise<IPCResponse<Message[]>>;
  checkInferenceHealth: () => Promise<IPCResponse<InferenceHealthResult>>;
  startInferenceStream: (input: StartInferenceStreamInput) => Promise<IPCResponse<null>>;
  cancelInference: (requestId: string) => Promise<IPCResponse<{ cancelled: boolean }>>;
  onStreamChunk: (callback: (chunk: StreamChunk) => void) => () => void;
}

const api: ArletexApi = {
  listConversations: () => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_LIST),
  createConversation: (title) => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_CREATE, title),
  getConversation: (id) => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_GET, id),
  updateConversation: (id, title) => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_UPDATE, id, title),
  deleteConversation: (id) => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATIONS_DELETE, id),
  listMessages: (conversationId) => ipcRenderer.invoke(IPC_CHANNELS.MESSAGES_LIST, conversationId),
  checkInferenceHealth: () => ipcRenderer.invoke(IPC_CHANNELS.INFERENCE_HEALTH),
  startInferenceStream: (input) => ipcRenderer.invoke(IPC_CHANNELS.INFERENCE_STREAM_START, input),
  cancelInference: (requestId) => ipcRenderer.invoke(IPC_CHANNELS.INFERENCE_STREAM_CANCEL, requestId),
  onStreamChunk: (callback: (chunk: StreamChunk) => void) => {
    const subscription = (_: IpcRendererEvent, chunk: StreamChunk) => callback(chunk);
    ipcRenderer.on(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.INFERENCE_STREAM_CHUNK, subscription);
    };
  },
};

contextBridge.exposeInMainWorld('arletexApi', api);
