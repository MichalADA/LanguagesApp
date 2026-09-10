export interface SentenceToken { id: string; text: string }
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function tokenize(sentence: string): SentenceToken[] {
  return (sentence.match(/[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*|[^\s]/gu) ?? []).map((text, index) => ({ id: `token-${index}`, text }));
}
export function joinTokens(tokens: readonly SentenceToken[]): string {
  return tokens.map(token => token.text).join(" ").replace(/\s+([.,!?;:)\]»])/g, "$1").replace(/([([«])\s+/g, "$1");
}
export function shuffledTokens(sentence: string): SentenceToken[] {
  const original = tokenize(sentence), result = shuffle(original);
  if (result.length > 1 && joinTokens(result) === joinTokens(original)) result.push(result.shift()!);
  return result;
}
