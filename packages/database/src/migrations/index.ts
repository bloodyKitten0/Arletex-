export interface Migration {
  id: number;
  name: string;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: '001_initial_schema',
    up: `
      -- Conversations table
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
        content TEXT NOT NULL,
        token_count INTEGER,
        created_at TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

      -- Application Configurations
      CREATE TABLE IF NOT EXISTS system_configs (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Audit Log (append-only)
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

      -- Model Configurations & Registry
      CREATE TABLE IF NOT EXISTS model_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        file_path TEXT,
        parameters TEXT NOT NULL DEFAULT '{}',
        is_active INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    id: 2,
    name: '002_memories_activities_and_pinning',
    up: `
      -- Pinning support for conversations
      ALTER TABLE conversations ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(is_pinned DESC, updated_at DESC);

      -- Persistent Memories (Episodic, Semantic, Procedural, Relationship, Emotional, Developmental)
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('episodic', 'semantic', 'procedural', 'relationship', 'emotional', 'developmental')),
        content TEXT NOT NULL,
        raw_observation TEXT,
        interpretation TEXT,
        confidence REAL NOT NULL DEFAULT 1.0,
        importance REAL NOT NULL DEFAULT 0.5,
        timestamp TEXT NOT NULL,
        provenance TEXT NOT NULL DEFAULT 'interaction',
        source_conversation_id TEXT,
        source_message_id TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        correction_history TEXT NOT NULL DEFAULT '[]',
        is_archived INTEGER NOT NULL DEFAULT 0,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (source_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
        FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_active ON memories(is_deleted, is_archived);

      -- Memory Embeddings (Float32 vector stored as BLOB)
      CREATE TABLE IF NOT EXISTS memory_embeddings (
        memory_id TEXT PRIMARY KEY,
        model_name TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        vector BLOB NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );

      -- Persistent Activities
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        origin TEXT NOT NULL CHECK (origin IN ('arle_initiated', 'user_assigned')),
        status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'paused', 'completed', 'cancelled')),
        progress REAL NOT NULL DEFAULT 0.0,
        associated_memories TEXT NOT NULL DEFAULT '[]',
        relevant_actions TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
      CREATE INDEX IF NOT EXISTS idx_activities_origin ON activities(origin);
      CREATE INDEX IF NOT EXISTS idx_activities_updated ON activities(updated_at DESC);

      -- Application Preferences (Voice output toggle, telemetry settings, etc.)
      CREATE TABLE IF NOT EXISTS app_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
];
