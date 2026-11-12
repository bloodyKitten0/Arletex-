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
];
