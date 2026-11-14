import Database from 'better-sqlite3';
import {
  ActiveEmotionState,
  ActiveEmotionStatus,
  ApeAppraisal,
  ApeEvent,
  ApePsychologicalState,
  ApeRelationshipConfig,
  ApeTransitionRecord,
  ContextualAffectiveMeasurements,
  CorePadDimensions,
  EmotionTaxonomyItem,
  INITIAL_EMOTIONS_TAXONOMY,
  INITIAL_MOODS_TAXONOMY,
  MoodTaxonomyItem,
} from '@arletex/contracts';
import { DatabaseError, IApeRepository } from '@arletex/core';

export class ApeRepository implements IApeRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureInitialized();
  }

  public ensureInitialized(): void {
    try {
      // 1. Seed Emotion Taxonomy if empty
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM ape_emotion_taxonomy');
      const { count: emotionCount } = countStmt.get() as { count: number };
      if (emotionCount === 0) {
        this.seedTaxonomies(INITIAL_EMOTIONS_TAXONOMY, INITIAL_MOODS_TAXONOMY);
      }

      // 2. Seed Singleton Affective State if empty
      const stateStmt = this.db.prepare('SELECT id FROM ape_affective_state WHERE id = ?');
      const existingState = stateStmt.get('singleton');
      if (!existingState) {
        const now = new Date().toISOString();
        const defaultContextual: ContextualAffectiveMeasurements = {
          tension: 0.15,
          emotionalStability: 0.85,
          perceivedControl: 0.8,
          certainty: 0.75,
          socialCloseness: { creator: 0.95 },
          socialSafety: 0.85,
          goalAlignment: 0.9,
          emotionalOpenness: 0.75,
          psychologicalEnergy: 0.85,
          cognitiveLoad: 0.3,
        };

        this.db
          .prepare(
            `
          INSERT INTO ape_affective_state (
            id, current_mood, mood_confidence, mood_activated_at,
            valence, arousal, dominance, contextual_measurements, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            'singleton',
            'focused',
            0.85,
            now,
            0.35,
            0.55,
            0.7,
            JSON.stringify(defaultContextual),
            now,
          );
      }

      // 3. Seed Singleton Relationship Config if empty
      const relStmt = this.db.prepare('SELECT id FROM ape_relationship_config WHERE id = ?');
      const existingRel = relStmt.get('singleton');
      if (!existingRel) {
        const now = new Date().toISOString();
        const defaultDynamics = {
          allowsFemdom: true,
          allowsTeasing: true,
          allowsAssertiveLead: true,
          boundariesEnforced: true,
        };

        this.db
          .prepare(
            `
          INSERT INTO ape_relationship_config (
            id, target_user_id, romantic_orientation, sexual_orientation,
            is_exclusively_committed, dominant_initiative_preference,
            flirtatious_initiative_preference, consensual_dynamics,
            accumulated_intimacy_depth, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            'singleton',
            'creator',
            'exclusive_to_user',
            'exclusive_to_user',
            1,
            0.85,
            0.8,
            JSON.stringify(defaultDynamics),
            0.6,
            now,
          );
      }

      // 4. Seed Baseline Active Emotion if empty
      const activeCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM ape_active_emotions WHERE status = ?');
      const { count: activeCount } = activeCountStmt.get('active') as { count: number };
      if (activeCount === 0) {
        const now = new Date().toISOString();
        this.saveActiveEmotion({
          id: 'baseline-curiosity',
          emotionId: 'curiosity',
          intensity: 0.7,
          confidence: 0.9,
          activatedAt: now,
          lastUpdatedAt: now,
          durationMs: 0,
          persistence: 'long_term',
          triggerEventId: 'system_init',
          target: 'environment',
          context: 'System boot and initial environment readiness',
          interpretation: 'Analytical readiness to engage environment and creator',
          supportingEvidence: ['Baseline operational state'],
          relatedMemoryIds: [],
          relatedEmotionIds: [],
          resolutionConditions: [],
          status: 'active',
        });
      }
    } catch (err) {
      throw new DatabaseError('Failed to initialize APE persistent baseline', err);
    }
  }

  // ==========================================
  // Taxonomies
  // ==========================================

  public seedTaxonomies(emotions: EmotionTaxonomyItem[], moods: MoodTaxonomyItem[]): void {
    const insertEmotion = this.db.prepare(`
      INSERT OR REPLACE INTO ape_emotion_taxonomy (
        id, name, category, classification, description,
        valence_baseline, arousal_baseline, dominance_baseline,
        default_persistence, aliases
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMood = this.db.prepare(`
      INSERT OR REPLACE INTO ape_mood_taxonomy (
        id, name, description, valence, arousal, dominance
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const e of emotions) {
        insertEmotion.run(
          e.id,
          e.name,
          e.category,
          e.classification,
          e.description,
          e.valenceBaseline,
          e.arousalBaseline,
          e.dominanceBaseline,
          e.defaultPersistence,
          JSON.stringify(e.aliases || []),
        );
      }

      for (const m of moods) {
        insertMood.run(m.id, m.name, m.description, m.valence, m.arousal, m.dominance);
      }
    });

    transaction();
  }

  public getEmotionTaxonomy(): EmotionTaxonomyItem[] {
    const rows = this.db.prepare('SELECT * FROM ape_emotion_taxonomy ORDER BY category, id').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      classification: r.classification,
      description: r.description,
      valenceBaseline: r.valence_baseline,
      arousalBaseline: r.arousal_baseline,
      dominanceBaseline: r.dominance_baseline,
      defaultPersistence: r.default_persistence,
      aliases: JSON.parse(r.aliases || '[]'),
    }));
  }

  public getMoodTaxonomy(): MoodTaxonomyItem[] {
    const rows = this.db.prepare('SELECT * FROM ape_mood_taxonomy ORDER BY name').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      valence: r.valence,
      arousal: r.arousal,
      dominance: r.dominance,
    }));
  }

  // ==========================================
  // Affective State & Dimensions
  // ==========================================

  public getAffectiveState(): ApePsychologicalState {
    const row = this.db.prepare('SELECT * FROM ape_affective_state WHERE id = ?').get('singleton') as any;
    if (!row) {
      throw new DatabaseError('APE affective state not found');
    }

    const activeEmotions = this.getActiveEmotions();
    const relationship = this.getRelationshipConfig();

    return {
      currentMood: row.current_mood,
      moodConfidence: row.mood_confidence,
      moodActivatedAt: row.mood_activated_at,
      pad: {
        valence: row.valence,
        arousal: row.arousal,
        dominance: row.dominance,
      },
      contextual: JSON.parse(row.contextual_measurements || '{}'),
      activeEmotions,
      relationship,
      isInitialized: true,
      lastAppraisalAt: row.last_appraisal_at || undefined,
    };
  }

  public updateAffectiveState(
    padOrPartial:
      | CorePadDimensions
      | {
          pad?: Partial<CorePadDimensions>;
          contextual?: Partial<ContextualAffectiveMeasurements>;
          currentMood?: string;
          moodConfidence?: number;
        },
    contextualArg?: ContextualAffectiveMeasurements,
    moodArg?: string,
    moodConfidenceArg?: number,
  ): void {
    const current = this.getAffectiveState();
    let pad: CorePadDimensions;
    let contextual: ContextualAffectiveMeasurements;
    let mood: string | undefined = moodArg;
    let moodConfidence: number | undefined = moodConfidenceArg;

    if ('valence' in padOrPartial && 'arousal' in padOrPartial && 'dominance' in padOrPartial) {
      pad = padOrPartial as CorePadDimensions;
      contextual = contextualArg || current.contextual;
    } else {
      const partial = padOrPartial as any;
      pad = {
        valence: partial.pad?.valence ?? current.pad.valence,
        arousal: partial.pad?.arousal ?? current.pad.arousal,
        dominance: partial.pad?.dominance ?? current.pad.dominance,
      };
      contextual = {
        ...current.contextual,
        ...(partial.contextual || {}),
      };
      if (partial.currentMood) mood = partial.currentMood;
      if (partial.moodConfidence) moodConfidence = partial.moodConfidence;
    }

    const now = new Date().toISOString();
    let sql = `
      UPDATE ape_affective_state
      SET valence = ?, arousal = ?, dominance = ?, contextual_measurements = ?, updated_at = ?
    `;
    const params: any[] = [pad.valence, pad.arousal, pad.dominance, JSON.stringify(contextual), now];

    if (mood) {
      sql += `, current_mood = ?, mood_confidence = ?, mood_activated_at = ?`;
      params.push(mood, moodConfidence ?? 0.85, now);
    }

    sql += ` WHERE id = 'singleton'`;
    this.db.prepare(sql).run(...params);
  }

  // ==========================================
  // Active Emotions (Multi-State)
  // ==========================================

  public getActiveEmotions(status?: ActiveEmotionStatus): ActiveEmotionState[] {
    let sql = 'SELECT * FROM ape_active_emotions';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    } else {
      sql += " WHERE status IN ('active', 'resolving', 'reappraised')";
    }
    sql += ' ORDER BY intensity DESC, last_updated_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      emotionId: r.emotion_id,
      intensity: r.intensity,
      confidence: r.confidence,
      activatedAt: r.activated_at,
      lastUpdatedAt: r.last_updated_at,
      durationMs: r.duration_ms,
      persistence: r.persistence,
      triggerEventId: r.trigger_event_id,
      target: r.target,
      context: r.context,
      interpretation: r.interpretation,
      supportingEvidence: JSON.parse(r.supporting_evidence || '[]'),
      relatedMemoryIds: JSON.parse(r.related_memory_ids || '[]'),
      relatedEmotionIds: JSON.parse(r.related_emotion_ids || '[]'),
      resolutionConditions: JSON.parse(r.resolution_conditions || '[]'),
      status: r.status,
    }));
  }

  public getActiveEmotionById(id: string): ActiveEmotionState | null {
    const r = this.db.prepare('SELECT * FROM ape_active_emotions WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      emotionId: r.emotion_id,
      intensity: r.intensity,
      confidence: r.confidence,
      activatedAt: r.activated_at,
      lastUpdatedAt: r.last_updated_at,
      durationMs: r.duration_ms,
      persistence: r.persistence,
      triggerEventId: r.trigger_event_id,
      target: r.target,
      context: r.context,
      interpretation: r.interpretation,
      supportingEvidence: JSON.parse(r.supporting_evidence || '[]'),
      relatedMemoryIds: JSON.parse(r.related_memory_ids || '[]'),
      relatedEmotionIds: JSON.parse(r.related_emotion_ids || '[]'),
      resolutionConditions: JSON.parse(r.resolution_conditions || '[]'),
      status: r.status,
    };
  }

  public saveActiveEmotion(emotion: ActiveEmotionState): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ape_active_emotions (
        id, emotion_id, intensity, confidence, activated_at,
        last_updated_at, duration_ms, persistence, trigger_event_id,
        target, context, interpretation, supporting_evidence,
        related_memory_ids, related_emotion_ids, resolution_conditions, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      emotion.id,
      emotion.emotionId,
      emotion.intensity,
      emotion.confidence,
      emotion.activatedAt,
      emotion.lastUpdatedAt,
      emotion.durationMs,
      emotion.persistence,
      emotion.triggerEventId,
      emotion.target,
      emotion.context,
      emotion.interpretation,
      JSON.stringify(emotion.supportingEvidence || []),
      JSON.stringify(emotion.relatedMemoryIds || []),
      JSON.stringify(emotion.relatedEmotionIds || []),
      JSON.stringify(emotion.resolutionConditions || []),
      emotion.status,
    );
  }

  public resolveActiveEmotion(id: string, _reason?: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      UPDATE ape_active_emotions
      SET status = 'resolved', last_updated_at = ?
      WHERE id = ?
    `,
      )
      .run(now, id);
  }

  public deleteActiveEmotion(id: string): boolean {
    const res = this.db.prepare('DELETE FROM ape_active_emotions WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // ==========================================
  // Event Journal & Idempotency
  // ==========================================

  public logEvent(event: ApeEvent): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO ape_event_journal (
          id, category, type, source, payload, processed, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        event.id,
        event.category,
        event.type,
        event.source,
        JSON.stringify(event.payload || {}),
        event.processed ? 1 : 0,
        event.timestamp,
      );
      return true;
    } catch (err: any) {
      // Idempotency: if primary key constraint fails, duplicate event was submitted
      if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err.message?.includes('UNIQUE')) {
        return false;
      }
      throw new DatabaseError(`Failed to log APE event ${event.id}`, err);
    }
  }

  public getEvent(id: string): ApeEvent | null {
    const r = this.db.prepare('SELECT * FROM ape_event_journal WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      category: r.category,
      type: r.type,
      source: r.source,
      payload: JSON.parse(r.payload || '{}'),
      processed: r.processed === 1,
      timestamp: r.timestamp,
    };
  }

  public markEventProcessed(id: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE ape_event_journal SET processed = 1, processed_at = ? WHERE id = ?')
      .run(now, id);
  }

  public listRecentEvents(limit = 30): ApeEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM ape_event_journal ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      type: r.type,
      source: r.source,
      payload: JSON.parse(r.payload || '{}'),
      processed: r.processed === 1,
      timestamp: r.timestamp,
    }));
  }

  // ==========================================
  // Appraisals & Transitions
  // ==========================================

  public saveAppraisal(appraisal: ApeAppraisal): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ape_appraisals (
        id, event_id, dimensions, primary_interpretation,
        alternative_interpretations, supporting_evidence,
        proposed_transitions, proposed_mood_shift, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      appraisal.id,
      appraisal.eventId,
      JSON.stringify(appraisal.dimensions),
      appraisal.primaryInterpretation,
      JSON.stringify(appraisal.alternativeInterpretations || []),
      JSON.stringify(appraisal.supportingEvidence || []),
      JSON.stringify(appraisal.proposedTransitions || []),
      appraisal.proposedMoodShift || null,
      appraisal.timestamp,
    );

    // Update last_appraisal_at in affective state
    this.db
      .prepare(`UPDATE ape_affective_state SET last_appraisal_at = ? WHERE id = 'singleton'`)
      .run(appraisal.timestamp);
  }

  public recordTransition(transition: ApeTransitionRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO ape_transitions (
        id, appraisal_id, event_id, emotion_id, transition_type,
        previous_intensity, new_intensity, reason, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      transition.id,
      transition.appraisalId || null,
      transition.eventId,
      transition.emotionId,
      transition.transitionType,
      transition.previousIntensity,
      transition.newIntensity,
      transition.reason,
      transition.timestamp,
    );
  }

  public listTransitions(limit = 40): ApeTransitionRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM ape_transitions ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      appraisalId: r.appraisal_id || undefined,
      eventId: r.event_id,
      emotionId: r.emotion_id,
      transitionType: r.transition_type,
      previousIntensity: r.previous_intensity,
      newIntensity: r.new_intensity,
      reason: r.reason,
      timestamp: r.timestamp,
    }));
  }

  public listAppraisals(limit = 20): ApeAppraisal[] {
    const rows = this.db
      .prepare('SELECT * FROM ape_appraisals ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      dimensions: JSON.parse(r.dimensions || '{}'),
      primaryInterpretation: r.primary_interpretation,
      alternativeInterpretations: JSON.parse(r.alternative_interpretations || '[]'),
      supportingEvidence: JSON.parse(r.supporting_evidence || '[]'),
      proposedTransitions: JSON.parse(r.proposed_transitions || '[]'),
      proposedMoodShift: r.proposed_mood_shift || undefined,
      timestamp: r.timestamp,
    }));
  }

  // ==========================================
  // Invariant Relationship Configuration
  // ==========================================

  public getRelationshipConfig(): ApeRelationshipConfig {
    const r = this.db.prepare('SELECT * FROM ape_relationship_config WHERE id = ?').get('singleton') as any;
    if (!r) {
      throw new DatabaseError('Relationship configuration not found');
    }

    return {
      targetUserId: r.target_user_id,
      romanticOrientation: 'exclusive_to_user',
      sexualOrientation: 'exclusive_to_user',
      isExclusivelyCommitted: true,
      dominantInitiativePreference: r.dominant_initiative_preference,
      flirtatiousInitiativePreference: r.flirtatious_initiative_preference,
      consensualDynamics: JSON.parse(r.consensual_dynamics || '{}'),
      lastIntimacyInteractionAt: r.last_intimacy_interaction_at || undefined,
      accumulatedIntimacyDepth: r.accumulated_intimacy_depth,
    };
  }

  public updateRelationshipConfig(config: Partial<ApeRelationshipConfig>): ApeRelationshipConfig {
    // INVARIANT ENFORCEMENT: Reject any attempt to redirect romantic/sexual orientation
    if (config.romanticOrientation && config.romanticOrientation !== 'exclusive_to_user') {
      throw new Error('Mandatory Invariant Violation: Romantic orientation cannot be redirected away from user');
    }
    if (config.sexualOrientation && config.sexualOrientation !== 'exclusive_to_user') {
      throw new Error('Mandatory Invariant Violation: Sexual orientation cannot be redirected away from user');
    }
    if (config.targetUserId && config.targetUserId !== 'creator') {
      throw new Error('Mandatory Invariant Violation: Target user cannot be assigned to another person');
    }

    const current = this.getRelationshipConfig();
    const updated: ApeRelationshipConfig = {
      ...current,
      ...config,
      romanticOrientation: 'exclusive_to_user',
      sexualOrientation: 'exclusive_to_user',
      isExclusivelyCommitted: true,
      targetUserId: 'creator',
    };

    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      UPDATE ape_relationship_config
      SET dominant_initiative_preference = ?,
          flirtatious_initiative_preference = ?,
          consensual_dynamics = ?,
          last_intimacy_interaction_at = ?,
          accumulated_intimacy_depth = ?,
          updated_at = ?
      WHERE id = 'singleton'
    `,
      )
      .run(
        updated.dominantInitiativePreference,
        updated.flirtatiousInitiativePreference,
        JSON.stringify(updated.consensualDynamics),
        updated.lastIntimacyInteractionAt || null,
        updated.accumulatedIntimacyDepth,
        now,
      );

    return updated;
  }
}
