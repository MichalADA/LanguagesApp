import type { Sentence, SentenceMode } from "./types";

export function normalizeAnswer(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").replace(/\.$/, "").trim().toLocaleLowerCase("hr");
}
export function expectedAnswers(sentence: Sentence, mode: SentenceMode): string[] {
  if (mode === "gap") return [sentence.gapAnswer];
  if (mode === "transform") return [sentence.transformAnswer];
  return [sentence.croatian, ...sentence.acceptedAnswers];
}
export function checkSentenceAnswer(sentence: Sentence, mode: SentenceMode, answer: string): boolean {
  return !!answer.trim() && expectedAnswers(sentence, mode).some(expected => normalizeAnswer(expected) === normalizeAnswer(answer));
}
