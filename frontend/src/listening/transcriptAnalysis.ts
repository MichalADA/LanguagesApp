/**
 * transcriptAnalysisService — normalizuje transkrypcję, tokenizuje ją i porównuje
 * z istniejącą bazą słownictwa Lexodromii. Bez AI, bez nowej bazy słów.
 *
 * Ten sam pipeline będzie wołany, gdy w przyszłości Whisper wygeneruje transcript
 * z audio: wejście to zawsze `string transcript`.
 */
import type { VocabularyEntry } from "@/vocabulary/types";

const DIACRITICS = "čćđšžČĆĐŠŽ";
const WORD_RE = new RegExp(`[a-z0-9${DIACRITICS.toLowerCase()}]+`, "g");
const SPEAKER_LINE = /^\s*[A-ZÀ-ŽČĆĐŠŽ][\w\s.'-]{0,40}:\s*/;

export interface TranscriptAnalysis {
  totalWords: number;
  uniqueWords: number;
  knownWords: number;
  missingWords: number;
  coveragePercent: number;
  known: string[];
  missing: string[];
}

export function normalizeTranscript(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(SPEAKER_LINE, ""))
    .join(" ")
    .toLowerCase()
    .normalize("NFC");
}

export function tokenizeTranscript(raw: string): string[] {
  const cleaned = normalizeTranscript(raw);
  const matches = cleaned.match(WORD_RE);
  return matches ? matches.filter((token) => token.length > 0) : [];
}

/** Turns vocabulary entries into a set of normalized target-language tokens. */
export function buildKnownSet(entries: VocabularyEntry[]): Set<string> {
  const set = new Set<string>();
  for (const entry of entries) {
    for (const token of tokenizeTranscript(entry.targetText)) set.add(token);
    if (entry.acceptedAnswers) {
      for (const alt of entry.acceptedAnswers) {
        for (const token of tokenizeTranscript(alt)) set.add(token);
      }
    }
  }
  return set;
}

export function analyzeTranscript(transcript: string, known: Set<string>): TranscriptAnalysis {
  const tokens = tokenizeTranscript(transcript);
  const unique = Array.from(new Set(tokens));
  const knownList: string[] = [];
  const missingList: string[] = [];
  for (const token of unique) {
    if (known.has(token)) knownList.push(token);
    else missingList.push(token);
  }
  const coveragePercent = unique.length === 0 ? 0 : Math.round((knownList.length / unique.length) * 1000) / 10;
  return {
    totalWords: tokens.length,
    uniqueWords: unique.length,
    knownWords: knownList.length,
    missingWords: missingList.length,
    coveragePercent,
    known: knownList,
    missing: missingList,
  };
}
