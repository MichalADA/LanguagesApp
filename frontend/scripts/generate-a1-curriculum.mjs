#!/usr/bin/env node
/**
 * Generator kursu HR A1: CSV → TypeScript.
 *
 *   node scripts/generate-a1-curriculum.mjs          # generuje src/curriculum/data/hr-a1/**
 *   node scripts/generate-a1-curriculum.mjs --check  # tylko sprawdza, czy wygenerowane pliki są aktualne
 *   node scripts/generate-a1-curriculum.mjs --dry --csv inny.csv  # sama walidacja innego pliku (testy)
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, "curriculum/hr-a1");
const argValue = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null);
const CSV_PATH = argValue("--csv") ? resolve(argValue("--csv")) : join(SOURCE_DIR, "lexodromia_hr_A1_curriculum.csv");
const DRY = process.argv.includes("--dry");
const DIDACTICS_PATH = join(SOURCE_DIR, "didactics.json");
const LISTENING_PATH = join(ROOT, "public/data/listening/hr-a1-dialogues.json");
const OUT_DIR = join(ROOT, "src/curriculum/data/hr-a1");
const CHECK = process.argv.includes("--check");

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
  proper_noun: "nazwa własna", verb_form: "forma czasownika", auxiliary: "forma pomocnicza",
};

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

/** Zdanie z CSV z pełną listą akceptowanych wariantów. */
function sentenceOf(lessonId, seq) {
  const bucket = byLesson.get(lessonId);
  const record = bucket?.sentences.find((r) => Number(r.sequence) === Number(seq));
  if (!record) { fail(`Brak zdania ${lessonId}:${seq}`); return { hr: "?", pl: "?", accepted: [] }; }
  const accepted = unique([record.hr_text, ...splitAccepted(record.accepted_answers), ...(extra[record.record_id] ?? []), ...(extra[`${lessonId}:${seq}`] ?? [])]);
  return { hr: record.hr_text, pl: record.pl_text, accepted, recordId: record.record_id };
}

function vocabOf(lessonId, seq) {
  const record = byLesson.get(lessonId)?.vocabulary.find((r) => Number(r.sequence) === Number(seq));
  if (!record) { fail(`Brak słowa ${lessonId}:${seq}`); return null; }
  return record;
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

/** Dopasowanie słowa do zdania (dokładnie albo wspólny rdzeń ≥ 3 liter). */
function exampleFor(word, sentences) {
  const w = fold(word.hr_text);
  const tokens = (s) => fold(s.hr_text).split(/\s+/);
  const exact = sentences.find((s) => ` ${fold(s.hr_text)} `.includes(` ${w} `));
  if (exact) return exact;
  if (w.includes(" ")) return undefined;
  const stem = w.slice(0, Math.max(3, Math.min(w.length - 2, 5)));
  return sentences.find((s) => tokens(s).some((t) => t.length >= 3 && t.startsWith(stem)));
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
function choiceStep(id, stage, instruction, prompt, correct, distractors, rotate, explanation) {
  const pool = unique(distractors.filter((d) => fold(d) !== fold(correct))).slice(0, 2);
  if (pool.length < 2) fail(`${id}: za mało dystraktorów dla „${prompt}”`);
  const options = [...pool];
  const at = rotate % 3;
  options.splice(at, 0, correct);
  return { id, stage, type: "choice", instruction, prompt, options, correctIndex: at, ...(explanation ? { explanation } : {}) };
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

function dialogStep(lessonId, spec) {
  const turns = spec.turns.map((turn) => {
    if (turn.line !== undefined) {
      const s = resolveSentence(turn.line, lessonId);
      return { kind: "line", line: { speaker: spec.partner, text: s.hr, translation: s.pl } };
    }
    if (turn.say) return { kind: "line", line: { speaker: spec.partner, text: turn.say, translation: turn.pl } };
    const reply = turn.reply;
    const accepted = unique(reply.accept.flatMap((a) => (typeof a === "number" || /^a1-\d\d:\d$/.test(a) ? resolveSentence(a, lessonId).accepted : [a])));
    if (!accepted.length) fail(`${lessonId}: odpowiedź w dialogu bez wariantów`);
    if (reply.pattern) {
      try { new RegExp(reply.pattern, "u"); } catch (e) { fail(`${lessonId}: błędny pattern ${reply.pattern}: ${e.message}`); }
      // Wzorzec ma przepuszczać przynajmniej sugerowaną odpowiedź — inaczej to błąd w danych.
      const canon = (x) => x.toLocaleLowerCase("hr").replace(/[.,!?;:„”"]/g, " ").replace(/\s+/g, " ").trim();
      for (const answer of accepted) {
        if (!new RegExp(reply.pattern, "u").test(canon(answer))) warn(`${lessonId}: wariant „${answer}” spoza wzorca (akceptowany z listy)`);
      }
    }
    return { kind: "reply", prompt: reply.prompt, accepted, ...(reply.pattern ? { pattern: reply.pattern } : {}), suggestion: accepted[0] };
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

const summaryStep = (recap, extraFields = {}) => ({ id: "summary", stage: "summary", type: "summary", title: "Lekcja ukończona", recap, ...extraFields });

/* ---------- Zwykła lekcja ---------- */

function buildRegular(bucket) {
  const { lesson, vocabulary, sentences } = bucket;
  const id = lesson.lesson_id;
  const n = lessonNo(bucket);
  const d = didactics.lessons[id];
  const rand = seeded(n * 7919);
  const all = sentences.map((r) => sentenceOf(id, r.sequence));
  const steps = [];

  steps.push({
    id: "intro", stage: "intro", type: "intro", title: lesson.lesson_title_pl,
    body: `Po tej lekcji będziesz umieć ${lowerFirst(stripDot(lesson.communicative_goal))}.`,
    goalsTitle: "Powiesz między innymi",
    goals: all.slice(0, 3).map((s) => `${s.hr} — ${s.pl}`),
  });

  if (kindOf(n) === "conversation") {
    steps.push(vocabListStep("words", "words", "Słowa, które przydadzą się w rozmowie", vocabulary));
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
        steps.push(choiceStep(`check-${g + 1}`, "words", "Jak powiesz to po chorwacku?", asked.pl_text, asked.hr_text, pickDistractors(hr, asked.hr_text, rand), n + g));
      } else {
        steps.push(choiceStep(`check-${g + 1}`, "words", "Co znaczy to słowo?", asked.hr_text, asked.pl_text, pickDistractors(pl, asked.pl_text, rand), n + g));
      }
    });
  }

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
  const extraChoices = (d.choices ?? []).map((c, i) => ({ id: `choice-${i + 1}`, stage: "practice", type: "choice", instruction: c.instruction, prompt: c.prompt, options: c.options, correctIndex: c.correct, ...(c.explanation ? { explanation: c.explanation } : {}) }));
  const [t1, ...rest] = translations;
  if (n % 2) practice.push(comprehend, ...extraChoices, t1, order, ...rest);
  else practice.push(t1, order, ...extraChoices, comprehend, ...rest);
  steps.push(...practice.filter(Boolean));

  if (d.listening) {
    const step = listeningStep("listening", "dialog", d.listening);
    if (step) steps.push(step);
  }
  if (d.dialog) steps.push(dialogStep(id, d.dialog));
  if (d.free) steps.push(freeStep("free", d.free));

  const recapCount = kindOf(n) === "conversation" ? 5 : 4;
  steps.push(summaryStep(all.slice(0, recapCount).map((s) => `${s.hr} — ${s.pl}`)));
  return steps;
}

/* ---------- Powtórka modułu ---------- */

function previousLessons(bucket) {
  const m = bucket.lesson.module_no;
  return ordered.filter((b) => b.lesson.module_no === m && lessonNo(b) < lessonNo(bucket));
}

/** Zdanie do tłumaczenia z wcześniejszej lekcji (z jej wariantami). */
function reviewTranslation(prev, pickLast) {
  const spec = didactics.lessons[prev.lesson.lesson_id];
  const list = spec?.translate ?? [];
  const chosen = list.length ? list[pickLast ? list.length - 1 : 0] : { sentence: 4 };
  return translateStep("", "practice", sentenceOf(prev.lesson.lesson_id, chosen.sentence), chosen.accept);
}

function buildReview(bucket) {
  const { lesson, vocabulary, sentences } = bucket;
  const id = lesson.lesson_id;
  const n = lessonNo(bucket);
  const d = didactics.lessons[id];
  const rand = seeded(n * 104729);
  const prev = previousLessons(bucket);
  const steps = [];
  const goals = prev.map((p) => stripDot(p.lesson.communicative_goal));

  steps.push({
    id: "intro", stage: "intro", type: "intro", title: lesson.lesson_title_pl,
    body: `Powtórka modułu „${lesson.module_title_pl}”. Połączysz materiał z lekcji ${lessonNo(prev[0])}–${lessonNo(prev[prev.length - 1])} i sprawdzisz go w rozmowie.`,
    goalsTitle: "Sprawdzisz, czy umiesz",
    goals: goals.map(lowerFirst),
  });

  // 1. Krótkie rozpoznanie: po jednym słowie z trzech lekcji.
  const prevVocab = prev.flatMap((p) => p.vocabulary);
  prev.slice(0, 3).forEach((p, i) => {
    const word = p.vocabulary[(n + i * 3) % p.vocabulary.length];
    const others = prevVocab.map((v) => v.pl_text);
    steps.push(choiceStep(`recall-${i + 1}`, "words", "Co znaczy to słowo?", word.hr_text, word.pl_text, pickDistractors(others, word.pl_text, rand), n + i));
  });
  steps.push(vocabListStep("vocab", "words", "Przydatne słowa na koniec modułu", vocabulary, "Nie musisz ich jeszcze znać na pamięć — pojawią się w rozmowie."));

  // 2. Luka i uporządkowanie zdania z wcześniejszych lekcji.
  const gapSource = [...prev].reverse().find((p) => didactics.lessons[p.lesson.lesson_id]?.gap);
  if (gapSource) {
    const g = didactics.lessons[gapSource.lesson.lesson_id].gap;
    const step = gapStep("gap", "structure", sentenceOf(gapSource.lesson.lesson_id, g.sentence), g.word);
    if (step) steps.push(step);
  }
  const orderSource = prev[0];
  const orderSpec = didactics.lessons[orderSource.lesson.lesson_id];
  const orderSentence = orderSpec?.comprehend && sentenceOf(orderSource.lesson.lesson_id, orderSpec.comprehend).hr.split(/\s+/).length >= 3
    ? sentenceOf(orderSource.lesson.lesson_id, orderSpec.comprehend)
    : sentenceOf(orderSource.lesson.lesson_id, 1);
  steps.push(orderStep("order", "structure", orderSentence, rand));

  // 3. Tłumaczenia z trzech lekcji modułu.
  [prev[0], prev[1], prev[3]].filter(Boolean).forEach((p, i) => {
    const t = reviewTranslation(p, i % 2 === 0);
    steps.push({ ...t, id: `translate-${i + 1}` });
  });

  // 4. Dialog i zadanie komunikacyjne.
  if (d.dialog) steps.push(dialogStep(id, d.dialog));
  if (d.canDo) steps.push(freeStep("can-do", d.canDo));

  const all = sentences.map((r) => sentenceOf(id, r.sequence));
  steps.push(summaryStep(all.slice(0, 4).map((s) => `${s.hr} — ${s.pl}`), { canDo: goals.map(lowerFirst) }));
  return steps;
}

/* ---------- Wielka powtórka A1 (spirala) ---------- */

function buildSpiral(bucket) {
  const { lesson, vocabulary, sentences } = bucket;
  const id = lesson.lesson_id;
  const d = didactics.lessons[id];
  const rand = seeded(39 * 15485863);
  const s = d.spiral;
  const allVocab = ordered.filter((b) => lessonNo(b) < 39).flatMap((b) => b.vocabulary);
  const steps = [];

  steps.push({
    id: "intro", stage: "intro", type: "intro", title: lesson.lesson_title_pl,
    body: "Krótkie serie z całego poziomu: słowa, miejsca, jedzenie, hobby, podróże — i trzy czasy: teraz, wczoraj, jutro.",
    goalsTitle: "W tej powtórce",
    goals: ["rozpoznasz słowa ze wszystkich modułów", "uzupełnisz zdania w czasie teraźniejszym, przeszłym i przyszłym", "przetłumaczysz zdania z codziennych sytuacji", "porozmawiasz o sobie, wczoraj i jutrze"],
  });

  // Seria 1: słowa (co drugie słowo przeplatane tłumaczeniem, żeby nie było długiego ciągu).
  const translations = s.translations.map((ref, i) => {
    const [lid] = ref.split(":");
    const spec = (didactics.lessons[lid]?.translate ?? []).find((t) => `${lid}:${t.sentence}` === ref);
    return { ...translateStep(`translate-${i + 1}`, "practice", resolveSentence(ref, id), spec?.accept), id: `translate-${i + 1}` };
  });
  s.recognition.forEach((ref, i) => {
    const [lid, seq] = ref.split(":");
    const word = vocabOf(lid, Number(seq));
    if (!word) return;
    steps.push(choiceStep(`recall-${i + 1}`, "words", "Co znaczy to słowo?", word.hr_text, word.pl_text, pickDistractors(allVocab.map((v) => v.pl_text), word.pl_text, rand), i));
  });
  steps.push(vocabListStep("vocab", "words", "Słowa o nauce języka", vocabulary));

  // Seria 2: trzy czasy i konstrukcje w kontekście.
  steps.push(structureStep(id, d.grammar));
  s.gaps.forEach((lid, i) => {
    const g = didactics.lessons[lid]?.gap;
    if (!g) { fail(`${id}: lekcja ${lid} nie ma luki do spirali`); return; }
    const step = gapStep(`gap-${i + 1}`, "structure", sentenceOf(lid, g.sentence), g.word);
    if (step) steps.push(step);
  });

  // Seria 3: tłumaczenia z różnych modułów + układanie zdania.
  steps.push(translations[0], translations[1], orderStep("order", "practice", resolveSentence(s.order, id), rand), ...translations.slice(2));

  // Seria 4: rozmowa i samodzielna wypowiedź.
  steps.push(dialogStep(id, d.dialog), freeStep("can-do", d.canDo));

  const own = sentences.map((r) => sentenceOf(id, r.sequence));
  steps.push(summaryStep(own.slice(2).map((x) => `${x.hr} — ${x.pl}`)));
  return steps;
}

/* ---------- Test A1 ---------- */

function buildTest(bucket) {
  const { lesson, vocabulary } = bucket;
  const id = lesson.lesson_id;
  const t = didactics.lessons[id].test;
  const rand = seeded(40 * 32452843);
  const own = (seq) => bi(sentenceOf(id, seq));
  const allVocab = ordered.filter((b) => lessonNo(b) < 40).flatMap((b) => b.vocabulary);
  const steps = [];

  steps.push({
    id: "intro", stage: "intro", type: "intro", title: lesson.lesson_title_pl,
    body: "Test obejmuje materiał całego poziomu A1. Nie ma tu zaliczenia ani oblania — na końcu zobaczysz, co masz dobrze opanowane, a co warto powtórzyć.",
    goalsTitle: "Sześć krótkich części",
    goals: ["słownictwo", "czytanie", "słuchanie", "gramatyka w kontekście", "tłumaczenie", "krótka wypowiedź"],
  });
  steps.push(vocabListStep("instructions", "intro", "Słowa z poleceń testu", vocabulary, "Polecenia w teście są po chorwacku — pod spodem zawsze zobaczysz tłumaczenie."));

  t.vocabulary.items.forEach((ref, i) => {
    const [lid, seq] = ref.split(":");
    const word = vocabOf(lid, Number(seq));
    if (!word) return;
    steps.push({ ...choiceStep(`vocab-${i + 1}`, "words", t.vocabulary.instruction, word.hr_text, word.pl_text, pickDistractors(allVocab.map((v) => v.pl_text), word.pl_text, rand), i), section: "vocabulary" });
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

  t.grammar.gaps.forEach((g, i) => {
    const step = gapStep(`grammar-${i + 1}`, "structure", resolveSentence(g.ref, id), g.word);
    if (step) steps.push({ ...step, section: "grammar", instructionTarget: own(t.grammar.instruction) });
  });

  t.translation.items.forEach((ref, i) => {
    const [lid] = ref.split(":");
    const spec = (didactics.lessons[lid]?.translate ?? []).find((x) => `${lid}:${x.sentence}` === ref);
    steps.push({ ...translateStep(`translation-${i + 1}`, "practice", resolveSentence(ref, id), spec?.accept), section: "translation", instructionTarget: own(t.translation.instruction) });
  });

  steps.push({ ...freeStep("production", { ...t.production, instruction: "Napisz 2–4 zdania o sobie." }), section: "production", instructionTarget: own(t.production.instruction) });
  steps.push({ ...summaryStep([]), title: "Wynik testu A1", closing: own(t.finished) });
  return steps;
}

/* ------------------------------------------------------------------ */
/* Emisja                                                               */
/* ------------------------------------------------------------------ */

const MINUTES = { intro: 0.6, word: 0.45, vocabList: 1, structure: 1.2, choice: 0.4, translate: 0.8, gap: 0.5, order: 0.7, listening: 2, reading: 2.5, free: 2.5, summary: 0.4 };
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

for (const bucket of ordered) {
  const n = lessonNo(bucket);
  const kind = kindOf(n);
  const moduleNo = Number(bucket.lesson.module_no);
  const order = n - (moduleNo - 1) * 5;
  const appId = `a1-${pad(moduleNo)}-${pad(order)}`;
  const fileName = `module-${pad(moduleNo)}/lesson-${pad(order)}.ts`;
  const vocabulary = bucket.vocabulary.map(vocabItem);
  const material = materialOf(bucket);
  const isOverride = Boolean(didactics.overrides?.[bucket.lesson.lesson_id]);

  let steps;
  let body;
  if (isOverride) {
    // Ręcznie napisana lekcja demo zostaje; dołączamy do niej słownictwo i materiał z CSV.
    body = `import type { GeneratedLesson } from "../../../types";\nimport { LESSON_A1_01_02 } from "../../lessons/a1-01-02";\n\nexport const LESSON: GeneratedLesson = {\n  content: { ...LESSON_A1_01_02, vocabulary: ${json(vocabulary).replace(/\n/g, "\n  ")} },\n  material: ${json(material).replace(/\n/g, "\n  ")},\n};\n`;
    steps = null;
  } else {
    steps = kind === "test" ? buildTest(bucket) : kind === "spiral" ? buildSpiral(bucket) : kind === "review" ? buildReview(bucket) : buildRegular(bucket);
    const content = { lessonId: appId, ...(kind === "test" ? { mode: "test" } : {}), vocabulary, steps };
    body = `import type { GeneratedLesson } from "../../../types";\n\nexport const LESSON: GeneratedLesson = {\n  content: ${json(content).replace(/\n/g, "\n  ")},\n  material: ${json(material).replace(/\n/g, "\n  ")},\n};\n`;
  }
  files.set(fileName, HEADER(`${appId} · ${bucket.lesson.lesson_title_pl}`) + body);

  outline.push({
    moduleNo,
    moduleTitle: bucket.lesson.module_title_pl,
    lesson: {
      id: appId,
      moduleId: `a1-${pad(moduleNo)}`,
      order,
      title: bucket.lesson.lesson_title_pl,
      shortDescription: bucket.lesson.communicative_goal,
      estimatedMinutes: steps ? estimateMinutes(steps) : 12,
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

if (DRY) {
  console.log(`OK (dry): ${files.size} plików, ${records.length} rekordów CSV.`);
} else if (CHECK) {
  const stale = [];
  for (const [name, content] of files) {
    const path = join(OUT_DIR, name);
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) stale.push(name);
  }
  const extraFiles = listExisting(OUT_DIR).filter((f) => !files.has(f));
  if (stale.length || extraFiles.length) {
    console.error(`Wygenerowane pliki są nieaktualne. Uruchom: npm run curriculum:a1\n${[...stale, ...extraFiles.map((f) => `${f} (zbędny)`)].map((f) => `- ${f}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`OK: ${files.size} plików aktualnych (40 lekcji, ${records.length} rekordów CSV).`);
} else {
  rmSync(OUT_DIR, { recursive: true, force: true });
  for (const [name, content] of files) {
    const path = join(OUT_DIR, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  console.log(`Wygenerowano ${files.size} plików w ${relative(ROOT, OUT_DIR)} (40 lekcji, ${records.length} rekordów CSV, poprawek: ${appliedCorrections.length}).`);
}
if (warnings.length) console.warn(`Ostrzeżenia (${warnings.length}):\n- ${warnings.join("\n- ")}`);
