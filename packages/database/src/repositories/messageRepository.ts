import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import { CreateMessageInput, Message } from '@arletex/contracts';
import { DatabaseError } from '@arletex/core';

export class MessageRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public listByConversation(conversationId: string, limit = 500, offset = 0): Message[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, conversation_id, role, content, token_count, created_at, metadata
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(conversationId, limit, offset) as Array<{
        id: string;
        conversation_id: string;
        role: 'system' | 'user' | 'assistant';
        content: string;
        token_count: number | null;
        created_at: string;
        metadata: string;
      }>;

      return rows.map((r) => ({
        id: r.id,
        conversationId: r.conversation_id,
        role: r.role,
        content: r.content,
        tokenCount: r.token_count,
        createdAt: r.created_at,
        metadata: JSON.parse(r.metadata || '{}'),
      }));
    } catch (err) {
      throw new DatabaseError(`Failed to list messages for conversation ${conversationId}`, err);
    }
  }

  public listRecentByConversation(conversationId: string, limit = 10): Message[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, conversation_id, role, content, token_count, created_at, metadata
        FROM (
          SELECT id, conversation_id, role, content, token_count, created_at, metadata
          FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        )
        ORDER BY created_at ASC
      `);
      const rows = stmt.all(conversationId, limit) as Array<{
        id: string;
        conversation_id: string;
        role: 'system' | 'user' | 'assistant';
        content: string;
        token_count: number | null;
        created_at: string;
        metadata: string;
      }>;

      return rows.map((r) => ({
        id: r.id,
        conversationId: r.conversation_id,
        role: r.role,
        content: r.content,
        tokenCount: r.token_count,
        createdAt: r.created_at,
        metadata: JSON.parse(r.metadata || '{}'),
      }));
    } catch (err) {
      throw new DatabaseError(`Failed to list recent messages for conversation ${conversationId}`, err);
    }
  }

  public create(input: CreateMessageInput & { tokenCount?: number | null }): Message {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const metadataStr = JSON.stringify(input.metadata || {});

      const stmt = this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, token_count, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        input.conversationId,
        input.role,
        input.content,
        input.tokenCount ?? null,
        now,
        metadataStr,
      );

      // Also update the conversation's updated_at timestamp
      const updateConvStmt = this.db.prepare(`
        UPDATE conversations SET updated_at = ? WHERE id = ?
      `);
      updateConvStmt.run(now, input.conversationId);

      return {
        id,
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        tokenCount: input.tokenCount ?? null,
        createdAt: now,
        metadata: input.metadata || {},
      };
    } catch (err) {
      throw new DatabaseError('Failed to create message', err);
    }
  }

  public delete(id: string): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      throw new DatabaseError(`Failed to delete message ${id}`, err);
    }
  }
}
