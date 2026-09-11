import type { LearningLevelId } from "@/config/learningLevels";
import type { Sentence, SentenceMode } from "./types";
import { shuffle } from "./helpers";

export const SENTENCE_SESSION_SIZE = 10;
export function sentencePool(rows: readonly Sentence[], level: LearningLevelId, mode: SentenceMode): Sentence[] {
  return rows.filter(row => row.level === level && row.gameTypes.includes(mode));
}
export function createSentenceQueue(rows: readonly Sentence[], level: LearningLevelId, mode: SentenceMode): Sentence[] {
  const pool = [...new Map(sentencePool(rows, level, mode).map(row => [row.id, row])).values()];
  return pool.length < SENTENCE_SESSION_SIZE ? [] : shuffle(pool).slice(0, SENTENCE_SESSION_SIZE);
}
