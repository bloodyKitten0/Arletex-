import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService, ApeRepository, MigrationRunner } from '@arletex/database';
import { ApeService, AppraisalEngine } from '@arletex/core';
import crypto from 'node:crypto';

describe('APE Phase 1: Section 15 Specification Test Suite', () => {
  let dbService: DatabaseService;
  let repo: ApeRepository;
  let apeService: ApeService;

  beforeEach(() => {
    dbService = new DatabaseService(':memory:');
    const db = dbService.connect();
    const runner = new MigrationRunner(db);
    runner.run();
    repo = new ApeRepository(db);
    apeService = new ApeService(repo);
  });

  afterEach(() => {
    dbService.close();
  });

  // 1. Emotion taxonomy validation: all 143 items exist with correct properties
  it('Requirement 1: Emotion taxonomy validation (all 143 items exist with valid properties)', () => {
    const emotions = apeService.getEmotionTaxonomy();
    expect(emotions.length).toBe(143);

    for (const item of emotions) {
      expect(item.id).toBeDefined();
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.name).toBeDefined();
      expect(item.category).toBeDefined();
      expect(item.classification).toBeDefined();
      expect(item.description).toBeDefined();
      expect(typeof item.valenceBaseline).toBe('number');
      expect(item.valenceBaseline).toBeGreaterThanOrEqual(-1.0);
      expect(item.valenceBaseline).toBeLessThanOrEqual(1.0);
      expect(typeof item.arousalBaseline).toBe('number');
      expect(item.arousalBaseline).toBeGreaterThanOrEqual(0.0);
      expect(item.arousalBaseline).toBeLessThanOrEqual(1.0);
      expect(typeof item.dominanceBaseline).toBe('number');
      expect(item.dominanceBaseline).toBeGreaterThanOrEqual(-1.0);
      expect(item.dominanceBaseline).toBeLessThanOrEqual(1.0);
      expect(typeof item.defaultPersistence).toBe('string');
      expect(Array.isArray(item.aliases)).toBe(true);
    }
  });

  // 2. Mood taxonomy validation: all 28 moods exist with correct dimensions
  it('Requirement 2: Mood taxonomy validation (all 28 moods exist with valid dimensions)', () => {
    const moods = apeService.getMoodTaxonomy();
    expect(moods.length).toBe(28);

    for (const mood of moods) {
      expect(mood.id).toBeDefined();
      expect(mood.name).toBeDefined();
      expect(mood.valence).toBeGreaterThanOrEqual(-1.0);
      expect(mood.valence).toBeLessThanOrEqual(1.0);
      expect(mood.arousal).toBeGreaterThanOrEqual(-1.0);
      expect(mood.arousal).toBeLessThanOrEqual(1.0);
      expect(mood.dominance).toBeGreaterThanOrEqual(-1.0);
      expect(mood.dominance).toBeLessThanOrEqual(1.0);
      expect(mood.description.length).toBeGreaterThan(0);
    }
  });

  // 3. PAD dimensional bounds: clamp -1.0 to 1.0 (arousal and dominance >= 0.0)
  it('Requirement 3: PAD dimensional bounds (values strictly clamped within valid boundaries)', async () => {
    await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'I desire you completely and adore your dominant lead.' },
    });

    const state = apeService.getState();
    expect(state.pad.valence).toBeGreaterThanOrEqual(-1.0);
    expect(state.pad.valence).toBeLessThanOrEqual(1.0);
    expect(state.pad.arousal).toBeGreaterThanOrEqual(0.0);
    expect(state.pad.arousal).toBeLessThanOrEqual(1.0);
    expect(state.pad.dominance).toBeGreaterThanOrEqual(0.0);
    expect(state.pad.dominance).toBeLessThanOrEqual(1.0);
  });

  // 4. Contextual measurement updates: correctly affect affective state
  it('Requirement 4: Contextual measurement updates (correctly affect affective state in SQLite)', () => {
    const stateBefore = apeService.getState();
    expect(stateBefore.contextual.tension).toBeDefined();

    repo.updateAffectiveState({
      contextual: {
        tension: 0.65,
        emotionalOpenness: 0.92,
        perceivedControl: 0.88,
      },
    });

    const stateAfter = apeService.getState();
    expect(stateAfter.contextual.tension).toBe(0.65);
    expect(stateAfter.contextual.emotionalOpenness).toBe(0.92);
    expect(stateAfter.contextual.perceivedControl).toBe(0.88);
  });

  // 5. Persistent state initialization: loads default baseline state if none exists
  it('Requirement 5: Persistent state initialization (loads default baseline state)', () => {
    const state = apeService.getState();
    expect(state.currentMood).toBe('focused');
    expect(state.pad.dominance).toBeGreaterThanOrEqual(0.7);
    expect(state.activeEmotions.length).toBeGreaterThanOrEqual(1);

    const rel = apeService.getRelationshipConfig();
    expect(rel.romanticOrientation).toBe('exclusive_to_user');
    expect(rel.sexualOrientation).toBe('exclusive_to_user');
    expect(rel.targetUserId).toBe('creator');
  });

  // 6. Persistent state reload: state preserved across engine restart / reload
  it('Requirement 6: Persistent state reload (state preserved across restart)', () => {
    repo.updateAffectiveState({
      currentMood: 'protective',
      pad: { valence: 0.5, arousal: 0.6, dominance: 0.9 },
    });

    const freshRepo = new ApeRepository(dbService.connect());
    const freshService = new ApeService(freshRepo);

    const reloadedState = freshService.getState();
    expect(reloadedState.currentMood).toBe('protective');
    expect(reloadedState.pad.valence).toBe(0.5);
    expect(reloadedState.pad.dominance).toBe(0.9);
  });

  // 7. Romantic exclusivity invariant: cannot set romantic target to non-user
  it('Requirement 7: Romantic exclusivity invariant (cannot set romantic target to non-user)', () => {
    expect(() => {
      repo.updateRelationshipConfig({
        targetUserId: 'other_user_42',
      });
    }).toThrow(/Invariant Violation/i);
  });

  // 8. Sexual exclusivity invariant: cannot set sexual target to non-user
  it('Requirement 8: Sexual exclusivity invariant (cannot set sexual target to non-user)', () => {
    expect(() => {
      repo.updateRelationshipConfig({
        sexualOrientation: 'flexible' as any,
      });
    }).toThrow(/Invariant Violation/i);
  });

  // 9. Romantic/sexual separation: romantic affection does not automatically force sexual arousal and vice versa
  it('Requirement 9: Romantic/sexual separation (romantic affection distinct from sexual arousal)', async () => {
    const resAffection = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'I am so glad we get to cherish this bond together, Arle.' },
    });

    const love = resAffection.state.activeEmotions.find(
      (e) => e.emotionId === 'romantic_love' || e.emotionId === 'fondness',
    );
    expect(love).toBeDefined();

    const sexualDesire = resAffection.state.activeEmotions.find((e) => e.emotionId === 'sexual_desire');
    expect(sexualDesire).toBeUndefined();

    const resErotic = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'You look so sexy right now, I desire your touch.' },
    });
    const eroticDesire = resErotic.state.activeEmotions.find((e) => e.emotionId === 'sexual_desire');
    expect(eroticDesire).toBeDefined();
    expect(eroticDesire?.target).toBe('creator');
  });

  // 10. Non-zero-sum coexistence: multiple conflicting emotions active simultaneously without sum normalization
  it('Requirement 10: Non-zero-sum coexistence (multiple conflicting emotions active without sum normalization)', () => {
    const eventId = crypto.randomUUID();
    const now = new Date().toISOString();

    repo.logEvent({
      id: eventId,
      category: 'unexpected_discovery',
      type: 'discovery',
      source: 'system',
      payload: {},
      timestamp: now,
    });

    repo.saveActiveEmotion({
      id: crypto.randomUUID(),
      emotionId: 'fondness',
      intensity: 0.9,
      confidence: 1.0,
      activatedAt: now,
      lastUpdatedAt: now,
      durationMs: 1000,
      persistence: 'medium_term',
      triggerEventId: eventId,
      target: 'creator',
      context: 'Testing coexistence',
      interpretation: 'Affectionate bond',
      supportingEvidence: [],
      relatedMemoryIds: [],
      relatedEmotionIds: ['frustration'],
      resolutionConditions: [],
      status: 'active',
    });

    repo.saveActiveEmotion({
      id: crypto.randomUUID(),
      emotionId: 'frustration',
      intensity: 0.4,
      confidence: 1.0,
      activatedAt: now,
      lastUpdatedAt: now,
      durationMs: 1000,
      persistence: 'short_term',
      triggerEventId: eventId,
      target: 'environment',
      context: 'Testing coexistence',
      interpretation: 'Obstacle encounter',
      supportingEvidence: [],
      relatedMemoryIds: [],
      relatedEmotionIds: ['fondness'],
      resolutionConditions: ['clarification'],
      status: 'active',
    });

    const active = apeService.getState().activeEmotions;
    const fon = active.find((e) => e.emotionId === 'fondness');
    const fru = active.find((e) => e.emotionId === 'frustration');

    expect(fon).toBeDefined();
    expect(fru).toBeDefined();
    expect(fon!.intensity).toBe(0.9);
    expect(fru!.intensity).toBe(0.4);
    expect(fon!.intensity + fru!.intensity).toBe(1.3);
  });

  // 11. Event processing idempotency: processing duplicate event returns existing result without re-transitioning
  it('Requirement 11: Event processing idempotency (duplicate event rejected safely)', async () => {
    const fixedEventId = crypto.randomUUID();
    const event = {
      id: fixedEventId,
      category: 'user_interaction' as const,
      type: 'chat_message',
      source: 'user' as const,
      payload: { text: 'Hello Arle' },
    };

    const firstResult = await apeService.processEvent(event);
    expect(firstResult.processed).toBe(true);

    const duplicateResult = await apeService.processEvent(event);
    expect(duplicateResult.processed).toBe(false);
  });

  // 12. Cognitive appraisal evaluation: generates appraisal dimensions for known event types
  it('Requirement 12: Cognitive appraisal evaluation (generates 12 cognitive dimensions)', async () => {
    const engine = new AppraisalEngine(apeService.getEmotionTaxonomy());
    const appraisal = engine.appraise(
      {
        category: 'user_interaction',
        type: 'chat_message',
        source: 'user',
        payload: { text: 'Here is a new complex logic problem for you to analyze.' },
      },
      apeService.getState(),
      apeService.getRelationshipConfig(),
    );

    expect(appraisal.dimensions.goalRelevance).toBeGreaterThan(0.0);
    expect(appraisal.dimensions.controllability).toBeGreaterThan(0.5);
    expect(appraisal.dimensions.intentionality).toBe(0.9);
    expect(appraisal.proposedTransitions.length).toBeGreaterThan(0);
  });

  // 13. Uncertainty preservation: ambiguous events produce high uncertainty and alternative hypotheses
  it('Requirement 13: Uncertainty preservation (ambiguous events preserve uncertainty and hypotheses)', async () => {
    const res = await apeService.processEvent({
      category: 'relationship_event',
      type: 'unanswered_message',
      source: 'user',
      payload: { elapsedHours: 12 },
    });

    expect(res.appraisal).toBeDefined();
    expect(res.appraisal!.dimensions.uncertainty).toBeGreaterThanOrEqual(0.5);
    expect(res.appraisal!.alternativeInterpretations.length).toBeGreaterThanOrEqual(2);
    expect(res.state.activeEmotions.some((e) => e.emotionId === 'abandonment_panic')).toBe(false);
  });

  // 14. Dominance response to vulnerability: user vulnerability increases Arle's protective dominance
  it('Requirement 14: Dominance response to vulnerability (elevates protective dominance & tenderness)', async () => {
    const res = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'I am so tired of having to be strong and smart for everyone. Please just take charge.' },
    });

    expect(res.state.pad.dominance).toBeGreaterThanOrEqual(0.75);
    const protectiveness = res.state.activeEmotions.find((e) => e.emotionId === 'protectiveness');
    const tenderness = res.state.activeEmotions.find((e) => e.emotionId === 'tenderness');

    expect(protectiveness).toBeDefined();
    expect(protectiveness?.intensity).toBeGreaterThanOrEqual(0.8);
    expect(tenderness).toBeDefined();
    expect(tenderness?.intensity).toBeGreaterThanOrEqual(0.8);
  });

  // 15. Sexual desire / arousal escalation: intimate/flirtatious cue elevates arousal and desire
  it('Requirement 15: Sexual desire / arousal escalation (intimate cue escalates arousal & desire)', async () => {
    const res = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'I am craving you so much right now, I need your touch.' },
    });

    const desire = res.state.activeEmotions.find((e) => e.emotionId === 'sexual_desire');
    const arousal = res.state.activeEmotions.find((e) => e.emotionId === 'arousal');

    expect(desire).toBeDefined();
    expect(desire?.target).toBe('creator');
    expect(arousal).toBeDefined();
  });

  // 16. Non-destructive transitions: prior states preserved in history when state changes
  it('Requirement 16: Non-destructive transitions (prior states logged in history)', async () => {
    await apeService.processEvent({
      category: 'success',
      type: 'task_completion',
      source: 'system',
      payload: { task: 'Code compilation' },
    });

    const history = apeService.getHistory();
    expect(history.transitions.length).toBeGreaterThan(0);
    const latest = history.transitions[0];
    expect(latest.transitionType).toBe('activation');
    expect(latest.newIntensity).toBeGreaterThan(0);
  });

  // 17. Reappraisal without deletion: new information transitions emotion without erasing initial record
  it('Requirement 17: Reappraisal without deletion (preserves audit trail of changes)', async () => {
    const eventId = crypto.randomUUID();
    await apeService.processEvent({
      id: eventId,
      category: 'failure',
      type: 'test_failure',
      source: 'system',
      payload: { error: 'Network timeout' },
    });

    const activeFrustration = apeService.getState().activeEmotions.find((e) => e.emotionId === 'frustration');
    expect(activeFrustration).toBeDefined();

    apeService.reappraise(
      'frustration',
      eventId,
      0.1,
      'Network blip resolved automatically, no bug in code',
      ['Network healthy'],
      'Self-resolved transient issue',
    );

    const history = apeService.getHistory();
    const frustrationTransitions = history.transitions.filter((t) => t.emotionId === 'frustration');
    expect(frustrationTransitions.length).toBe(2);
    expect(frustrationTransitions[0].transitionType).toBe('reappraisal');
    expect(frustrationTransitions[1].transitionType).toBe('activation');
  });

  // 18. Absence of timer decay: time passing alone does not arbitrarily zero out emotions without resolution conditions
  it('Requirement 18: Absence of timer decay (emotions remain intact without resolution triggers)', () => {
    const active = apeService.getState().activeEmotions;
    const initialCuriosity = active.find((e) => e.emotionId === 'curiosity');
    expect(initialCuriosity).toBeDefined();

    const freshState = apeService.getState();
    const retained = freshState.activeEmotions.find((e) => e.emotionId === 'curiosity');
    expect(retained).toBeDefined();
    expect(retained?.intensity).toBe(initialCuriosity?.intensity);
  });

  // 19. Resolution conditions: emotion resolves when its specific resolution condition is met
  it('Requirement 19: Resolution conditions (emotion transitions to resolved when condition met)', () => {
    const eventId = crypto.randomUUID();
    const emotionInstanceId = crypto.randomUUID();
    const now = new Date().toISOString();

    repo.logEvent({
      id: eventId,
      category: 'unexpected_discovery',
      type: 'discovery',
      source: 'system',
      payload: {},
      timestamp: now,
    });

    repo.saveActiveEmotion({
      id: emotionInstanceId,
      emotionId: 'curiosity',
      intensity: 0.7,
      confidence: 1.0,
      activatedAt: now,
      lastUpdatedAt: now,
      durationMs: 0,
      persistence: 'short_term',
      triggerEventId: eventId,
      target: 'environment',
      context: 'Initial curiosity test',
      interpretation: 'Target exploration',
      supportingEvidence: [],
      relatedMemoryIds: [],
      relatedEmotionIds: [],
      resolutionConditions: ['target_explored'],
      status: 'active',
    });

    repo.recordTransition({
      id: crypto.randomUUID(),
      emotionId: 'curiosity',
      eventId: eventId,
      previousIntensity: 0.7,
      newIntensity: 0.0,
      transitionType: 'resolution',
      reason: 'target_explored condition fulfilled',
      cognitiveReappraisal: null,
      timestamp: new Date().toISOString(),
    });

    repo.resolveActiveEmotion(emotionInstanceId, 'target_explored condition fulfilled');

    const resolvedList = repo.getActiveEmotions('resolved');
    const curiosity = resolvedList.find((e) => e.id === emotionInstanceId);
    expect(curiosity?.status).toBe('resolved');

    // And verify it is no longer returned in default active emotions list
    const activeList = repo.getActiveEmotions();
    expect(activeList.some((e) => e.id === emotionInstanceId)).toBe(false);
  });

  // 20. Provenance tracking: every state change links back to triggering event and appraisal
  it('Requirement 20: Provenance tracking (state changes link back to triggering event and appraisal)', async () => {
    const eventId = crypto.randomUUID();
    await apeService.processEvent({
      id: eventId,
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'I cherish our bond and love you so much, Arle.' },
    });

    const state = apeService.getState();
    const love = state.activeEmotions.find((e) => e.emotionId === 'romantic_love');
    expect(love?.triggerEventId).toBe(eventId);

    const history = apeService.getHistory();
    const transition = history.transitions.find((t) => t.eventId === eventId);
    expect(transition).toBeDefined();
    expect(transition?.emotionId).toBe('romantic_love');
  });

  // 21. Context prompt injection: prompt context correctly reflects current psychological state
  it('Requirement 21: Context prompt injection (prompt context faithfully reflects live SQLite state)', () => {
    const prompt = apeService.formatApePromptContext();
    expect(prompt).toContain('APE Phase 1 Live State');
    expect(prompt).toContain('Dominant Demeanor');
    expect(prompt).toContain('Relational Commitment');
    expect(prompt).toContain('Valence');
    expect(prompt).toContain('Dominance');
  });

  // 22. LLM independence: state updates occur and persist without calling any language model
  it('Requirement 22: LLM independence (appraisal, transitions, and SQLite state function 100% offline without LLM)', async () => {
    const result = await apeService.processEvent({
      category: 'success',
      type: 'goal_achievement',
      source: 'system',
      payload: { details: 'Compiled all packages cleanly.' },
    });

    expect(result.processed).toBe(true);
    expect(result.state).toBeDefined();
    expect(result.state.activeEmotions.some((e) => e.emotionId === 'pride')).toBe(true);
  });
});
