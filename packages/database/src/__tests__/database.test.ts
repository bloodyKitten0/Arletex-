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

  it('runs migrations and establishes schema', () => {
    const db = dbService.getClient();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('_migrations');
    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('system_configs');
    expect(tableNames).toContain('audit_logs');
    expect(tableNames).toContain('model_configs');
  });

  it('supports conversation CRUD operations', () => {
    const db = dbService.getClient();
    const repo = new ConversationRepository(db);

    // Create
    const conv = repo.create({ title: 'Architectural Discussion' });
    expect(conv.id).toBeDefined();
    expect(conv.title).toBe('Architectural Discussion');

    // Get
    const fetched = repo.getById(conv.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(conv.id);

    // List
    const list = repo.list();
    expect(list.length).toBe(1);

    // Update
    const updated = repo.update({ id: conv.id, title: 'Updated Title' });
    expect(updated.title).toBe('Updated Title');

    // Delete
    const deleted = repo.delete(conv.id);
    expect(deleted).toBe(true);
    expect(repo.getById(conv.id)).toBeNull();
  });

  it('supports messages and foreign key cascades', () => {
    const db = dbService.getClient();
    const convRepo = new ConversationRepository(db);
    const msgRepo = new MessageRepository(db);

    const conv = convRepo.create({ title: 'Session' });

    // Create messages
    const msg1 = msgRepo.create({
      conversationId: conv.id,
      role: 'user',
      content: 'Hello Arle',
    });
    const msg2 = msgRepo.create({
      conversationId: conv.id,
      role: 'assistant',
      content: 'Hello. How can I help?',
    });

    expect(msg1.id).toBeDefined();
    expect(msg2.id).toBeDefined();

    const messages = msgRepo.listByConversation(conv.id);
    expect(messages.length).toBe(2);
    expect(messages[0]?.content).toBe('Hello Arle');
    expect(messages[1]?.content).toBe('Hello. How can I help?');

    // Deleting conversation cascades to messages
    convRepo.delete(conv.id);
    const orphaned = msgRepo.listByConversation(conv.id);
    expect(orphaned.length).toBe(0);
  });

  it('records audit events accurately', () => {
    const db = dbService.getClient();
    const auditRepo = new AuditRepository(db);

    const event = auditRepo.log({
      actor: 'system',
      action: 'startup',
      details: 'Database initialized',
      status: 'success',
    });

    expect(event.id).toBeDefined();
    expect(event.action).toBe('startup');

    const logs = auditRepo.list();
    expect(logs.length).toBe(1);
    expect(logs[0]?.details).toBe('Database initialized');
  });

  it('persists data across database connection restarts', () => {
    const db1 = dbService.getClient();
    const convRepo1 = new ConversationRepository(db1);
    const conv = convRepo1.create({ title: 'Persistent Session' });

    // Close connection
    dbService.close();

    // Reopen with a new instance pointing to same file
    const dbService2 = new DatabaseService(dbPath);
    const db2 = dbService2.connect();
    const convRepo2 = new ConversationRepository(db2);

    const persisted = convRepo2.getById(conv.id);
    expect(persisted).not.toBeNull();
    expect(persisted?.title).toBe('Persistent Session');

    dbService2.close();
  });
});
