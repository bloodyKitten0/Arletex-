import {
  InferenceConfig,
  InferenceHealthResult,
  InferenceProviderType,
  StreamChunk,
} from '@arletex/contracts';

export type ChatMessageContent =
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;

export interface ChatStreamOptions {
  conversationId: string;
  requestId: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: ChatMessageContent }>;
  configOverride?: Partial<InferenceConfig>;
  signal?: AbortSignal;
  onChunk: (chunk: StreamChunk) => void;
}

export interface IInferenceProvider {
  readonly providerType: InferenceProviderType;
  readonly name: string;
  checkHealth(): Promise<InferenceHealthResult>;
  streamChat(options: ChatStreamOptions): Promise<string>;
  updateConfig(newConfig: Partial<InferenceConfig>): void;
  getConfig(): InferenceConfig;
}
