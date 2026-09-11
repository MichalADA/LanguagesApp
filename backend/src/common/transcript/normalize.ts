/**
 * Reusable transcript normalization/tokenization.
 *
 * Kept language-agnostic on purpose: Whisper output, a scraped page and a manual
 * paste all flow through here. Croatian diacritics (č ć đ š ž) stay untouched.
 */

const DIACRITICS = "čćđšžČĆĐŠŽ";
const WORD_RE = new RegExp(`[a-z0-9${DIACRITICS.toLowerCase()}]+`, "g");

const SPEAKER_LINE = /^\s*[A-ZÀ-ŽČĆĐŠŽ][\w\s.'-]{0,40}:\s*/;

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

export function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}
