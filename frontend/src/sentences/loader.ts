import { splitRow } from "@/vocabulary/adapter";
import { LEARNING_LEVELS } from "@/config/learningLevels";
import { SENTENCE_MODES, type Sentence, type SentenceMode } from "./types";

export const SENTENCE_COLUMNS = ["id", "polish", "croatian", "acceptedAnswers", "level", "topic", "grammarTopic", "gameTypes", "gapText", "gapAnswer", "incorrectSentence", "correctionExplanation", "transformType", "transformInstruction", "transformAnswer", "sourceType", "sourceName", "sourceUrl", "license"] as const;
export function parseSentences(text: string): Sentence[] {
  const [header, ...lines] = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim()).map(splitRow);
  if (!header || SENTENCE_COLUMNS.some(key => !header.includes(key)) || new Set(header).size !== header.length) throw new Error("Invalid sentence CSV header");
  const ids = new Set<string>();
  return lines.map(values => {
    if (values.length !== header.length) throw new Error("Invalid sentence CSV row");
    const row = Object.fromEntries(header.map((key, i) => [key, values[i].trim()]));
    if (!row.id || ids.has(row.id) || !row.polish || !row.croatian || !row.topic || !row.grammarTopic || !row.sourceType || !row.sourceName || !row.license || !LEARNING_LEVELS.some(level => level.id === row.level)) throw new Error(`Invalid sentence: ${row.id}`);
    ids.add(row.id);
    const gameTypes = row.gameTypes.split("|") as SentenceMode[];
    if (!gameTypes.length || gameTypes.some(mode => !SENTENCE_MODES.includes(mode))) throw new Error(`Invalid modes: ${row.id}`);
    if (gameTypes.includes("gap") && (!row.gapAnswer || row.gapText.split("___").length !== 2 || row.gapText.replace("___", row.gapAnswer) !== row.croatian)) throw new Error(`Invalid gap: ${row.id}`);
    if (gameTypes.includes("correction") && (!row.incorrectSentence || row.incorrectSentence === row.croatian || !row.correctionExplanation)) throw new Error(`Invalid correction: ${row.id}`);
    if (gameTypes.includes("transform") && (!row.transformType || !row.transformInstruction || !row.transformAnswer || row.transformAnswer === row.croatian)) throw new Error(`Invalid transformation: ${row.id}`);
    return { ...row, acceptedAnswers: row.acceptedAnswers.split("|").map(answer => answer.trim()).filter(Boolean), gameTypes } as unknown as Sentence;
  });
}

let cached: Promise<Sentence[]> | undefined;
/** Shared request/cache for all five games; a failed request can be retried. */
export function loadSentences(): Promise<Sentence[]> {
  if (!cached) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    cached = fetch(`${import.meta.env.BASE_URL}data/hr_sentences.csv`, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error(`Sentence dataset HTTP ${response.status}`);
      return response.text();
    }).then(parseSentences).catch(error => { cached = undefined; throw error; }).finally(() => clearTimeout(timer));
  }
  return cached;
}
