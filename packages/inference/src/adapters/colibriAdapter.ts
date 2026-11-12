import {
  InferenceConfig,
  InferenceConfigSchema,
  InferenceHealthResult,
  InferenceProviderType,
} from '@arletex/contracts';
import { ILogger, InferenceError, ModelUnavailableError, rootLogger } from '@arletex/core';
import { createParser, EventSourceMessage } from 'eventsource-parser';
import { ChatStreamOptions, IInferenceProvider } from '../types.js';

export class ColibriAdapter implements IInferenceProvider {
  public readonly providerType: InferenceProviderType = 'colibri';
  public readonly name = 'Colibri Local Engine';

  private config: InferenceConfig;
  private readonly logger: ILogger;

  constructor(config: Partial<InferenceConfig> = {}, logger: ILogger = rootLogger) {
    this.config = InferenceConfigSchema.parse({
      ...config,
      provider: 'colibri',
    });
    this.logger = logger.child('ColibriAdapter');
  }

  public updateConfig(newConfig: Partial<InferenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Updated Colibri adapter configuration', this.config);
  }

  public getConfig(): InferenceConfig {
    return { ...this.config };
  }

  public async checkHealth(): Promise<InferenceHealthResult> {
    const startTime = Date.now();
    const serverUrl = this.config.serverUrl;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      let response: Response;
      let modelLoaded: string | null = null;

      try {
        // Probe OpenAI standard endpoint first (/v1/models)
        response = await fetch(`${serverUrl}/v1/models`, {
          method: 'GET',
          signal: controller.signal,
        });

        if (response.ok) {
          try {
            const data = (await response.json()) as { data?: Array<{ id: string }> };
            if (data.data && data.data.length > 0 && data.data[0]) {
              modelLoaded = data.data[0].id;
            }
          } catch {}
        } else {
          // If /v1/models not implemented or 404, fallback to /health
          response = await fetch(`${serverUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
          });
        }
      } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        response = await fetch(`${serverUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          status: 'error',
          provider: 'colibri',
          url: serverUrl,
          latencyMs,
          modelLoaded: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          isFallback: false,
        };
      }

      return {
        status: 'connected',
        provider: 'colibri',
        url: serverUrl,
        latencyMs,
        modelLoaded: modelLoaded || this.config.defaultModelId,
        error: null,
        isFallback: false,
      };
    } catch (err: any) {
      return {
        status: 'disconnected',
        provider: 'colibri',
        url: serverUrl,
        latencyMs: null,
        modelLoaded: null,
        error: err.name === 'AbortError' ? 'Colibri health check timed out' : err.message,
        isFallback: false,
      };
    }
  }

  public async streamChat(options: ChatStreamOptions): Promise<string> {
    const { conversationId, requestId, messages, configOverride, signal, onChunk } = options;
    const effectiveConfig = { ...this.config, ...configOverride };
    const endpoint = `${effectiveConfig.serverUrl}/v1/chat/completions`;

    this.logger.info(`[Colibri] Starting stream inference request ${requestId} to ${endpoint}`);

    const payload = {
      model: effectiveConfig.defaultModelId,
      messages,
      temperature: effectiveConfig.temperature,
      top_p: effectiveConfig.topP,
      max_tokens: effectiveConfig.maxTokens,
      stream: true,
      stop: effectiveConfig.stopSequences.length > 0 ? effectiveConfig.stopSequences : undefined,
      chat_template_kwargs: { enable_thinking: false },
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        this.logger.info(`[Colibri] Inference request ${requestId} was cancelled by caller.`);
        onChunk({
          requestId,
          conversationId,
          delta: '',
          fullContent: '',
          isDone: true,
          finishReason: 'cancelled',
          error: null,
        });
        return '';
      }
      this.logger.error(`[Colibri] Network error connecting to ${endpoint}`, err);
      throw new ModelUnavailableError(effectiveConfig.serverUrl, err);
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => 'Unknown error');
      this.logger.error(`[Colibri] Server responded with HTTP ${response.status}`, errBody);
      const errMsg = `Colibri server error (${response.status}): ${errBody}`;
      onChunk({
        requestId,
        conversationId,
        delta: '',
        fullContent: '',
        isDone: true,
        finishReason: 'error',
        error: errMsg,
      });
      throw new InferenceError(errMsg);
    }

    if (!response.body) {
      throw new InferenceError('Response body is null from Colibri server');
    }

    let fullContent = '';
    let fullReasoning = '';
    let isDoneEmitted = false;
    let lastFinishReason: string | null = null;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const emitDone = (finishReason = 'stop') => {
      if (!isDoneEmitted) {
        isDoneEmitted = true;
        const text = fullContent || fullReasoning;
        onChunk({
          requestId,
          conversationId,
          delta: '',
          fullContent: text,
          fullReasoning,
          isDone: true,
          finishReason: lastFinishReason || finishReason,
          error: null,
        });
      }
    };

    const parser = createParser({
      onEvent: (event: EventSourceMessage) => {
        if (event.data === '[DONE]') {
          emitDone();
          return;
        }

        try {
          const parsed = JSON.parse(event.data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          const reasoningDelta = parsed.choices?.[0]?.delta?.reasoning_content || '';
          const finishReason = parsed.choices?.[0]?.finish_reason || null;
          if (finishReason) {
            lastFinishReason = finishReason;
          }

          if (reasoningDelta) {
            fullReasoning += reasoningDelta;
          }

          if (delta) {
            fullContent += delta;
          }

          if (delta || reasoningDelta) {
            onChunk({
              requestId,
              conversationId,
              delta,
              reasoningDelta,
              fullContent: fullContent || fullReasoning,
              fullReasoning,
              isDone: false,
              finishReason: null,
              error: null,
            });
          }
        } catch (parseErr) {
          this.logger.warn('[Colibri] Failed to parse SSE JSON chunk', {
            data: event.data,
            error: parseErr,
          });
        }
      },
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
      // Ensure completion chunk is emitted even if server closed without [DONE]
      emitDone();
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        this.logger.info(`[Colibri] Stream reading aborted for request ${requestId}`);
        if (!isDoneEmitted) {
          isDoneEmitted = true;
          onChunk({
            requestId,
            conversationId,
            delta: '',
            fullContent,
            fullReasoning,
            isDone: true,
            finishReason: 'cancelled',
            error: null,
          });
        }
        return fullContent || fullReasoning;
      }
      this.logger.error('[Colibri] Error while reading stream chunks', err);
      if (!isDoneEmitted) {
        isDoneEmitted = true;
        onChunk({
          requestId,
          conversationId,
          delta: '',
          fullContent: fullContent || fullReasoning,
          fullReasoning,
          isDone: true,
          finishReason: 'error',
          error: err.message,
        });
      }
      throw err;
    }

    return fullContent || fullReasoning;
  }
}
