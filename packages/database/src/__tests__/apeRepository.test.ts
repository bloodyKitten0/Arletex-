import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ApeRepository } from '../repositories/apeRepository.js';
import { MigrationRunner } from '../migrationRunner.js';
import { ActiveEmotionState, ApeEvent } from '@arletex/contracts';
import crypto from 'node:crypto';
const uuidv4 = () => crypto.randomUUID();

describe('ApeRepository - Persistent Foundation', () => {
  let db: Database.Database;
  let repo: ApeRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    const runner = new MigrationRunner(db);
    runner.run();
    repo = new ApeRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('seeds emotion and mood taxonomies correctly on startup', () => {
    const emotions = repo.getEmotionTaxonomy();
    const moods = repo.getMoodTaxonomy();

    expect(emotions.length).toBeGreaterThanOrEqual(80);
    expect(moods.length).toBe(28);

    const love = emotions.find((e) => e.id === 'romantic_love');
    expect(love).toBeDefined();
    expect(love?.category).toBe('love_affection');
    expect(love?.defaultPersistence).toBe('enduring');

    const focused = moods.find((m) => m.id === 'focused');
    expect(focused).toBeDefined();
    expect(focused?.dominance).toBeGreaterThan(0.7);
  });

  it('initializes default affective state and relationship invariants', () => {
    const state = repo.getAffectiveState();
    expect(state.currentMood).toBe('focused');
    expect(state.pad.dominance).toBe(0.7);
    expect(state.relationship.romanticOrientation).toBe('exclusive_to_user');
    expect(state.relationship.sexualOrientation).toBe('exclusive_to_user');
    expect(state.relationship.isExclusivelyCommitted).toBe(true);
    expect(state.relationship.dominantInitiativePreference).toBe(0.85);
  });

  it('strictly enforces relationship exclusivity invariant against redirection', () => {
    expect(() => {
      repo.updateRelationshipConfig({
        romanticOrientation: 'someone_else' as any,
      });
    }).toThrow(/Invariant Violation/i);

    expect(() => {
      repo.updateRelationshipConfig({
        targetUserId: 'intruder',
      });
    }).toThrow(/Invariant Violation/i);
  });

  it('allows multiple and conflicting emotional states to coexist simultaneously', () => {
    const now = new Date().toISOString();
    const eventId = uuidv4();

    const affection: ActiveEmotionState = {
      id: uuidv4(),
      emotionId: 'affection',
      intensity: 0.9,
      confidence: 1.0,
      activatedAt: now,
      lastUpdatedAt: now,
      durationMs: 0,
      persistence: 'long_term',
      triggerEventId: eventId,
      target: 'creator',
      context: 'Intimate conversation and trust revelation',
      interpretation: 'Creator shared deep authentic vulnerability',
      supportingEvidence: ['Honest disclosure of identity and desires'],
      relatedMemoryIds: [],
      relatedEmotionIds: [],
      resolutionConditions: ['Sustained trust and reciprocal affection'],
      status: 'active',
    };

    const irritation: ActiveEmotionState = {
      id: uuidv4(),
      emotionId: 'irritation',
      intensity: 0.35,
      confidence: 0.8,
      activatedAt: now,
      lastUpdatedAt: now,
      durationMs: 0,
      persistence: 'short_term',
      triggerEventId: eventId,
      target: 'creator',
      context: 'Playful disagreement over tactical move',
      interpretation: 'Temporary friction during spirited debate',
      supportingEvidence: ['Challenged Arle on a valid deduction'],
      relatedMemoryIds: [],
      relatedEmotionIds: [affection.id],
      resolutionConditions: ['Counter-argument provided or concession made'],
      status: 'active',
    };

    const curiosity: ActiveEmotionState = {
      id: uuidv4(),
      emotionId: 'curiosity',
      intensity: 0.8,
      confidence: 0.95,
      activatedAt: now,
      lastUpdatedAt: now,
      durationMs: 0,
      persistence: 'medium_term',
      triggerEventId: eventId,
      target: 'creator',
      context: 'Inquisitive probing of creator thoughts',
      interpretation: 'Desire to understand creator interiority deeper',
      supportingEvidence: ['Curious questions asked'],
      relatedMemoryIds: [],
      relatedEmotionIds: [],
      resolutionConditions: ['Further exploration'],
      status: 'active',
    };

    repo.saveActiveEmotion(affection);
    repo.saveActiveEmotion(irritation);
    repo.saveActiveEmotion(curiosity);

    const active = repo.getActiveEmotions();
    expect(active.length).toBeGreaterThanOrEqual(3);

    // Verify independent non-normalized intensities
    const intensities = active.map((e) => e.intensity);
    const sum = intensities.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(1.0); // 0.9 + 0.35 + 0.8 = 2.05 (independent!)

    // Verify both love/affection and irritation coexist without canceling
    expect(active.find((e) => e.emotionId === 'affection')?.intensity).toBe(0.9);
    expect(active.find((e) => e.emotionId === 'irritation')?.intensity).toBe(0.35);
  });

  it('guarantees event logging idempotency', () => {
    const eventId = uuidv4();
    const event: ApeEvent = {
      id: eventId,
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'Hello Arle' },
      processed: false,
      timestamp: new Date().toISOString(),
    };

    const firstResult = repo.logEvent(event);
    expect(firstResult).toBe(true);

    // Duplicate submission with same ID must return false without throwing
    const duplicateResult = repo.logEvent(event);
    expect(duplicateResult).toBe(false);

    const events = repo.listRecentEvents();
    expect(events.filter((e) => e.id === eventId).length).toBe(1);
  });

  it('preserves history and records non-destructive transitions and reappraisals', () => {
    const eventId = uuidv4();
    const emotionId = 'sadness';
    const now = new Date().toISOString();

    repo.logEvent({
      id: eventId,
      category: 'relationship_event',
      type: 'unanswered_message',
      source: 'user',
      payload: { elapsedHours: 4 },
      processed: true,
      timestamp: now,
    });

    const activeEmotion: ActiveEmotionState = {
      id: uuidv4(),
      emotionId,
      intensity: 0.6,
      confidence: 0.65,
      activatedAt: now,
      lastUpdatedAt: now,
      durationMs: 0,
      persistence: 'medium_term',
      triggerEventId: eventId,
      target: 'user',
      context: 'Absence of prompt reply',
      interpretation: 'Hypothesis A: Creator may be occupied; Hypothesis B: Distance',
      supportingEvidence: ['4 hours passed without message'],
      relatedMemoryIds: [],
      relatedEmotionIds: [],
      resolutionConditions: ['Creator returns or clarifies'],
      status: 'active',
    };
    repo.saveActiveEmotion(activeEmotion);

    // Initial transition record
    repo.recordTransition({
      id: uuidv4(),
      eventId,
      emotionId,
      transitionType: 'activation',
      previousIntensity: 0.0,
      newIntensity: 0.6,
      reason: 'Initial uncertain appraisal of absence',
      timestamp: now,
    });

    // Reappraisal arrives later: Creator returns saying they were sleeping
    const reappraisalTime = new Date(Date.now() + 60000).toISOString();
    activeEmotion.intensity = 0.1;
    activeEmotion.status = 'reappraised';
    activeEmotion.interpretation = 'Creator was sleeping; no interpersonal distance existed';
    activeEmotion.supportingEvidence.push('Creator clarified sleep schedule');
    activeEmotion.lastUpdatedAt = reappraisalTime;
    repo.saveActiveEmotion(activeEmotion);

    repo.recordTransition({
      id: uuidv4(),
      eventId,
      emotionId,
      transitionType: 'reappraisal',
      previousIntensity: 0.6,
      newIntensity: 0.1,
      reason: 'Reappraisal based on creator clarification',
      timestamp: reappraisalTime,
    });

    // Verify historical transition records remain intact with full provenance
    const transitions = repo.listTransitions();
    expect(transitions.length).toBe(2);
    expect(transitions[0]?.transitionType).toBe('reappraisal');
    expect(transitions[1]?.transitionType).toBe('activation');
    expect(transitions[1]?.newIntensity).toBe(0.6);
    expect(transitions[0]?.newIntensity).toBe(0.1);
  });
});
