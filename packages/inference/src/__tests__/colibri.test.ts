import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { ColibriAdapter } from '../adapters/colibriAdapter.js';
import { InferenceGateway } from '../gateway.js';
import { StreamChunk } from '@arletex/contracts';

describe('ColibriAdapter & InferenceGateway Integration', () => {
  let mockColibriServer: http.Server | null = null;
  let mockLlamaServer: http.Server | null = null;

  afterEach(async () => {
    if (mockColibriServer) {
      await new Promise<void>((resolve) => mockColibriServer!.close(() => resolve()));
      mockColibriServer = null;
    }
    if (mockLlamaServer) {
      await new Promise<void>((resolve) => mockLlamaServer!.close(() => resolve()));
      mockLlamaServer = null;
    }
  });

  describe('ColibriAdapter', () => {
    it('reports disconnected when Colibri daemon is offline', async () => {
      const adapter = new ColibriAdapter({
        serverUrl: 'http://127.0.0.1:58888',
        defaultModelId: 'colibri-custom-9b',
      });

      const health = await adapter.checkHealth();
      expect(health.status).toBe('disconnected');
      expect(health.provider).toBe('colibri');
      expect(health.latencyMs).toBeNull();
      expect(health.error).toBeDefined();
    });

    it('reports connected when Colibri /v1/models responds', async () => {
      mockColibriServer = http.createServer((req, res) => {
        if (req.url === '/v1/models') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [{ id: 'colibri-model-v1' }] }));
        } else if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      await new Promise<void>((resolve) => mockColibriServer!.listen(0, '127.0.0.1', () => resolve()));
      const port = (mockColibriServer.address() as AddressInfo).port;

      const adapter = new ColibriAdapter({
        serverUrl: `http://127.0.0.1:${port}`,
        defaultModelId: 'colibri-model-v1',
      });

      const health = await adapter.checkHealth();
      expect(health.status).toBe('connected');
      expect(health.provider).toBe('colibri');
      expect(health.modelLoaded).toBe('colibri-model-v1');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('streams response including reasoning_content thinking tokens', async () => {
      mockColibriServer = http.createServer((req, res) => {
        if (req.url === '/v1/chat/completions' && req.method === 'POST') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          // Simulate thinking model emitting reasoning tokens first, then content
          res.write('data: {"choices":[{"delta":{"reasoning_content":"Thinking about the answer..."}}]}\n\n');
          setTimeout(() => {
            res.write('data: {"choices":[{"delta":{"content":"Here is the verified answer."}}]}\n\n');
            setTimeout(() => {
              res.write('data: [DONE]\n\n');
              res.end();
            }, 20);
          }, 20);
        }
      });

      await new Promise<void>((resolve) => mockColibriServer!.listen(0, '127.0.0.1', () => resolve()));
      const port = (mockColibriServer.address() as AddressInfo).port;

      const adapter = new ColibriAdapter({
        serverUrl: `http://127.0.0.1:${port}`,
        defaultModelId: 'colibri-reasoning-model',
      });

      const chunks: StreamChunk[] = [];
      const result = await adapter.streamChat({
        conversationId: 'conv-123',
        requestId: 'req-123',
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        onChunk: (chunk) => chunks.push(chunk),
      });

      expect(result).toBe('Here is the verified answer.');
      expect(chunks.some((c) => c.reasoningDelta?.includes('Thinking'))).toBe(true);
      expect(chunks.some((c) => c.delta?.includes('verified answer'))).toBe(true);
      expect(chunks[chunks.length - 1]?.isDone).toBe(true);
      expect(chunks[chunks.length - 1]?.finishReason).toBe('stop');
    });

    it('handles stream cancellation gracefully', async () => {
      mockColibriServer = http.createServer((req, res) => {
        if (req.url === '/v1/chat/completions') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.write('data: {"choices":[{"delta":{"content":"Chunk 1"}}]}\n\n');
        }
      });

      await new Promise<void>((resolve) => mockColibriServer!.listen(0, '127.0.0.1', () => resolve()));
      const port = (mockColibriServer.address() as AddressInfo).port;

      const adapter = new ColibriAdapter({
        serverUrl: `http://127.0.0.1:${port}`,
      });

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 25);

      const chunks: StreamChunk[] = [];
      await adapter.streamChat({
        conversationId: 'conv-123',
        requestId: 'req-cancel',
        messages: [{ role: 'user', content: 'Long request' }],
        signal: controller.signal,
        onChunk: (chunk) => chunks.push(chunk),
      });

      expect(chunks[chunks.length - 1]?.finishReason).toBe('cancelled');
    });
  });

  describe('InferenceGateway (Provider Dispatch & Fallback)', () => {
    it('routes to Colibri by default when Colibri is online', async () => {
      mockColibriServer = http.createServer((req, res) => {
        if (req.url === '/v1/models') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [{ id: 'colibri-primary' }] }));
        } else if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      await new Promise<void>((resolve) => mockColibriServer!.listen(0, '127.0.0.1', () => resolve()));
      const colibriPort = (mockColibriServer.address() as AddressInfo).port;

      const gateway = new InferenceGateway({
        provider: 'colibri',
        serverUrl: `http://127.0.0.1:${colibriPort}`,
        defaultModelId: 'colibri-primary',
        fallbackServerUrl: 'http://127.0.0.1:59999', // explicitly set fallback to non-existent port in this test
      });

      const health = await gateway.checkHealth();
      expect(health.status).toBe('connected');
      expect(health.provider).toBe('colibri');
      expect(health.isFallback).toBe(false);
      expect(health.modelLoaded).toBe('colibri-primary');
    });

    it('falls back to llama.cpp when Colibri is offline and fallback is enabled', async () => {
      // Colibri server is NOT running (dead port 59998)
      // Llama server IS running
      mockLlamaServer = http.createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } else if (req.url === '/v1/models') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [{ id: 'llama-fallback-model' }] }));
        }
      });
      await new Promise<void>((resolve) => mockLlamaServer!.listen(0, '127.0.0.1', () => resolve()));
      const llamaPort = (mockLlamaServer.address() as AddressInfo).port;

      const gateway = new InferenceGateway({
        provider: 'colibri',
        serverUrl: 'http://127.0.0.1:59998', // Colibri offline
        defaultModelId: 'colibri-model',
        fallbackEnabled: true,
        fallbackProvider: 'llama.cpp',
        fallbackServerUrl: `http://127.0.0.1:${llamaPort}`,
        fallbackModelId: 'llama-fallback-model',
      });

      const health = await gateway.checkHealth();
      expect(health.status).toBe('connected');
      expect(health.provider).toBe('llama.cpp');
      expect(health.isFallback).toBe(true);
      expect(health.modelLoaded).toBe('llama-fallback-model');
    });

    it('streams from fallback provider when primary provider is offline', async () => {
      mockLlamaServer = http.createServer((req, res) => {
        if (req.url === '/v1/chat/completions' && req.method === 'POST') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            Connection: 'keep-alive',
          });
          res.write('data: {"choices":[{"delta":{"content":"Fallback response."}}]}\n\n');
          setTimeout(() => {
            res.write('data: [DONE]\n\n');
            res.end();
          }, 20);
        }
      });
      await new Promise<void>((resolve) => mockLlamaServer!.listen(0, '127.0.0.1', () => resolve()));
      const llamaPort = (mockLlamaServer.address() as AddressInfo).port;

      const gateway = new InferenceGateway({
        provider: 'colibri',
        serverUrl: 'http://127.0.0.1:59997', // Colibri offline
        fallbackEnabled: true,
        fallbackServerUrl: `http://127.0.0.1:${llamaPort}`,
      });

      const chunks: StreamChunk[] = [];
      const result = await gateway.streamChat({
        conversationId: 'conv-fallback',
        requestId: 'req-fallback',
        messages: [{ role: 'user', content: 'Hello' }],
        onChunk: (c) => chunks.push(c),
      });

      expect(result).toBe('Fallback response.');
      expect(chunks[chunks.length - 1]?.isDone).toBe(true);
    });

    it('allows dynamic provider and settings updates', () => {
      const gateway = new InferenceGateway({
        provider: 'colibri',
        serverUrl: 'http://127.0.0.1:8080',
      });

      expect(gateway.getActiveProvider().providerType).toBe('colibri');

      gateway.updateConfig({
        provider: 'llama.cpp',
        defaultModelId: 'custom-llama-model',
      });

      expect(gateway.getConfig().provider).toBe('llama.cpp');
      expect(gateway.getActiveProvider().providerType).toBe('llama.cpp');
    });
  });
});
