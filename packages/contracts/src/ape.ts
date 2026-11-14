import { z } from 'zod';

// ==========================================
// APE Classification & Taxonomy Schemas
// ==========================================

export const EmotionCategorySchema = z.enum([
  'positive',
  'love_affection',
  'sexual_sensual',
  'anger_hostility',
  'sadness_pain',
  'fear_insecurity',
  'intellectual',
  'social_interpersonal',
  'existential_complex',
]);

export type EmotionCategory = z.infer<typeof EmotionCategorySchema>;

export const PsychologicalClassificationSchema = z.enum([
  'emotion',
  'complex_experience',
  'mood',
  'motivational_drive',
  'cognitive_affective',
  'physiological_activation',
  'interpersonal_construct',
]);

export type PsychologicalClassification = z.infer<typeof PsychologicalClassificationSchema>;

export const EmotionTaxonomyItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: EmotionCategorySchema,
  classification: PsychologicalClassificationSchema,
  description: z.string(),
  valenceBaseline: z.number().min(-1.0).max(1.0),
  arousalBaseline: z.number().min(0.0).max(1.0),
  dominanceBaseline: z.number().min(0.0).max(1.0),
  defaultPersistence: z.enum(['short_term', 'medium_term', 'long_term', 'enduring']),
  aliases: z.array(z.string()).optional(),
});

export type EmotionTaxonomyItem = z.infer<typeof EmotionTaxonomyItemSchema>;

export const MoodTaxonomyItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  valence: z.number().min(-1.0).max(1.0),
  arousal: z.number().min(0.0).max(1.0),
  dominance: z.number().min(0.0).max(1.0),
});

export type MoodTaxonomyItem = z.infer<typeof MoodTaxonomyItemSchema>;

// ==========================================
// Affective Dimensions & Contextual State
// ==========================================

export const CorePadDimensionsSchema = z.object({
  valence: z.number().min(-1.0).max(1.0).default(0.35),
  arousal: z.number().min(0.0).max(1.0).default(0.55),
  dominance: z.number().min(0.0).max(1.0).default(0.70),
});

export type CorePadDimensions = z.infer<typeof CorePadDimensionsSchema>;

export const ContextualAffectiveMeasurementsSchema = z.object({
  tension: z.number().min(0.0).max(1.0).default(0.15),
  emotionalStability: z.number().min(0.0).max(1.0).default(0.85),
  perceivedControl: z.number().min(0.0).max(1.0).default(0.80),
  certainty: z.number().min(0.0).max(1.0).default(0.75),
  socialCloseness: z.record(z.string(), z.number().min(0.0).max(1.0)).default({ creator: 0.90 }),
  socialSafety: z.number().min(0.0).max(1.0).default(0.85),
  goalAlignment: z.number().min(0.0).max(1.0).default(0.90),
  emotionalOpenness: z.number().min(0.0).max(1.0).default(0.70),
  psychologicalEnergy: z.number().min(0.0).max(1.0).default(0.80),
  cognitiveLoad: z.number().min(0.0).max(1.0).default(0.30),
});

export type ContextualAffectiveMeasurements = z.infer<typeof ContextualAffectiveMeasurementsSchema>;

// ==========================================
// Active Emotional State Model
// ==========================================

export const ActiveEmotionStatusSchema = z.enum(['active', 'resolving', 'reappraised', 'resolved']);
export type ActiveEmotionStatus = z.infer<typeof ActiveEmotionStatusSchema>;

export const ActiveEmotionPersistenceSchema = z.enum(['short_term', 'medium_term', 'long_term', 'enduring']);
export type ActiveEmotionPersistence = z.infer<typeof ActiveEmotionPersistenceSchema>;

export const ActiveEmotionStateSchema = z.object({
  id: z.string().uuid(),
  emotionId: z.string(),
  intensity: z.number().min(0.0).max(1.0),
  confidence: z.number().min(0.0).max(1.0).default(1.0),
  activatedAt: z.string().datetime(),
  lastUpdatedAt: z.string().datetime(),
  durationMs: z.number().default(0),
  persistence: ActiveEmotionPersistenceSchema.default('medium_term'),
  triggerEventId: z.string(),
  target: z.string().default('user'),
  context: z.string().default(''),
  interpretation: z.string().default(''),
  supportingEvidence: z.array(z.string()).default([]),
  relatedMemoryIds: z.array(z.string()).default([]),
  relatedEmotionIds: z.array(z.string()).default([]),
  resolutionConditions: z.array(z.string()).default([]),
  status: ActiveEmotionStatusSchema.default('active'),
});

export type ActiveEmotionState = z.infer<typeof ActiveEmotionStateSchema>;

// ==========================================
// Invariant Relationship Configuration
// ==========================================

export const ApeRelationshipConfigSchema = z.object({
  targetUserId: z.string().default('creator'),
  romanticOrientation: z.literal('exclusive_to_user').default('exclusive_to_user'),
  sexualOrientation: z.literal('exclusive_to_user').default('exclusive_to_user'),
  isExclusivelyCommitted: z.literal(true).default(true),
  dominantInitiativePreference: z.number().min(0.0).max(1.0).default(0.85),
  flirtatiousInitiativePreference: z.number().min(0.0).max(1.0).default(0.80),
  consensualDynamics: z.object({
    allowsFemdom: z.boolean().default(true),
    allowsTeasing: z.boolean().default(true),
    allowsAssertiveLead: z.boolean().default(true),
    boundariesEnforced: z.boolean().default(true),
  }).default({
    allowsFemdom: true,
    allowsTeasing: true,
    allowsAssertiveLead: true,
    boundariesEnforced: true,
  }),
  lastIntimacyInteractionAt: z.string().datetime().optional(),
  accumulatedIntimacyDepth: z.number().min(0.0).max(1.0).default(0.5),
});

export type ApeRelationshipConfig = z.infer<typeof ApeRelationshipConfigSchema>;

// ==========================================
// Psychological Events & Appraisals
// ==========================================

export const ApeEventCategorySchema = z.enum([
  'user_interaction',
  'conversation_outcome',
  'memory_retrieval',
  'personal_project_progress',
  'success',
  'failure',
  'unexpected_discovery',
  'social_interaction',
  'relationship_event',
  'environmental_event',
  'self_generated_thought',
  'internal_reflection',
  'goal_obstruction',
  'goal_achievement',
  'repeated_experience',
  'user_departure_under_arousal',
]);

export type ApeEventCategory = z.infer<typeof ApeEventCategorySchema>;

export const ApeEventSchema = z.object({
  id: z.string().uuid(),
  category: ApeEventCategorySchema,
  type: z.string(),
  source: z.string().default('user'),
  payload: z.record(z.string(), z.any()).default({}),
  processed: z.boolean().default(false),
  timestamp: z.string().datetime(),
});

export type ApeEvent = z.infer<typeof ApeEventSchema>;

export const AlternativeInterpretationSchema = z.object({
  hypothesis: z.string(),
  likelihood: z.number().min(0.0).max(1.0),
  reasoning: z.string(),
});

export type AlternativeInterpretation = z.infer<typeof AlternativeInterpretationSchema>;

export const ProposedEmotionTransitionSchema = z.object({
  emotionId: z.string(),
  target: z.string().default('user'),
  intensityDelta: z.number().min(-1.0).max(1.0),
  targetIntensity: z.number().min(0.0).max(1.0),
  reason: z.string(),
  resolutionConditions: z.array(z.string()).default([]),
});

export type ProposedEmotionTransition = z.infer<typeof ProposedEmotionTransitionSchema>;

export const ApeAppraisalSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  dimensions: z.object({
    goalRelevance: z.number().min(0.0).max(1.0),
    goalCongruence: z.number().min(-1.0).max(1.0),
    unexpectedness: z.number().min(0.0).max(1.0),
    responsibility: z.enum(['user', 'arle', 'environment', 'unknown']),
    intentionality: z.number().min(0.0).max(1.0),
    fairness: z.number().min(0.0).max(1.0),
    threat: z.number().min(0.0).max(1.0),
    controllability: z.number().min(0.0).max(1.0),
    socialMeaning: z.string(),
    personalSignificance: z.number().min(0.0).max(1.0),
    uncertainty: z.number().min(0.0).max(1.0),
    relationshipImplications: z.string(),
  }),
  primaryInterpretation: z.string(),
  alternativeInterpretations: z.array(AlternativeInterpretationSchema).default([]),
  supportingEvidence: z.array(z.string()).default([]),
  proposedTransitions: z.array(ProposedEmotionTransitionSchema).default([]),
  proposedMoodShift: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type ApeAppraisal = z.infer<typeof ApeAppraisalSchema>;

export const EmotionTransitionTypeSchema = z.enum([
  'activation',
  'intensity_change',
  'reinforcement',
  'reduction',
  'persistence',
  'resolution',
  'reappraisal',
]);

export type EmotionTransitionType = z.infer<typeof EmotionTransitionTypeSchema>;

export const ApeTransitionRecordSchema = z.object({
  id: z.string().uuid(),
  appraisalId: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  emotionId: z.string(),
  transitionType: EmotionTransitionTypeSchema,
  previousIntensity: z.number().min(0.0).max(1.0),
  newIntensity: z.number().min(0.0).max(1.0),
  reason: z.string(),
  timestamp: z.string().datetime(),
});

export type ApeTransitionRecord = z.infer<typeof ApeTransitionRecordSchema>;

// ==========================================
// Aggregated Overall APE Psychological State
// ==========================================

export const ApePsychologicalStateSchema = z.object({
  currentMood: z.string().default('focused'),
  moodConfidence: z.number().min(0.0).max(1.0).default(0.85),
  moodActivatedAt: z.string().datetime(),
  pad: CorePadDimensionsSchema,
  contextual: ContextualAffectiveMeasurementsSchema,
  activeEmotions: z.array(ActiveEmotionStateSchema).default([]),
  relationship: ApeRelationshipConfigSchema,
  isInitialized: z.boolean().default(true),
  lastAppraisalAt: z.string().datetime().optional(),
});

export type ApePsychologicalState = z.infer<typeof ApePsychologicalStateSchema>;

export const ApeHistoryResponseSchema = z.object({
  transitions: z.array(ApeTransitionRecordSchema),
  recentEvents: z.array(ApeEventSchema),
  appraisals: z.array(ApeAppraisalSchema),
});

export type ApeHistoryResponse = z.infer<typeof ApeHistoryResponseSchema>;
