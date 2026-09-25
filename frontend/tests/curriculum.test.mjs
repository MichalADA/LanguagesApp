import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/* Minimalne środowisko przeglądarki dla playera (bez DOM). */
const storage = new Map();
globalThis.window = { addEventListener() {}, removeEventListener() {}, scrollTo() {}, setTimeout, clearTimeout };
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

/** Ładuje moduł TS/TSX z src (z zależnościami), podmieniając tylko kontekst aplikacji. */
const cache = new Map();
function resolveFile(from, id) {
  const base = id.startsWith('@/') ? join(SRC, id.slice(2)) : resolve(dirname(from), id);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) if (existsSync(candidate) && !candidate.endsWith('/')) { try { if (readFileSync(candidate)) return candidate; } catch { /* katalog */ } }
  throw new Error(`Nie znaleziono ${id} (z ${from})`);
}
function loadFile(file) {
  if (cache.has(file)) return cache.get(file);
  const source = readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  const exports = {};
  cache.set(file, exports);
  const req = (id) => {
    if (MOCKS && MOCKS[id]) return MOCKS[id];
    if (id.startsWith('.') || id.startsWith('@/')) return loadFile(resolveFile(file, id));
    return require(id);
  };
  new Function('require', 'exports', 'module', outputText)(req, exports, { exports });
  return exports;
}
async function load(path) { return loadFile(join(ROOT, path)); }
/** Dynamiczne import() w lessons.ts → synchroniczne ładowanie przez nasz loader. */
function loadLesson(file) { return loadFile(join(SRC, 'curriculum/data/hr-a1', file)).LESSON; }

const plDict = (await load('src/i18n/locales/pl.ts')).pl;
const { lookup, interpolate } = await load('src/i18n/types.ts');
const t = (key, params) => { const value = lookup(plDict, key); assert.ok(value, `brak tłumaczenia: ${key}`); return interpolate(value, params); };
const course = { id: 'pl-hr', specialCharacters: ['č', 'ć', 'đ', 'š', 'ž'], validation: { caseInsensitive: true, trimWhitespace: true, diacriticsMatter: true, foldMap: { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd' } } };
const MOCKS = {
  '@/i18n': { useT: () => t, useI18n: () => ({ t, locale: 'pl' }) },
  'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children) },
  '@/courses/CourseProvider': { useCourse: () => ({ course }) },
};

const { PL_HR_OUTLINE } = await load('src/curriculum/data/a1.ts');
const { deriveLevel, nextLessonId } = await load('src/curriculum/progress.ts');
const { checkLessonAnswer, checkLessonAnswerDetailed, reviewFreeResponse } = await load('src/curriculum/answers.ts');
const { queueLessonVocabulary, readVocabularyQueue } = await load('src/curriculum/srs.ts');
const { LessonPlayer } = await load('src/curriculum/player/LessonPlayer.tsx');
const rules = course.validation;

const a1 = PL_HR_OUTLINE.levels.find((level) => level.id === 'A1');
const lessons = a1.modules.flatMap((m) => m.lessons);
const fileOf = (lesson) => `module-${lesson.moduleId.slice(-2)}/lesson-${String(lesson.order).padStart(2, '0')}.ts`;
const generated = new Map(lessons.map((lesson) => [lesson.id, loadLesson(fileOf(lesson))]));

/* ------------------------------------------------------------------ */

test('A1 ma dokładnie 8 modułów po 5 lekcji, 40 unikalnych id i wymagane pola', () => {
  assert.equal(a1.modules.length, 8);
  for (const module of a1.modules) assert.equal(module.lessons.length, 5, module.id);
  assert.equal(lessons.length, 40);
  assert.equal(new Set(lessons.map((l) => l.id)).size, 40);
  assert.equal(new Set(lessons.map((l) => l.source.lessonId)).size, 40);
  for (const lesson of lessons) {
    for (const key of ['id', 'moduleId', 'order', 'title', 'shortDescription', 'estimatedMinutes', 'status']) assert.ok(lesson[key] !== undefined, `${lesson.id}.${key}`);
    assert.equal(lesson.hasContent, true, lesson.id);
  }
  assert.deepEqual(PL_HR_OUTLINE.levels.map((l) => [l.id, l.available]), [['A1', true], ['A2', false], ['B1', false], ['B2', false]]);
  assert.equal(a1.modules[1].title, 'Ja i moje otoczenie');
});

test('każda lekcja ma treść i pełny materiał z CSV (bez URL-i w treści playera)', () => {
  for (const lesson of lessons) {
    const { content, material } = generated.get(lesson.id);
    assert.equal(content.lessonId, lesson.id);
    assert.ok(content.steps.length >= 8, `${lesson.id}: za mało kroków`);
    assert.equal(material.records.filter((r) => r.type === 'lesson').length, 1);
    // Rdzeń: 8 słów i 6 zdań na lekcję; moduły 02–08 mają dodatkowo słownictwo uzupełniające i zdania przykładowe.
    const words = material.records.filter((r) => r.type === 'vocabulary');
    const sentences = material.records.filter((r) => r.type === 'sentence');
    assert.equal(words.filter((r) => r.tags.includes('active')).length, 8, lesson.id);
    assert.equal(sentences.filter((r) => !r.tags.includes('example')).length, 6, lesson.id);
    assert.ok(words.every((r) => r.tags.includes('active') || r.tags.includes('supplement')), lesson.id);
    if (lesson.moduleId === 'a1-01') assert.equal(words.length, 8, `${lesson.id}: moduł 01 bez zmian`);
    assert.equal(material.records.filter((r) => r.type === 'exercise_blueprint').length, 3, lesson.id);
    assert.ok(material.sources.length > 0);
    assert.ok(!JSON.stringify(content).includes('http'), `${lesson.id}: URL w treści`);
  }
  const total = [...generated.values()].reduce((sum, g) => sum + g.material.records.length, 0);
  assert.ok(total >= 720, `${total} rekordów`);
});

test('każda zwykła lekcja ma słownictwo i zdania, a słowa są podzielone na małe grupy z ćwiczeniem', () => {
  for (const lesson of lessons.filter((l) => l.kind === 'lesson')) {
    const { content } = generated.get(lesson.id);
    assert.ok(content.vocabulary.length >= 8 && content.vocabulary.length <= 25, `${lesson.id}: ${content.vocabulary.length} słów`);
    if (lesson.id === 'a1-01-02') continue; // ręczna lekcja demo
    const types = content.steps.map((s) => s.type);
    // Osobne karty tylko dla rdzenia; słowa uzupełniające są jedną listą z nagraniami.
    assert.equal(types.filter((x) => x === 'word').length, 8, lesson.id);
    const extra = content.vocabulary.length - 8;
    if (extra) {
      const list = content.steps.find((s) => s.id === 'more-words');
      assert.equal(list?.items.length, extra, `${lesson.id}: lista słów uzupełniających`);
      assert.ok(content.steps.some((s) => s.id === 'check-more'), `${lesson.id}: brak ćwiczenia do słów uzupełniających`);
    }
    // Nigdy więcej niż 3 nowe słowa pod rząd bez ćwiczenia.
    let run = 0;
    for (const type of types) { run = type === 'word' ? run + 1 : 0; assert.ok(run <= 3, `${lesson.id}: ${run} słów pod rząd`); }
    for (const type of ['structure', 'gap', 'translate', 'order', 'dialog', 'free', 'summary']) assert.ok(types.includes(type), `${lesson.id}: brak ${type}`);
    assert.ok(types.indexOf('choice') < types.indexOf('structure'), `${lesson.id}: ćwiczenie ma być przed gramatyką`);
  }
});

test('moduły 02–08: dialog wzorcowy przed rozmową i nagrania w manifeście dla całej treści', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-a1/audio-manifest.json'), 'utf8'));
  assert.deepEqual(manifest.modules, [1, 2, 3, 4, 5, 6, 7, 8]);
  // Manifest łączy warianty różniące się tylko wielkością liter i interpunkcją („Hvala!” / „hvala”).
  const key = (t) => t.toLocaleLowerCase('hr').replace(/[.,!?;:„”"«»…]/g, '').replace(/\s+/g, ' ').trim();
  const known = new Set(manifest.items.map((i) => key(i.text)));
  const spoken = { has: (t) => known.has(key(t)) };
  for (const lesson of lessons.filter((l) => l.kind === 'lesson' && l.moduleId !== 'a1-01')) {
    const steps = generated.get(lesson.id).content.steps;
    const model = steps.find((s) => s.id === 'model');
    assert.ok(model && model.type === 'listen' && model.lines.length >= 4, `${lesson.id}: brak dialogu wzorcowego`);
    assert.ok(steps.indexOf(model) < steps.findIndex((s) => s.type === 'dialog'), `${lesson.id}: dialog wzorcowy po rozmowie`);
    for (const line of model.lines) assert.ok(spoken.has(line.text), `${lesson.id}: brak nagrania „${line.text}”`);
    for (const item of steps.find((s) => s.id === 'more-words').items) assert.ok(spoken.has(item.target), `${lesson.id}: brak nagrania „${item.target}”`);
    for (const example of steps.find((s) => s.id === 'examples').examples) assert.ok(spoken.has(example.target), `${lesson.id}: brak nagrania „${example.target}”`);
  }
});

test('odpowiedzi wzorcowe przechodzą walidację, a opcje wyboru są spójne', () => {
  for (const lesson of lessons) {
    for (const step of generated.get(lesson.id).content.steps) {
      if (step.type === 'translate' || step.type === 'gap' || step.type === 'order') {
        assert.equal(checkLessonAnswer(step.accepted[0], step.accepted, rules), 'hit', `${lesson.id}/${step.id}`);
      }
      if (step.type === 'dialog') {
        for (const turn of step.turns.filter((x) => x.kind === 'reply')) assert.equal(checkLessonAnswer(turn.suggestion, turn.accepted, rules, turn.pattern), 'hit', `${lesson.id}: ${turn.suggestion}`);
      }
      if (step.type === 'choice') {
        assert.equal(new Set(step.options).size, step.options.length, `${lesson.id}/${step.id}: powtórzone opcje`);
        assert.ok(step.correctIndex >= 0 && step.correctIndex < step.options.length);
      }
      if (step.type === 'order') {
        const norm = (words) => words.map((w) => w.toLowerCase()).sort().join(' ');
        assert.equal(norm(step.tokens), norm(step.accepted[0].replace(/[.,!?]/g, '').split(' ')), `${lesson.id}/${step.id}`);
      }
      if (step.type === 'reading' || step.type === 'listening') for (const q of step.questions) assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length, `${lesson.id}: ${q.prompt}`);
    }
  }
});

test('powtórki modułów korzystają z materiału czterech poprzednich lekcji i kończą się „Po tym module potrafisz”', () => {
  for (const review of lessons.filter((l) => l.kind === 'review')) {
    const module = a1.modules.find((m) => m.id === review.moduleId);
    const previous = module.lessons.filter((l) => l.order < 5).map((l) => generated.get(l.id).material);
    const prevWords = new Set(previous.flatMap((m) => m.records.filter((r) => r.type === 'vocabulary').map((r) => r.hr)));
    const prevSentencesPl = new Set(previous.flatMap((m) => m.records.filter((r) => r.type === 'sentence').map((r) => r.pl)));
    const steps = generated.get(review.id).content.steps;
    const recalls = steps.filter((s) => s.id.startsWith('recall-'));
    assert.ok(recalls.length >= 3, review.id);
    // Przypominanie głównie produkcyjne: uczeń wpisuje słowo po chorwacku (tylko ostatnie jest rozpoznaniem).
    const produced = recalls.filter((s) => s.type === 'translate');
    assert.ok(produced.length >= 3 && produced.length > recalls.length / 2, `${review.id}: recall ma sprawdzać produkcję`);
    for (const s of recalls) {
      const word = s.type === 'translate' ? s.accepted[0] : s.prompt;
      assert.ok(prevWords.has(word), `${review.id}: ${word} spoza modułu`);
    }
    const translations = steps.filter((s) => s.type === 'translate' && !s.id.startsWith('recall-'));
    assert.ok(translations.length >= 2, review.id);
    for (const s of translations) assert.ok(prevSentencesPl.has(s.prompt), `${review.id}: ${s.prompt} spoza modułu`);
    for (const type of ['gap', 'order', 'dialog', 'free']) assert.ok(steps.some((s) => s.type === type), `${review.id}: brak ${type}`);
    assert.ok(!steps.some((s) => s.type === 'word'), `${review.id}: nowe słowa jako osobne ekrany`);
    const summary = steps.at(-1);
    assert.deepEqual(summary.canDo.length, 4, review.id);
  }
});

test('lekcje 36 i 37 wprowadzają perfekt i futur na zdaniach z CSV', () => {
  const l36 = generated.get('a1-08-01').content;
  const l37 = generated.get('a1-08-02').content;
  const text36 = JSON.stringify(l36);
  for (const sentence of ['Jučer sam radio.', 'Jučer sam radila.', 'Bio sam kod kuće.', 'Bila sam kod kuće.', 'Išao sam u grad.', 'Vidjela sam prijateljicu.']) assert.ok(text36.includes(sentence), sentence);
  const text37 = JSON.stringify(l37);
  for (const sentence of ['Sutra ću raditi.', 'Sutra ću učiti hrvatski.', 'Kasnije ću se odmoriti.', 'Hoćeš li ići sa mnom?']) assert.ok(text37.includes(sentence), sentence);
  assert.ok(!l36.steps.some((s) => s.type === 'structure' && s.table), 'bez tabel odmiany');
});

test('lekcja 40 działa jako test: sekcje, polecenia po chorwacku i tryb testu', () => {
  const content = generated.get('a1-08-05').content;
  assert.equal(content.mode, 'test');
  const sections = new Set(content.steps.map((s) => s.section).filter(Boolean));
  assert.deepEqual([...sections].sort(), ['grammar', 'listening', 'production', 'reading', 'translation', 'vocabulary']);
  assert.ok(content.steps.find((s) => s.type === 'listening').lines.every((l) => l.audio?.startsWith('/audio/')));
  assert.equal(content.steps.find((s) => s.type === 'reading').instructionTarget.target, 'Pročitaj i odaberi točan odgovor.');
  assert.equal(content.steps.at(-1).closing.target, 'Test je završen.');
});

/** Przechodzi lekcję w playerze jak użytkownik (odpowiada czymkolwiek) aż do podsumowania. */
async function walk(content) {
  let completed = 0;
  let renderer;
  const element = React.createElement(LessonPlayer, { content, header: { position: 'A1', title: 'T', meta: 'M', closeTo: '/m' }, nextHref: null, moduleHref: '/m', onComplete: () => { completed++; } });
  await act(async () => { renderer = Renderer.create(element); });
  const byClass = (type, cls) => renderer.root.findAll((n) => n.type === type && typeof n.props.className === 'string' && n.props.className.split(' ').includes(cls));
  for (let guard = 0; guard < 400; guard++) {
    if (byClass('div', 'step-summary').length) break;
    const footer = byClass('button', 'btn-lg')[0];
    if (footer && !footer.props.disabled) { await act(async () => footer.props.onClick()); continue; }
    const choice = byClass('button', 'choice').find((n) => n.props['aria-disabled'] !== true);
    if (choice) { await act(async () => choice.props.onClick()); continue; }
    const token = byClass('button', 'order-token').find((n) => !n.props.disabled && !n.props.className.includes('placed'));
    if (token) { await act(async () => token.props.onClick()); continue; }
    const input = renderer.root.findAll((n) => n.type === 'input' && !n.props.disabled && !n.props.readOnly)[0];
    if (input) { await act(async () => input.props.onChange({ target: { value: 'x' } })); continue; }
    const skip = byClass('button', 'btn-ghost').find((n) => n.props.children === t('curriculum.player.skip'));
    if (skip) { await act(async () => skip.props.onClick()); continue; }
    throw new Error(`Player utknął w ${content.lessonId}`);
  }
  const summary = byClass('div', 'step-summary');
  assert.equal(summary.length, 1, `${content.lessonId}: nie doszedł do podsumowania`);
  const isTestResult = byClass('div', 'test-result').length === 1;
  act(() => renderer.unmount());
  return { completed, isTestResult };
}

test('wszystkie 40 lekcji da się otworzyć i przejść w playerze bez błędów', async () => {
  for (const lesson of lessons) {
    const { completed, isTestResult } = await walk(generated.get(lesson.id).content);
    assert.equal(completed, 1, `${lesson.id}: onComplete`);
    assert.equal(isTestResult, lesson.kind === 'test', `${lesson.id}: wynik testu`);
  }
});

test('walidacja: brak diakrytyków to „near” z poprawną pisownią, błędna gramatyka nie przechodzi', () => {
  assert.deepEqual(checkLessonAnswerDetailed('Zivim u Poljskoj', ['Živim u Poljskoj.'], rules), { verdict: 'near', expected: 'Živim u Poljskoj.' });
  assert.equal(checkLessonAnswer('Račun molim', ['Račun, molim.'], rules), 'hit');
  assert.equal(checkLessonAnswer('Živim u Poljska.', ['Živim u Poljskoj.'], rules), 'miss');
  assert.equal(checkLessonAnswer('Sam dobro.', ['Dobro sam.'], rules), 'miss');
  assert.equal(checkLessonAnswer('Zivim u Krakovu', [], rules, '^(ja )?živim u \\p{L}+$'), 'near');
  const free = reviewFreeResponse('Ja sam iz Poljske. Zivim u Gdanjsku.', [{ any: ['iz'], label: 'a' }, { any: ['živim'], label: 'b' }], rules);
  assert.equal(free.sentences, 2);
  assert.deepEqual(free.missing, []);
});

test('postęp: nowy użytkownik zaczyna od lekcji 1, lekcja liczy się raz, kolejka słów jest idempotentna', () => {
  const fresh = deriveLevel(a1, new Set());
  assert.equal(fresh.completedCount, 0);
  assert.equal(fresh.current.lesson.lesson.id, 'a1-01-01');
  const first12 = new Set(lessons.slice(0, 12).map((l) => l.id));
  const view = deriveLevel(a1, first12);
  assert.equal(view.completedCount, 12);
  assert.equal(view.current.lesson.lesson.id, 'a1-03-03');
  assert.equal(view.modules[3].status, 'locked');
  // Set nie dubluje ponownie ukończonej lekcji.
  assert.equal(deriveLevel(a1, new Set([...first12, 'a1-01-01'])).completedCount, 12);
  const all = deriveLevel(a1, new Set(lessons.map((l) => l.id)));
  assert.equal(all.current, null);
  assert.equal(all.percent, 100);
  assert.equal(nextLessonId(a1, 'a1-01-05'), 'a1-02-01');
  assert.equal(nextLessonId(a1, 'a1-08-05'), null);

  const vocab = generated.get('a1-01-01').content.vocabulary;
  queueLessonVocabulary('guest', 'pl-hr', 'a1-01-01', vocab);
  queueLessonVocabulary('guest', 'pl-hr', 'a1-01-01', vocab);
  const queue = readVocabularyQueue('guest', 'pl-hr');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].items[0].recordId, 'A1-0002');
});

test('generator: wygenerowane pliki są aktualne względem CSV', () => {
  const run = spawnSync(process.execPath, ['scripts/generate-a1-curriculum.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});

test('generator: zgłasza duplikaty record_id i brak rekordu lesson', () => {
  const csv = readFileSync(join(ROOT, 'curriculum/hr-a1/lexodromia_hr_A1_curriculum.csv'), 'utf8');
  const lines = csv.split(/\r?\n/);
  const broken = [lines[0], ...lines.slice(1).filter((line) => !line.startsWith('A1-0001,')), lines[2]].join('\n');
  const dir = mkdtempSync(join(tmpdir(), 'curriculum-'));
  const file = join(dir, 'broken.csv');
  writeFileSync(file, broken);
  const run = spawnSync(process.execPath, ['scripts/generate-a1-curriculum.mjs', '--dry', '--csv', file], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Duplikat record_id: A1-0002/);
  assert.match(run.stderr, /a1-01: brak rekordu lesson/);
});

/* ------------------------------------------------------------------ */
/* Regresja po audycie A1 (Etap 1)                                     */
/* ------------------------------------------------------------------ */

const { recordForms, tokens: hrTokens } = await import(join(ROOT, 'scripts/lib/hr-morphology.mjs'));
const reply = (id, n) => generated.get(id).content.steps.filter((s) => s.type === 'dialog').flatMap((s) => s.turns.filter((t) => t.kind === 'reply'))[n];
const stepOf = (id, stepId) => generated.get(id).content.steps.find((s) => s.id === stepId);
const verdictOfReply = (id, n, answer) => { const t = reply(id, n); return checkLessonAnswer(answer, t.accepted, rules, t.pattern); };

test('audyt: naturalne, poprawne odpowiedzi ucznia są akceptowane', () => {
  // Te same odpowiedzi, które w audycie przechodziły w 5 przypadkach na 32.
  const dialog = [
    ['a1-02-04', 0, 'Da, imam.'], ['a1-04-01', 0, 'Pijem mlijeko.'], ['a1-04-01', 1, 'Jedem jogurt i voće.'], ['a1-04-01', 1, 'Jedem piletinu.'],
    ['a1-05-02', 0, 'Idem u pekaru.'], ['a1-05-02', 0, 'Idem na tržnicu.'], ['a1-06-01', 0, 'U slobodno vrijeme pjevam.'], ['a1-06-01', 0, 'Gledam serije.'],
    ['a1-06-02', 0, 'Volim tenis.'], ['a1-06-02', 1, 'Trčim dva puta tjedno.'], ['a1-03-01', 1, 'Navečer kuham.'], ['a1-03-01', 1, 'Navečer gledam film.'],
    ['a1-02-02', 1, 'On je nastavnik.'], ['a1-06-03', 0, 'Danas je vruće.'], ['a1-06-03', 0, 'Oblačno je.'], ['a1-07-01', 1, 'Putujem trajektom.'],
    ['a1-01-01', 0, 'Loše sam.'], ['a1-01-01', 1, 'Vidimo se!'], ['a1-04-03', 0, 'Jednu bijelu kavu, molim.'], ['a1-04-03', 0, 'Mogu li dobiti kavu?'],
    ['a1-05-04', 0, 'Tražim kruh i mlijeko.'], ['a1-08-01', 0, 'Jučer sam gledala film.'], ['a1-08-01', 0, 'Jučer sam bila u gradu.'], ['a1-08-02', 0, 'Sutra ću igrati nogomet.'],
    // rodzaj w odpowiedziach o sobie i naturalne warianty
    ['a1-03-05', 2, 'U subotu sam slobodna.'], ['a1-03-05', 2, 'Slobodna sam.'], ['a1-08-03', 3, 'Jučer sam bila kod kuće.'], ['a1-08-04', 1, 'Jučer sam gledala film.'],
    ['a1-04-03', 0, 'Htjela bih sok.'], ['a1-08-02', 0, 'Sutra ću se odmoriti.'], ['a1-08-02', 0, 'Radit ću sutra.'], ['a1-06-02', 0, 'Volim plivati i trčati.'],
    ['a1-02-05', 1, 'Moja sestra je vesela.'], ['a1-03-01', 1, 'Navečer se odmaram.'], ['a1-06-05', 1, 'Vikendom igram tenis.'],
  ];
  for (const [id, n, answer] of dialog) assert.equal(verdictOfReply(id, n, answer), 'hit', `${id} [${reply(id, n).prompt}] „${answer}”`);
  const translations = [
    ['a1-02-03', 'translate-1', 'Danas sam umorna.'], ['a1-04-02', 'translate-2', 'Gladna sam.'], ['a1-01-01', 'translate-1', 'Ja sam odlično.'],
    ['a1-03-02', 'translate-1', 'Ja danas ne radim.'], ['a1-04-03', 'translate-1', 'Molim račun.'], ['a1-05-04', 'translate-1', 'Koliko košta?'],
  ];
  for (const [id, stepId, answer] of translations) {
    const s = stepOf(id, stepId);
    assert.equal(checkLessonAnswer(answer, s.accepted, rules, s.pattern), 'hit', `${id}/${stepId} «${s.prompt}» „${answer}”`);
  }
});

test('audyt: odpowiedzi niezgodne z poleceniem lub błędne gramatycznie nadal są odrzucane', () => {
  const wrong = [
    ['a1-04-01', 0, 'Pijem voda.'], ['a1-04-01', 0, 'Ja pije kavu.'], ['a1-04-01', 0, 'Piję wodę.'], ['a1-04-01', 1, 'Jedem piletina.'],
    ['a1-05-02', 0, 'Idem u pekara.'], ['a1-03-01', 1, 'Navečer kuhati.'], ['a1-03-01', 1, 'Navečer kuha.'],
    ['a1-08-01', 0, 'Jučer sam radim.'], ['a1-08-01', 0, 'Jučer radila.'], ['a1-08-01', 0, 'Sam radila jučer.'],
    ['a1-08-02', 0, 'Sutra ću igram nogomet.'], ['a1-08-02', 0, 'Sutra igrati nogomet.'],
    ['a1-02-03', 1, 'Moja sestra je sretan.'], ['a1-02-03', 0, 'Moj brat je visoka i mlada.'], ['a1-02-05', 1, 'Moja sestra je sretan.'],
    ['a1-07-01', 1, 'Putujem trajekt.'], ['a1-06-02', 0, 'Volim tenisa.'], ['a1-01-01', 0, 'Sam dobro.'], ['a1-02-01', 0, 'Ovo je moj sestra.'],
    // polecenie mówi konkretnie, co powiedzieć — inna treść to błąd, nawet jeśli zdanie jest poprawne
    ['a1-02-03', 1, 'Moja sestra je vesela.'], ['a1-07-04', 1, 'Sunčam se.'],
  ];
  for (const [id, n, answer] of wrong) assert.equal(verdictOfReply(id, n, answer), 'miss', `${id} [${reply(id, n).prompt}] „${answer}”`);
  // tłumaczenie w lekcji o rodzaju (perfekt) zostaje jednoznaczne
  assert.equal(checkLessonAnswer('Jučer sam radila.', stepOf('a1-08-01', 'translate-1').accepted, rules), 'miss');
});

/** Formy wszystkich słów kursu: forma → rekordy (lemat), do sprawdzania „czy uczeń to już widział”. */
const vocabRecords = [...generated.values()].flatMap((g) => g.material.records.filter((r) => r.type === 'vocabulary'))
  .map((r) => ({ key: r.recordId, hr_text: r.hr, lemma: r.lemma, part_of_speech: r.partOfSpeech }));
const formIndex = new Map();
const formsByRecord = new Map();
for (const r of vocabRecords) {
  const forms = new Set(Object.values(recordForms(r)).flat().flatMap((f) => f.split(/\s+/)).filter((f) => f && f !== 'se'));
  formsByRecord.set(r.key, { record: r, forms });
  for (const f of forms) formIndex.set(f, [...(formIndex.get(f) ?? []), r.key]);
}

test('żadne ćwiczenie nie wymaga słowa, którego uczeń wcześniej nie widział (ani formy znanego lematu)', () => {
  // Słowa funkcyjne identyczne jak po polsku.
  const FUNCTION_WORDS = new Set(['ne', 'i', 'a', 'da']);
  // Znane przypadki kolejności materiału — do naprawy w Etapie 2 (zmiana kolejności / treści), nie w walidatorze.
  const ETAP_2 = new Set(['a1-02-05|banci', 'a1-03-03|vlak', 'a1-03-03|dolazi', 'a1-03-05|često', 'a1-03-05|čitam', 'a1-04-05|karticom']);
  const seenTokens = new Set();
  const seenRecords = new Set();
  const show = (text) => { for (const t of hrTokens(text)) { seenTokens.add(t); for (const r of formIndex.get(t) ?? []) seenRecords.add(r); } };
  const known = (t) => FUNCTION_WORDS.has(t) || seenTokens.has(t) || (formIndex.get(t) ?? []).some((r) => seenRecords.has(r));
  const problems = [];
  const require = (lessonId, what, text) => {
    for (const t of hrTokens(text)) if (!known(t) && !ETAP_2.has(`${lessonId}|${t}`)) problems.push(`${lessonId} ${what} „${text}” → ${t}`);
  };
  for (const lesson of lessons) {
    for (const s of generated.get(lesson.id).content.steps) {
      if (s.instructionTarget) show(s.instructionTarget.target);
      switch (s.type) {
        case 'intro': s.goals.forEach((g) => typeof g !== 'string' && show(g.target)); break;
        case 'word': show(s.target); if (s.example) show(s.example.target); (s.related ?? []).forEach((x) => show(x.target)); break;
        case 'structure': (s.examples ?? []).forEach((x) => show(x.target)); (s.table ?? []).forEach((g) => g.rows.forEach((r) => { show(r.base); show(r.form); })); break;
        case 'vocabList': s.items.forEach((x) => show(x.target)); break;
        case 'listen': case 'listening': s.lines.forEach((x) => show(x.text)); break;
        case 'reading': s.text.forEach((x) => show(x.target)); break;
        case 'choice': if (s.targetText !== 'options') show(s.prompt); else s.options.forEach(show); break;
        case 'translate': require(lesson.id, 'tłumaczenie', s.accepted[0]); show(s.accepted[0]); break;
        case 'gap': require(lesson.id, 'luka', s.accepted[0]); show(`${s.before} ${s.accepted[0]} ${s.after}`); break;
        case 'order': show(s.accepted[0]); break; // elementy są podane
        case 'dialog':
          for (const t of s.turns) {
            if (t.kind === 'line') show(t.line.text);
            else { require(lesson.id, `dialog [${t.prompt}]`, t.suggestion); show(t.suggestion); }
          }
          break;
        case 'summary': s.recap.forEach((x) => show(x.target)); break;
        default: break;
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('przykład przy karcie słowa zawiera to słowo albo formę tego samego lematu', () => {
  const bad = [];
  for (const lesson of lessons) {
    const { content, material } = generated.get(lesson.id);
    for (const s of content.steps.filter((x) => x.type === 'word' && x.example)) {
      const record = material.records.find((r) => r.type === 'vocabulary' && r.hr === s.target);
      if (!record) continue; // ręczna lekcja demo ma własne karty
      const { forms } = formsByRecord.get(record.recordId);
      const words = hrTokens(s.target);
      const example = hrTokens(s.example.target);
      const ok = words.length > 1 ? ` ${example.join(' ')} `.includes(` ${words.join(' ')} `) || example.some((t) => forms.has(t)) && words.every((w) => example.some((t) => t === w || forms.has(t)))
        : example.some((t) => forms.has(t));
      if (!ok) bad.push(`${lesson.id} ${s.target} → „${s.example.target}”`);
    }
  }
  assert.deepEqual(bad, []);
  // przypadki z audytu: przykład oparty tylko na początku wyrazu
  const exampleOf = (id, target) => generated.get(id).content.steps.find((x) => x.type === 'word' && x.target === target)?.example?.target;
  assert.notEqual(exampleOf('a1-01-04', 'dva'), 'Imam dvadeset šest godina.');
  assert.notEqual(exampleOf('a1-04-02', 'sladak'), 'Volim čokoladu i sladoled.');
  assert.notEqual(exampleOf('a1-04-02', 'slan'), 'Volim čokoladu i sladoled.');
  assert.notEqual(exampleOf('a1-01-03', 'on'), 'Ona se zove Ana.');
  assert.notEqual(exampleOf('a1-02-02', 'prijateljica'), 'Ovo je moj prijatelj Marko.');
  assert.notEqual(exampleOf('a1-02-02', 'učitelj'), 'Moja susjeda je učiteljica.');
  assert.notEqual(exampleOf('a1-02-02', 'liječnik'), 'Ana je liječnica.');
});

test('powtórki, Wielka powtórka i test nie kopiują zadań z wcześniejszych lekcji', () => {
  const gapText = (s) => `${s.before}|${s.accepted[0]}|${s.after}`;
  const sig = (s) => (s.type === 'translate' ? `T:${s.prompt}` : s.type === 'gap' ? `G:${gapText(s)}` : s.type === 'order' ? `O:${s.accepted[0]}` : s.type === 'choice' ? `C:${s.prompt}|${s.options[s.correctIndex]}` : null);
  const first = new Map();
  const copies = [];
  for (const lesson of lessons) {
    for (const s of generated.get(lesson.id).content.steps) {
      const k = sig(s);
      if (!k) continue;
      if (first.has(k) && ['review', 'spiral', 'test'].includes(lesson.kind)) copies.push(`${lesson.id}: ${k} (= ${first.get(k)})`);
      if (!first.has(k)) first.set(k, lesson.id);
    }
  }
  assert.deepEqual(copies, []);
  // test końcowy nie pyta o słowa z Wielkiej powtórki
  const spiralWords = new Set(generated.get('a1-08-04').content.steps.filter((s) => s.id.startsWith('recall-')).map((s) => s.accepted[0]));
  const testWords = generated.get('a1-08-05').content.steps.filter((s) => s.section === 'vocabulary').map((s) => s.prompt);
  assert.equal(testWords.length, 6);
  for (const w of testWords) assert.ok(!spiralWords.has(w), `test powtarza słowo ze spirali: ${w}`);
  // spirala przypomina słowa produkcyjnie
  assert.ok([...spiralWords].length >= 5);
  assert.ok(generated.get('a1-08-04').content.steps.filter((s) => s.id.startsWith('recall-')).every((s) => s.type === 'translate'));
});

/* ------------------------------------------------------------------ */
/* Otwarte repliki w dialogach A1                                      */
/* ------------------------------------------------------------------ */

const { OPEN_REPLIES } = await import(join(ROOT, 'tests/fixtures/open-replies.mjs'));
const allReplies = [...generated.entries()].flatMap(([id, g]) => g.content.steps.filter((s) => s.type === 'dialog')
  .flatMap((s) => s.turns.filter((t) => t.kind === 'reply')).map((turn, n) => ({ id, n, turn })));

test('otwarte repliki: „Bok dobro sam” na „Kako si?” to HIT', () => {
  assert.equal(verdictOfReply('a1-01-01', 0, 'Bok dobro sam'), 'hit');
  for (const answer of ['Dobro sam.', 'Dobro sam, hvala.', 'Bok, dobro sam.', 'Bok, dobro sam, hvala.', 'Super sam.', 'Odlično sam.']) {
    // interpunkcja i wielkość liter nie wpływają na wynik
    for (const variant of [answer, answer.toLocaleUpperCase('hr'), answer.toLocaleLowerCase('hr').replace(/[.,!?]/g, ''), `${answer.replace(/[.]$/, '')}!!!`]) {
      assert.equal(verdictOfReply('a1-01-01', 0, variant), 'hit', `„${variant}”`);
      assert.equal(verdictOfReply('a1-08-04', 0, variant), 'hit', `a1-08-04 „${variant}”`);
    }
  }
  for (const wrong of ['Sam dobro.', 'Dobro si.', 'Zovem se Ana.']) assert.equal(verdictOfReply('a1-01-01', 0, wrong), 'miss', `„${wrong}”`);
});

test('otwarte repliki: naturalne odpowiedzi ze słownictwa kursu przechodzą, błędne nie', () => {
  for (const f of OPEN_REPLIES) {
    const t = reply(f.lesson, f.reply);
    assert.ok(t, `${f.lesson}#${f.reply}: brak repliki`);
    for (const answer of f.hit) assert.equal(verdictOfReply(f.lesson, f.reply, answer), 'hit', `${f.lesson}#${f.reply} [${t.prompt}] „${answer}”`);
    for (const answer of f.miss ?? []) assert.equal(verdictOfReply(f.lesson, f.reply, answer), 'miss', `${f.lesson}#${f.reply} [${t.prompt}] przepuszcza „${answer}”`);
  }
});

test('otwarte repliki: lista w teście = repliki oznaczone „open” w didactics (+ lekcja demo)', () => {
  const didactics = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-a1/didactics.json'), 'utf8'));
  const flagged = ['a1-01-02#0', 'a1-01-02#1'];
  for (const [key, lesson] of Object.entries(didactics.lessons)) {
    const n = Number(key.slice(3));
    const appId = `a1-${String(Math.ceil(n / 5)).padStart(2, '0')}-${String(((n - 1) % 5) + 1).padStart(2, '0')}`;
    (lesson.dialog?.turns ?? []).filter((t) => t.reply).forEach((t, i) => { if (t.reply.open) flagged.push(`${appId}#${i}`); });
  }
  assert.deepEqual(OPEN_REPLIES.map((f) => `${f.lesson}#${f.reply}`).sort(), flagged.sort());
});

test('wszystkie repliki: interpunkcja, wielkość liter i grzecznościowa rama nie zmieniają wyniku', () => {
  assert.ok(allReplies.length >= 100);
  const open = new Set(OPEN_REPLIES.map((f) => `${f.lesson}#${f.reply}`));
  for (const { id, n, turn } of allReplies) {
    assert.ok(turn.pattern, `${id}#${n}: replika bez wzorca`);
    const s = turn.suggestion;
    const bare = s.toLocaleLowerCase('hr').replace(/[.,!?]/g, '');
    const variants = [s, bare, s.toLocaleUpperCase('hr'), `${bare}!`, `${s} Hvala.`];
    if (open.has(`${id}#${n}`)) variants.push(`Bok, ${s}`, `Bok ${bare} hvala`, `${bare}, a ti?`);
    for (const v of variants) assert.equal(checkLessonAnswer(v, turn.accepted, rules, turn.pattern), 'hit', `${id}#${n} [${turn.prompt}] „${v}”`);
  }
});
