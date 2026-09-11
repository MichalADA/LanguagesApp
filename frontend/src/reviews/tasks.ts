import type { ReviewItem } from "./api";
import type { VocabularyEntry } from "@/vocabulary/types";
import type { VerbEntry, PersonId } from "@/grammar/types";
import type { Sentence } from "@/sentences/types";
import { normalizeAnswer } from "@/sentences/validation";
export interface ReviewTask {
  item: ReviewItem;
  prompt: string;
  expected: string[];
  gameType: string;
  direction: "SOURCE_TO_TARGET" | "TARGET_TO_SOURCE";
  options?: string[];
}
export function createReviewTasks(
  items: ReviewItem[],
  words: VocabularyEntry[],
  verbs: VerbEntry[],
  sentences: Sentence[],
): ReviewTask[] {
  const wordMap = new Map(words.map((w) => [w.id, w]));
  const verbMap = new Map(verbs.map((v) => [v.id, v]));
  const sentenceMap = new Map(
    sentences.map((s) => [`${items[0]?.course.slug}:sentence:${s.id}`, s]),
  );
  return items.flatMap((item, index): ReviewTask[] => {
    if (item.itemType === "WORD") {
      const w = wordMap.get(item.itemId);
      if (!w) return [];
      const reverse = index % 3 === 1;
      const task: ReviewTask = {
        item,
        prompt: reverse ? w.targetText : w.sourceText,
        expected: reverse
          ? [w.sourceText]
          : [w.targetText, ...(w.acceptedAnswers ?? [])],
        direction: reverse ? "TARGET_TO_SOURCE" : "SOURCE_TO_TARGET",
        gameType: "review-translation",
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
export const isReviewCorrect = (task: ReviewTask, answer: string) =>
  Boolean(answer.trim()) &&
  task.expected.some(
    (expected) => normalizeAnswer(expected) === normalizeAnswer(answer),
  );
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
