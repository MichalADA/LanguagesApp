#!/usr/bin/env node
/**
 * Generator kursu HR A1: CSV → TypeScript.
 *
 *   node scripts/generate-a1-curriculum.mjs          # generuje src/curriculum/data/hr-a1/**
 *   node scripts/generate-a1-curriculum.mjs --check  # tylko sprawdza, czy wygenerowane pliki są aktualne
 *   node scripts/generate-a1-curriculum.mjs --dry --csv inny.csv  # sama walidacja innego pliku (testy)
 *   node scripts/generate-a1-curriculum.mjs --check --audio-strict  # + błąd, gdy brakuje któregoś nagrania z manifestu
 *
 * Wejście (poza src/, więc build aplikacji ich nie potrzebuje):
 *   curriculum/hr-a1/lexodromia_hr_A1_curriculum.csv — źródło prawdy treści,
 *   curriculum/hr-a1/didactics.json                   — warstwa dydaktyczna i jawne poprawki,
 *   public/data/listening/hr-a1-dialogues.json        — nagrane dialogi (audio w ćwiczeniach słuchania).
 * Wyjście jest deterministyczne (bez dat i losowości), commitowane do repozytorium.
 * Bez zależności: własny parser CSV (RFC 4180).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { attachAudio, buildManifest } from "./lib/course-audio.mjs";
import { CLITICS, buildLexicon, expandSlots, genderizePattern, genderPairs, recordForms, swapGender, tokens } from "./lib/hr-morphology.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, "curriculum/hr-a1");
const argValue = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
const CSV_PATH = argValue("--csv") ? resolve(argValue("--csv")) : join(SOURCE_DIR, "lexodromia_hr_A1_curriculum.csv");
const DRY = process.argv.includes("--dry");
const DIDACTICS_PATH = join(SOURCE_DIR, "didactics.json");
const LISTENING_PATH = join(ROOT, "public/data/listening/hr-a1-dialogues.json");
const OUT_DIR = join(ROOT, "src/curriculum/data/hr-a1");
const AUDIO_CONFIG_PATH = join(SOURCE_DIR, "audio.json");
const AUDIO_MANIFEST_PATH = join(SOURCE_DIR, "audio-manifest.json");
const PUBLIC_DIR = join(ROOT, "public");
const DEMO_LESSON_PATH = join(ROOT, "src/curriculum/data/lessons/a1-01-02.ts");
const CHECK = process.argv.includes("--check");
const AUDIO_STRICT = process.argv.includes("--audio-strict");

/* ------------------------------------------------------------------ */
/* Błędy i ostrzeżenia                                                  */
/* ------------------------------------------------------------------ */

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/* ------------------------------------------------------------------ */
/* CSV                                                                  */
/* ------------------------------------------------------------------ */

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((c) => c !== "")) rows.push(row); }
  const [header, ...body] = rows;
  return body.map((cells, index) => {
    if (cells.length !== header.length) fail(`CSV wiersz ${index + 2}: ${cells.length} kolumn zamiast ${header.length}`);
    return Object.fromEntries(header.map((key, i) => [key.trim(), (cells[i] ?? "").trim()]));
  });
}

const REQUIRED = {
  lesson: ["record_id", "level", "module_no", "module_title_pl", "lesson_no", "lesson_id", "lesson_title_pl", "grammar_focus", "communicative_goal"],
  vocabulary: ["record_id", "lesson_id", "sequence", "hr_text", "pl_text", "lemma", "part_of_speech"],
  sentence: ["record_id", "lesson_id", "sequence", "hr_text", "pl_text"],
  exercise_blueprint: ["record_id", "lesson_id", "sequence", "exercise_type"],
};

/* ------------------------------------------------------------------ */
/* Pomocnicze                                                           */
/* ------------------------------------------------------------------ */

const FOLD = { č: "c", ć: "c", š: "s", ž: "z", đ: "d" };
const fold = (s) => s.toLocaleLowerCase("hr").replace(/[čćšžđ]/g, (c) => FOLD[c]).replace(/[.,!?;:„”"]/g, "").trim();
const pad = (n) => String(n).padStart(2, "0");
const unique = (list) => [...new Set(list.filter(Boolean))];
const lowerFirst = (s) => s.charAt(0).toLocaleLowerCase("pl") + s.slice(1);
const stripDot = (s) => s.replace(/[.]\s*$/, "");
const bi = (s) => ({ target: s.hr, source: s.pl });

/** Deterministyczny „los”: te same dane → ta sama kolejność. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POS_PL = {
  noun: "rzeczownik", verb: "czasownik", adjective: "przymiotnik", adverb: "przysłówek", pronoun: "zaimek",
  numeral: "liczebnik", interjection: "wykrzyknik", phrase: "zwrot", preposition: "przyimek",
  proper_noun: "nazwa własna", verb_form: "forma czasownika", auxiliary: "forma pomocnicza", conjunction: "spójnik",
};

/**
 * Słownictwo lekcji ma dwie warstwy (kolumna tags w CSV):
 *   vocab|active     — rdzeń: osobne karty słów i ćwiczenia (8 na lekcję),
 *   vocab|supplement — uzupełnienie: jedna lista „Więcej przydatnych słów” z nagraniami + fiszki.
 * Dzięki temu lekcja może mieć 15–25 słów bez 20 kart pod rząd.
 */
const isSupplement = (r) => r.tags.split("|").map((t) => t.trim()).includes("supplement");
const coreOf = (bucket) => bucket.vocabulary.filter((r) => !isSupplement(r));
const supplementOf = (bucket) => bucket.vocabulary.filter(isSupplement);
/** Zdania przykładowe z rozszerzenia (tag „example”) — pokazywane razem z nagraniami, nie ćwiczone. */
const isExampleSentence = (r) => r.tags.split("|").map((t) => t.trim()).includes("example");

/* ------------------------------------------------------------------ */
/* Wczytanie i walidacja                                                */
/* ------------------------------------------------------------------ */

const csvText = readFileSync(CSV_PATH, "utf8");
const csvHash = createHash("sha256").update(csvText).digest("hex").slice(0, 16);
const records = parseCsv(csvText);
const didactics = JSON.parse(readFileSync(DIDACTICS_PATH, "utf8"));
const listening = existsSync(LISTENING_PATH) ? JSON.parse(readFileSync(LISTENING_PATH, "utf8")) : { dialogues: [] };

const seenIds = new Set();
for (const record of records) {
  const required = REQUIRED[record.record_type];
  if (!required) { fail(`${record.record_id}: nieznany record_type „${record.record_type}”`); continue; }
  for (const key of required) if (!record[key]) fail(`${record.record_id || "(brak id)"}: brak pola ${key}`);
  if (seenIds.has(record.record_id)) fail(`Duplikat record_id: ${record.record_id}`);
  seenIds.add(record.record_id);
  if (record.level !== "A1") fail(`${record.record_id}: poziom ${record.level}, oczekiwano A1`);
}

// Jawne poprawki treści (didactics.corrections) — sprawdzamy, czy nadal pasują do CSV.
const byId = new Map(records.map((r) => [r.record_id, r]));
const appliedCorrections = [];
for (const c of didactics.corrections ?? []) {
  const record = byId.get(c.record);
  if (!record) { fail(`Poprawka: brak rekordu ${c.record}`); continue; }
  if (record[c.field] === c.from) { record[c.field] = c.to; appliedCorrections.push(c); }
  else if (record[c.field] === c.to) warn(`Poprawka ${c.record}.${c.field} jest już w CSV — można ją usunąć z didactics.json`);
  else fail(`Poprawka ${c.record}.${c.field}: CSV ma „${record[c.field]}”, poprawka oczekuje „${c.from}”`);
}

// Grupowanie po lesson_id i sortowanie po sequence.
const lessons = new Map();
for (const record of records) {
  if (!lessons.has(record.lesson_id)) lessons.set(record.lesson_id, { lesson: null, vocabulary: [], sentences: [], blueprints: [] });
  const bucket = lessons.get(record.lesson_id);
  if (record.record_type === "lesson") {
    if (bucket.lesson) fail(`${record.lesson_id}: więcej niż jeden rekord lesson`);
    bucket.lesson = record;
  } else if (record.record_type === "vocabulary") bucket.vocabulary.push(record);
  else if (record.record_type === "sentence") bucket.sentences.push(record);
  else bucket.blueprints.push(record);
}
for (const [id, bucket] of lessons) {
  if (!bucket.lesson) { fail(`${id}: brak rekordu lesson`); continue; }
  for (const key of ["vocabulary", "sentences", "blueprints"]) {
    bucket[key].sort((a, b) => Number(a.sequence) - Number(b.sequence));
    const seqs = bucket[key].map((r) => r.sequence);
    if (new Set(seqs).size !== seqs.length) fail(`${id}: powtórzone sequence w ${key}`);
  }
}

const ordered = [...lessons.values()].filter((b) => b.lesson).sort((a, b) => Number(a.lesson.lesson_no) - Number(b.lesson.lesson_no));
if (ordered.length !== 40) fail(`Oczekiwano 40 lekcji, jest ${ordered.length}`);
const moduleNos = unique(ordered.map((b) => b.lesson.module_no));
if (moduleNos.length !== 8) fail(`Oczekiwano 8 modułów, jest ${moduleNos.length}`);
for (const m of moduleNos) {
  const count = ordered.filter((b) => b.lesson.module_no === m).length;
  if (count !== 5) fail(`Moduł ${m}: ${count} lekcji zamiast 5`);
}

const lessonNo = (b) => Number(b.lesson.lesson_no);
const kindOf = (n) => (n === 40 ? "test" : n === 39 ? "spiral" : n === 38 ? "conversation" : n % 5 === 0 ? "review" : "lesson");
for (const bucket of ordered) {
  const kind = kindOf(lessonNo(bucket));
  if (kind !== "test" && kind !== "review" && (!bucket.vocabulary.length || !bucket.sentences.length)) {
    fail(`${bucket.lesson.lesson_id}: zwykła lekcja bez słownictwa lub zdań`);
  }
  if (!didactics.lessons?.[bucket.lesson.lesson_id]) fail(`${bucket.lesson.lesson_id}: brak wpisu w didactics.json`);
  const words = bucket.vocabulary.map((r) => fold(r.hr_text));
  for (const word of new Set(words)) if (words.indexOf(word) !== words.lastIndexOf(word)) fail(`${bucket.lesson.lesson_id}: słowo „${word}” występuje dwa razy`);
  const model = didactics.lessons?.[bucket.lesson.lesson_id]?.model;
  if (model && (!model.title || !model.lines?.length || model.lines.some((l) => !l.speaker || !l.hr || !l.pl))) {
    fail(`${bucket.lesson.lesson_id}: dialog wzorcowy (model) wymaga title i linii { speaker, hr, pl }`);
  }
}
// Słowo uzupełniające, które jest już w rdzeniu innej lekcji, to zwykle pomyłka (recykling robią zdania, nie listy).
const coreWords = new Map(ordered.flatMap((b) => coreOf(b).map((r) => [fold(r.hr_text), b.lesson.lesson_id])));
for (const bucket of ordered) {
  for (const r of supplementOf(bucket)) {
    const owner = coreWords.get(fold(r.hr_text));
    if (owner) warn(`${bucket.lesson.lesson_id}: słowo uzupełniające „${r.hr_text}” jest już w rdzeniu ${owner}`);
  }
}

if (errors.length) {
  console.error(`Walidacja nie powiodła się (${errors.length}):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Model danych                                                         */
/* ------------------------------------------------------------------ */

const byLesson = new Map(ordered.map((b) => [b.lesson.lesson_id, b]));
const extra = didactics.extraAccepted ?? {};
const splitAccepted = (value) => value.split("|").map((v) => v.trim()).filter(Boolean);

/* Morfologia kursu: formy słów z całego słownictwa CSV (scripts/lib/hr-morphology.mjs). */
const vocabRecords = records.filter((r) => r.record_type === "vocabulary");
const LEXICON = buildLexicon(vocabRecords);
const GENDER = genderPairs(vocabRecords);
const PRES1 = new Set(LEXICON.pres1.filter((f) => !f.includes(" ")));
/** Jednowyrazowe formy rekordu słownictwa (bez klityki „se”). */
const formsCache = new Map();
function formsOf(record) {
  if (!formsCache.has(record.record_id)) {
    const all = Object.values(recordForms(record)).flat().flatMap((f) => f.split(/\s+/)).filter((f) => f && f !== "se");
    formsCache.set(record.record_id, new Set(all));
  }
  return formsCache.get(record.record_id);
}
const genderDrill = (lessonId) => Boolean(didactics.lessons[lessonId]?.genderDrill);
const isSelf = (text) => tokens(text).some((t) => t === "sam" || t === "bih");

/**
 * Naturalne warianty poprawnej odpowiedzi (bez nowej treści):
 *  - zdanie o sobie w drugim rodzaju (Umoran sam. ↔ Umorna sam.) — poza lekcjami, które ćwiczą właśnie rodzaj,
 *  - podmiot „Ja” na początku, gdy zdanie nie ma klityk (Danas ne radim. → Ja danas ne radim.).
 */
function naturalVariants(list, lessonId) {
  const out = [...list];
  for (const answer of list) {
    if (!genderDrill(lessonId) && isSelf(answer)) out.push(swapGender(answer, GENDER));
    const words = tokens(answer);
    if (words[0] !== "ja" && !answer.trim().endsWith("?") && !words.some((w) => CLITICS.has(w)) && words.some((w) => PRES1.has(w)) && !PROPER.has(answer.split(/\s+/)[0])) {
      out.push(`Ja ${answer.charAt(0).toLocaleLowerCase("hr")}${answer.slice(1)}`);
    }
  }
  return unique(out);
}

/** Zdanie z CSV z pełną listą akceptowanych wariantów. */
function sentenceOf(lessonId, seq) {
  const bucket = byLesson.get(lessonId);
  const record = bucket?.sentences.find((r) => Number(r.sequence) === Number(seq));
  if (!record) { fail(`Brak zdania ${lessonId}:${seq}`); return { hr: "?", pl: "?", accepted: [] }; }
  const base = unique([record.hr_text, ...splitAccepted(record.accepted_answers), ...(extra[record.record_id] ?? []), ...(extra[`${lessonId}:${seq}`] ?? [])]);
  return { hr: record.hr_text, pl: record.pl_text, accepted: naturalVariants(base, lessonId), recordId: record.record_id, lessonId, seq: Number(seq) };
}

/** 3 → zdanie 3 tej lekcji; "a1-12:6" → zdanie 6 lekcji a1-12. */
function resolveSentence(ref, lessonId) {
  if (typeof ref === "number") return sentenceOf(lessonId, ref);
  const [id, seq] = String(ref).split(":");
  return sentenceOf(id, Number(seq));
}

const vocabItem = (r) => ({ target: r.hr_text, source: r.pl_text, lemma: r.lemma, partOfSpeech: r.part_of_speech, recordId: r.record_id });

/* ------------------------------------------------------------------ */
/* Budowanie kroków                                                     */
/* ------------------------------------------------------------------ */

/**
 * Przykład do karty słowa: zdanie musi zawierać to słowo albo poprawną formę tego samego lematu
 * (voda → Pijem vodu). Wyrażenie wielowyrazowe — całe, w mianowniku lub bierniku. Bez dopasowania
 * po początku wyrazu (dva ≠ dvadeset, slan ≠ sladoled). Brak pasującego zdania = karta bez przykładu.
 */
function exampleFor(word, sentences) {
  const phrase = tokens(word.hr_text);
  if (phrase.length > 1) {
    const forms = recordForms(word);
    const variants = unique([phrase.join(" "), ...forms.nom, ...forms.acc, ...forms.inf, ...forms.pres1]).map((v) => ` ${v} `);
    return sentences.find((s) => variants.some((v) => ` ${tokens(s.hr_text).join(" ")} `.includes(v)));
  }
  // Najpierw zdanie z dokładnie tą formą (soba → „Soba je…”), dopiero potem z inną formą lematu (sobu).
  const base = phrase[0];
  const exact = sentences.find((s) => tokens(s.hr_text).includes(base));
  if (exact) return exact;
  const forms = formsOf(word);
  return sentences.find((s) => tokens(s.hr_text).some((t) => forms.has(t)));
}

function wordStep(id, record, sentences) {
  const example = exampleFor(record, sentences);
  return {
    id, stage: "words", type: "word",
    target: record.hr_text, source: record.pl_text,
    partOfSpeech: POS_PL[record.part_of_speech] ?? record.part_of_speech,
    ...(example ? { example: { target: example.hr_text, source: example.pl_text } } : {}),
  };
}

/** Wybór jednej z opcji; poprawna pozycja rotuje deterministycznie. */
function choiceStep(id, stage, instruction, prompt, correct, distractors, rotate, explanation, targetText = "prompt") {
  const pool = unique(distractors.filter((d) => fold(d) !== fold(correct))).slice(0, 2);
  if (pool.length < 2) fail(`${id}: za mało dystraktorów dla „${prompt}”`);
  const options = [...pool];
  const at = rotate % 3;
  options.splice(at, 0, correct);
  return { id, stage, type: "choice", instruction, prompt, options, correctIndex: at, ...(explanation ? { explanation } : {}), targetText };
}

function pickDistractors(list, exclude, rand, n = 2) {
  const pool = list.filter((x) => fold(x) !== fold(exclude));
  const out = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

function gapStep(id, stage, sentence, word) {
  const tokens = sentence.hr.split(/(\s+)/);
  const clean = (t) => t.replace(/[.,!?;:]/g, "");
  const index = tokens.findIndex((t) => clean(t) === word);
  if (index < 0) { fail(`${id}: słowa „${word}” nie ma w „${sentence.hr}”`); return null; }
  const tail = tokens[index].slice(clean(tokens[index]).length);
  return {
    id, stage, type: "gap", instruction: "Uzupełnij lukę.",
    before: tokens.slice(0, index).join("").trim(),
    after: (tail + tokens.slice(index + 1).join("")).trim(),
    accepted: [word],
    translation: sentence.pl,
  };
}

function translateStep(id, stage, sentence, extraAccept = []) {
  return {
    id, stage, type: "translate", instruction: "Przetłumacz na chorwacki.",
    prompt: sentence.pl,
    accepted: unique([...sentence.accepted, ...extraAccept]),
  };
}

const PROPER = new Set(["Ana", "Anu", "Marko", "Ivan", "Michał", "Marta", "Zagreb", "Zagrebu", "Split", "Zadar", "Krakovu", "Poljske", "Poljskoj", "Hrvatske", "Hrvatska", "Poljska"]);

function orderStep(id, stage, sentence, rand) {
  const words = sentence.hr.replace(/[.,!?;:]/g, "").split(/\s+/).filter(Boolean);
  if (words.length < 3) fail(`${id}: zdanie „${sentence.hr}” jest za krótkie do układania`);
  const tokens = words.map((w, i) => (i === 0 && !PROPER.has(w) ? w.charAt(0).toLocaleLowerCase("hr") + w.slice(1) : w));
  let shuffled = [...tokens];
  for (let attempt = 0; attempt < 10 && shuffled.join(" ") === tokens.join(" "); attempt++) {
    shuffled = [...tokens];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return { id, stage, type: "order", instruction: "Ułóż zdanie.", translation: sentence.pl, tokens: shuffled, accepted: sentence.accepted };
}

function comprehendStep(id, stage, target, others, rotate) {
  return choiceStep(id, stage, "Co znaczy to zdanie?", target.hr, target.pl, others.map((s) => s.pl), rotate);
}

function structureStep(lessonId, spec) {
  return {
    id: "structure", stage: "structure", type: "structure",
    title: spec.title,
    explanation: spec.text,
    examples: (spec.examples ?? []).map((ref) => bi(resolveSentence(ref, lessonId))),
    ...(spec.tip ? { note: spec.tip } : {}),
  };
}

/**
 * Grzecznościowa rama repliki: w rozmowie naturalnie dodajemy powitanie, „hvala”, imię rozmówcy
 * albo „a ti?” — to nie zmienia treści odpowiedzi, więc nie może jej unieważnić
 * („Bok, dobro sam, hvala, a ti?” = „Dobro sam.”). Wielkość liter i interpunkcję usuwa już checker.
 */
const canonReply = (x) => x.toLocaleLowerCase("hr").replace(/[.,!?;:„”"…«»]/g, " ").replace(/\s+/g, " ").trim();
function framePattern(core, partner) {
  const name = partner ? `|${canonReply(partner)}` : "";
  const lead = `(?:(?:bok|zdravo|hej|dobar dan|dobro jutro|dobra večer|oprostite|hvala(?: lijepa| vam)?${name}) )*`;
  const trail = `(?: (?:hvala(?: lijepa| vam)?|a ti|a vi|molim(?: vas)?${name}))*`;
  // rdzeń bez własnych kotwic: ^a$|^b$ → a|b
  const bare = core.replace(/(^|\|)\^/g, "$1").replace(/\$(?=\||$)/g, "");
  return `^${lead}(?:${bare})${trail}$`;
}
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replika: lista wariantów → rama (wzorzec z didactics albo alternatywa wariantów) → sprawdzenie. */
function replyTurn(lessonId, prompt, accepted, pattern, partner, { open = false, source = pattern } = {}) {
  const core = pattern ?? accepted.map((a) => `^${escapeRegex(canonReply(a))}$`).join("|");
  const framed = framePattern(core, partner);
  let regex = null;
  try { regex = new RegExp(framed, "u"); } catch (e) { fail(`${lessonId}: błędny pattern ${source}: ${e.message}`); }
  if (regex) {
    // Wzorzec ma przepuszczać sugerowaną odpowiedź — inaczej to błąd w danych.
    if (!regex.test(canonReply(accepted[0]))) fail(`${lessonId}: sugerowana odpowiedź „${accepted[0]}” nie pasuje do ramy ${source}`);
    // Replika otwarta: odpowiedź w grzecznościowej ramie („Bok, … hvala”) też musi przejść.
    if (open && !regex.test(canonReply(`Bok, ${accepted[0]} hvala`))) fail(`${lessonId}: otwarta replika „${prompt}” odrzuca „Bok, ${accepted[0]} hvala”`);
  }
  return { kind: "reply", prompt, accepted, pattern: framed, suggestion: accepted[0] };
}

function dialogStep(lessonId, spec) {
  const turns = spec.turns.map((turn) => {
    if (turn.line !== undefined) {
      const s = resolveSentence(turn.line, lessonId);
      return { kind: "line", line: { speaker: spec.partner, text: s.hr, translation: s.pl } };
    }
    if (turn.say) return { kind: "line", line: { speaker: spec.partner, text: turn.say, translation: turn.pl } };
    const reply = turn.reply;
    const listed = unique(reply.accept.flatMap((a) => (typeof a === "number" || /^a1-\d\d:\d$/.test(a) ? resolveSentence(a, lessonId).accepted : naturalVariants([a], lessonId))));
    // Replika o sobie (sam / bih): poprawne są obie formy rodzaju — uczeń mówi o sobie.
    const self = listed.some(isSelf);
    const accepted = self ? unique([...listed, ...listed.map((a) => swapGender(a, GENDER))]) : listed;
    if (!accepted.length) fail(`${lessonId}: odpowiedź w dialogu bez wariantów`);
    // Replika otwarta (polecenie dopuszcza wiele treści) musi mieć ramę zdania, nie jedną odpowiedź.
    if (reply.open && !reply.pattern) fail(`${lessonId}: otwarta replika „${reply.prompt}” bez wzorca`);
    let pattern = reply.pattern;
    if (pattern) {
      // Rama zdania: {slot} → formy słownictwa całego kursu (hr-morphology), rodzaj → (?:m|ż) przy replikach o sobie.
      try { pattern = expandSlots(self ? genderizePattern(pattern, GENDER) : pattern, LEXICON); } catch (e) { fail(`${lessonId}: błędny pattern ${reply.pattern}: ${e.message}`); }
    }
    return replyTurn(lessonId, reply.prompt, accepted, pattern, spec.partner, { open: reply.open, source: reply.pattern });
  });
  return { id: "dialog", stage: "dialog", type: "dialog", title: spec.title, turns };
}

function freeStep(id, spec, stage = "dialog") {
  return {
    id, stage, type: "free",
    instruction: spec.instruction,
    points: spec.points,
    keywords: spec.keywords,
    minSentences: spec.minSentences ?? 2,
    sample: spec.sample,
  };
}

function listeningStep(id, stage, dialogueId, extraQuestions = [], instructionTarget) {
  const dialogue = listening.dialogues.find((d) => d.id === dialogueId);
  if (!dialogue) { fail(`Brak nagranego dialogu ${dialogueId}`); return null; }
  const manifestQuestion = {
    prompt: dialogue.question.promptPl,
    options: dialogue.question.options.map((o) => o.textPl),
    correctIndex: dialogue.question.options.findIndex((o) => o.id === dialogue.question.correctOptionId),
  };
  const names = { ana: "Ana", marko: "Marko" };
  const questions = extraQuestions.length
    ? extraQuestions.map((q) => (q.fromManifest ? manifestQuestion : { prompt: q.prompt, options: q.options, correctIndex: q.correct }))
    : [manifestQuestion];
  return {
    id, stage, type: "listening",
    instruction: "Posłuchaj dialogu i odpowiedz na pytanie.",
    ...(instructionTarget ? { instructionTarget } : {}),
    title: dialogue.titlePl,
    lines: dialogue.lines.map((l) => ({ speaker: names[l.speaker] ?? l.speaker, text: l.textHr, translation: l.textPl, audio: l.audioPath })),
    questions,
  };
}

const vocabListStep = (id, stage, title, vocabulary, note) => ({
  id, stage, type: "vocabList", title, ...(note ? { note } : {}),
  items: vocabulary.map((r) => ({ target: r.hr_text, source: r.pl_text, partOfSpeech: POS_PL[r.part_of_speech] ?? r.part_of_speech })),
});

/** Słowa uzupełniające: jedna lista z nagraniami + jedno rozpoznanie (osobny „los”, żeby nie przesuwać reszty lekcji). */
function supplementSteps(bucket) {
  const extra = supplementOf(bucket);
  if (!extra.length) return [];
  const n = lessonNo(bucket);
  const rand = seeded(n * 6151);
  const asked = extra[n % extra.length];
  return [
    vocabListStep("more-words", "words", "Więcej przydatnych słów", extra, "Odsłuchaj i powtórz na głos. Te słowa trafią do fiszek razem z resztą lekcji."),
    choiceStep("check-more", "words", "Co znaczy to słowo?", asked.hr_text, asked.pl_text, pickDistractors(extra.map((v) => v.pl_text), asked.pl_text, rand), n),
  ];
}

/** Zdania przykładowe z nowymi słowami — do odsłuchania, bez oceniania. */
function examplesStep(bucket) {
  const examples = bucket.sentences.filter(isExampleSentence);
  if (!examples.length) return [];
  return [{
    id: "examples", stage: "words", type: "structure",
    title: "Nowe słowa w zdaniach",
    explanation: "Posłuchaj, jak nowe słowa brzmią w krótkich, codziennych zdaniach.",
    examples: examples.map((r) => ({ target: r.hr_text, source: r.pl_text })),
  }];
}

/** Dialog wzorcowy (didactics → model): najpierw słuchasz rozmowy, potem prowadzisz własną. */
function modelStep(lessonId) {
  const model = didactics.lessons[lessonId]?.model;
  if (!model) return [];
  return [{
    id: "model", stage: "dialog", type: "listen", title: model.title,
    lines: model.lines.map((l) => ({ speaker: l.speaker, text: l.hr, translation: l.pl })),
  }];
}

const summaryStep = (recap, extraFields = {}) => ({ id: "summary", stage: "summary", type: "summary", title: "Lekcja ukończona", recap, ...extraFields });

/* ---------- Zwykła lekcja ---------- */

function buildRegular(bucket) {
  const { lesson, sentences } = bucket;
  const vocabulary = coreOf(bucket);
  const id = lesson.lesson_id;
  const n = lessonNo(bucket);
  const d = didactics.lessons[id];
  const rand = seeded(n * 7919);
  const all = sentences.filter((r) => !isExampleSentence(r)).map((r) => sentenceOf(id, r.sequence));
  const steps = [];

  steps.push({
    id: "intro", stage: "intro", type: "intro", title: lesson.lesson_title_pl,
    body: `Po tej lekcji będziesz umieć ${lowerFirst(stripDot(lesson.communicative_goal))}.`,
    goalsTitle: "Powiesz między innymi",
    goals: all.slice(0, 3).map(bi),
  });

  if (kindOf(n) === "conversation") {
    steps.push(vocabListStep("words", "words", "Słowa, które przydadzą się w rozmowie", bucket.vocabulary));
  } else {
    // Nowa rzecz → mikroćwiczenie: grupy 3 + 3 + 2 słowa.
    const groups = [vocabulary.slice(0, 3), vocabulary.slice(3, 6), vocabulary.slice(6)];
    const pl = vocabulary.map((v) => v.pl_text);
    const hr = vocabulary.map((v) => v.hr_text);
    groups.forEach((group, g) => {
      if (!group.length) return;
      group.forEach((word) => steps.push(wordStep(`word-${word.sequence}`, word, sentences)));
      const asked = group[(n + g) % group.length];
      if (g === 1) {
        steps.push(choiceStep(`check-${g + 1}`, "words", "Jak powiesz to po chorwacku?", asked.pl_text, asked.hr_text, pickDistractors(hr, asked.hr_text, rand), n + g, undefined, "options"));
      } else {
        steps.push(choiceStep(`check-${g + 1}`, "words", "Co znaczy to słowo?", asked.hr_text, asked.pl_text, pickDistractors(pl, asked.pl_text, rand), n + g));
      }
    });
    steps.push(...supplementSteps(bucket));
  }
  steps.push(...examplesStep(bucket));

  if (d.grammar) steps.push(structureStep(id, d.grammar));
  if (d.gap) {
    const gap = gapStep("gap", "structure", sentenceOf(id, d.gap.sentence), d.gap.word);
    if (gap) steps.push(gap);
  }

  // Ćwiczenia: kolejność różni się między lekcjami, żeby nie powtarzać schematu.
  const practice = [];
  const comprehend = d.comprehend ? comprehendStep("comprehend", "practice", sentenceOf(id, d.comprehend), all.filter((s) => s.hr !== sentenceOf(id, d.comprehend).hr), n) : null;
  const translations = (d.translate ?? []).map((t, i) => translateStep(`translate-${i + 1}`, "practice", sentenceOf(id, t.sentence), t.accept));
  const order = d.order ? orderStep("order", "practice", sentenceOf(id, d.order), rand) : null;
  const extraChoices = (d.choices ?? []).map((c, i) => ({ id: `choice-${i + 1}`, stage: "practice", type: "choice", instruction: c.instruction, prompt: c.prompt, options: c.options, correctIndex: c.correct, ...(c.explanation ? { explanation: c.explanation } : {}), targetText: "options" }));
  const [t1, ...rest] = translations;
  if (n % 2) practice.push(comprehend, ...extraChoices, t1, order, ...rest);
  else practice.push(t1, order, ...extraChoices, comprehend, ...rest);
  steps.push(...practice.filter(Boolean));

  if (d.listening) {
    const step = listeningStep("listening", "dialog", d.listening);
    if (step) steps.push(step);
  }
  steps.push(...modelStep(id));
  if (d.dialog) steps.push(dialogStep(id, d.dialog));
  if (d.free) steps.push(freeStep("free", d.free));

  const recapCount = kindOf(n) === "conversation" ? 5 : 4;
  steps.push(summaryStep(all.slice(0, recapCount).map(bi)));
  return steps;
}

/* ---------- Śledzenie materiału: co uczeń już widział i co już ćwiczył ---------- */

/**
 * Powtórki, spirala i test budują zadania z materiału, który uczeń już widział (zdania z lekcji, słowa z kart),
 * ale w nowej formie: nigdy tego samego zadania co wcześniej. Stan rośnie w kolejności lekcji.
 */
const keyOf = (text) => tokens(text).join(" ");
const usage = { displayed: new Set(), exercised: new Map(), asked: new Set(), tasks: new Map() };
/** Zapamiętuje, jakim typem zadania zdanie było już ćwiczone (tłumaczenie / układanie / luka). */
const markExercised = (text, type) => { const k = keyOf(text); usage.exercised.set(k, (usage.exercised.get(k) ?? new Set()).add(type)); };
const gapSentence = (step) => {
  const [, punct = "", rest = ""] = step.after.match(/^([.,!?;:]*)\s*(.*)$/) ?? [];
  return [step.before, `${step.accepted[0]}${punct}`, rest].filter(Boolean).join(" ");
};

/** Podpis zadania: to samo zadanie w innej lekcji = kopia. */
function taskSignature(step) {
  switch (step.type) {
    case "translate": return `tłumaczenie „${step.prompt}”`;
    case "gap": return `luka „${gapSentence(step)}” [${step.accepted[0]}]`;
    case "order": return `układanie „${keyOf(step.accepted[0])}”`;
    case "choice": return `wybór „${step.prompt}” → ${step.options[step.correctIndex]}`;
    default: return null;
  }
}

function registerLesson(lessonId, steps) {
  const show = (x) => { if (x) usage.displayed.add(keyOf(typeof x === "string" ? x : x.target)); };
  for (const s of steps) {
    show(s.instructionTarget);
    switch (s.type) {
      case "intro": s.goals.forEach(show); break;
      case "word": show(s.target); show(s.example); s.related?.forEach(show); break;
      case "structure": s.examples?.forEach(show); break;
      case "vocabList": s.items.forEach(show); break;
      case "listen": case "listening": s.lines.forEach((l) => show(l.text)); break;
      case "reading": s.text.forEach(show); break;
      case "dialog": s.turns.forEach((t) => show(t.kind === "line" ? t.line.text : t.suggestion)); break;
      case "choice": if (s.targetText !== "options") show(s.prompt); if (s.targetText !== "prompt") s.options.forEach(show); break;
      case "summary": s.recap.forEach(show); show(s.closing); break;
      default: break;
    }
    if (s.type === "translate" || s.type === "order") markExercised(s.accepted[0], s.type);
    if (s.type === "gap") markExercised(gapSentence(s), "gap");
    if (s.type === "choice" && /^(check|recall|vocab)/.test(s.id)) usage.asked.add(keyOf(s.targetText === "options" ? s.options[s.correctIndex] : s.prompt));
    if (s.type === "translate" && /^recall/.test(s.id)) usage.asked.add(keyOf(s.accepted[0]));
    const sig = taskSignature(s);
    if (sig && !usage.tasks.has(sig)) usage.tasks.set(sig, lessonId);
  }
}

/**
 * Zdania lekcji, które uczeń widział: najpierw w ogóle niećwiczone, potem ćwiczone innym typem zadania
 * (zdanie z luki może wrócić do układania — to nowe zadanie; to samo zadanie drugi raz już nie).
 * Tłumaczenie nie wraca do zdań już tłumaczonych ani układanych.
 */
function freshSentences(lessonId, minWords, type) {
  const blocked = type === "translate" ? ["translate", "order"] : [type, "translate"];
  const seen = byLesson.get(lessonId).sentences.filter((r) => usage.displayed.has(keyOf(r.hr_text)) && tokens(r.hr_text).length >= minWords);
  const done = (r) => usage.exercised.get(keyOf(r.hr_text)) ?? new Set();
  return [...seen.filter((r) => done(r).size === 0), ...seen.filter((r) => done(r).size > 0 && !blocked.some((t) => done(r).has(t)))];
}

function takeSentence(lessonIds, minWords = 2) {
  for (const lid of unique(lessonIds)) {
    const r = freshSentences(lid, minWords, "translate")[0];
    if (r) { markExercised(r.hr_text, "translate"); return sentenceOf(lid, r.sequence); }
  }
  fail(`Brak nieprzećwiczonego zdania w ${unique(lessonIds).join(", ")}`);
  return null;
}

const AUX = new Set(["ću", "ćeš", "će", "ćemo", "ćete"]);
const single = (list) => new Set(list.filter((f) => !f.includes(" ")));
const PP_FORMS = single(LEXICON.pp);
const PRES_FORMS = single(LEXICON.pres);
const INFLECTED = single([...LEXICON.acc, ...LEXICON.loc, ...LEXICON.ins]);
const NOMINATIVE = single(LEXICON.nom);
/** Luka najpierw na tym, co niesie gramatykę: imiesłów / ću, forma osobowa, rzeczownik w przypadku zależnym. */
const gapPriority = (t) => (PP_FORMS.has(t) || AUX.has(t) ? 0 : PRES_FORMS.has(t) ? 1 : INFLECTED.has(t) && !NOMINATIVE.has(t) ? 2 : 3);

function takeGap(id, stage, lessonIds) {
  for (const lid of unique(lessonIds)) {
    const coreForms = new Set(coreOf(byLesson.get(lid)).flatMap((r) => [...formsOf(r)]));
    let best = null;
    for (const r of freshSentences(lid, 3, "gap")) {
      for (const word of r.hr_text.split(/\s+/).map((w) => w.replace(/[.,!?;:]/g, "")).filter(Boolean)) {
        const t = word.toLocaleLowerCase("hr");
        if (t.length < 2 || !coreForms.has(t) || (CLITICS.has(t) && !AUX.has(t))) continue;
        const priority = gapPriority(t);
        if (!best || priority < best.priority) best = { priority, record: r, word };
      }
    }
    if (best) {
      markExercised(best.record.hr_text, "gap");
      return gapStep(id, stage, sentenceOf(lid, best.record.sequence), best.word);
    }
  }
  fail(`Brak zdania na lukę w ${unique(lessonIds).join(", ")}`);
  return null;
}

function takeOrder(id, stage, lessonIds, rand) {
  for (const lid of unique(lessonIds)) {
    const r = freshSentences(lid, 4, "order")[0];
    if (r) { markExercised(r.hr_text, "order"); return orderStep(id, stage, sentenceOf(lid, r.sequence), rand); }
  }
  fail(`Brak zdania do układania w ${unique(lessonIds).join(", ")}`);
  return null;
}

/** Polskie znaczenie → jedno chorwackie słowo w całym kursie (inaczej „wpisz po chorwacku” byłoby niejednoznaczne). */
const plIndex = new Map();
for (const r of vocabRecords) {
  const k = keyOf(r.pl_text);
  plIndex.set(k, (plIndex.get(k) ?? new Set()).add(keyOf(r.hr_text)));
}

/** Słowo rdzenia, które uczeń widział, ale o które jeszcze go nie pytano; bez kognatów i niejednoznaczności. */
function takeWord(lessonIds, rotate) {
  for (const lid of unique(lessonIds)) {
    const candidates = coreOf(byLesson.get(lid)).filter((r) => {
      const hr = keyOf(r.hr_text);
      return usage.displayed.has(hr) && !usage.asked.has(hr) && plIndex.get(keyOf(r.pl_text)).size === 1
        && fold(r.hr_text) !== fold(r.pl_text) && !/[()]/.test(r.pl_text);
    });
    if (candidates.length) {
      const r = candidates[rotate % candidates.length];
      usage.asked.add(keyOf(r.hr_text));
      return r;
    }
  }
  fail(`Brak słowa do przypomnienia w ${unique(lessonIds).join(", ")}`);
  return null;
}

/** Przypomnienie z produkcją: polskie znaczenie → uczeń wpisuje słowo po chorwacku. */
const recallStep = (id, word, stage = "words") => ({
  id, stage, type: "translate", instruction: "Jak powiesz to po chorwacku?", prompt: word.pl_text, accepted: [word.hr_text],
});

const moduleLessons = (moduleNo) => ordered.filter((b) => Number(b.lesson.module_no) === Number(moduleNo) && kindOf(lessonNo(b)) === "lesson").map((b) => b.lesson.lesson_id);

/* ---------- Powtórka modułu ---------- */

function previousLessons(bucket) {
  const m = bucket.lesson.module_no;
  return ordered.filter((b) => b.lesson.module_no === m && lessonNo(b) < lessonNo(bucket));
}

function buildReview(bucket) {
  const { lesson, vocabulary, sentences } = bucket;
  const id = lesson.lesson_id;
  const n = lessonNo(bucket);
  const d = didactics.lessons[id];
  const rand = seeded(n * 104729);
  const prev = previousLessons(bucket);
  const ids = prev.map((p) => p.lesson.lesson_id);
  const steps = [];
  const goals = prev.map((p) => stripDot(p.lesson.communicative_goal));

  steps.push({
    id: "intro", stage: "intro", type: "intro", title: lesson.lesson_title_pl,
    body: `Powtórka modułu „${lesson.module_title_pl}”. Połączysz materiał z lekcji ${lessonNo(prev[0])}–${lessonNo(prev[prev.length - 1])} i sprawdzisz go w rozmowie.`,
    goalsTitle: "Sprawdzisz, czy umiesz",
    goals: goals.map(lowerFirst),
  });

  // 1. Przypominanie: trzy słowa do wpisania (lekcje 1–3) i jedno do rozpoznania (lekcja 4) — słowa, o które jeszcze nie pytano.
  const prevVocab = prev.flatMap(coreOf);
  ids.slice(0, 3).forEach((lid, i) => {
    const word = takeWord([lid, ...ids], n + i);
    if (word) steps.push(recallStep(`recall-${i + 1}`, word));
  });
  if (ids[3]) {
    const word = takeWord([ids[3], ...ids], n + 3);
    if (word) steps.push(choiceStep("recall-4", "words", "Co znaczy to słowo?", word.hr_text, word.pl_text, pickDistractors(prevVocab.map((v) => v.pl_text), word.pl_text, rand), n + 3));
  }
  steps.push(vocabListStep("vocab", "words", "Przydatne słowa na koniec modułu", vocabulary, "Nie musisz ich jeszcze znać na pamięć — pojawią się w rozmowie."));
  steps.push(...examplesStep(bucket));

  // 2. Luka i układanie na zdaniach z modułu, których uczeń jeszcze nie ćwiczył.
  const gap = takeGap("gap", "structure", [...ids].reverse());
  if (gap) steps.push(gap);
  const order = takeOrder("order", "structure", ids, rand);
  if (order) steps.push(order);

  // 3. Tłumaczenia: po jednym zdaniu z trzech lekcji — zdania, których uczeń jeszcze nie tłumaczył ani nie układał.
  [ids[0], ids[1], ids[3] ?? ids[2]].forEach((lid, i) => {
    const sentence = takeSentence([lid, ...ids]);
    if (sentence) steps.push({ ...translateStep(`translate-${i + 1}`, "practice", sentence), id: `translate-${i + 1}` });
  });

  // 4. Dialog i zadanie komunikacyjne.
  steps.push(...modelStep(id));
  if (d.dialog) steps.push(dialogStep(id, d.dialog));
  if (d.canDo) steps.push(freeStep("can-do", d.canDo));

  const all = sentences.filter((r) => !isExampleSentence(r)).map((r) => sentenceOf(id, r.sequence));
  steps.push(summaryStep(all.slice(0, 4).map(bi), { canDo: goals.map(lowerFirst) }));
  return steps;
}

/* ---------- Wielka powtórka A1 (spirala) ---------- */

function buildSpiral(bucket) {
  const { lesson, vocabulary, sentences } = bucket;
  const id = lesson.lesson_id;
  const d = didactics.lessons[id];
  const rand = seeded(39 * 15485863);
  const s = d.spiral;
  const steps = [];

  steps.push({
    id: "intro", stage: "intro", type: "intro", title: lesson.lesson_title_pl,
    body: "Krótkie serie z całego poziomu: słowa, miejsca, jedzenie, hobby, podróże — i trzy czasy: teraz, wczoraj, jutro.",
    goalsTitle: "W tej powtórce",
    goals: ["przypomnisz sobie słowa ze wszystkich modułów", "uzupełnisz zdania w czasie teraźniejszym, przeszłym i przyszłym", "przetłumaczysz zdania z codziennych sytuacji", "porozmawiasz o sobie, wczoraj i jutrze"],
  });

  // Seria 1: słowa z różnych modułów — do wpisania po chorwacku.
  s.recallModules.forEach((m, i) => {
    const word = takeWord(moduleLessons(m), i);
    if (word) steps.push(recallStep(`recall-${i + 1}`, word));
  });
  steps.push(vocabListStep("vocab", "words", "Słowa o nauce języka", vocabulary));

  // Seria 2: trzy czasy i konstrukcje w kontekście — luki w zdaniach, których uczeń jeszcze nie ćwiczył.
  steps.push(structureStep(id, d.grammar));
  s.gaps.forEach((lid, i) => {
    const step = takeGap(`gap-${i + 1}`, "structure", [lid]);
    if (step) steps.push(step);
  });

  // Seria 3: tłumaczenia z różnych modułów + układanie zdania.
  const translations = s.translations.map((lid, i) => {
    const sentence = takeSentence([lid]);
    return sentence ? { ...translateStep(`translate-${i + 1}`, "practice", sentence), id: `translate-${i + 1}` } : null;
  }).filter(Boolean);
  const order = takeOrder("order", "practice", [s.order], rand);
  steps.push(...translations.slice(0, 2), ...(order ? [order] : []), ...translations.slice(2));

  // Seria 4: rozmowa i samodzielna wypowiedź.
  steps.push(dialogStep(id, d.dialog), freeStep("can-do", d.canDo));

  const own = sentences.map((r) => sentenceOf(id, r.sequence));
  steps.push(summaryStep(own.slice(2).map(bi)));
  return steps;
}

/* ---------- Test A1 ---------- */

function buildTest(bucket) {
  const { lesson, vocabulary } = bucket;
  const id = lesson.lesson_id;
  const t = didactics.lessons[id].test;
  const rand = seeded(40 * 32452843);
  const own = (seq) => bi(sentenceOf(id, seq));
  const allVocab = ordered.filter((b) => lessonNo(b) < 40).flatMap(coreOf);
  const steps = [];

  steps.push({
    id: "intro", stage: "intro", type: "intro", title: lesson.lesson_title_pl,
    body: "Test obejmuje materiał całego poziomu A1. Nie ma tu zaliczenia ani oblania — na końcu zobaczysz, co masz dobrze opanowane, a co warto powtórzyć.",
    goalsTitle: "Sześć krótkich części",
    goals: ["słownictwo", "czytanie", "słuchanie", "gramatyka w kontekście", "tłumaczenie", "krótka wypowiedź"],
  });
  steps.push(vocabListStep("instructions", "intro", "Słowa z poleceń testu", vocabulary, "Polecenia w teście są po chorwacku — pod spodem zawsze zobaczysz tłumaczenie."));

  // Słowa, o które kurs (także Wielka powtórka) jeszcze nie pytał.
  t.vocabulary.modules.forEach((m, i) => {
    const word = takeWord(moduleLessons(m), i);
    if (word) steps.push({ ...choiceStep(`vocab-${i + 1}`, "words", t.vocabulary.instruction, word.hr_text, word.pl_text, pickDistractors(allVocab.map((v) => v.pl_text), word.pl_text, rand), i), section: "vocabulary" });
  });

  steps.push({
    id: "reading", stage: "practice", section: "reading", type: "reading",
    instructionTarget: own(t.reading.instruction),
    instruction: "Przeczytaj tekst i odpowiedz na pytania.",
    title: t.reading.title,
    text: t.reading.text.map((line) => ({ target: line, source: "" })),
    questions: t.reading.questions.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correct })),
  });

  const listen = listeningStep("listening", "practice", t.listening.dialogue, t.listening.questions, own(t.listening.instruction));
  if (listen) steps.push({ ...listen, section: "listening" });

  t.grammar.lessons.forEach((lid, i) => {
    const step = takeGap(`grammar-${i + 1}`, "structure", [lid]);
    if (step) steps.push({ ...step, section: "grammar", instructionTarget: own(t.grammar.instruction) });
  });

  t.translation.lessons.forEach((lid, i) => {
    const sentence = takeSentence([lid]);
    if (sentence) steps.push({ ...translateStep(`translation-${i + 1}`, "practice", sentence), section: "translation", instructionTarget: own(t.translation.instruction) });
  });

  steps.push({ ...freeStep("production", { ...t.production, instruction: "Napisz 2–4 zdania o sobie." }), section: "production", instructionTarget: own(t.production.instruction) });
  steps.push({ ...summaryStep([]), title: "Wynik testu A1", closing: own(t.finished) });
  return steps;
}

/* ------------------------------------------------------------------ */
/* Emisja                                                               */
/* ------------------------------------------------------------------ */

const MINUTES = { intro: 0.6, word: 0.45, vocabList: 1, listen: 1.2, structure: 1.2, choice: 0.4, translate: 0.8, gap: 0.5, order: 0.7, listening: 2, reading: 2.5, free: 2.5, summary: 0.4 };
function estimateMinutes(steps) {
  const total = steps.reduce((sum, step) => sum + (step.type === "dialog" ? 1 + step.turns.length * 0.35 : MINUTES[step.type] ?? 0.5), 0);
  return Math.max(8, Math.round(total));
}

function materialOf(bucket) {
  const sources = unique(bucket.lesson.source_url.split("|").map((s) => s.trim()));
  const toRecord = (r) => {
    const own = unique(r.source_url.split("|").map((s) => s.trim()));
    return {
      recordId: r.record_id, type: r.record_type, sequence: Number(r.sequence),
      hr: r.hr_text, pl: r.pl_text, lemma: r.lemma, partOfSpeech: r.part_of_speech,
      exerciseType: r.exercise_type, acceptedAnswers: splitAccepted(r.accepted_answers),
      notes: r.notes_pl, tags: r.tags.split("|").map((x) => x.trim()).filter(Boolean),
      ...(own.join("|") !== sources.join("|") ? { sources: own } : {}),
    };
  };
  return {
    sourceLessonId: bucket.lesson.lesson_id,
    grammarFocus: bucket.lesson.grammar_focus,
    communicativeGoal: bucket.lesson.communicative_goal,
    sources,
    records: [bucket.lesson, ...bucket.vocabulary, ...bucket.sentences, ...bucket.blueprints].map(toRecord),
  };
}

const HEADER = (what) => `// AUTO-GENERATED by scripts/generate-a1-curriculum.mjs — nie edytuj ręcznie.\n// ${what}\n// Źródło: curriculum/hr-a1/lexodromia_hr_A1_curriculum.csv (sha256 ${csvHash}…) + didactics.json\n`;
const json = (value) => JSON.stringify(value, null, 2);

const files = new Map();
const outline = [];

/** Ręcznie napisana lekcja demo (TypeScript) → obiekt, żeby dołączyć do niej materiał i audio z CSV. */
function loadDemoLesson() {
  const ts = createRequire(import.meta.url)("typescript");
  const { outputText } = ts.transpileModule(readFileSync(DEMO_LESSON_PATH, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  new Function("exports", "require", outputText)(exports, () => ({}));
  const lesson = structuredClone(exports.LESSON_A1_01_02);
  // Repliki lekcji demo (skąd jesteś, gdzie mieszkasz) są otwarte — dostają tę samą ramę co reszta A1.
  for (const step of lesson.steps) {
    if (step.type !== "dialog") continue;
    const partner = step.turns.find((t) => t.kind === "line")?.line.speaker;
    step.turns = step.turns.map((t) => (t.kind === "reply" ? replyTurn(lesson.lessonId, t.prompt, t.accepted, t.pattern, partner, { open: true }) : t));
  }
  return lesson;
}

// 1. Treść wszystkich lekcji.
const built = ordered.map((bucket) => {
  const n = lessonNo(bucket);
  const kind = kindOf(n);
  const moduleNo = Number(bucket.lesson.module_no);
  const order = n - (moduleNo - 1) * 5;
  const appId = `a1-${pad(moduleNo)}-${pad(order)}`;
  const vocabulary = bucket.vocabulary.map(vocabItem);
  const isOverride = Boolean(didactics.overrides?.[bucket.lesson.lesson_id]);
  // Lekcja demo zostaje w swoim pliku jako źródło; generator dołącza słownictwo z CSV.
  const content = isOverride
    ? { ...loadDemoLesson(), vocabulary }
    : (() => {
        const steps = kind === "test" ? buildTest(bucket) : kind === "spiral" ? buildSpiral(bucket) : kind === "review" ? buildReview(bucket) : buildRegular(bucket);
        return { lessonId: appId, ...(kind === "test" ? { mode: "test" } : {}), vocabulary, steps };
      })();
  // Powtórka, spirala i test nie mogą kopiować zadań z wcześniejszych lekcji.
  if (kind === "review" || kind === "spiral" || kind === "test") {
    for (const step of content.steps) {
      const sig = taskSignature(step);
      if (sig && usage.tasks.has(sig)) fail(`${bucket.lesson.lesson_id}: ${sig} kopiuje zadanie z ${usage.tasks.get(sig)}`);
    }
  }
  registerLesson(bucket.lesson.lesson_id, content.steps);
  return { bucket, n, kind, moduleNo, order, appId, isOverride, content, material: materialOf(bucket), fileName: `module-${pad(moduleNo)}/lesson-${pad(order)}.ts` };
});

// 2. Audio: manifest nagrań dla modułów z curriculum/hr-a1/audio.json + audioSrc tam, gdzie plik już istnieje.
const audioConfig = JSON.parse(readFileSync(AUDIO_CONFIG_PATH, "utf8"));
const previousManifest = existsSync(AUDIO_MANIFEST_PATH) ? JSON.parse(readFileSync(AUDIO_MANIFEST_PATH, "utf8")) : null;
const lessonsByModule = new Map(audioConfig.modules.map((m) => [m, built.filter((b) => b.moduleNo === m)]));
const audioManifest = buildManifest(audioConfig, previousManifest, lessonsByModule);
const audioStats = { attached: 0, missing: 0 };
const lessonsMissingAudio = [];
for (const lesson of built) {
  if (!audioConfig.modules.includes(lesson.moduleNo)) continue;
  const result = attachAudio(lesson.content, audioConfig, audioManifest, PUBLIC_DIR);
  audioStats.attached += result.attached;
  audioStats.missing += result.missing;
  if (result.missing) lessonsMissingAudio.push(`${lesson.appId} (${result.missing})`);
}

// 3. Emisja.
for (const { bucket, kind, moduleNo, order, appId, isOverride, content, material, fileName } of built) {
  const body = `import type { GeneratedLesson } from "../../../types";\n\nexport const LESSON: GeneratedLesson = {\n  content: ${json(content).replace(/\n/g, "\n  ")},\n  material: ${json(material).replace(/\n/g, "\n  ")},\n};\n`;
  files.set(fileName, HEADER(`${appId} · ${bucket.lesson.lesson_title_pl}${isOverride ? " (treść: src/curriculum/data/lessons/a1-01-02.ts)" : ""}`) + body);

  outline.push({
    moduleNo,
    moduleTitle: bucket.lesson.module_title_pl,
    lesson: {
      id: appId,
      moduleId: `a1-${pad(moduleNo)}`,
      order,
      title: bucket.lesson.lesson_title_pl,
      shortDescription: bucket.lesson.communicative_goal,
      estimatedMinutes: isOverride ? 12 : estimateMinutes(content.steps),
      status: "not_started",
      hasContent: true,
      kind,
      source: { lessonId: bucket.lesson.lesson_id, grammarFocus: bucket.lesson.grammar_focus, communicativeGoal: bucket.lesson.communicative_goal, sources: material.sources },
    },
    file: fileName,
  });
}

const modules = unique(outline.map((o) => o.moduleNo)).map((m) => {
  const items = outline.filter((o) => o.moduleNo === m);
  return {
    id: `a1-${pad(m)}`,
    levelId: "A1",
    order: m,
    title: items[0].moduleTitle,
    description: didactics.modules?.[String(m)]?.description ?? "",
    canDo: items.slice(0, 4).map((o) => lowerFirst(stripDot(o.lesson.shortDescription))),
    lessons: items.map((o) => o.lesson),
  };
});

files.set(
  "outline.ts",
  HEADER("Plan poziomu A1: 8 modułów × 5 lekcji") +
    `import type { CourseModule } from "../../types";\n\nexport const HR_A1_MODULES: CourseModule[] = ${json(modules)};\n`,
);
files.set(
  "lessons.ts",
  HEADER("Leniwe ładowanie treści lekcji (osobny chunk na lekcję)") +
    `import type { GeneratedLesson } from "../../types";\n\nexport const HR_A1_LESSONS: Record<string, () => Promise<GeneratedLesson>> = {\n${outline
      .map((o) => `  "${o.lesson.id}": () => import("./${o.file.replace(/\.ts$/, "")}").then((m) => m.LESSON),`)
      .join("\n")}\n};\n`,
);

if (errors.length) {
  console.error(`Generowanie nie powiodło się (${errors.length}):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Zapis albo sprawdzenie                                               */
/* ------------------------------------------------------------------ */

function listExisting(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listExisting(join(dir, e.name), base) : [relative(base, join(dir, e.name))],
  );
}

const manifestText = `${json(audioManifest)}\n`;
const audioReport = () => {
  const exists = (item) => existsSync(join(PUBLIC_DIR, item.audioPath));
  const present = audioManifest.items.filter(exists).length;
  console.log(
    `Audio (moduły ${audioManifest.modules.join(", ")}): ${audioManifest.items.length} unikalnych tekstów, ${audioManifest.characters} znaków; ` +
      `nagrania: ${present} istnieje, ${audioManifest.items.length - present} brakuje; audioSrc w lekcjach: ${audioStats.attached} (${audioStats.missing} czeka na pliki).`,
  );
  // Pokrycie per moduł: nagranie liczy się w module, w którym plik leży (teksty z wcześniejszych modułów są współdzielone).
  for (const m of audioManifest.modules) {
    const dir = `${audioConfig.pathPrefix}/module-${pad(m)}/`;
    const own = audioManifest.items.filter((item) => item.audioPath.startsWith(dir));
    const used = audioManifest.items.filter((item) => item.modules.includes(m));
    console.log(`  moduł ${pad(m)}: ${own.length} plików w module (${own.filter(exists).length} istnieje), używa ${used.length} nagrań łącznie z współdzielonymi`);
  }
  if (lessonsMissingAudio.length) console.log(`  lekcje z brakującymi nagraniami: ${lessonsMissingAudio.join(", ")}`);
  if (AUDIO_STRICT && present !== audioManifest.items.length) {
    console.error(`Brakuje ${audioManifest.items.length - present} nagrań. Uruchom: python tools/listening/generate_tts.py --course-manifest frontend/curriculum/hr-a1/audio-manifest.json, potem npm run curriculum:a1`);
    process.exitCode = 1;
  }
};

if (DRY) {
  console.log(`OK (dry): ${files.size} plików, ${records.length} rekordów CSV.`);
} else if (CHECK) {
  const stale = [];
  for (const [name, content] of files) {
    const path = join(OUT_DIR, name);
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) stale.push(name);
  }
  const extraFiles = listExisting(OUT_DIR).filter((f) => !files.has(f));
  if (!existsSync(AUDIO_MANIFEST_PATH) || readFileSync(AUDIO_MANIFEST_PATH, "utf8") !== manifestText) stale.push(relative(ROOT, AUDIO_MANIFEST_PATH));
  if (stale.length || extraFiles.length) {
    console.error(`Wygenerowane pliki są nieaktualne. Uruchom: npm run curriculum:a1\n${[...stale, ...extraFiles.map((f) => `${f} (zbędny)`)].map((f) => `- ${f}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`OK: ${files.size} plików aktualnych (40 lekcji, ${records.length} rekordów CSV).`);
  audioReport();
} else {
  rmSync(OUT_DIR, { recursive: true, force: true });
  for (const [name, content] of files) {
    const path = join(OUT_DIR, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  writeFileSync(AUDIO_MANIFEST_PATH, manifestText);
  console.log(`Wygenerowano ${files.size} plików w ${relative(ROOT, OUT_DIR)} (40 lekcji, ${records.length} rekordów CSV, poprawek: ${appliedCorrections.length}).`);
  audioReport();
}
if (warnings.length) console.warn(`Ostrzeżenia (${warnings.length}):\n- ${warnings.join("\n- ")}`);
