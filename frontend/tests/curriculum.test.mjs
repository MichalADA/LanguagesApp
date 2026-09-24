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
    assert.equal(material.records.filter((r) => r.type === 'vocabulary').length, 8, lesson.id);
    assert.equal(material.records.filter((r) => r.type === 'sentence').length, 6, lesson.id);
    assert.equal(material.records.filter((r) => r.type === 'exercise_blueprint').length, 3, lesson.id);
    assert.ok(material.sources.length > 0);
    assert.ok(!JSON.stringify(content).includes('http'), `${lesson.id}: URL w treści`);
  }
  const total = [...generated.values()].reduce((sum, g) => sum + g.material.records.length, 0);
  assert.equal(total, 720);
});

test('każda zwykła lekcja ma słownictwo i zdania, a słowa są podzielone na małe grupy z ćwiczeniem', () => {
  for (const lesson of lessons.filter((l) => l.kind === 'lesson')) {
    const { content } = generated.get(lesson.id);
    assert.equal(content.vocabulary.length, 8, lesson.id);
    if (lesson.id === 'a1-01-02') continue; // ręczna lekcja demo
    const types = content.steps.map((s) => s.type);
    assert.equal(types.filter((x) => x === 'word').length, 8, lesson.id);
    // Nigdy więcej niż 3 nowe słowa pod rząd bez ćwiczenia.
    let run = 0;
    for (const type of types) { run = type === 'word' ? run + 1 : 0; assert.ok(run <= 3, `${lesson.id}: ${run} słów pod rząd`); }
    for (const type of ['structure', 'gap', 'translate', 'order', 'dialog', 'free', 'summary']) assert.ok(types.includes(type), `${lesson.id}: brak ${type}`);
    assert.ok(types.indexOf('choice') < types.indexOf('structure'), `${lesson.id}: ćwiczenie ma być przed gramatyką`);
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
    for (const s of recalls) assert.ok(prevWords.has(s.prompt), `${review.id}: ${s.prompt} spoza modułu`);
    const translations = steps.filter((s) => s.type === 'translate');
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
