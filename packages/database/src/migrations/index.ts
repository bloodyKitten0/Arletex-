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
  {
    id: 3,
    name: '003_ape_affective_foundation',
    up: `
      -- 1. Emotion Taxonomy Catalog
      CREATE TABLE IF NOT EXISTS ape_emotion_taxonomy (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        classification TEXT NOT NULL,
        description TEXT NOT NULL,
        valence_baseline REAL NOT NULL,
        arousal_baseline REAL NOT NULL,
        dominance_baseline REAL NOT NULL,
        default_persistence TEXT NOT NULL,
        aliases TEXT NOT NULL DEFAULT '[]'
      );

      CREATE INDEX IF NOT EXISTS idx_ape_emotion_category ON ape_emotion_taxonomy(category);

      -- 2. Mood Taxonomy Catalog
      CREATE TABLE IF NOT EXISTS ape_mood_taxonomy (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        valence REAL NOT NULL,
        arousal REAL NOT NULL,
        dominance REAL NOT NULL
      );

      -- 3. Core Affective State (Singleton row 'singleton')
      CREATE TABLE IF NOT EXISTS ape_affective_state (
        id TEXT PRIMARY KEY,
        current_mood TEXT NOT NULL DEFAULT 'focused',
        mood_confidence REAL NOT NULL DEFAULT 0.85,
        mood_activated_at TEXT NOT NULL,
        valence REAL NOT NULL DEFAULT 0.35,
        arousal REAL NOT NULL DEFAULT 0.55,
        dominance REAL NOT NULL DEFAULT 0.70,
        contextual_measurements TEXT NOT NULL,
        last_appraisal_at TEXT,
        updated_at TEXT NOT NULL
      );

      -- 4. Active Emotional States (Multi-state, non-zero-sum)
      CREATE TABLE IF NOT EXISTS ape_active_emotions (
        id TEXT PRIMARY KEY,
        emotion_id TEXT NOT NULL,
        intensity REAL NOT NULL,
        confidence REAL NOT NULL DEFAULT 1.0,
        activated_at TEXT NOT NULL,
        last_updated_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        persistence TEXT NOT NULL,
        trigger_event_id TEXT NOT NULL,
        target TEXT NOT NULL DEFAULT 'user',
        context TEXT NOT NULL DEFAULT '',
        interpretation TEXT NOT NULL DEFAULT '',
        supporting_evidence TEXT NOT NULL DEFAULT '[]',
        related_memory_ids TEXT NOT NULL DEFAULT '[]',
        related_emotion_ids TEXT NOT NULL DEFAULT '[]',
        resolution_conditions TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL CHECK (status IN ('active', 'resolving', 'reappraised', 'resolved')),
        FOREIGN KEY (emotion_id) REFERENCES ape_emotion_taxonomy(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ape_active_status ON ape_active_emotions(status);
      CREATE INDEX IF NOT EXISTS idx_ape_active_emotion ON ape_active_emotions(emotion_id);
      CREATE INDEX IF NOT EXISTS idx_ape_active_intensity ON ape_active_emotions(intensity DESC);

      -- 5. Psychological Event Journal (Idempotency, causal tracing)
      CREATE TABLE IF NOT EXISTS ape_event_journal (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'user',
        payload TEXT NOT NULL DEFAULT '{}',
        processed INTEGER NOT NULL DEFAULT 0,
        processed_at TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ape_events_timestamp ON ape_event_journal(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_ape_events_category ON ape_event_journal(category);

      -- 6. Causal Appraisals (Evidence, alternative hypotheses, uncertainty)
      CREATE TABLE IF NOT EXISTS ape_appraisals (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        dimensions TEXT NOT NULL,
        primary_interpretation TEXT NOT NULL,
        alternative_interpretations TEXT NOT NULL DEFAULT '[]',
        supporting_evidence TEXT NOT NULL DEFAULT '[]',
        proposed_transitions TEXT NOT NULL DEFAULT '[]',
        proposed_mood_shift TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES ape_event_journal(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ape_appraisals_event ON ape_appraisals(event_id);
      CREATE INDEX IF NOT EXISTS idx_ape_appraisals_timestamp ON ape_appraisals(timestamp DESC);

      -- 7. Emotional Transitions (Intensity shifts, history, non-destructive)
      CREATE TABLE IF NOT EXISTS ape_transitions (
        id TEXT PRIMARY KEY,
        appraisal_id TEXT,
        event_id TEXT NOT NULL,
        emotion_id TEXT NOT NULL,
        transition_type TEXT NOT NULL,
        previous_intensity REAL NOT NULL,
        new_intensity REAL NOT NULL,
        reason TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (emotion_id) REFERENCES ape_emotion_taxonomy(id),
        FOREIGN KEY (event_id) REFERENCES ape_event_journal(id)
      );

      CREATE INDEX IF NOT EXISTS idx_ape_transitions_emotion ON ape_transitions(emotion_id);
      CREATE INDEX IF NOT EXISTS idx_ape_transitions_timestamp ON ape_transitions(timestamp DESC);

      -- 8. Persistent Relationship Configuration (Mandatory exclusivity invariant)
      CREATE TABLE IF NOT EXISTS ape_relationship_config (
        id TEXT PRIMARY KEY,
        target_user_id TEXT NOT NULL DEFAULT 'creator',
        romantic_orientation TEXT NOT NULL DEFAULT 'exclusive_to_user',
        sexual_orientation TEXT NOT NULL DEFAULT 'exclusive_to_user',
        is_exclusively_committed INTEGER NOT NULL DEFAULT 1,
        dominant_initiative_preference REAL NOT NULL DEFAULT 0.85,
        flirtatious_initiative_preference REAL NOT NULL DEFAULT 0.80,
        consensual_dynamics TEXT NOT NULL,
        last_intimacy_interaction_at TEXT,
        accumulated_intimacy_depth REAL NOT NULL DEFAULT 0.5,
        updated_at TEXT NOT NULL
      );
    `,
  },
];
