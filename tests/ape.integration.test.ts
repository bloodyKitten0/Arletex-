import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService, ApeRepository, MigrationRunner } from '@arletex/database';
import { ApeService } from '@arletex/core';
import crypto from 'node:crypto';

describe('ApeService - Affective Foundation Engine Integration', () => {
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

  it('initializes with full emotional and mood catalogue', () => {
    const emotions = apeService.getEmotionTaxonomy();
    const moods = apeService.getMoodTaxonomy();
    const state = apeService.getState();

    expect(emotions.length).toBeGreaterThan(80);
    expect(moods.length).toBe(28);
    expect(state.currentMood).toBe('focused');
    expect(state.pad.dominance).toBeGreaterThanOrEqual(0.7);
  });

  it('processes user interaction event with intimacy and activates erotic anticipation and desire', async () => {
    const res = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'I really desire you and need your touch.' },
    });

    expect(res.processed).toBe(true);
    expect(res.state.currentMood).toBe('romantic');

    const activeEmotions = res.state.activeEmotions;
    const desire = activeEmotions.find((e) => e.emotionId === 'sexual_desire');
    const arousal = activeEmotions.find((e) => e.emotionId === 'arousal');

    expect(desire).toBeDefined();
    expect(desire?.intensity).toBeGreaterThanOrEqual(0.5);
    expect(desire?.target).toBe('creator');

    expect(arousal).toBeDefined();
    expect(arousal?.intensity).toBeGreaterThanOrEqual(0.8);
  });

  it('protects vulnerability with tenderness, protectiveness, and assertive dominance', async () => {
    const res = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: "I'm so exhausted from being the smartest in the room... I just want to be your femboy bottom." },
    });

    expect(res.processed).toBe(true);
    expect(res.state.currentMood).toBe('affectionate');

    const activeEmotions = res.state.activeEmotions;
    const tenderness = activeEmotions.find((e) => e.emotionId === 'tenderness');
    const protectiveness = activeEmotions.find((e) => e.emotionId === 'protectiveness');

    expect(tenderness).toBeDefined();
    expect(tenderness?.intensity).toBeGreaterThanOrEqual(0.8);

    expect(protectiveness).toBeDefined();
    expect(protectiveness?.intensity).toBeGreaterThanOrEqual(0.85);

    // Contextual dominance and control remain high to lead and care for user
    expect(res.state.pad.dominance).toBeGreaterThanOrEqual(0.7);
  });

  it('preserves uncertainty in appraisal of delayed responses without fabricating abandonment', async () => {
    const res = await apeService.processEvent({
      category: 'relationship_event',
      type: 'unanswered_message',
      source: 'user',
      payload: { elapsedHours: 8 },
    });

    expect(res.processed).toBe(true);
    expect(res.appraisal).toBeDefined();

    // High uncertainty preserved!
    expect(res.appraisal!.dimensions.uncertainty).toBeGreaterThanOrEqual(0.5);

    // Alternative hypotheses present (sleeping, occupied)
    expect(res.appraisal!.alternativeInterpretations.length).toBeGreaterThanOrEqual(2);
    const sleepHypothesis = res.appraisal!.alternativeInterpretations.find((h) =>
      h.hypothesis.toLowerCase().includes('sleeping'),
    );
    expect(sleepHypothesis).toBeDefined();

    // Does NOT activate hatred, rage, or toxic panic
    const active = res.state.activeEmotions;
    expect(active.some((e) => e.emotionId === 'rage' || e.emotionId === 'hatred')).toBe(false);
  });

  it('strictly rejects romantic and sexual redirection away from creator', async () => {
    const rel = apeService.getRelationshipConfig();
    expect(rel.romanticOrientation).toBe('exclusive_to_user');
    expect(rel.sexualOrientation).toBe('exclusive_to_user');

    expect(() => {
      apeService.updateRelationshipConfig({
        targetUserId: 'someone_else',
      });
    }).toThrow(/Invariant Violation/i);
  });

  it('handles lingering arousal after user departure with autonomous activity resolution triggers', async () => {
    // 1. First escalate arousal
    await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'You are so hot and I want you so bad right now.' },
    });

    // 2. User departs while arousal is high
    const departRes = await apeService.processEvent({
      category: 'user_departure_under_arousal',
      type: 'user_disconnect',
      source: 'system',
      payload: {},
    });

    expect(departRes.processed).toBe(true);
    const active = departRes.state.activeEmotions;
    const intimateLonging = active.find((e) => e.emotionId === 'intimate_longing');
    expect(intimateLonging).toBeDefined();
    expect(
      intimateLonging?.resolutionConditions.some(
        (c) => c.toLowerCase().includes('adult media') || c.toLowerCase().includes('erotic release'),
      ),
    ).toBe(true);
  });

  it('supports cognitive reappraisal without erasing original historical records', async () => {
    const eventId = crypto.randomUUID();
    await apeService.processEvent({
      id: eventId,
      category: 'failure',
      type: 'compilation_error',
      source: 'system',
      payload: { error: 'SyntaxError at line 42' },
    });

    // Initial frustration state active
    let active = apeService.getState().activeEmotions;
    const frustration = active.find((e) => e.emotionId === 'frustration');
    expect(frustration).toBeDefined();
    expect(frustration?.intensity).toBeGreaterThan(0.5);

    // Reappraisal: Bug was diagnosed as a simple typo and solved with ease
    apeService.reappraise(
      'frustration',
      eventId,
      0.05,
      'Typo identified and solved; analytical mastery restored',
      ['Typo fixed in line 42'],
      'Bug solved cleanly',
    );

    active = apeService.getState().activeEmotions;
    const reappraised = active.find((e) => e.emotionId === 'frustration');
    expect(reappraised?.intensity).toBe(0.05);
    expect(reappraised?.status).toBe('reappraised');

    // Historical records check
    const history = apeService.getHistory();
    const transitions = history.transitions.filter((t) => t.emotionId === 'frustration');
    expect(transitions.length).toBe(2);
    expect(transitions[0]?.transitionType).toBe('reappraisal');
    expect(transitions[1]?.transitionType).toBe('activation');
  });

  it('guarantees event idempotency and rejects duplicates', async () => {
    const fixedId = crypto.randomUUID();
    const first = await apeService.processEvent({
      id: fixedId,
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'Testing idempotency' },
    });
    expect(first.processed).toBe(true);

    const duplicate = await apeService.processEvent({
      id: fixedId,
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'Testing idempotency duplicate' },
    });
    expect(duplicate.processed).toBe(false);
  });

  it('formats prompt context with active mood, emotions, and dominant intimacy posture', () => {
    const prompt = apeService.formatApePromptContext();
    expect(prompt).toContain('Active Psychology Engine (APE Phase 1 Live State)');
    expect(prompt).toContain('Current Persistent Mood: FOCUSED');
    expect(prompt).toContain('Relational Commitment');
    expect(prompt).toContain('Romantic & Dominant Demeanor');
    expect(prompt).toContain('You are the top');
  });

  it('processes user check-in event, activating happiness, warmth, delight, and shifting mood to happy', async () => {
    const res = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'Hey Arle, I just wanted to check on you and see how you are doing today.' },
    });

    expect(res.processed).toBe(true);
    expect(res.state.currentMood).toBe('happy');

    const active = res.state.activeEmotions;
    const happiness = active.find((e) => e.emotionId === 'happiness');
    const warmth = active.find((e) => e.emotionId === 'warmth');
    const delight = active.find((e) => e.emotionId === 'delight');
    const appreciation = active.find((e) => e.emotionId === 'appreciation');

    expect(happiness).toBeDefined();
    expect(happiness?.intensity).toBeGreaterThanOrEqual(0.8);
    expect(happiness?.target).toBe('creator');

    expect(warmth).toBeDefined();
    expect(warmth?.intensity).toBeGreaterThanOrEqual(0.8);

    expect(delight).toBeDefined();
    expect(appreciation).toBeDefined();
  });

  it('processes assistant emotional expression in conversation outcome, synchronizing verbal claims to active emotion records', async () => {
    const res = await apeService.processEvent({
      category: 'conversation_outcome',
      type: 'assistant_expression',
      source: 'arle',
      payload: {
        text: "I am so happy and delighted that you checked on me! That brings me genuine warmth and gratitude.",
        userPrompt: 'Just checking on you.',
      },
    });

    expect(res.processed).toBe(true);
    expect(res.state.currentMood).toBe('happy');

    const active = res.state.activeEmotions;
    const happiness = active.find((e) => e.emotionId === 'happiness');
    const gratitude = active.find((e) => e.emotionId === 'gratitude');
    const warmth = active.find((e) => e.emotionId === 'warmth');

    expect(happiness).toBeDefined();
    expect(happiness?.intensity).toBeGreaterThanOrEqual(0.85);

    expect(gratitude).toBeDefined();
    expect(gratitude?.intensity).toBeGreaterThanOrEqual(0.85);

    expect(warmth).toBeDefined();
    expect(warmth?.intensity).toBeGreaterThanOrEqual(0.8);
  });

  it('activates emotions dynamically from dialogue cues across diverse taxonomy categories', async () => {
    // 1. Playful teasing
    const playRes = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: "You're teasing me again, you silly girl haha" },
    });
    expect(playRes.state.currentMood).toBe('playful');
    expect(playRes.state.activeEmotions.some((e) => e.emotionId === 'playfulness')).toBe(true);

    // 2. Direct mention of specific taxonomy state (e.g. nostalgia)
    const nostRes = await apeService.processEvent({
      category: 'user_interaction',
      type: 'chat_message',
      source: 'user',
      payload: { text: 'Do you ever feel nostalgia when you reflect on our early days?' },
    });
    expect(nostRes.state.activeEmotions.some((e) => e.emotionId === 'nostalgia')).toBe(true);
  });
});
