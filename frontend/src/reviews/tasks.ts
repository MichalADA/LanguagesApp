import type { ReviewItem } from "./api";
import type { VocabularyEntry } from "@/vocabulary/types";
import type { VerbEntry, PersonId } from "@/grammar/types";
import type { Sentence } from "@/sentences/types";
import type { CurriculumReviewItem } from "@/curriculum/types";
export interface ReviewTask {
  item: ReviewItem;
  prompt: string;
  expected: string[];
  gameType: string;
  direction: "SOURCE_TO_TARGET" | "TARGET_TO_SOURCE";
  options?: string[];
  /** Nagranie chorwackiej formy (słowo / zwrot), gdy jest. */
  audioSrc?: string;
}

/** Słowo do powtórki: wpis słownika kursu albo zwrot z lekcji (PHRASE). */
interface Card {
  id: string;
  targetText: string;
  sourceText: string;
  acceptedAnswers?: string[];
  audioUrl?: string;
}

/**
 * Polskie znaczenie „mieszkać / żyć”, „wolno (nie szybko)” → każda część jest poprawną
 * odpowiedzią (plus całość). Nawias to doprecyzowanie, nie część odpowiedzi.
 */
export function sourceAlternatives(text: string): string[] {
  const bare = text.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const parts = bare.split(/\s*[/,;]\s*/).map((part) => part.trim()).filter(Boolean);
  return [...new Set([text, bare, ...parts])];
}
export function createReviewTasks(
  items: ReviewItem[],
  words: VocabularyEntry[],
  verbs: VerbEntry[],
  sentences: Sentence[],
  /** Zwroty z lekcji spoza słownika (karty PHRASE), zob. curriculum/reviewItems.ts. */
  phrases: Record<string, CurriculumReviewItem> = {},
): ReviewTask[] {
  const wordMap = new Map<string, Card>(words.map((w) => [w.id, w]));
  for (const [id, phrase] of Object.entries(phrases))
    wordMap.set(id, { id, targetText: phrase.target, sourceText: phrase.source, acceptedAnswers: phrase.accepted, audioUrl: phrase.audioSrc });
  const verbMap = new Map(verbs.map((v) => [v.id, v]));
  const sentenceMap = new Map(
    sentences.map((s) => [`${items[0]?.course.slug}:sentence:${s.id}`, s]),
  );
  return items.flatMap((item, index): ReviewTask[] => {
    if (item.itemType === "WORD" || item.itemType === "PHRASE") {
      const w = wordMap.get(item.itemId);
      if (!w) return [];
      const reverse = index % 3 === 1;
      const task: ReviewTask = {
        item,
        prompt: reverse ? w.targetText : w.sourceText,
        expected: reverse
          ? sourceAlternatives(w.sourceText)
          : [w.targetText, ...(w.acceptedAnswers ?? [])],
        direction: reverse ? "TARGET_TO_SOURCE" : "SOURCE_TO_TARGET",
        gameType: "review-translation",
        ...(w.audioUrl ? { audioSrc: w.audioUrl } : {}),
      };
      if (index % 3 === 2) {
        const options = [
          w.targetText,
          ...words
            .filter(
              (other) =>
                other.id !== w.id && !task.expected.includes(other.targetText),
            )
            .map((other) => other.targetText),
        ];
        const unique = [...new Set(options)].slice(0, 4);
        if (unique.length === 4) {
          task.gameType = "review-choice";
          task.options = [
            ...unique.slice(index % 4),
            ...unique.slice(0, index % 4),
          ];
        }
      }
      return [task];
    }
    if (item.itemType === "SENTENCE") {
      const s = sentenceMap.get(item.itemId);
      if (!s) return [];
      const gap = index % 2 === 0 && s.gapText && s.gapAnswer;
      return [
        {
          item,
          prompt: gap ? s.gapText : s.polish,
          expected: gap ? [s.gapAnswer] : [s.croatian, ...s.acceptedAnswers],
          gameType: gap ? "review-gap" : "review-sentence-translation",
          direction: "SOURCE_TO_TARGET",
        },
      ];
    }
    if (item.itemType === "VERB") {
      const parts = item.itemId.split(":");
      const person = parts.pop() as PersonId;
      const verb = verbMap.get(parts.join(":"));
      if (!verb?.forms[person]) return [];
      return [
        {
          item,
          prompt: `${verb.infinitive} · ${person}`,
          expected: verb.forms[person].split(/[|/]/).map((s) => s.trim()),
          gameType: "review-conjugation",
          direction: "SOURCE_TO_TARGET",
        },
      ];
    }
    return [];
  });
}
/** Wielkość liter, interpunkcja i nadmiarowe spacje nie zmieniają odpowiedzi (Kako ste = Kako ste?). */
const normalizeReview = (value: string) =>
  value
    .normalize("NFC")
    .toLocaleLowerCase("hr")
    .replace(/[.,!?;:„”"«»…]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const FOLD: Record<string, string> = { č: "c", ć: "c", š: "s", ž: "z", đ: "d" };
const foldCroatian = (value: string) => value.replace(/[čćšžđ]/g, (c) => FOLD[c]);

/**
 * hit — poprawnie; near — po chorwacku poprawnie poza znakami diakrytycznymi
 * (dobry kierunek, ale FSRS dostaje ocenę „trudne”); miss — błąd.
 */
export function reviewVerdict(task: ReviewTask, answer: string): "hit" | "near" | "miss" {
  const given = normalizeReview(answer);
  if (!given) return "miss";
  if (task.expected.some((expected) => normalizeReview(expected) === given)) return "hit";
  if (task.direction === "SOURCE_TO_TARGET" && !task.options && task.expected.some((expected) => foldCroatian(normalizeReview(expected)) === foldCroatian(given)))
    return "near";
  return "miss";
}

/** Poprawna pisownia wariantu, do którego pasuje odpowiedź (dla „near”). */
export function matchedExpected(task: ReviewTask, answer: string): string {
  const given = foldCroatian(normalizeReview(answer));
  return task.expected.find((expected) => foldCroatian(normalizeReview(expected)) === given) ?? task.expected[0];
}

export const isReviewCorrect = (task: ReviewTask, answer: string) => reviewVerdict(task, answer) === "hit";
/** Only reinsert when three other tasks can intervene. Otherwise keep the server due. */
export function repeatAfterError(
  queue: ReviewTask[],
  index: number,
): ReviewTask[] {
  if (queue.length - index - 1 < 3) return queue;
  const copy = [...queue];
  copy.splice(index + 4, 0, queue[index]);
  return copy;
}
