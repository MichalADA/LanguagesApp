import { tokenizeTranscript, uniqueTokens } from "./normalize";

export interface CoverageReport {
  totalWords: number;
  uniqueWords: number;
  knownWords: number;
  missingWords: number;
  coveragePercent: number;
  missing: string[];
}

/**
 * Compute vocabulary coverage of a transcript against a known-word set.
 *
 * The set is a passed-in bag of normalized tokens: this service does not know
 * where those words come from (frontend CSV, DB seed, future user vocabulary).
 */
export function computeCoverage(transcript: string, knownWordSet: Set<string>): CoverageReport {
  const tokens = tokenizeTranscript(transcript);
  const unique = uniqueTokens(tokens);
  const knownList: string[] = [];
  const missingList: string[] = [];
  for (const token of unique) {
    if (knownWordSet.has(token)) knownList.push(token);
    else missingList.push(token);
  }
  const coveragePercent = unique.length === 0 ? 0 : Math.round((knownList.length / unique.length) * 1000) / 10;
  return {
    totalWords: tokens.length,
    uniqueWords: unique.length,
    knownWords: knownList.length,
    missingWords: missingList.length,
    coveragePercent,
    missing: missingList,
  };
}
