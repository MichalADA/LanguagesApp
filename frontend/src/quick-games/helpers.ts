import type { VocabularyEntry as Word } from "../vocabulary/types";

export const QUICK_GAME_IDS = ["pairs", "swipe", "true-false", "match-columns", "odd-one-out", "scrambled-word", "multiple-choice"] as const;
export type QuickGameId = (typeof QUICK_GAME_IDS)[number];
export interface Question { word: Word; options?: Word[]; correct?: boolean; translation?: string; topic?: string }

export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const key = (text: string) => text.normalize("NFC").trim().toLocaleLowerCase();

/** Avoid ambiguous visible matches, while always using record IDs for identity. */
export function uniqueWords(words: readonly Word[]): Word[] {
  const source = new Set<string>(), target = new Set<string>(), ids = new Set<string>();
  return words.filter((word) => {
    const s = key(word.sourceText), t = key(word.targetText);
    if (!s || !t || source.has(s) || target.has(t) || ids.has(word.id)) return false;
    source.add(s); target.add(t); ids.add(word.id);
    return true;
  });
}

// Only semantic topic tags, not POS, technical blocks or broad metadata.
export const SEMANTIC_TOPICS = new Set(["food", "home", "work", "people", "travel", "transportation", "media", "nature", "animals", "body", "health", "clothes", "weather", "sport", "school", "family", "technology", "shopping"]);
export const topicsOf = (word: Word) => word.tags.filter((tag) => SEMANTIC_TOPICS.has(tag));

function distractors(word: Word, words: Word[]): Word[] {
  const similarity = (other: Word) => Number(other.partOfSpeech === word.partOfSpeech) + 2 * Number(topicsOf(word).some((topic) => other.tags.includes(topic)));
  return shuffle(words.filter((other) => other.id !== word.id && key(other.sourceText) !== key(word.sourceText) && key(other.targetText) !== key(word.targetText)))
    .sort((a, b) => similarity(b) - similarity(a));
}

export function buildQuestions(mode: QuickGameId, pool: readonly Word[]): Question[] {
  const words = uniqueWords(shuffle(pool));
  if (mode === "pairs" || mode === "match-columns") return words.slice(0, 6).map((word) => ({ word }));
  if (mode === "odd-one-out") {
    const questions: Question[] = [];
    for (const topic of shuffle([...SEMANTIC_TOPICS])) {
      const group = words.filter((word) => topicsOf(word).length === 1 && topicsOf(word)[0] === topic);
      const outsiders = words.filter((word) => topicsOf(word).length === 1 && !word.tags.includes(topic));
      if (group.length < 3 || !outsiders.length) continue;
      for (let i = 0; i < Math.min(3, outsiders.length); i++) {
        const word = outsiders[i];
        questions.push({ word, topic, options: shuffle([...shuffle(group).slice(0, 3), word]) });
      }
    }
    return shuffle(questions).slice(0, 10);
  }
  if (mode === "scrambled-word") return words.filter((word) => /^[\p{L}]{2,18}$/u.test(word.targetText) && new Set(Array.from(word.targetText)).size > 1).slice(0, 20).map((word) => ({ word }));
  if (mode === "swipe") return words.slice(0, 20).map((word) => ({ word }));
  if (words.length < (mode === "multiple-choice" ? 4 : 2)) return [];
  const truth = shuffle(Array.from({ length: Math.min(20, words.length) }, (_, i) => i % 2 === 0));
  return words.slice(0, 20).map((word, index) => {
    const others = distractors(word, words);
    if (mode === "multiple-choice") return { word, options: shuffle([word, ...others.slice(0, 3)]) };
    return { word, correct: truth[index], translation: truth[index] ? word.sourceText : others[0].sourceText };
  });
}

export function scrambledLetters(text: string) {
  const letters = Array.from(text.normalize("NFC")).map((letter, id) => ({ id, letter }));
  const mixed = shuffle(letters);
  if (mixed.map((item) => item.letter).join("") === text) mixed.push(mixed.shift()!);
  return mixed;
}
