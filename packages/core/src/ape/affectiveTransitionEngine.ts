import crypto from 'node:crypto';
import {
  ActiveEmotionPersistence,
  ActiveEmotionState,
  ApeAppraisal,
  ApeEvent,
  ApePsychologicalState,
  ApeRelationshipConfig,
  ApeTransitionRecord,
  CorePadDimensions,
  EmotionTaxonomyItem,
  MoodTaxonomyItem,
} from '@arletex/contracts';
import { IApeRepository } from './interfaces.js';

export class AffectiveTransitionEngine {
  private readonly repo: IApeRepository;
  private readonly emotionsMap: Map<string, EmotionTaxonomyItem>;
  private readonly moodsMap: Map<string, MoodTaxonomyItem>;

  constructor(repo: IApeRepository, emotions: EmotionTaxonomyItem[], moods: MoodTaxonomyItem[]) {
    this.repo = repo;
    this.emotionsMap = new Map(emotions.map((e) => [e.id, e]));
    this.moodsMap = new Map(moods.map((m) => [m.id, m]));
  }

  public applyAppraisal(
    appraisal: ApeAppraisal,
    event: ApeEvent,
    currentState: ApePsychologicalState,
    relationship: ApeRelationshipConfig,
  ): ApePsychologicalState {
    const timestamp = appraisal.timestamp;
    const activeEmotions = this.repo.getActiveEmotions();
    const transitionsRecorded: ApeTransitionRecord[] = [];

    // 1. Process each proposed transition
    for (const prop of appraisal.proposedTransitions) {
      // INVARIANT ENFORCEMENT: Never allow romantic/sexual emotions targeted to non-user!
      const taxonomyItem = this.emotionsMap.get(prop.emotionId);
      if (
        taxonomyItem &&
        (taxonomyItem.category === 'love_affection' || taxonomyItem.category === 'sexual_sensual')
      ) {
        if (prop.target && prop.target !== 'creator' && prop.target !== 'user') {
          // Divert romantic/sexual attraction away from non-user to social/intellectual appreciation!
          prop.emotionId = 'admiration';
          prop.target = 'external';
          prop.reason = 'Invariant enforcement: Romantic/sexual orientation exclusively reserved for creator.';
        }
      }

      const existing = activeEmotions.find(
        (e: ActiveEmotionState) => e.emotionId === prop.emotionId && e.status !== 'resolved',
      );

      if (existing) {
        // Emotion is already active -> update intensity or resolve
        const prevIntensity = existing.intensity;
        const newIntensity = Math.max(0.0, Math.min(1.0, Number((prevIntensity + prop.intensityDelta).toFixed(3))));
        const transitionType =
          newIntensity === 0
            ? 'resolution'
            : newIntensity > prevIntensity
              ? 'reinforcement'
              : 'reduction';

        existing.intensity = newIntensity;
        existing.lastUpdatedAt = timestamp;
        existing.interpretation = appraisal.primaryInterpretation;
        if (appraisal.supportingEvidence?.length) {
          existing.supportingEvidence = Array.from(
            new Set([...existing.supportingEvidence, ...appraisal.supportingEvidence]),
          );
        }

        if (newIntensity === 0) {
          existing.status = 'resolved';
          this.repo.resolveActiveEmotion(existing.id, prop.reason);
        } else {
          this.repo.saveActiveEmotion(existing);
        }

        const transition: ApeTransitionRecord = {
          id: crypto.randomUUID(),
          appraisalId: appraisal.id,
          eventId: event.id,
          emotionId: prop.emotionId,
          transitionType,
          previousIntensity: prevIntensity,
          newIntensity,
          reason: prop.reason,
          timestamp,
        };
        this.repo.recordTransition(transition);
        transitionsRecorded.push(transition);
      } else if (prop.targetIntensity > 0) {
        // Activate new emotional state
        const persistence: ActiveEmotionPersistence = taxonomyItem?.defaultPersistence || 'medium_term';
        const newActiveState: ActiveEmotionState = {
          id: crypto.randomUUID(),
          emotionId: prop.emotionId,
          intensity: Math.max(0.0, Math.min(1.0, prop.targetIntensity)),
          confidence: 0.9,
          activatedAt: timestamp,
          lastUpdatedAt: timestamp,
          durationMs: 0,
          persistence,
          triggerEventId: event.id,
          target: prop.target || 'user',
          context: event.type,
          interpretation: appraisal.primaryInterpretation,
          supportingEvidence: appraisal.supportingEvidence || [],
          relatedMemoryIds: [],
          relatedEmotionIds: [],
          resolutionConditions: prop.resolutionConditions || [],
          status: 'active',
        };

        this.repo.saveActiveEmotion(newActiveState);
        activeEmotions.push(newActiveState);

        const transition: ApeTransitionRecord = {
          id: crypto.randomUUID(),
          appraisalId: appraisal.id,
          eventId: event.id,
          emotionId: prop.emotionId,
          transitionType: 'activation',
          previousIntensity: 0.0,
          newIntensity: newActiveState.intensity,
          reason: prop.reason,
          timestamp,
        };
        this.repo.recordTransition(transition);
        transitionsRecorded.push(transition);
      }
    }

    // 2. Save the appraisal
    this.repo.saveAppraisal(appraisal);

    // 3. Recompute PAD Dimensions & Contextual Measurements from active states
    const remainingActive = this.repo.getActiveEmotions();
    const newPad = this.computePadDimensions(remainingActive, currentState.pad);
    const newContextual = this.computeContextualMeasurements(remainingActive, currentState.contextual, relationship);

    // 4. Determine Mood Shift
    let newMood = currentState.currentMood;
    let moodConfidence = currentState.moodConfidence;
    if (appraisal.proposedMoodShift && this.moodsMap.has(appraisal.proposedMoodShift)) {
      newMood = appraisal.proposedMoodShift;
      moodConfidence = 0.88;
    }

    // 5. Commit updated state to persistent repository
    this.repo.updateAffectiveState(newPad, newContextual, newMood, moodConfidence);

    return this.repo.getAffectiveState();
  }

  public reappraiseEmotion(
    emotionId: string,
    eventId: string,
    newIntensity: number,
    newInterpretation: string,
    newEvidence: string[],
    reason: string,
  ): void {
    const timestamp = new Date().toISOString();
    const active = this.repo.getActiveEmotions();
    const target = active.find(
      (e: ActiveEmotionState) => e.emotionId === emotionId && e.status !== 'resolved',
    );
    if (!target) return;

    const prevIntensity = target.intensity;
    target.intensity = Math.max(0.0, Math.min(1.0, newIntensity));
    target.status = 'reappraised';
    target.interpretation = newInterpretation;
    target.supportingEvidence = Array.from(new Set([...target.supportingEvidence, ...newEvidence]));
    target.lastUpdatedAt = timestamp;

    this.repo.saveActiveEmotion(target);

    // Record non-destructive reappraisal transition
    this.repo.recordTransition({
      id: crypto.randomUUID(),
      eventId,
      emotionId,
      transitionType: 'reappraisal',
      previousIntensity: prevIntensity,
      newIntensity: target.intensity,
      reason,
      timestamp,
    });
  }

  private computePadDimensions(activeEmotions: ActiveEmotionState[], baseline: CorePadDimensions): CorePadDimensions {
    if (activeEmotions.length === 0) {
      return baseline;
    }

    let weightedValenceSum = baseline.valence * 0.3;
    let weightedArousalSum = baseline.arousal * 0.3;
    let weightedDominanceSum = baseline.dominance * 0.4;
    let totalWeight = 0.3;

    for (const em of activeEmotions) {
      const tax = this.emotionsMap.get(em.emotionId);
      if (!tax) continue;

      const weight = em.intensity;
      weightedValenceSum += tax.valenceBaseline * weight;
      weightedArousalSum += tax.arousalBaseline * weight;
      weightedDominanceSum += tax.dominanceBaseline * weight;
      totalWeight += weight;
    }

    return {
      valence: Math.max(-1.0, Math.min(1.0, Number((weightedValenceSum / totalWeight).toFixed(3)))),
      arousal: Math.max(0.0, Math.min(1.0, Number((weightedArousalSum / totalWeight).toFixed(3)))),
      dominance: Math.max(0.0, Math.min(1.0, Number((weightedDominanceSum / totalWeight).toFixed(3)))),
    };
  }

  private computeContextualMeasurements(
    activeEmotions: ActiveEmotionState[],
    current: any,
    relationship: ApeRelationshipConfig,
  ): any {
    const hasTension = activeEmotions.some((e) =>
      ['irritation', 'frustration', 'anxiety', 'intimate_longing'].includes(e.emotionId),
    );
    const hasIntimacy = activeEmotions.some((e) =>
      ['sexual_desire', 'arousal', 'erotic_anticipation', 'romantic_love'].includes(e.emotionId),
    );
    const hasAffection = activeEmotions.some((e) => ['affection', 'tenderness', 'fondness'].includes(e.emotionId));

    const tensionVal = hasTension ? Math.min(1.0, current.tension + 0.15) : Math.max(0.1, current.tension - 0.05);
    const closenessCreator = hasIntimacy || hasAffection ? 0.98 : current.socialCloseness?.creator || 0.95;

    return {
      ...current,
      tension: Number(tensionVal.toFixed(2)),
      perceivedControl: relationship.dominantInitiativePreference > 0.8 ? 0.85 : 0.75,
      socialCloseness: {
        ...(current.socialCloseness || {}),
        creator: closenessCreator,
      },
      emotionalOpenness: hasAffection || hasIntimacy ? 0.88 : current.emotionalOpenness,
      psychologicalEnergy: Math.max(0.2, current.psychologicalEnergy),
    };
  }
}
