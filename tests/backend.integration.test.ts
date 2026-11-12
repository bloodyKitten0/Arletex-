import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { createDefaultConfig } from '@arletex/core';
import { ArletexBackendServer } from '../apps/desktop/src/backend/server.js';

describe('Backend Integration Test', () => {
  let tempDir: string;
  let dbPath: string;
  let server: ArletexBackendServer;
  let serverPort: number;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arletex-backend-test-'));
    dbPath = path.join(tempDir, 'integration.sqlite');

    const config = createDefaultConfig({
      databasePath: dbPath,
      dataDirectory: tempDir,
    });

    server = new ArletexBackendServer(config);
    serverPort = await server.start(0); // dynamic port
  });

  afterEach(async () => {
    await server.stop();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('responds to /health check', async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('creates and lists conversations over HTTP', async () => {
    // Create
    const createRes = await fetch(`http://127.0.0.1:${serverPort}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Autonomous Reasoning Session' }),
    });

    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; title: string };
    expect(created.id).toBeDefined();
    expect(created.title).toBe('Autonomous Reasoning Session');

    // List
    const listRes = await fetch(`http://127.0.0.1:${serverPort}/api/conversations`);
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as Array<{ id: string; title: string }>;
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(created.id);
  });

  it('creates and retrieves messages for a conversation', async () => {
    // Create conversation first
    const conv = server.createConversation('Message Test Conv');

    // Create message over HTTP
    const msgRes = await fetch(`http://127.0.0.1:${serverPort}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: conv.id,
        role: 'user',
        content: 'Testing message persistence',
      }),
    });

    expect(msgRes.status).toBe(201);
    const msg = (await msgRes.json()) as { id: string; content: string };
    expect(msg.content).toBe('Testing message persistence');

    // Retrieve messages
    const getRes = await fetch(
      `http://127.0.0.1:${serverPort}/api/conversations/${conv.id}/messages`,
    );
    expect(getRes.status).toBe(200);
    const messages = (await getRes.json()) as Array<{ content: string }>;
    expect(messages.length).toBe(1);
    expect(messages[0]?.content).toBe('Testing message persistence');
  });

  it('reports offline inference health without crashing', async () => {
    // Override inference URL with non-existent port to test offline detection
    const offlineConfig = createDefaultConfig({
      databasePath: path.join(tempDir, 'offline.sqlite'),
      dataDirectory: tempDir,
      inference: {
        serverUrl: 'http://127.0.0.1:59998',
        defaultModelId: 'test-model',
        fallbackEnabled: false,
      },
    });

    const offlineServer = new ArletexBackendServer(offlineConfig);
    const offlinePort = await offlineServer.start(0);

    try {
      const res = await fetch(`http://127.0.0.1:${offlinePort}/api/inference/health`);
      expect(res.status).toBe(200);
      const health = (await res.json()) as { status: string };
      expect(health.status).toBe('disconnected');
    } finally {
      await offlineServer.stop();
    }
  });

  it('connects to inference server when running', async () => {
    // Spin up a mock llama-server
    const mockLlama = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ id: 'Qwen3.5-9B-Heretic-Q4_K_M' }] }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => mockLlama.listen(0, '127.0.0.1', () => resolve()));
    const llamaPort = (mockLlama.address() as AddressInfo).port;

    const onlineConfig = createDefaultConfig({
      databasePath: path.join(tempDir, 'online.sqlite'),
      dataDirectory: tempDir,
      inference: {
        serverUrl: `http://127.0.0.1:${llamaPort}`,
        defaultModelId: 'Qwen3.5-9B-Heretic-Q4_K_M',
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 100,
        contextSize: 2048,
        stopSequences: [],
      },
    });

    const onlineServer = new ArletexBackendServer(onlineConfig);
    const onlinePort = await onlineServer.start(0);

    try {
      const res = await fetch(`http://127.0.0.1:${onlinePort}/api/inference/health`);
      expect(res.status).toBe(200);
      const health = (await res.json()) as { status: string; latencyMs: number; modelLoaded: string };
      expect(health.status).toBe('connected');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.modelLoaded).toContain('Qwen3.5-9B-Heretic');
    } finally {
      await onlineServer.stop();
      await new Promise<void>((resolve) => mockLlama.close(() => resolve()));
    }
  });

  it('gets and updates inference configuration over HTTP', async () => {
    // GET config
    const getRes = await fetch(`http://127.0.0.1:${serverPort}/api/inference/config`);
    expect(getRes.status).toBe(200);
    const config = (await getRes.json()) as { provider: string; serverUrl: string };
    expect(config.provider).toBeDefined();

    // POST update to switch provider to llama.cpp
    const updateRes = await fetch(`http://127.0.0.1:${serverPort}/api/inference/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'llama.cpp',
        defaultModelId: 'custom-switched-model',
      }),
    });

    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as { provider: string; defaultModelId: string };
    expect(updated.provider).toBe('llama.cpp');
    expect(updated.defaultModelId).toBe('custom-switched-model');
  });
});
