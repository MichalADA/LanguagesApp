/**
 * HTML entity decoder — named + numeric (decimal and hex).
 *
 * Covers the entities that actually appear in Tako Lako / Pressbooks pages
 * (typographic punctuation, common accents, ampersand family). Anything
 * out of the table falls through unchanged, which is safer than a wrong
 * best-guess Unicode point.
 */

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  middot: '·',
  bull: '•',
  deg: '°',
  times: '×',
  divide: '÷',
  szlig: 'ß',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  para: '¶',
  sect: '§',
  iexcl: '¡',
  iquest: '¿',
};

function decodeNumeric(match: string, hex: string | undefined, dec: string | undefined): string {
  const code = hex ? parseInt(hex, 16) : dec ? parseInt(dec, 10) : NaN;
  if (Number.isNaN(code) || code < 0 || code > 0x10ffff) return match;
  try {
    return String.fromCodePoint(code);
  } catch {
    return match;
  }
}

export function decodeHtmlEntities(input: string): string {
  if (!input.includes('&')) return input;
  return input
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (match, hex: string) => decodeNumeric(match, hex, undefined))
    .replace(/&#(\d+);/g, (match, dec: string) => decodeNumeric(match, undefined, dec))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name: string) => NAMED[name] ?? match);
}
