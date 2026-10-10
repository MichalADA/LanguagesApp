/**
 * Tożsamość słowa z lekcji w FSRS (backend: ReviewState.itemType + itemId).
 *
 * - Słowo, które jest w słowniku kursu (public/data/*.csv) w tym samym znaczeniu,
 *   dostaje istniejący identyfikator WORD (`pl-hr:<rank>`) — tę samą kartę, której
 *   używają Bura, Trasa, fiszki i powtórki. Bez duplikatów.
 * - Zgodność znaczenia sprawdzamy po polskim tłumaczeniu: wspólne słowo albo wspólny
 *   rdzeń (≥ 4 litery: dziś / dzisiaj). Homonimy (radio = „pracował” vs „radio”) nie
 *   trafiają na cudzą kartę.
 * - Pozostałe słowa i zwroty (bok, Kako ste?) dostają PHRASE `pl-hr:phrase:<tekst>` —
 *   klucz z tekstu, więc to samo słowo w dwóch lekcjach (albo w A1 i A2) to jedna karta.
 */

const norm = (s) => s.toLocaleLowerCase("hr").replace(/\s+/g, " ").trim();
const PL_FOLD = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
const plTokens = (s) =>
  s.toLocaleLowerCase("pl").split(/[^\p{L}]+/u).filter((t) => t.length >= 2).map((t) => t.replace(/[ąćęłńóśźż]/g, (c) => PL_FOLD[c]));

/** Czy dwa polskie tłumaczenia opisują to samo znaczenie. */
export function sameMeaning(a, b) {
  const left = plTokens(a);
  const right = plTokens(b);
  return left.some((x) => right.some((y) => x === y || (x.length >= 4 && y.length >= 4 && x.slice(0, 4) === y.slice(0, 4))));
}

/** Klucz zwrotu: małe litery, bez interpunkcji i podwójnych spacji. */
export function phraseKey(text) {
  return norm(text.replace(/[.,!?;:„”"«»…()]+/g, " "));
}

/** Wiersz CSV ze średnikami (jak splitRow w src/vocabulary/adapter.ts). */
function splitRow(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === ";" && !quoted) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Indeks słownika kursu (CSV ze średnikami: Rank;Polish;Croatian;…) po chorwackim tekście. */
export function datasetIndex(csvText) {
  const [header, ...rows] = csvText.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const cols = splitRow(header).map((c) => c.trim());
  const at = (name) => cols.indexOf(name);
  const rank = at("Rank");
  const polish = at("Polish");
  const croatian = at("Croatian");
  if (rank < 0 || polish < 0 || croatian < 0) throw new Error(`Słownik bez kolumn Rank/Polish/Croatian: ${header}`);
  const index = new Map();
  rows.forEach((line, i) => {
    const cells = splitRow(line).map((c) => c.trim());
    const key = norm(cells[croatian] ?? "");
    if (!key || !cells[polish]) return;
    if (!index.has(key)) index.set(key, []);
    // Ten sam identyfikator co VocabularyEntry.id (adapter: Number(rank) || numer wiersza).
    index.get(key).push({ rank: Number(cells[rank]) || i + 1, polish: cells[polish] });
  });
  return index;
}

/** { itemType, itemId } karty FSRS dla słowa z lekcji. */
export function reviewRefFor(word, index, course) {
  const candidates = (index.get(norm(word.hr)) ?? []).filter((entry) => sameMeaning(entry.polish, word.pl));
  if (candidates.length) return { itemType: "WORD", itemId: `${course}:${candidates[0].rank}` };
  return { itemType: "PHRASE", itemId: `${course}:phrase:${phraseKey(word.hr)}` };
}
