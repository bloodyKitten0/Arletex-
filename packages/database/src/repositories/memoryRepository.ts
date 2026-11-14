import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import {
  CreateMemoryInput,
  Memory,
  MemoryCorrection,
  QueryMemoriesInput,
  UpdateMemoryInput,
} from '@arletex/contracts';
import { DatabaseError } from '@arletex/core';

export class MemoryRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public create(input: CreateMemoryInput): Memory {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const type = input.type || 'episodic';
      const timestamp = input.timestamp || now;
      const confidence = input.confidence ?? 1.0;
      const importance = input.importance ?? 0.5;
      const tagsStr = JSON.stringify(input.tags || []);
      const metadataStr = JSON.stringify(input.metadata || {});
      const correctionHistoryStr = JSON.stringify([]);

      const stmt = this.db.prepare(`
        INSERT INTO memories (
          id, type, content, raw_observation, interpretation,
          confidence, importance, timestamp, provenance,
          source_conversation_id, source_message_id,
          tags, metadata, correction_history,
          is_archived, is_deleted, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          0, 0, ?, ?
        )
      `);

      stmt.run(
        id,
        type,
        input.content,
        input.rawObservation ?? null,
        input.interpretation ?? null,
        confidence,
        importance,
        timestamp,
        input.provenance ?? 'interaction',
        input.sourceConversationId ?? null,
        input.sourceMessageId ?? null,
        tagsStr,
        metadataStr,
        correctionHistoryStr,
        now,
        now,
      );

      return {
        id,
        type,
        content: input.content,
        rawObservation: input.rawObservation ?? null,
        interpretation: input.interpretation ?? null,
        confidence,
        importance,
        timestamp,
        provenance: input.provenance ?? 'interaction',
        sourceConversationId: input.sourceConversationId ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
        tags: input.tags ?? [],
        metadata: input.metadata ?? {},
        correctionHistory: [],
        isArchived: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      throw new DatabaseError('Failed to create memory', err);
    }
  }

  public getById(id: string): Memory | null {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM memories WHERE id = ?
      `);
      const row = stmt.get(id) as any;
      if (!row) return null;

      return this.mapRow(row);
    } catch (err) {
      throw new DatabaseError(`Failed to get memory ${id}`, err);
    }
  }

  public list(options: QueryMemoriesInput = {}): Memory[] {
    try {
      const { query, type, limit = 50, minImportance = 0.0, includeArchived = false } = options;

      let sql = `
        SELECT * FROM memories
        WHERE is_deleted = 0
          AND importance >= ?
      `;
      const params: any[] = [minImportance];

      if (!includeArchived) {
        sql += ` AND is_archived = 0`;
      }

      if (type) {
        sql += ` AND type = ?`;
        params.push(type);
      }

      if (query && query.trim().length > 0) {
        sql += ` AND (content LIKE ? OR interpretation LIKE ? OR tags LIKE ?)`;
        const q = `%${query.trim()}%`;
        params.push(q, q, q);
      }

      sql += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      return rows.map((r) => this.mapRow(r));
    } catch (err) {
      throw new DatabaseError('Failed to list memories', err);
    }
  }

  public update(input: UpdateMemoryInput): Memory {
    try {
      const existing = this.getById(input.id);
      if (!existing) {
        throw new DatabaseError(`Memory ${input.id} not found`);
      }

      const now = new Date().toISOString();
      const content = input.content ?? existing.content;
      const interpretation = input.interpretation !== undefined ? input.interpretation : existing.interpretation;
      const importance = input.importance ?? existing.importance;
      const confidence = input.confidence ?? existing.confidence;
      const tags = input.tags ?? existing.tags;
      const isArchived = input.isArchived !== undefined ? (input.isArchived ? 1 : 0) : (existing.isArchived ? 1 : 0);
      const isDeleted = input.isDeleted !== undefined ? (input.isDeleted ? 1 : 0) : (existing.isDeleted ? 1 : 0);

      // Track correction history if content changed
      const history: MemoryCorrection[] = [...existing.correctionHistory];
      if (input.content && input.content !== existing.content) {
        history.push({
          timestamp: now,
          previousContent: existing.content,
          reason: input.reason || 'Manual user correction',
        });
      }

      const stmt = this.db.prepare(`
        UPDATE memories
        SET content = ?,
            interpretation = ?,
            importance = ?,
            confidence = ?,
            tags = ?,
            correction_history = ?,
            is_archived = ?,
            is_deleted = ?,
            updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        content,
        interpretation,
        importance,
        confidence,
        JSON.stringify(tags),
        JSON.stringify(history),
        isArchived,
        isDeleted,
        now,
        input.id,
      );

      return {
        ...existing,
        content,
        interpretation,
        importance,
        tags,
        correctionHistory: history,
        isArchived: Boolean(isArchived),
        isDeleted: Boolean(isDeleted),
        updatedAt: now,
      };
    } catch (err) {
      throw new DatabaseError(`Failed to update memory ${input.id}`, err);
    }
  }

  public delete(id: string): boolean {
    try {
      // Soft-delete so provenance can be traced, and delete embedding immediately
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        UPDATE memories
        SET is_deleted = 1, updated_at = ?
        WHERE id = ?
      `);
      const result = stmt.run(now, id);

      if (result.changes > 0) {
        this.db.prepare('DELETE FROM memory_embeddings WHERE memory_id = ?').run(id);
        return true;
      }
      return false;
    } catch (err) {
      throw new DatabaseError(`Failed to delete memory ${id}`, err);
    }
  }

  public deletePermanently(id: string): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (err) {
      throw new DatabaseError(`Failed to permanently delete memory ${id}`, err);
    }
  }

  public merge(primaryId: string, secondaryId: string): Memory {
    try {
      const primary = this.getById(primaryId);
      const secondary = this.getById(secondaryId);

      if (!primary || !secondary) {
        throw new DatabaseError('One or both memories to merge were not found');
      }

      const mergedContent = `${primary.content}\n\n[Merged with ${secondary.id} (${secondary.type})]: ${secondary.content}`;
      const mergedTags = Array.from(new Set([...primary.tags, ...secondary.tags]));
      const now = new Date().toISOString();

      const mergedHistory: MemoryCorrection[] = [
        ...primary.correctionHistory,
        {
          timestamp: now,
          previousContent: primary.content,
          reason: `Merged with memory ${secondaryId}`,
        },
      ];

      this.db.transaction(() => {
        // Update primary
        this.db
          .prepare(
            `UPDATE memories
             SET content = ?, tags = ?, correction_history = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(mergedContent, JSON.stringify(mergedTags), JSON.stringify(mergedHistory), now, primaryId);

        // Soft-delete secondary
        this.delete(secondaryId);
      })();

      return this.getById(primaryId)!;
    } catch (err) {
      throw new DatabaseError(`Failed to merge memories ${primaryId} and ${secondaryId}`, err);
    }
  }

  // ==========================================
  // Vector Embedding Storage & Search
  // ==========================================
  public saveEmbedding(
    memoryId: string,
    modelName: string,
    vector: Float32Array,
  ): void {
    try {
      const now = new Date().toISOString();
      const buffer = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);

      const stmt = this.db.prepare(`
        INSERT INTO memory_embeddings (memory_id, model_name, dimensions, vector, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(memory_id) DO UPDATE SET
          model_name = excluded.model_name,
          dimensions = excluded.dimensions,
          vector = excluded.vector,
          created_at = excluded.created_at
      `);

      stmt.run(memoryId, modelName, vector.length, buffer, now);
    } catch (err) {
      throw new DatabaseError(`Failed to save embedding for memory ${memoryId}`, err);
    }
  }

  public getEmbedding(memoryId: string): { dimensions: number; vector: Float32Array } | null {
    try {
      const stmt = this.db.prepare(`
        SELECT dimensions, vector FROM memory_embeddings WHERE memory_id = ?
      `);
      const row = stmt.get(memoryId) as { dimensions: number; vector: Buffer } | undefined;
      if (!row) return null;

      const floatArray = new Float32Array(
        row.vector.buffer,
        row.vector.byteOffset,
        row.dimensions,
      );
      return { dimensions: row.dimensions, vector: floatArray };
    } catch (err) {
      throw new DatabaseError(`Failed to get embedding for memory ${memoryId}`, err);
    }
  }

  public searchSimilar(
    queryVector: Float32Array,
    options: QueryMemoriesInput = {},
  ): Memory[] {
    try {
      const { type, limit = 10, minImportance = 0.0, includeArchived = false } = options;

      let sql = `
        SELECT m.*, e.vector, e.dimensions
        FROM memories m
        JOIN memory_embeddings e ON m.id = e.memory_id
        WHERE m.is_deleted = 0
          AND m.importance >= ?
      `;
      const params: any[] = [minImportance];

      if (!includeArchived) {
        sql += ` AND m.is_archived = 0`;
      }

      if (type) {
        sql += ` AND m.type = ?`;
        params.push(type);
      }

      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      // Calculate cosine similarity for each vector
      const scoredMemories: Array<{ memory: Memory; score: number }> = [];

      for (const row of rows) {
        if (!row.vector || row.dimensions !== queryVector.length) continue;

        const candidateVector = new Float32Array(
          row.vector.buffer,
          row.vector.byteOffset,
          row.dimensions,
        );

        const similarity = this.cosineSimilarity(queryVector, candidateVector);
        // Hybrid score: 70% semantic similarity + 20% importance + 10% recency
        const recencyScore = this.calculateRecencyScore(row.timestamp);
        const hybridScore = similarity * 0.7 + (row.importance || 0.5) * 0.2 + recencyScore * 0.1;

        const memory = this.mapRow(row);
        memory.similarityScore = parseFloat(similarity.toFixed(4));

        scoredMemories.push({ memory, score: hybridScore });
      }

      // Sort descending by score
      scoredMemories.sort((a, b) => b.score - a.score);

      return scoredMemories.slice(0, limit).map((s) => s.memory);
    } catch (err) {
      throw new DatabaseError('Failed to search similar memories', err);
    }
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < a.length; i++) {
      const valA = a[i]!;
      const valB = b[i]!;
      dot += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private calculateRecencyScore(timestamp: string): number {
    const ageMs = Date.now() - new Date(timestamp).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const ageDays = Math.max(0, ageMs / dayMs);
    // Exponential decay with half-life of ~14 days
    return Math.exp(-ageDays / 14);
  }

  private mapRow(row: any): Memory {
    return {
      id: row.id,
      type: row.type,
      content: row.content,
      rawObservation: row.raw_observation,
      interpretation: row.interpretation,
      confidence: row.confidence,
      importance: row.importance,
      timestamp: row.timestamp,
      provenance: row.provenance,
      sourceConversationId: row.source_conversation_id,
      sourceMessageId: row.source_message_id,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      correctionHistory: JSON.parse(row.correction_history || '[]'),
      isArchived: Boolean(row.is_archived),
      isDeleted: Boolean(row.is_deleted),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
