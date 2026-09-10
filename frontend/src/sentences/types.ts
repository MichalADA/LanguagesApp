import type { LearningLevelId } from "@/config/learningLevels";

export const SENTENCE_MODES = ["translation", "builder", "gap", "correction", "transform"] as const;
export type SentenceMode = (typeof SENTENCE_MODES)[number];
export interface Sentence {
  id: string;
  polish: string;
  croatian: string;
  acceptedAnswers: string[];
  level: LearningLevelId;
  topic: string;
  grammarTopic: string;
  gameTypes: SentenceMode[];
  gapText: string;
  gapAnswer: string;
  incorrectSentence: string;
  /** i18n key, keeping explanations available in both interface languages. */
  correctionExplanation: string;
  transformType: string;
  transformInstruction: string;
  transformAnswer: string;
  sourceType: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
}
export interface SentenceAnswer { sentenceId: string; answer: string; correct: boolean }
