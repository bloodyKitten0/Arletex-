import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { LlamaServerAdapter } from '../adapters/llamaServerAdapter.js';
import { StreamChunk } from '@arletex/contracts';

describe('Inference Package - LlamaServerAdapter', () => {
  let mockServer: http.Server | null = null;

  afterEach(async () => {
    if (mockServer) {
      await new Promise<void>((resolve) => mockServer!.close(() => resolve()));
      mockServer = null;
    }
  });

  it('handles offline inference server gracefully', async () => {
    const gateway = new LlamaServerAdapter({
      serverUrl: 'http://127.0.0.1:59999', // Non-existent port
      defaultModelId: 'test-model',
    });

    const health = await gateway.checkHealth();
    expect(health.status).toBe('disconnected');
    expect(health.provider).toBe('llama.cpp');
    expect(health.error).toBeDefined();
    expect(health.latencyMs).toBeNull();
  });

  it('reports healthy when server responds to /health', async () => {
    mockServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ id: 'Qwen3.5-9B-Heretic' }] }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => mockServer!.listen(0, '127.0.0.1', () => resolve()));
    const port = (mockServer.address() as AddressInfo).port;

    const gateway = new LlamaServerAdapter({
      serverUrl: `http://127.0.0.1:${port}`,
      defaultModelId: 'Qwen3.5-9B-Heretic',
    });

    const health = await gateway.checkHealth();
    expect(health.status).toBe('connected');
    expect(health.provider).toBe('llama.cpp');
    expect(health.modelLoaded).toBe('Qwen3.5-9B-Heretic');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('streams chat completions over SSE correctly', async () => {
    mockServer = http.createServer((req, res) => {
      if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        // Send mock chunks
        res.write('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
        setTimeout(() => {
          res.write('data: {"choices":[{"delta":{"content":" world."}}]}\n\n');
          setTimeout(() => {
            res.write('data: [DONE]\n\n');
            res.end();
          }, 20);
        }, 20);
      }
    });

    await new Promise<void>((resolve) => mockServer!.listen(0, '127.0.0.1', () => resolve()));
    const port = (mockServer.address() as AddressInfo).port;

    const gateway = new LlamaServerAdapter({
      serverUrl: `http://127.0.0.1:${port}`,
      defaultModelId: 'test-model',
    });

    const receivedChunks: StreamChunk[] = [];
    const fullResult = await gateway.streamChat({
      conversationId: 'test-conv-id',
      requestId: 'test-req-id',
      messages: [{ role: 'user', content: 'Hi' }],
      onChunk: (chunk) => {
        receivedChunks.push(chunk);
      },
    });

    expect(fullResult).toBe('Hello world.');
    expect(receivedChunks.length).toBeGreaterThanOrEqual(2);
    expect(receivedChunks[receivedChunks.length - 1]?.isDone).toBe(true);
    expect(receivedChunks[receivedChunks.length - 1]?.finishReason).toBe('stop');
  });

  it('supports stream cancellation', async () => {
    mockServer = http.createServer((req, res) => {
      if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write('data: {"choices":[{"delta":{"content":"Token 1"}}]}\n\n');
        // keep open indefinitely until aborted
      }
    });

    await new Promise<void>((resolve) => mockServer!.listen(0, '127.0.0.1', () => resolve()));
    const port = (mockServer.address() as AddressInfo).port;

    const gateway = new LlamaServerAdapter({
      serverUrl: `http://127.0.0.1:${port}`,
      defaultModelId: 'test-model',
    });

    const controller = new AbortController();
    const receivedChunks: StreamChunk[] = [];

    setTimeout(() => {
      controller.abort();
    }, 30);

    await gateway.streamChat({
      conversationId: 'test-conv-id',
      requestId: 'test-req-id',
      messages: [{ role: 'user', content: 'Hi' }],
      signal: controller.signal,
      onChunk: (chunk) => {
        receivedChunks.push(chunk);
      },
    });

    const lastChunk = receivedChunks[receivedChunks.length - 1];
    expect(lastChunk?.isDone).toBe(true);
    expect(lastChunk?.finishReason).toBe('cancelled');
  });
});
