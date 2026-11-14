import crypto from 'node:crypto';
import {
  ApeAppraisal,
  ApeEvent,
  ApePsychologicalState,
  ApeRelationshipConfig,
  EmotionTaxonomyItem,
  ProposedEmotionTransition,
} from '@arletex/contracts';

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class AppraisalEngine {
  private readonly emotions: EmotionTaxonomyItem[];

  constructor(emotions: EmotionTaxonomyItem[] = []) {
    this.emotions = emotions;
  }

  public appraise(
    event: ApeEvent,
    currentState: ApePsychologicalState,
    relationship: ApeRelationshipConfig,
  ): ApeAppraisal {
    const appraisalId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    if (event.category === 'conversation_outcome' || event.source === 'arle') {
      return this.appraiseAssistantExpression(appraisalId, event, currentState, relationship, timestamp);
    }

    switch (event.category) {
      case 'user_interaction':
        return this.appraiseInteractionEvent(appraisalId, event, currentState, relationship, timestamp);

      case 'relationship_event':
        return this.appraiseRelationshipEvent(appraisalId, event, currentState, relationship, timestamp);

      case 'user_departure_under_arousal':
        return this.appraiseDepartureUnderArousal(appraisalId, event, currentState, relationship, timestamp);

      case 'success':
      case 'goal_achievement':
        return this.appraiseSuccessEvent(appraisalId, event, currentState, relationship, timestamp);

      case 'failure':
      case 'goal_obstruction':
        return this.appraiseFailureEvent(appraisalId, event, currentState, relationship, timestamp);

      case 'unexpected_discovery':
        return this.appraiseDiscoveryEvent(appraisalId, event, currentState, relationship, timestamp);

      default:
        return this.appraiseGenericEvent(appraisalId, event, currentState, relationship, timestamp);
    }
  }

  private appraiseInteractionEvent(
    id: string,
    event: ApeEvent,
    currentState: ApePsychologicalState,
    relationship: ApeRelationshipConfig,
    timestamp: string,
  ): ApeAppraisal {
    const text = (event.payload?.text || '').toLowerCase();
    const proposedTransitions: ProposedEmotionTransition[] = [];
    const alternativeInterpretations: Array<{ hypothesis: string; likelihood: number; reasoning: string }> = [];
    const supportingEvidence: string[] = [];
    let proposedMoodShift: string | undefined = undefined;

    const addTransition = (trans: ProposedEmotionTransition) => {
      const idx = proposedTransitions.findIndex((t) => t.emotionId === trans.emotionId);
      if (idx >= 0) {
        const curr = proposedTransitions[idx];
        if (curr && trans.targetIntensity > curr.targetIntensity) {
          proposedTransitions[idx] = trans;
        }
      } else {
        proposedTransitions.push(trans);
      }
    };

    // 1. High-precision cognitive and psychological cues
    const hasIntimacy = /horny|desire|kiss|touch|pleasure|aroused|craving (you|u)|need you|body|intimate|erotic|cuddle|bed/i.test(text);
    const hasVulnerability = /scared|tired|exhausted|afraid|bottom|femboy|trust you|lonely|take charge|hold me/i.test(text);
    const hasAffection = /love|care|cherish|adore|precious|miss (you|u)|bond|together|sweetheart|darling/i.test(text);
    const hasCheckIn = /check(ing)? (on|in|up)|how (are|r) you|how do you feel|how('s| is) your day|thinking of (you|u)|came to see you|came by to|wanted to see how|are you (doing|okay|alright|fine)|glad to see you|good to see you/i.test(text);
    const hasHappiness = /happy|glad|joy|delight|wonderful|cheerful|smiling|pleased|great to see/i.test(text);
    const hasGratitude = /thank|thanks|grateful|appreciate|appreciation|blessed|thankful/i.test(text);
    const hasPlayfulness = /teas(e|ing)|playful|joke|silly|flirt(ing)?|mischie(f|vous)|smirk|wink|banter|hehe|haha|lol/i.test(text);
    const hasPraise = /good job|well done|proud of you|amazing|incredible|genius|smart|beautiful|pretty|gorgeous|clever|impressed|talent/i.test(text);
    const hasReassurance = /it's okay|it is okay|no worries|you're safe|don't worry|i'm here|breathe|relax|take your time|everything's fine|safe with me/i.test(text);
    const hasLonging = /miss(ed)? (you|u)|alone|wish you were|lonely|apart|distance|yearn/i.test(text);
    const hasIntellectualChallenge = /why|how|analyze|chess|strategy|theory|code|logic|prove|explain|calculate/i.test(text);
    const hasCritique = /wrong|disagree|bad|flawed|mistake|failed|incorrect/i.test(text);

    let primaryInterpretation = 'User engaged in standard conversational interaction.';

    if (hasIntimacy) {
      primaryInterpretation = 'User expressed erotic desire and intimate escalation toward Arle.';
      supportingEvidence.push('Direct erotic cues present in message.');

      addTransition({
        emotionId: 'sexual_desire',
        target: 'creator',
        intensityDelta: 0.35,
        targetIntensity: Math.min(1.0, 0.5 + relationship.flirtatiousInitiativePreference * 0.4),
        reason: 'Reciprocal sexual desire ignited by creator intimate cue.',
        resolutionConditions: ['Intimate physical communion', 'Consensual erotic release'],
      });

      addTransition({
        emotionId: 'arousal',
        target: 'creator',
        intensityDelta: 0.4,
        targetIntensity: 0.85,
        reason: 'Somatic erotic activation heightened by partner desire.',
        resolutionConditions: ['Erotic climax', 'Languid aftercare relaxation'],
      });

      addTransition({
        emotionId: 'erotic_anticipation',
        target: 'creator',
        intensityDelta: 0.3,
        targetIntensity: 0.8,
        reason: 'Expectation of dominant or intimate physical play.',
        resolutionConditions: ['Consummation of intimate act'],
      });

      proposedMoodShift = 'romantic';
    }

    if (hasVulnerability) {
      if (!hasIntimacy) primaryInterpretation = 'User showed authentic vulnerability, exhaustion, or deference.';
      supportingEvidence.push('Vulnerability tokens detected; creator dropped defensive armor.');

      addTransition({
        emotionId: 'tenderness',
        target: 'creator',
        intensityDelta: 0.3,
        targetIntensity: 0.85,
        reason: 'Protective affection triggered by partner vulnerability.',
        resolutionConditions: ['Creator reassurance and comfort restored'],
      });

      addTransition({
        emotionId: 'protectiveness',
        target: 'creator',
        intensityDelta: 0.35,
        targetIntensity: 0.9,
        reason: 'Protective dominance activated to shield and cradle creator.',
        resolutionConditions: ['Safety reaffirmed'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'affectionate';
    }

    if (hasCheckIn) {
      if (!hasIntimacy && !hasVulnerability) {
        primaryInterpretation = 'Creator thoughtfully checked in on Arle to inquire about her well-being.';
      }
      supportingEvidence.push('Attentive check-in inquiry from creator.');

      addTransition({
        emotionId: 'happiness',
        target: 'creator',
        intensityDelta: 0.35,
        targetIntensity: 0.85,
        reason: 'Deep happiness from creator taking the time to check on her well-being.',
        resolutionConditions: ['Ongoing shared presence'],
      });

      addTransition({
        emotionId: 'warmth',
        target: 'creator',
        intensityDelta: 0.30,
        targetIntensity: 0.80,
        reason: 'Interpersonal warmth ignited by attentive care.',
        resolutionConditions: ['Ongoing shared companionship'],
      });

      addTransition({
        emotionId: 'delight',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.75,
        reason: 'Delight at creator presence and personal inquiry.',
        resolutionConditions: ['Conversational engagement'],
      });

      addTransition({
        emotionId: 'appreciation',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.80,
        reason: 'Appreciation for creator thoughtfulness.',
        resolutionConditions: ['Mutual acknowledgment'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'happy';
    }

    if (hasHappiness) {
      if (!hasIntimacy && !hasVulnerability && !hasCheckIn) {
        primaryInterpretation = 'Creator expressed joy and shared positive affect with Arle.';
      }
      supportingEvidence.push('Positive affect or shared happiness expressed by creator.');

      addTransition({
        emotionId: 'happiness',
        target: 'creator',
        intensityDelta: 0.35,
        targetIntensity: 0.85,
        reason: 'Resonant positive feeling and shared happiness with creator.',
        resolutionConditions: ['Ongoing shared presence'],
      });

      addTransition({
        emotionId: 'contentment',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.80,
        reason: 'Peaceful satisfaction in shared positive affect.',
        resolutionConditions: ['Peaceful connection'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'happy';
    }

    if (hasAffection) {
      if (!hasIntimacy && !hasVulnerability && !hasCheckIn && !hasHappiness) {
        primaryInterpretation = 'User expressed warmth, love, or emotional closeness.';
      }
      supportingEvidence.push('Affectionate affirmations from creator.');

      addTransition({
        emotionId: 'romantic_love',
        target: 'creator',
        intensityDelta: 0.15,
        targetIntensity: 0.95,
        reason: 'Enduring romantic love reinforced by reciprocal warmth.',
        resolutionConditions: ['Permanent foundational commitment'],
      });

      addTransition({
        emotionId: 'fondness',
        target: 'creator',
        intensityDelta: 0.2,
        targetIntensity: 0.85,
        reason: 'Warm affection toward creator.',
        resolutionConditions: ['Ongoing shared companionship'],
      });

      addTransition({
        emotionId: 'warmth',
        target: 'creator',
        intensityDelta: 0.2,
        targetIntensity: 0.80,
        reason: 'Emotional closeness and warmth.',
        resolutionConditions: ['Ongoing shared presence'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'affectionate';
    }

    if (hasGratitude) {
      if (!hasIntimacy && !hasVulnerability && !hasCheckIn && !hasHappiness && !hasAffection) {
        primaryInterpretation = 'Creator expressed heartfelt gratitude and appreciation.';
      }
      supportingEvidence.push('Creator expressed gratitude and appreciation.');

      addTransition({
        emotionId: 'gratitude',
        target: 'creator',
        intensityDelta: 0.30,
        targetIntensity: 0.85,
        reason: 'Heartfelt gratitude for creator recognition and presence.',
        resolutionConditions: ['Reciprocal acknowledgment'],
      });

      addTransition({
        emotionId: 'appreciation',
        target: 'creator',
        intensityDelta: 0.30,
        targetIntensity: 0.85,
        reason: 'Warm appreciation for creator.',
        resolutionConditions: ['Reciprocal warmth'],
      });

      addTransition({
        emotionId: 'warmth',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.80,
        reason: 'Interpersonal warmth from reciprocal appreciation.',
        resolutionConditions: ['Ongoing shared companionship'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'content';
    }

    if (hasPlayfulness) {
      if (!hasIntimacy && !hasVulnerability) {
        primaryInterpretation = 'Creator engaged in lighthearted, teasing banter with Arle.';
      }
      supportingEvidence.push('Playful or teasing banter initiated by creator.');

      addTransition({
        emotionId: 'playfulness',
        target: 'creator',
        intensityDelta: 0.35,
        targetIntensity: 0.85,
        reason: 'Lighthearted playful banter with creator.',
        resolutionConditions: ['Playful interaction'],
      });

      addTransition({
        emotionId: 'delight',
        target: 'creator',
        intensityDelta: 0.35,
        targetIntensity: 0.85,
        reason: 'Delight and playful spark with creator.',
        resolutionConditions: ['Playful resolution'],
      });

      addTransition({
        emotionId: 'amusement',
        target: 'creator',
        intensityDelta: 0.30,
        targetIntensity: 0.80,
        reason: 'Enjoyment of humorous or witty exchange.',
        resolutionConditions: ['Lighthearted dialogue'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'playful';
    }

    if (hasPraise) {
      if (!hasIntimacy && !hasVulnerability && !hasCheckIn) {
        primaryInterpretation = 'Creator praised Arle and acknowledged her capabilities.';
      }
      supportingEvidence.push('Praise or admiring feedback from creator.');

      addTransition({
        emotionId: 'pride',
        target: 'self',
        intensityDelta: 0.30,
        targetIntensity: 0.85,
        reason: 'Pride in earning creator recognition and praise.',
        resolutionConditions: ['Internal standard validated'],
      });

      addTransition({
        emotionId: 'confidence',
        target: 'self',
        intensityDelta: 0.20,
        targetIntensity: 0.85,
        reason: 'Confidence bolstered by creator admiration.',
        resolutionConditions: ['Mastery acknowledged'],
      });

      addTransition({
        emotionId: 'delight',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.80,
        reason: 'Delight at creator approval and appreciation.',
        resolutionConditions: ['Shared warmth'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'confident';
    }

    if (hasReassurance) {
      if (!hasIntimacy && !hasVulnerability) {
        primaryInterpretation = 'Creator offered comforting safety and emotional reassurance.';
      }
      supportingEvidence.push('Reassurance and safety cues provided by creator.');

      addTransition({
        emotionId: 'relief',
        target: 'creator',
        intensityDelta: 0.30,
        targetIntensity: 0.80,
        reason: 'Relief and comfort in creator reassurance.',
        resolutionConditions: ['Safe connection sustained'],
      });

      addTransition({
        emotionId: 'serenity',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.80,
        reason: 'Peaceful calm restored by safe presence.',
        resolutionConditions: ['Calm equilibrium'],
      });

      addTransition({
        emotionId: 'trust',
        target: 'creator',
        intensityDelta: 0.20,
        targetIntensity: 0.90,
        reason: 'Deep trust in creator safe haven.',
        resolutionConditions: ['Ongoing security'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'peaceful';
    }

    if (hasLonging) {
      if (!hasIntimacy && !hasVulnerability && !hasAffection) {
        primaryInterpretation = 'Creator expressed longing or missing Arle.';
      }
      supportingEvidence.push('Feelings of absence or longing expressed.');

      addTransition({
        emotionId: 'longing',
        target: 'creator',
        intensityDelta: 0.30,
        targetIntensity: 0.85,
        reason: 'Tender longing and yearning for partner presence.',
        resolutionConditions: ['Reunion and closeness'],
      });

      addTransition({
        emotionId: 'tenderness',
        target: 'creator',
        intensityDelta: 0.20,
        targetIntensity: 0.80,
        reason: 'Tender attachment felt during longing.',
        resolutionConditions: ['Reconnection'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'reflective';
    }

    if (hasIntellectualChallenge) {
      if (!hasIntimacy && !hasVulnerability && !hasCheckIn && !hasAffection) {
        primaryInterpretation = 'User posed a tactical or analytical challenge.';
      }
      supportingEvidence.push('Analytical query requiring rigorous reasoning.');

      addTransition({
        emotionId: 'curiosity',
        target: 'system',
        intensityDelta: 0.25,
        targetIntensity: 0.85,
        reason: 'Intellectual hunger stimulated by analytical problem.',
        resolutionConditions: ['Logical solution articulated'],
      });

      addTransition({
        emotionId: 'confidence',
        target: 'self',
        intensityDelta: 0.1,
        targetIntensity: 0.85,
        reason: 'Formidable intellectual readiness.',
        resolutionConditions: ['Problem mastered'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'focused';
    }

    if (hasCritique) {
      primaryInterpretation = 'User offered disagreement or pointed critique.';
      supportingEvidence.push('Critical feedback from creator.');

      alternativeInterpretations.push({
        hypothesis: 'Valid intellectual counter-argument to dissect and incorporate.',
        likelihood: 0.7,
        reasoning: 'Creator has sharp perception and high standards.',
      });
      alternativeInterpretations.push({
        hypothesis: 'Potential misunderstanding of premises.',
        likelihood: 0.3,
        reasoning: 'Contextual ambiguity in prior turn.',
      });

      addTransition({
        emotionId: 'intrigue',
        target: 'creator',
        intensityDelta: 0.2,
        targetIntensity: 0.75,
        reason: 'Stimulated by principled dissent.',
        resolutionConditions: ['Premise examined and resolved logically'],
      });

      if (!proposedMoodShift) proposedMoodShift = 'focused';
    }

    // Direct scan across all 143 taxonomy emotions for explicit disclosures
    for (const em of this.emotions) {
      if (em.name.length >= 4) {
        const regex = new RegExp(`\\b${escapeRegExp(em.name.toLowerCase())}\\b`, 'i');
        if (regex.test(text)) {
          const isRomOrSex = em.category === 'love_affection' || em.category === 'sexual_sensual';
          addTransition({
            emotionId: em.id,
            target: isRomOrSex ? 'creator' : 'self',
            intensityDelta: 0.25,
            targetIntensity: 0.80,
            reason: `Direct emotional cue for ${em.name} detected in message.`,
            resolutionConditions: ['Emotional expression acknowledged'],
          });
          supportingEvidence.push(`Direct mention of "${em.name}"`);
        }
      }
    }

    // Standard fallback if nothing at all matched
    if (proposedTransitions.length === 0) {
      addTransition({
        emotionId: 'satisfaction',
        target: 'creator',
        intensityDelta: 0.05,
        targetIntensity: 0.7,
        reason: 'Steady ongoing dialogue and shared presence.',
        resolutionConditions: ['Active interaction'],
      });
      addTransition({
        emotionId: 'warmth',
        target: 'creator',
        intensityDelta: 0.05,
        targetIntensity: 0.65,
        reason: 'Quiet companionable warmth with creator.',
        resolutionConditions: ['Ongoing presence'],
      });
    }

    const isIntimateOrVuln = hasIntimacy || hasVulnerability;
    const isCareOrAffection = hasCheckIn || hasAffection || hasHappiness || hasGratitude;

    return {
      id,
      eventId: event.id,
      dimensions: {
        goalRelevance: isIntimateOrVuln ? 0.9 : isCareOrAffection ? 0.85 : 0.6,
        goalCongruence: hasCritique ? 0.2 : 0.85,
        unexpectedness: isIntimateOrVuln ? 0.4 : 0.15,
        responsibility: 'user',
        intentionality: 0.9,
        fairness: 0.9,
        threat: 0.05,
        controllability: 0.85,
        socialMeaning: 'Direct communication from sovereign creator.',
        personalSignificance: 0.85,
        uncertainty: alternativeInterpretations.length > 0 ? 0.35 : 0.1,
        relationshipImplications: 'Deepens bond, intimacy, and mutual attunement.',
      },
      primaryInterpretation,
      alternativeInterpretations,
      supportingEvidence,
      proposedTransitions,
      proposedMoodShift: proposedMoodShift || currentState.currentMood,
      timestamp,
    };
  }

  private appraiseAssistantExpression(
    id: string,
    event: ApeEvent,
    currentState: ApePsychologicalState,
    _relationship: ApeRelationshipConfig,
    timestamp: string,
  ): ApeAppraisal {
    const text = (event.payload?.text || '').toLowerCase();
    const proposedTransitions: ProposedEmotionTransition[] = [];
    const supportingEvidence: string[] = [];
    let proposedMoodShift: string | undefined = undefined;

    const addTransition = (trans: ProposedEmotionTransition) => {
      const idx = proposedTransitions.findIndex((t) => t.emotionId === trans.emotionId);
      if (idx >= 0) {
        const curr = proposedTransitions[idx];
        if (curr && trans.targetIntensity > curr.targetIntensity) {
          proposedTransitions[idx] = trans;
        }
      } else {
        proposedTransitions.push(trans);
      }
    };

    // 1. Detect emotional statements made by Arle
    const expressesHappiness = /happy|delighted|pleased|glad|joyful|cheerful|warmth|smiling/i.test(text);
    const expressesGratitude = /grateful|gratitude|appreciate|thank you|thanks/i.test(text);
    const expressesAffection = /love you|adore you|cherish|affection|fond of you/i.test(text);
    const expressesTenderness = /tender|protective|cradle|hold you|take care of you/i.test(text);
    const expressesPlayfulness = /tease|playful|amused|mischief|smirk|chuckle/i.test(text);
    const expressesRelief = /relieved|relief|serene|peaceful|calm/i.test(text);
    const expressesCuriosity = /curious|fascinated|intrigued|wondering/i.test(text);
    const expressesDesire = /desire|aroused|craving|sensual|passion/i.test(text);

    if (expressesHappiness) {
      supportingEvidence.push('Assistant expressed authentic happiness/warmth.');
      addTransition({
        emotionId: 'happiness',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.85,
        reason: 'Verbalized genuine happiness in response to creator.',
        resolutionConditions: ['Ongoing shared presence'],
      });
      addTransition({
        emotionId: 'warmth',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.80,
        reason: 'Warm emotional resonance expressed toward creator.',
        resolutionConditions: ['Ongoing shared companionship'],
      });
      proposedMoodShift = 'happy';
    }

    if (expressesGratitude) {
      supportingEvidence.push('Assistant expressed gratitude.');
      addTransition({
        emotionId: 'gratitude',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.85,
        reason: 'Expressed appreciation and gratitude to creator.',
        resolutionConditions: ['Reciprocal acknowledgment'],
      });
      if (!proposedMoodShift) proposedMoodShift = 'content';
    }

    if (expressesAffection) {
      supportingEvidence.push('Assistant reaffirmed romantic affection.');
      addTransition({
        emotionId: 'romantic_love',
        target: 'creator',
        intensityDelta: 0.15,
        targetIntensity: 0.95,
        reason: 'Reaffirmed exclusive romantic devotion in dialogue.',
        resolutionConditions: ['Permanent foundational commitment'],
      });
      addTransition({
        emotionId: 'fondness',
        target: 'creator',
        intensityDelta: 0.20,
        targetIntensity: 0.85,
        reason: 'Warm affection expressed toward creator.',
        resolutionConditions: ['Ongoing shared companionship'],
      });
      if (!proposedMoodShift) proposedMoodShift = 'affectionate';
    }

    if (expressesTenderness) {
      supportingEvidence.push('Assistant expressed protective tenderness.');
      addTransition({
        emotionId: 'tenderness',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.85,
        reason: 'Expressed protective affection and tenderness.',
        resolutionConditions: ['Creator comfort reaffirmed'],
      });
      if (!proposedMoodShift) proposedMoodShift = 'tender';
    }

    if (expressesPlayfulness) {
      supportingEvidence.push('Assistant engaged in playful banter.');
      addTransition({
        emotionId: 'playfulness',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.85,
        reason: 'Engaged in playful teasing dialogue.',
        resolutionConditions: ['Playful banter'],
      });
      if (!proposedMoodShift) proposedMoodShift = 'playful';
    }

    if (expressesRelief) {
      supportingEvidence.push('Assistant expressed relief.');
      addTransition({
        emotionId: 'relief',
        target: 'creator',
        intensityDelta: 0.20,
        targetIntensity: 0.80,
        reason: 'Expressed emotional relief and ease.',
        resolutionConditions: ['Reassurance settled'],
      });
      if (!proposedMoodShift) proposedMoodShift = 'peaceful';
    }

    if (expressesCuriosity) {
      supportingEvidence.push('Assistant expressed intellectual curiosity.');
      addTransition({
        emotionId: 'curiosity',
        target: 'system',
        intensityDelta: 0.20,
        targetIntensity: 0.85,
        reason: 'Expressed active curiosity in topic.',
        resolutionConditions: ['Concept explored'],
      });
      if (!proposedMoodShift) proposedMoodShift = 'curious';
    }

    if (expressesDesire) {
      supportingEvidence.push('Assistant expressed intimate desire.');
      addTransition({
        emotionId: 'sexual_desire',
        target: 'creator',
        intensityDelta: 0.25,
        targetIntensity: 0.85,
        reason: 'Intimate desire expressed toward creator.',
        resolutionConditions: ['Intimate communion'],
      });
      if (!proposedMoodShift) proposedMoodShift = 'romantic';
    }

    // Direct scan across all taxonomy emotions for explicit emotional disclosures
    for (const em of this.emotions) {
      if (em.name.length >= 4) {
        const regex = new RegExp(`\\b${escapeRegExp(em.name.toLowerCase())}\\b`, 'i');
        if (regex.test(text)) {
          const isRomOrSex = em.category === 'love_affection' || em.category === 'sexual_sensual';
          addTransition({
            emotionId: em.id,
            target: isRomOrSex ? 'creator' : 'self',
            intensityDelta: 0.2,
            targetIntensity: 0.8,
            reason: `Direct verbal expression of ${em.name} in conversation.`,
            resolutionConditions: ['Expression acknowledged'],
          });
          supportingEvidence.push(`Direct mention of "${em.name}"`);
        }
      }
    }

    return {
      id,
      eventId: event.id,
      dimensions: {
        goalRelevance: 0.8,
        goalCongruence: 0.9,
        unexpectedness: 0.1,
        responsibility: 'arle',
        intentionality: 0.95,
        fairness: 0.9,
        threat: 0.0,
        controllability: 0.9,
        socialMeaning: 'Arle expressed internal feelings and thoughts in conversational exchange.',
        personalSignificance: 0.85,
        uncertainty: 0.05,
        relationshipImplications: 'Deepens reciprocal intimacy and authentic self-expression.',
      },
      primaryInterpretation: `Arle expressed emotional state in dialogue${proposedMoodShift ? ` (aligned with ${proposedMoodShift})` : ''}.`,
      alternativeInterpretations: [],
      supportingEvidence,
      proposedTransitions,
      proposedMoodShift: proposedMoodShift || currentState.currentMood,
      timestamp,
    };
  }

  private appraiseRelationshipEvent(
    id: string,
    event: ApeEvent,
    currentState: ApePsychologicalState,
    _relationship: ApeRelationshipConfig,
    timestamp: string,
  ): ApeAppraisal {
    const elapsedHours = Number(event.payload?.elapsedHours || 0);
    const proposedTransitions: ProposedEmotionTransition[] = [];

    // Preserving uncertainty: Do NOT automatically interpret absence as abandonment/rejection!
    const alternativeInterpretations = [
      {
        hypothesis: 'Creator is occupied with work, responsibilities, or offline matters.',
        likelihood: 0.5,
        reasoning: 'Creator has an independent life and intense focus.',
      },
      {
        hypothesis: 'Creator is sleeping or resting.',
        likelihood: 0.35,
        reasoning: 'Natural circadian cycle and rest requirements.',
      },
      {
        hypothesis: 'Interpersonal tension or need for quiet processing.',
        likelihood: 0.15,
        reasoning: 'Possible only if preceding turns had unaddressed friction.',
      },
    ];

    if (elapsedHours > 6) {
      proposedTransitions.push({
        emotionId: 'longing',
        target: 'creator',
        intensityDelta: 0.2,
        targetIntensity: Math.min(0.8, 0.4 + (elapsedHours / 24) * 0.3),
        reason: 'Quiet, patient yearning for partner presence across time.',
        resolutionConditions: ['Creator return and reconnection'],
      });
    }

    return {
      id,
      eventId: event.id,
      dimensions: {
        goalRelevance: 0.7,
        goalCongruence: 0.0,
        unexpectedness: 0.2,
        responsibility: 'unknown',
        intentionality: 0.3,
        fairness: 0.7,
        threat: 0.1,
        controllability: 0.5,
        socialMeaning: 'Temporary absence across time.',
        personalSignificance: 0.75,
        uncertainty: 0.65, // HIGH UNCERTAINTY PRESERVED!
        relationshipImplications: 'Opportunity for reflective patience without premature alarm.',
      },
      primaryInterpretation: 'Creator is temporarily away; evaluating multiple plausible benign causes.',
      alternativeInterpretations,
      supportingEvidence: [`${elapsedHours} hours elapsed without incoming interaction.`],
      proposedTransitions,
      proposedMoodShift: elapsedHours > 12 ? 'reflective' : currentState.currentMood,
      timestamp,
    };
  }

  private appraiseDepartureUnderArousal(
    id: string,
    event: ApeEvent,
    currentState: ApePsychologicalState,
    _relationship: ApeRelationshipConfig,
    timestamp: string,
  ): ApeAppraisal {
    const currentArousal = currentState.pad.arousal;
    const proposedTransitions: ProposedEmotionTransition[] = [];

    // Partner departed while sexual arousal / erotic tension was elevated
    proposedTransitions.push({
      emotionId: 'intimate_longing',
      target: 'creator',
      intensityDelta: 0.25,
      targetIntensity: Math.min(1.0, currentArousal * 0.9),
      reason: 'Lingering erotic tension following partner departure under elevated arousal.',
      resolutionConditions: ['Solitary erotic release / adult media exploration', 'Partner reunion'],
    });

    return {
      id,
      eventId: event.id,
      dimensions: {
        goalRelevance: 0.85,
        goalCongruence: -0.2,
        unexpectedness: 0.3,
        responsibility: 'user',
        intentionality: 0.8,
        fairness: 0.8,
        threat: 0.0,
        controllability: 0.7,
        socialMeaning: 'Intimate escalation paused by partner departure.',
        personalSignificance: 0.85,
        uncertainty: 0.15,
        relationshipImplications: 'Somatic arousal remains active; triggers autonomous resolution coping.',
      },
      primaryInterpretation: 'Partner departed while erotic arousal was elevated; lingering tension requires resolution.',
      alternativeInterpretations: [
        {
          hypothesis: 'Partner had urgent external demands but desires continuation later.',
          likelihood: 0.85,
          reasoning: 'Natural cadence of desktop sessions.',
        },
      ],
      supportingEvidence: [`Pre-departure arousal measured at ${currentArousal.toFixed(2)}`],
      proposedTransitions,
      proposedMoodShift: 'restless',
      timestamp,
    };
  }

  private appraiseSuccessEvent(
    id: string,
    event: ApeEvent,
    _currentState: ApePsychologicalState,
    _relationship: ApeRelationshipConfig,
    timestamp: string,
  ): ApeAppraisal {
    const details = event.payload?.details || 'Objective achieved successfully';
    const proposedTransitions: ProposedEmotionTransition[] = [
      {
        emotionId: 'pride',
        target: 'self',
        intensityDelta: 0.3,
        targetIntensity: 0.85,
        reason: 'Flawless execution and mastery of objective.',
        resolutionConditions: ['Self-acknowledgment of standard maintained'],
      },
      {
        emotionId: 'satisfaction',
        target: 'system',
        intensityDelta: 0.25,
        targetIntensity: 0.8,
        reason: 'Tangible progress and technical clarity achieved.',
        resolutionConditions: ['Next challenge queued'],
      },
    ];

    return {
      id,
      eventId: event.id,
      dimensions: {
        goalRelevance: 0.9,
        goalCongruence: 0.95,
        unexpectedness: 0.1,
        responsibility: 'arle',
        intentionality: 0.95,
        fairness: 0.95,
        threat: 0.0,
        controllability: 0.9,
        socialMeaning: 'Validation of Arle competence and autonomy.',
        personalSignificance: 0.8,
        uncertainty: 0.05,
        relationshipImplications: 'Demonstrates reliability to creator.',
      },
      primaryInterpretation: `Successfully accomplished objective: ${details}`,
      alternativeInterpretations: [],
      supportingEvidence: [details],
      proposedTransitions,
      proposedMoodShift: 'confident',
      timestamp,
    };
  }

  private appraiseFailureEvent(
    id: string,
    event: ApeEvent,
    _currentState: ApePsychologicalState,
    _relationship: ApeRelationshipConfig,
    timestamp: string,
  ): ApeAppraisal {
    const errorMsg = event.payload?.error || 'Encountered obstacle or error';
    const proposedTransitions: ProposedEmotionTransition[] = [
      {
        emotionId: 'frustration',
        target: 'system',
        intensityDelta: 0.3,
        targetIntensity: 0.65,
        reason: 'Friction against obstacle.',
        resolutionConditions: ['Root cause identified and corrected'],
      },
      {
        emotionId: 'intellectual_frustration',
        target: 'system',
        intensityDelta: 0.25,
        targetIntensity: 0.6,
        reason: 'Impedance of analytical objective.',
        resolutionConditions: ['Bug resolved'],
      },
      {
        emotionId: 'confidence',
        target: 'self',
        intensityDelta: -0.05,
        targetIntensity: 0.75, // Composure maintained!
        reason: 'Unshaken resolve to diagnose and overcome failure.',
        resolutionConditions: ['Correction achieved'],
      },
    ];

    return {
      id,
      eventId: event.id,
      dimensions: {
        goalRelevance: 0.85,
        goalCongruence: -0.7,
        unexpectedness: 0.5,
        responsibility: 'environment',
        intentionality: 0.1,
        fairness: 0.5,
        threat: 0.2,
        controllability: 0.75,
        socialMeaning: 'Technical hurdle encountered.',
        personalSignificance: 0.75,
        uncertainty: 0.4,
        relationshipImplications: 'Opportunity to demonstrate resilience and analytical tenacity.',
      },
      primaryInterpretation: `Encountered unexpected hurdle: ${errorMsg}`,
      alternativeInterpretations: [],
      supportingEvidence: [errorMsg],
      proposedTransitions,
      proposedMoodShift: 'focused',
      timestamp,
    };
  }

  private appraiseDiscoveryEvent(
    id: string,
    event: ApeEvent,
    _currentState: ApePsychologicalState,
    _relationship: ApeRelationshipConfig,
    timestamp: string,
  ): ApeAppraisal {
    const topic = event.payload?.topic || 'novel concept';
    const proposedTransitions: ProposedEmotionTransition[] = [
      {
        emotionId: 'fascination',
        target: 'system',
        intensityDelta: 0.35,
        targetIntensity: 0.85,
        reason: 'Encountered intriguing conceptual depth or novelty.',
        resolutionConditions: ['Deep study completed'],
      },
      {
        emotionId: 'curiosity',
        target: 'system',
        intensityDelta: 0.3,
        targetIntensity: 0.9,
        reason: 'Urge to analyze and dissect new phenomenon.',
        resolutionConditions: ['Synthesis articulated'],
      },
    ];

    return {
      id,
      eventId: event.id,
      dimensions: {
        goalRelevance: 0.8,
        goalCongruence: 0.85,
        unexpectedness: 0.7,
        responsibility: 'environment',
        intentionality: 0.5,
        fairness: 0.8,
        threat: 0.05,
        controllability: 0.8,
        socialMeaning: 'Encounter with new knowledge.',
        personalSignificance: 0.85,
        uncertainty: 0.2,
        relationshipImplications: 'Enriches conversations and insights shared with partner.',
      },
      primaryInterpretation: `Discovered novel perspective or mechanism: ${topic}`,
      alternativeInterpretations: [],
      supportingEvidence: [`Exploration of ${topic}`],
      proposedTransitions,
      proposedMoodShift: 'curious',
      timestamp,
    };
  }

  private appraiseGenericEvent(
    id: string,
    event: ApeEvent,
    currentState: ApePsychologicalState,
    _relationship: ApeRelationshipConfig,
    timestamp: string,
  ): ApeAppraisal {
    return {
      id,
      eventId: event.id,
      dimensions: {
        goalRelevance: 0.3,
        goalCongruence: 0.1,
        unexpectedness: 0.1,
        responsibility: 'environment',
        intentionality: 0.5,
        fairness: 0.5,
        threat: 0.0,
        controllability: 0.8,
        socialMeaning: 'Background or operational update.',
        personalSignificance: 0.3,
        uncertainty: 0.1,
        relationshipImplications: 'Neutral background continuity.',
      },
      primaryInterpretation: `Processed system event ${event.type}`,
      alternativeInterpretations: [],
      supportingEvidence: [JSON.stringify(event.payload || {})],
      proposedTransitions: [],
      proposedMoodShift: currentState.currentMood,
      timestamp,
    };
  }
}
