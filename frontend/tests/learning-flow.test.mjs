/**
 * Pełna ścieżka nauki: lekcja → ćwiczenia → ocena → zaliczenie → zapis słów → FSRS.
 * Testy mechanizmów z src/curriculum: grading.ts, session.ts, srs.ts i LessonPlayer.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import ts from 'typescript';
import { mountLesson, walkLesson } from './fixtures/lesson-walker.mjs';
import { datasetIndex, phraseKey, reviewRefFor, sameMeaning } from '../scripts/lib/review-identity.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

const storage = new Map();
const events = [];
globalThis.window = { addEventListener() {}, removeEventListener() {}, scrollTo() {}, setTimeout, clearTimeout, dispatchEvent: (e) => events.push(e.type) };
globalThis.Event = class { constructor(type) { this.type = type; } };
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const cache = new Map();
function resolveFile(from, id) {
  const base = id.startsWith('@/') ? join(SRC, id.slice(2)) : resolve(dirname(from), id);
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), base]) if (existsSync(candidate) && /\.tsx?$/.test(candidate)) return candidate;
  throw new Error(`Nie znaleziono ${id} (z ${from})`);
}
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  const exports = {};
  cache.set(file, exports);
  const req = (id) => (MOCKS[id] ? MOCKS[id] : id.startsWith('.') || id.startsWith('@/') ? load(resolveFile(file, id)) : require(id));
  new Function('require', 'exports', 'module', outputText)(req, exports, { exports });
  return exports;
}
const src = (path) => load(join(ROOT, path));

const MOCKS = {};
const plDict = src('src/i18n/locales/pl.ts').pl;
const enDict = src('src/i18n/locales/en.ts').en;
const { lookup, interpolate } = src('src/i18n/types.ts');
const t = (key, params) => { const value = lookup(plDict, key); assert.ok(value, `brak tłumaczenia: ${key}`); assert.ok(lookup(enDict, key), `brak tłumaczenia EN: ${key}`); return interpolate(value, params); };
const course = { id: 'pl-hr', specialCharacters: ['č', 'ć', 'đ', 'š', 'ž'], validation: { caseInsensitive: true, trimWhitespace: true, diacriticsMatter: true, foldMap: { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd' } } };
Object.assign(MOCKS, {
  '@/i18n': { useT: () => t, useI18n: () => ({ t, locale: 'pl' }) },
  'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children) },
  '@/courses/CourseProvider': { useCourse: () => ({ course }) },
});

const grading = src('src/curriculum/grading.ts');
const session = src('src/curriculum/session.ts');
const srs = src('src/curriculum/srs.ts');
const { LessonPlayer } = src('src/curriculum/player/LessonPlayer.tsx');
const lessonFile = (level, file) => src(`src/curriculum/data/${level}/${file}`).LESSON;
const lesson = lessonFile('hr-a1', 'module-02/lesson-01.ts');
const testLesson = lessonFile('hr-a1', 'module-08/lesson-05.ts');
const options = (content, extra = {}) => ({ React, Renderer, act, LessonPlayer, t, content, ...extra });

/* ---------- Ocena ---------- */

const choice = (id) => ({ id, type: 'choice', stage: 'practice', instruction: '', prompt: '', options: ['a', 'b', 'c'], correctIndex: 0 });
const translate = (id) => ({ id, type: 'translate', stage: 'practice', instruction: '', prompt: '', accepted: ['x'] });

test('ocena: wpisanie zdania waży więcej niż wybór, poprawka daje połowę punktu, brak wyniku = 0', () => {
  const steps = [choice('c1'), choice('c2'), translate('t1'), { id: 'summary', type: 'summary', stage: 'summary', title: '', recap: [] }];
  // Dwa trafione wybory + błędne tłumaczenie: 2/5 punktów, mimo że „2 z 3 odpowiedzi”.
  const recognitionOnly = grading.evaluateLesson(steps, { c1: { correct: 1, total: 1 }, c2: { correct: 1, total: 1 }, t1: { correct: 0, total: 1 } });
  assert.equal(recognitionOnly.correct, 2);
  assert.equal(recognitionOnly.score, 2 / 5);
  assert.equal(recognitionOnly.passed, false);
  assert.deepEqual(recognitionOnly.mistakes, ['t1']);
  // Poprawione tłumaczenie: 2 + 1.5 = 3.5 / 5 = 70% → zaliczone.
  const fixed = grading.evaluateLesson(steps, { c1: { correct: 1, total: 1 }, c2: { correct: 1, total: 1 }, t1: { correct: 0, total: 1, fixed: 1 } });
  assert.equal(fixed.score, 0.7);
  assert.equal(fixed.passed, true);
  assert.deepEqual(fixed.mistakes, []);
  // Odwrotnie: tłumaczenie dobrze, oba wybory źle → 3/5 = 60% → jeszcze nie.
  assert.equal(grading.evaluateLesson(steps, { c1: { correct: 0, total: 1 }, c2: { correct: 0, total: 1 }, t1: { correct: 1, total: 1 } }).passed, false);
  // Pominięte ćwiczenie (brak wyniku) nie może dać zaliczenia.
  const skipped = grading.evaluateLesson(steps, { c1: { correct: 1, total: 1 }, c2: { correct: 1, total: 1 } });
  assert.deepEqual(skipped.unanswered, ['t1']);
  assert.equal(skipped.passed, false);
  // Zadanie dodatkowe (słowa z listy uzupełniającej) nie wpływa na zaliczenie.
  const withOptional = [...steps.slice(0, 3), { ...translate('extra'), optional: true }, steps[3]];
  const ok = { c1: { correct: 1, total: 1 }, c2: { correct: 1, total: 1 }, t1: { correct: 1, total: 1 } };
  assert.equal(grading.evaluateLesson(withOptional, { ...ok, extra: { correct: 0, total: 1 } }).score, 1);
  assert.equal(grading.evaluateLesson(withOptional, ok).passed, true, 'pominięte zadanie dodatkowe nie blokuje');
  // Wynik niepasujący do kroku (np. zmieniony zapis) jest ignorowany.
  assert.equal(grading.evaluateLesson(steps, { c1: { correct: 5, total: 1 }, c2: { correct: 1, total: 1 }, t1: { correct: 1, total: 1 } }).unanswered[0], 'c1');
});

test('ocena testu: liczy się pierwsze podejście i każda sekcja musi mieć co najmniej połowę', () => {
  const steps = [
    { ...choice('v1'), section: 'vocabulary' },
    { ...choice('v2'), section: 'vocabulary' },
    { ...translate('t1'), section: 'translation' },
    { ...translate('t2'), section: 'translation' },
  ];
  const all = { v1: { correct: 1, total: 1 }, v2: { correct: 1, total: 1 }, t1: { correct: 1, total: 1 }, t2: { correct: 1, total: 1 } };
  assert.equal(grading.evaluateLesson(steps, all, 'test').passed, true);
  // 6/8 punktów = 75%, ale słownictwo 0/2 → sekcja poniżej progu.
  const weak = grading.evaluateLesson(steps, { ...all, v1: { correct: 0, total: 1 }, v2: { correct: 0, total: 1 } }, 'test');
  assert.equal(weak.firstTry, 0.75);
  assert.deepEqual(weak.weakSections, ['vocabulary']);
  assert.equal(weak.passed, false);
  // Poprawki z rundy błędów nie zmieniają wyniku testu.
  const retried = grading.evaluateLesson(steps, { ...all, t1: { correct: 0, total: 1, fixed: 1 }, t2: { correct: 0, total: 1, fixed: 1 } }, 'test');
  assert.equal(retried.passed, false);
  assert.deepEqual(retried.mistakes, []);
});

test('runda błędów: poprawka liczy się tylko za błędy z pierwszego podejścia', () => {
  assert.deepEqual(grading.applyRetry({ correct: 0, total: 1 }, { correct: 1, total: 1 }), { correct: 0, total: 1, fixed: 1 });
  assert.deepEqual(grading.applyRetry({ correct: 0, total: 1 }, { correct: 0, total: 1 }), { correct: 0, total: 1, fixed: 0 });
  assert.deepEqual(grading.applyRetry({ correct: 2, total: 3 }, { correct: 3, total: 3 }), { correct: 2, total: 3, fixed: 1 });
  assert.deepEqual(grading.applyRetry({ correct: 1, total: 3, fixed: 1 }, { correct: 3, total: 3 }), { correct: 1, total: 3, fixed: 2 });
});

/* ---------- Wznawianie ---------- */

test('wznawianie: krok i wyniki wracają po odświeżeniu, osobno dla profilu i lekcji', async () => {
  storage.clear();
  const key = session.sessionKey('user-1', 'pl-hr', lesson.content.lessonId);
  const ctx = await mountLesson(options(lesson.content, { storageKey: key }));
  await ctx.drive('right', { stopAfter: 25 });
  const before = ctx.currentStep();
  ctx.unmount();
  const saved = JSON.parse(storage.get(key));
  assert.equal(saved.stepId, before.id);
  assert.ok(Object.keys(saved.results).length > 0, 'zapisane wyniki ćwiczeń');
  // Inny profil i inna lekcja nie widzą tego zapisu.
  assert.equal(storage.get(session.sessionKey('guest', 'pl-hr', lesson.content.lessonId)), undefined);

  const again = await mountLesson(options(lesson.content, { storageKey: key }));
  assert.equal(again.currentStep().id, before.id, 'ten sam krok po odświeżeniu');
  assert.equal(again.byClass('div', 'lesson-resume').length, 1, 'komunikat o wznowieniu');
  // „Zacznij od początku” czyści zapis.
  await again.click(again.buttonWith(t('curriculum.player.restart')));
  assert.equal(again.currentStep().id, lesson.content.steps[0].id);
  // Dokończenie lekcji poprawnie: zaliczenie i brak zapisu (kolejne otwarcie zaczyna od nowa).
  const result = await again.drive('right');
  assert.equal(result.completed, 1);
  assert.equal(storage.get(key), undefined);
  again.unmount();
});

test('wznawianie: zmieniony zapis nie przeskakuje ćwiczeń ani nie zalicza lekcji', async () => {
  storage.clear();
  const key = session.sessionKey('user-1', 'pl-hr', lesson.content.lessonId);
  const firstExercise = lesson.content.steps.findIndex(grading.isScored);
  // Zapis „jestem w podsumowaniu” bez wyników.
  storage.set(key, JSON.stringify({ v: 1, signature: session.lessonSignature(lesson.content.steps), stepId: 'summary', results: { bogus: { correct: 9, total: 1 } }, savedAt: 1 }));
  const restored = session.restoreLessonSession(key, lesson.content.steps);
  assert.equal(restored.index, firstExercise, 'najpóźniej pierwsze ćwiczenie bez wyniku');
  assert.deepEqual(restored.results, {});
  const ctx = await mountLesson(options(lesson.content, { storageKey: key }));
  assert.equal(ctx.currentStep().id, lesson.content.steps[firstExercise].id);
  assert.equal(ctx.state.completed, 0);
  ctx.unmount();

  // Nieczytelny zapis = start od początku.
  storage.set(key, '{nie json');
  assert.equal(session.restoreLessonSession(key, lesson.content.steps), null);
});

test('wznawianie: nowa wersja lekcji zachowuje pasujące wyniki i sygnalizuje zmianę', () => {
  storage.clear();
  const key = 'k';
  const steps = lesson.content.steps;
  const scored = steps.filter(grading.isScored);
  const results = Object.fromEntries(scored.slice(0, 3).map((s) => [s.id, { correct: 1, total: grading.expectedTotal(s) }]));
  session.saveLessonSession(key, steps, steps.indexOf(scored[3]), results);
  // Lekcja dostała nowy krok na początku i straciła jedno ćwiczenie.
  const changed = [{ id: 'new-intro', type: 'intro', stage: 'intro', title: '', body: '', goals: [] }, ...steps.filter((s) => s.id !== scored[1].id)];
  const restored = session.restoreLessonSession(key, changed);
  assert.equal(restored.changed, true);
  assert.deepEqual(Object.keys(restored.results).sort(), [scored[0].id, scored[2].id].sort());
  // Wznawiamy na pierwszym ćwiczeniu bez wyniku (to, które teraz nie ma odpowiedzi), nie dalej.
  assert.equal(changed[restored.index].id, changed.find((s) => grading.isScored(s) && !restored.results[s.id]).id);
});

test('ponowne otwarcie zaliczonej lekcji zaczyna od nowa', async () => {
  storage.clear();
  const key = 'done';
  session.saveLessonSession(key, lesson.content.steps, lesson.content.steps.length - 1, {});
  const ctx = await mountLesson(options(lesson.content, { storageKey: key, alreadyCompleted: true }));
  assert.equal(ctx.currentStep().id, lesson.content.steps[0].id);
  ctx.unmount();
});

/* ---------- Runda błędów ---------- */

test('runda błędów: po złych odpowiedziach można przećwiczyć błędy; zaliczenie wymaga dość punktów', async () => {
  storage.clear();
  const ctx = await mountLesson(options(lesson.content));
  const wrong = await ctx.drive('wrong');
  assert.equal(wrong.completed, 0);
  assert.equal(wrong.mistakes, true);
  assert.ok(ctx.byClass('p', 'summary-verdict').length, 'komunikat, że lekcja nie jest zaliczona');
  // Runda błędów odpowiedziana poprawnie: wraca do podsumowania, ale 0% + połowa za poprawki < 70%.
  await ctx.click(ctx.buttonWith(t('curriculum.player.retryMistakes', { n: 0 }).replace(/\s*\(0\)$/, '')));
  assert.ok(ctx.byClass('p', 'lesson-retry-note').length, 'tryb poprawy błędów');
  const afterRetry = await ctx.drive('right');
  assert.equal(afterRetry.completed, 0);
  assert.equal(afterRetry.mistakes, false);
  // Jedyna droga dalej: zacząć od nowa i odpowiedzieć dobrze.
  await ctx.click(ctx.buttonWith(t('curriculum.player.restart')));
  assert.equal((await ctx.drive('right')).completed, 1);
  ctx.unmount();
});

test('test poziomu: błędne odpowiedzi → „Rozwiąż test ponownie”, poprawne → zaliczony', async () => {
  storage.clear();
  const ctx = await mountLesson(options(testLesson.content));
  const wrong = await ctx.drive('wrong');
  assert.equal(wrong.isTestResult, true);
  assert.equal(wrong.completed, 0);
  await ctx.click(ctx.buttonWith(t('curriculum.player.testRetake')));
  assert.equal((await ctx.drive('right')).completed, 1);
  assert.ok(ctx.byClass('span', 'test-verdict').some((n) => n.props.className.includes('pass')));
  ctx.unmount();
});

test('po błędzie widać poprawną odpowiedź i regułę z materiału lekcji', async () => {
  const gapLesson = [1, 2, 3, 4].map((n) => lessonFile('hr-a1', `module-03/lesson-0${n}.ts`)).find((l) => l.content.steps.some((s) => s.type === 'gap' && s.rule));
  assert.ok(gapLesson, 'lekcja z regułą przy luce');
  const gap = gapLesson.content.steps.find((s) => s.type === 'gap' && s.rule);
  const content = { lessonId: 'gap', vocabulary: [], steps: [gap, { id: 'summary', type: 'summary', stage: 'summary', title: 'Koniec', recap: [] }] };
  const ctx = await mountLesson(options(content));
  await ctx.drive('wrong', { stopAfter: 2 });
  const feedback = ctx.byClass('div', 'feedback')[0];
  assert.ok(feedback, 'informacja zwrotna');
  const text = ctx.text(feedback);
  assert.ok(text.includes(gap.accepted[0]), 'poprawna odpowiedź');
  assert.ok(text.includes(gap.rule), 'reguła');
  ctx.unmount();
});

/* ---------- Słowa z lekcji → FSRS ---------- */

test('generator: słowa lekcji używają istniejących kart słownika, homonimy i zwroty dostają własne karty', () => {
  const index = datasetIndex(readFileSync(join(ROOT, 'public/data/chorwacki_2000_PL-HR.csv'), 'utf8'));
  assert.deepEqual(reviewRefFor({ hr: 'biti', pl: 'być' }, index, 'pl-hr'), { itemType: 'WORD', itemId: 'pl-hr:1' });
  assert.deepEqual(reviewRefFor({ hr: 'danas', pl: 'dziś' }, index, 'pl-hr').itemType, 'WORD');
  // radio = „pracował” w lekcji vs „radio” w słowniku — nie wolno trafić na cudzą kartę.
  assert.deepEqual(reviewRefFor({ hr: 'radio', pl: 'pracował / robił' }, index, 'pl-hr'), { itemType: 'PHRASE', itemId: 'pl-hr:phrase:radio' });
  assert.equal(phraseKey('Kako ste?'), 'kako ste');
  assert.equal(sameMeaning('mieszkać / żyć', 'mieszkać'), true);
  assert.equal(sameMeaning('załącznik', 'przysłówek'), false);

  const vocab = lesson.content.vocabulary;
  const core = vocab.filter((v) => !v.optional);
  const taught = new Set(lesson.content.steps.filter((s) => s.type === 'word').map((s) => s.target));
  assert.ok(core.length >= 6 && core.length <= 10, 'rozsądna liczba słów obowiązkowych');
  assert.ok(core.every((v) => taught.has(v.target) && v.review?.itemId.startsWith('pl-hr:')), 'obowiązkowe = słowa z kart');
  assert.ok(vocab.filter((v) => v.optional).every((v) => !taught.has(v.target)), 'opcjonalne = słowa z list');
  // Każdy zwrot PHRASE ma treść dla powtórek.
  const items = src('src/curriculum/data/hr-a1/review-items.ts').HR_A1_REVIEW_ITEMS;
  for (const v of core.filter((v) => v.review.itemType === 'PHRASE')) assert.ok(items[v.review.itemId], v.review.itemId);
});

test('srs: tylko słowa obowiązkowe, bez duplikatów; sync jest idempotentny i ponawia po błędzie sieci', async () => {
  storage.clear();
  const vocab = lesson.content.vocabulary;
  const refs = srs.enrollmentRefs([...vocab, ...vocab]);
  assert.equal(refs.length, new Set(vocab.filter((v) => !v.optional).map((v) => v.review.itemId)).size);

  srs.queueLessonVocabulary('u1', 'pl-hr', lesson.content.lessonId, vocab);
  srs.queueLessonVocabulary('u1', 'pl-hr', lesson.content.lessonId, vocab);
  assert.equal(srs.readVocabularyQueue('u1', 'pl-hr').length, 1);

  const calls = [];
  let online = false;
  const request = async (path, init) => {
    calls.push({ path, body: JSON.parse(init.body) });
    if (!online) throw new Error('offline');
    return { created: 8 };
  };
  const resolveVocab = async () => vocab;
  const offline = await srs.syncLessonVocabulary(request, 'u1', 'pl-hr', resolveVocab);
  assert.deepEqual(offline, { synced: 0, created: 0, pending: 1 });
  assert.equal(srs.pendingLessonVocabulary('u1', 'pl-hr').length, 1, 'wpis czeka na ponowienie');

  online = true;
  // Dwa równoległe wywołania = jeden przebieg.
  const [a, b] = await Promise.all([srs.syncLessonVocabulary(request, 'u1', 'pl-hr', resolveVocab), srs.syncLessonVocabulary(request, 'u1', 'pl-hr', resolveVocab)]);
  assert.deepEqual(a, b);
  assert.equal(a.synced, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].path, '/reviews/enroll');
  assert.deepEqual(calls[1].body, { course: 'pl-hr', source: `lesson:${lesson.content.lessonId}`, items: refs });
  assert.ok(events.includes('review-updated'));
  assert.equal(srs.pendingLessonVocabulary('u1', 'pl-hr').length, 0);
  // Kolejne wywołanie nic nie wysyła.
  await srs.syncLessonVocabulary(request, 'u1', 'pl-hr', resolveVocab);
  assert.equal(calls.length, 2);
});

test('srs: stare wpisy kolejki (bez identyfikatorów kart) trafiają do FSRS według aktualnej treści lekcji', async () => {
  storage.clear();
  // Format sprzed integracji: same słowa, bez `review` i `syncedAt`.
  const legacy = lesson.content.vocabulary.map(({ target, source, recordId }) => ({ target, source, recordId }));
  storage.set('lexodromia.curriculum.srsQueue.v1.guest.pl-hr', JSON.stringify([{ lessonId: lesson.content.lessonId, queuedAt: 1, items: legacy }]));
  assert.equal(srs.enrollmentRefs(legacy).length, 0);
  const sent = [];
  const result = await srs.syncLessonVocabulary(async (path, init) => { sent.push(JSON.parse(init.body)); return { created: 3 }; }, 'guest', 'pl-hr', async () => lesson.content.vocabulary);
  assert.equal(result.synced, 1);
  assert.equal(sent[0].items.length, srs.enrollmentRefs(lesson.content.vocabulary).length);
});
