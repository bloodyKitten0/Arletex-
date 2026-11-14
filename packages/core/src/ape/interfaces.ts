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
  MoodTaxonomyItem,
} from '@arletex/contracts';

export interface IApeRepository {
  getEmotionTaxonomy(): EmotionTaxonomyItem[];
  getMoodTaxonomy(): MoodTaxonomyItem[];
  getAffectiveState(): ApePsychologicalState;
  updateAffectiveState(
    padOrPartial:
      | CorePadDimensions
      | {
          pad?: Partial<CorePadDimensions>;
          contextual?: Partial<ContextualAffectiveMeasurements>;
          currentMood?: string;
          moodConfidence?: number;
        },
    contextual?: ContextualAffectiveMeasurements,
    mood?: string,
    moodConfidence?: number,
  ): void;
  getActiveEmotions(status?: ActiveEmotionStatus): ActiveEmotionState[];
  saveActiveEmotion(emotion: ActiveEmotionState): void;
  resolveActiveEmotion(id: string, reason?: string): void;
  deleteActiveEmotion(id: string): boolean;
  logEvent(event: ApeEvent): boolean;
  getEvent(id: string): ApeEvent | null;
  markEventProcessed(id: string): void;
  listRecentEvents(limit?: number): ApeEvent[];
  saveAppraisal(appraisal: ApeAppraisal): void;
  recordTransition(transition: ApeTransitionRecord): void;
  listTransitions(limit?: number): ApeTransitionRecord[];
  listAppraisals(limit?: number): ApeAppraisal[];
  getRelationshipConfig(): ApeRelationshipConfig;
  updateRelationshipConfig(config: Partial<ApeRelationshipConfig>): ApeRelationshipConfig;
}
