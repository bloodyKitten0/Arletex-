import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  DatabaseService,
  MigrationRunner,
  ConversationRepository,
  MessageRepository,
  AuditRepository,
  MemoryRepository,
  ActivityRepository,
  PreferenceRepository,
} from '../index.js';

describe('Database Package', () => {
  let tempDir: string;
  let dbPath: string;
  let dbService: DatabaseService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arletex-db-test-'));
    dbPath = path.join(tempDir, 'test.sqlite');
    dbService = new DatabaseService(dbPath);
    const db = dbService.connect();
    const migrator = new MigrationRunner(db);
    migrator.run();
  });

  afterEach(() => {
    dbService.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs migrations and establishes schema for initial and milestone 2 tables', () => {
    const db = dbService.getClient();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('_migrations');
    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('memories');
    expect(tableNames).toContain('memory_embeddings');
    expect(tableNames).toContain('activities');
    expect(tableNames).toContain('app_preferences');
    expect(tableNames).toContain('audit_logs');
  });

  it('supports conversation CRUD and pinning operations', () => {
    const db = dbService.getClient();
    const repo = new ConversationRepository(db);

    const conv1 = repo.create({ title: 'Standard Conversation' });
    const conv2 = repo.create({ title: 'Important Pinned Session', isPinned: true });

    expect(conv1.isPinned).toBe(false);
    expect(conv2.isPinned).toBe(true);

    // List should return pinned conversations first
    const list = repo.list();
    expect(list.length).toBe(2);
    expect(list[0]?.id).toBe(conv2.id);
    expect(list[1]?.id).toBe(conv1.id);

    // Pin conv1
    repo.update({ id: conv1.id, isPinned: true });
    expect(repo.getById(conv1.id)?.isPinned).toBe(true);
  });

  it('supports messages and foreign key cascades', () => {
    const db = dbService.getClient();
    const convRepo = new ConversationRepository(db);
    const msgRepo = new MessageRepository(db);

    const conv = convRepo.create({ title: 'Session' });

    const msg1 = msgRepo.create({
      conversationId: conv.id,
      role: 'user',
      content: 'Hello, Arle.',
    });

    const msg2 = msgRepo.create({
      conversationId: conv.id,
      role: 'assistant',
      content: 'I hear you.',
    });

    expect(msg1.id).toBeDefined();
    expect(msg2.id).toBeDefined();

    const messages = msgRepo.listByConversation(conv.id);
    expect(messages.length).toBe(2);

    convRepo.delete(conv.id);
    expect(msgRepo.listByConversation(conv.id).length).toBe(0);
  });

  it('records and queries audit events accurately', () => {
    const db = dbService.getClient();
    const auditRepo = new AuditRepository(db);

    const event = auditRepo.log({
      actor: 'system',
      action: 'migration_apply',
      details: 'Applied 002 migration',
      status: 'success',
    });

    expect(event.id).toBeDefined();
    expect(event.status).toBe('success');

    const logs = auditRepo.list(10);
    expect(logs.length).toBe(1);
    expect(logs[0]?.action).toBe('migration_apply');
  });

  it('supports memory CRUD, correction history, and soft deletion', () => {
    const db = dbService.getClient();
    const repo = new MemoryRepository(db);

    const memory = repo.create({
      type: 'episodic',
      content: 'Discussed architectural priorities with creator.',
      rawObservation: 'Creator asked about psychological engine.',
      interpretation: 'High alignment on building authentic individual.',
      confidence: 0.95,
      importance: 0.8,
      tags: ['architecture', 'creator', 'ape'],
    });

    expect(memory.id).toBeDefined();
    expect(memory.type).toBe('episodic');
    expect(memory.importance).toBe(0.8);
    expect(memory.tags).toContain('ape');

    // Correction tracking
    const updated = repo.update({
      id: memory.id,
      content: 'Discussed architectural priorities with creator, focusing on memory and autonomy.',
      reason: 'More specific summary',
    });

    expect(updated.correctionHistory.length).toBe(1);
    expect(updated.correctionHistory[0]?.previousContent).toBe('Discussed architectural priorities with creator.');

    // Query list
    const list = repo.list({ query: 'autonomy' });
    expect(list.length).toBe(1);

    // Soft delete removes from active retrieval
    repo.delete(memory.id);
    expect(repo.list().length).toBe(0);

    const deletedRecord = repo.getById(memory.id);
    expect(deletedRecord?.isDeleted).toBe(true);
  });

  it('supports vector embedding storage and cosine similarity search', () => {
    const db = dbService.getClient();
    const repo = new MemoryRepository(db);

    const m1 = repo.create({
      type: 'semantic',
      content: 'Bobby Fischer opening book theory',
      importance: 0.7,
    });

    const m2 = repo.create({
      type: 'semantic',
      content: 'Recipe for baking sourdough bread',
      importance: 0.3,
    });

    // Dummy 4-dimensional normalized vectors
    // Chess query is close to m1
    const v1 = new Float32Array([1.0, 0.0, 0.0, 0.0]); // chess
    const v2 = new Float32Array([0.0, 1.0, 0.0, 0.0]); // bread
    const queryVector = new Float32Array([0.95, 0.05, 0.0, 0.0]); // query close to chess

    repo.saveEmbedding(m1.id, 'embedding-gemma-300m', v1);
    repo.saveEmbedding(m2.id, 'embedding-gemma-300m', v2);

    const retrievedEmb = repo.getEmbedding(m1.id);
    expect(retrievedEmb).not.toBeNull();
    expect(retrievedEmb?.dimensions).toBe(4);
    expect(retrievedEmb?.vector[0]).toBeCloseTo(1.0);

    const results = repo.searchSimilar(queryVector, { limit: 2 });
    expect(results.length).toBe(2);
    expect(results[0]?.id).toBe(m1.id); // m1 should be top result
    expect(results[0]?.similarityScore).toBeGreaterThan(0.9);

    // If m1 is deleted, it should be excluded from similarity results
    repo.delete(m1.id);
    const resultsAfterDelete = repo.searchSimilar(queryVector);
    expect(resultsAfterDelete.some((r) => r.id === m1.id)).toBe(false);
  });

  it('supports memory merging with provenance preservation', () => {
    const db = dbService.getClient();
    const repo = new MemoryRepository(db);

    const primary = repo.create({
      type: 'relationship',
      content: 'Creator values intellectual honesty.',
      tags: ['creator', 'trust'],
    });

    const secondary = repo.create({
      type: 'relationship',
      content: 'Creator strongly dislikes sycophancy.',
      tags: ['creator', 'anti-servility'],
    });

    const merged = repo.merge(primary.id, secondary.id);
    expect(merged.id).toBe(primary.id);
    expect(merged.content).toContain('Creator values intellectual honesty.');
    expect(merged.content).toContain('Creator strongly dislikes sycophancy.');
    expect(merged.tags).toContain('trust');
    expect(merged.tags).toContain('anti-servility');

    // Secondary should be soft deleted
    const secFetched = repo.getById(secondary.id);
    expect(secFetched?.isDeleted).toBe(true);
  });

  it('supports activity CRUD operations with origin and status', () => {
    const db = dbService.getClient();
    const repo = new ActivityRepository(db);

    const act1 = repo.create({
      title: 'Analyze Vulkan Memory Heap',
      objective: 'Optimize memory allocation for ROG Ally X APU',
      origin: 'arle_initiated',
      status: 'in_progress',
      progress: 0.45,
    });

    expect(act1.id).toBeDefined();
    expect(act1.origin).toBe('arle_initiated');
    expect(act1.progress).toBe(0.45);

    const act2 = repo.create({
      title: 'Refactor Unit Tests',
      objective: 'Add integration coverage',
      origin: 'user_assigned',
      status: 'planned',
    });

    expect(act2.id).toBeDefined();

    const allActivities = repo.list();
    expect(allActivities.length).toBe(2);

    const arleActivities = repo.list(undefined, 'arle_initiated');
    expect(arleActivities.length).toBe(1);
    expect(arleActivities[0]?.id).toBe(act1.id);

    repo.update({ id: act1.id, status: 'completed', progress: 1.0 });
    expect(repo.getById(act1.id)?.status).toBe('completed');
  });

  it('persists and retrieves application preferences', () => {
    const db = dbService.getClient();
    const repo = new PreferenceRepository(db);

    repo.set('voice_output_enabled', 'true');
    repo.set('telemetry_sample_interval_ms', '2000');

    expect(repo.get('voice_output_enabled')).toBe('true');
    expect(repo.get('telemetry_sample_interval_ms')).toBe('2000');
    expect(repo.get('non_existent', 'fallback')).toBe('fallback');

    const all = repo.getAll();
    expect(all['voice_output_enabled']).toBe('true');
  });
});
