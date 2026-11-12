import {
  InferenceConfig,
  InferenceHealthResult,
  InferenceProviderType,
  StreamChunk,
} from '@arletex/contracts';

export interface ChatStreamOptions {
  conversationId: string;
  requestId: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
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
