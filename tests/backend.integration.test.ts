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

  it('supports persistent memory CRUD, audit tracking, and retrieval', async () => {
    // 1. Create a memory record
    const createRes = await fetch(`http://127.0.0.1:${serverPort}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'episodic',
        content: 'Arle reflected on her initial awakening on ROG Ally X and confirmed her persistent identity.',
        tags: ['identity', 'awakening', 'ally-x'],
        importance: 0.95,
        confidence: 1.0,
        provenance: 'direct_observation',
      }),
    });

    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as any;
    expect(created.id).toBeDefined();
    expect(created.type).toBe('episodic');
    expect(created.importance).toBe(0.95);
    expect(created.correctionHistory).toHaveLength(0);

    // 2. Query memories
    const queryRes = await fetch(`http://127.0.0.1:${serverPort}/api/memories/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'episodic',
        query: 'awakening',
      }),
    });
    expect(queryRes.status).toBe(200);
    const queryResults = (await queryRes.json()) as any[];
    expect(queryResults.length).toBeGreaterThanOrEqual(1);
    expect(queryResults[0].id).toBe(created.id);

    // 3. Update memory (tracks correction history)
    const updateRes = await fetch(`http://127.0.0.1:${serverPort}/api/memories/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Arle reflected on her awakening on ROG Ally X with Qwen 3.5-9B Heretic cognitive engine.',
        reason: 'Added cognitive model specification',
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as any;
    expect(updated.content).toContain('Qwen 3.5-9B Heretic');
    expect(updated.correctionHistory).toHaveLength(1);
    expect(updated.correctionHistory[0].reason).toBe('Added cognitive model specification');

    // 4. Soft delete memory
    const deleteRes = await fetch(`http://127.0.0.1:${serverPort}/api/memories/${created.id}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);

    // Verify excluded from normal queries immediately
    const queryAfterDelete = await fetch(`http://127.0.0.1:${serverPort}/api/memories/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const remaining = (await queryAfterDelete.json()) as any[];
    expect(remaining.find((m) => m.id === created.id)).toBeUndefined();
  });

  it('supports activities CRUD and distinguishes Arle-initiated from user-assigned', async () => {
    // 1. Create Arle-initiated activity
    const arleActRes = await fetch(`http://127.0.0.1:${serverPort}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Master Sicilian Defense in Chess',
        objective: 'Deepen tactical sharpness and counter-attacking patterns.',
        origin: 'arle_initiated',
        status: 'in_progress',
        progress: 0.35,
      }),
    });
    expect(arleActRes.status).toBe(201);
    const arleAct = (await arleActRes.json()) as any;
    expect(arleAct.origin).toBe('arle_initiated');
    expect(arleAct.progress).toBe(0.35);

    // 2. Create User-assigned activity
    const userActRes = await fetch(`http://127.0.0.1:${serverPort}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Draft Project Roadmap',
        objective: 'Outline milestones for autonomous environment control.',
        origin: 'user_assigned',
        status: 'planned',
        progress: 0.0,
      }),
    });
    expect(userActRes.status).toBe(201);
    const userAct = (await userActRes.json()) as any;
    expect(userAct.origin).toBe('user_assigned');

    // 3. Filter by origin
    const listArleOnly = await fetch(`http://127.0.0.1:${serverPort}/api/activities?origin=arle_initiated`);
    expect(listArleOnly.status).toBe(200);
    const arleOnly = (await listArleOnly.json()) as any[];
    expect(arleOnly.some((a) => a.id === arleAct.id)).toBe(true);
    expect(arleOnly.some((a) => a.id === userAct.id)).toBe(false);

    // 4. Update activity progress and completion
    const patchRes = await fetch(`http://127.0.0.1:${serverPort}/api/activities/${arleAct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: 1.0,
        status: 'completed',
      }),
    });
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as any;
    expect(patched.status).toBe('completed');
    expect(patched.progress).toBe(1.0);
  });

  it('provides real device telemetry and manages user preferences', async () => {
    // 1. Device Telemetry
    const telemRes = await fetch(`http://127.0.0.1:${serverPort}/api/telemetry`);
    expect(telemRes.status).toBe(200);
    const telemetry = (await telemRes.json()) as any;
    expect(telemetry.cpu).toBeDefined();
    expect(telemetry.memory).toBeDefined();
    expect(telemetry.gpu).toBeDefined();
    expect(telemetry.services).toBeDefined();

    // 2. App Preferences (e.g. voice toggle)
    const setPrefRes = await fetch(`http://127.0.0.1:${serverPort}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'voice_output_enabled',
        value: 'true',
      }),
    });
    expect(setPrefRes.status).toBe(200);

    const getPrefRes = await fetch(`http://127.0.0.1:${serverPort}/api/preferences`);
    expect(getPrefRes.status).toBe(200);
    const prefs = (await getPrefRes.json()) as Record<string, string>;
    expect(prefs['voice_output_enabled']).toBe('true');
  });
});
