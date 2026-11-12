import {
  InferenceConfig,
  InferenceConfigSchema,
  InferenceHealthResult,
  InferenceProviderType,
} from '@arletex/contracts';
import { ILogger, ModelUnavailableError, rootLogger } from '@arletex/core';
import { ChatStreamOptions, IInferenceProvider } from './types.js';
import { ColibriAdapter } from './adapters/colibriAdapter.js';
import { LlamaServerAdapter } from './adapters/llamaServerAdapter.js';

export class InferenceGateway implements IInferenceProvider {
  public readonly providerType: InferenceProviderType;
  public readonly name = 'Inference Gateway Dispatcher';

  private config: InferenceConfig;
  private readonly logger: ILogger;
  private readonly colibriAdapter: ColibriAdapter;
  private readonly llamaAdapter: LlamaServerAdapter;
  private readonly codingSpecialistAdapter: ColibriAdapter;

  constructor(config: Partial<InferenceConfig> = {}, logger: ILogger = rootLogger) {
    this.config = InferenceConfigSchema.parse(config);
    this.logger = logger.child('InferenceGateway');
    this.providerType = this.config.provider;

    // Initialize adapters with appropriate endpoints and model IDs
    this.colibriAdapter = new ColibriAdapter(
      {
        ...this.config,
        provider: 'colibri',
      },
      logger,
    );

    const isLlamaPrimary = this.config.provider === 'llama.cpp';
    this.llamaAdapter = new LlamaServerAdapter(
      {
        ...this.config,
        provider: 'llama.cpp',
        serverUrl: isLlamaPrimary ? this.config.serverUrl : this.config.fallbackServerUrl,
        defaultModelId: isLlamaPrimary ? this.config.defaultModelId : this.config.fallbackModelId,
      },
      logger,
    );

    // Coding Specialist Engine (Heretic Qwen3-Coder-30B)
    this.codingSpecialistAdapter = new ColibriAdapter(
      {
        ...this.config,
        provider: 'colibri',
        serverUrl: this.config.specialistCoding.serverUrl,
        defaultModelId: this.config.specialistCoding.modelId,
        temperature: this.config.specialistCoding.temperature,
        maxTokens: this.config.specialistCoding.maxTokens,
      },
      logger.child('CodingSpecialist'),
    );
  }

  public getActiveProvider(): IInferenceProvider {
    return this.config.provider === 'colibri' ? this.colibriAdapter : this.llamaAdapter;
  }

  public getFallbackProvider(): IInferenceProvider {
    return this.config.provider === 'colibri' ? this.llamaAdapter : this.colibriAdapter;
  }

  public getCodingSpecialistAdapter(): ColibriAdapter {
    return this.codingSpecialistAdapter;
  }

  public updateConfig(newConfig: Partial<InferenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.colibriAdapter.updateConfig({
      ...this.config,
      provider: 'colibri',
    });

    const isLlamaPrimary = this.config.provider === 'llama.cpp';
    this.llamaAdapter.updateConfig({
      ...this.config,
      provider: 'llama.cpp',
      serverUrl: isLlamaPrimary ? this.config.serverUrl : this.config.fallbackServerUrl,
      defaultModelId: isLlamaPrimary ? this.config.defaultModelId : this.config.fallbackModelId,
    });

    this.codingSpecialistAdapter.updateConfig({
      ...this.config,
      provider: 'colibri',
      serverUrl: this.config.specialistCoding.serverUrl,
      defaultModelId: this.config.specialistCoding.modelId,
      temperature: this.config.specialistCoding.temperature,
      maxTokens: this.config.specialistCoding.maxTokens,
    });

    this.logger.info(`InferenceGateway updated. Active provider: ${this.config.provider}, fallbackEnabled: ${this.config.fallbackEnabled}`);
  }

  public getConfig(): InferenceConfig {
    return { ...this.config };
  }

  public async checkHealth(): Promise<InferenceHealthResult> {
    const primary = this.getActiveProvider();
    const primaryHealth = await primary.checkHealth();

    // Check coding specialist if enabled
    let specialistCodingHealth: InferenceHealthResult['specialistCoding'] = undefined;
    if (this.config.specialistCoding.enabled) {
      try {
        const specHealth = await this.codingSpecialistAdapter.checkHealth();
        specialistCodingHealth = {
          status: specHealth.status,
          url: specHealth.url,
          modelLoaded: specHealth.modelLoaded,
          latencyMs: specHealth.latencyMs,
        };
      } catch (err: any) {
        specialistCodingHealth = {
          status: 'error',
          url: this.config.specialistCoding.serverUrl,
          modelLoaded: null,
          latencyMs: null,
        };
      }
    }

    if (primaryHealth.status === 'connected') {
      return {
        ...primaryHealth,
        isFallback: false,
        specialistCoding: specialistCodingHealth,
      };
    }

    // Check if fallback is eligible
    if (this.config.fallbackEnabled) {
      const fallback = this.getFallbackProvider();
      const fallbackHealth = await fallback.checkHealth();

      if (fallbackHealth.status === 'connected') {
        this.logger.info(`Primary inference provider (${primary.name}) offline. Fallback provider (${fallback.name}) is online.`);
        return {
          ...fallbackHealth,
          isFallback: true,
          error: `Primary (${primary.providerType}) offline: ${primaryHealth.error}. Using fallback.`,
          specialistCoding: specialistCodingHealth,
        };
      }
    }

    return {
      ...primaryHealth,
      isFallback: false,
      specialistCoding: specialistCodingHealth,
    };
  }

  public async streamCodingSpecialist(options: ChatStreamOptions): Promise<string> {
    if (!this.config.specialistCoding.enabled) {
      throw new Error('Coding specialist is not enabled in configuration');
    }
    return await this.codingSpecialistAdapter.streamChat(options);
  }

  public async streamChat(options: ChatStreamOptions): Promise<string> {
    const primary = this.getActiveProvider();

    try {
      return await primary.streamChat(options);
    } catch (err: any) {
      // If caller aborted/cancelled, do not attempt fallback
      if (err.name === 'AbortError' || options.signal?.aborted) {
        throw err;
      }

      // Check if fallback is enabled and error is model unavailability
      if (this.config.fallbackEnabled && err instanceof ModelUnavailableError) {
        const fallback = this.getFallbackProvider();
        this.logger.warn(`Primary provider (${primary.name}) unavailable. Triggering fallback to ${fallback.name}...`, err);

        // Notify client about fallback transition before streaming from fallback
        options.onChunk({
          requestId: options.requestId,
          conversationId: options.conversationId,
          delta: '',
          fullContent: '',
          isDone: false,
          error: null,
          finishReason: null,
        });

        return await fallback.streamChat(options);
      }

      throw err;
    }
  }
}
