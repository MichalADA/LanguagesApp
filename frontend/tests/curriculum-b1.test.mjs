import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import ts from 'typescript';
import { audioSlots } from '../scripts/lib/course-audio.mjs';

/* Kurs B1 (powstaje moduł po module, plan: curriculum/hr-b1/README.md) — ten sam generator i player co A1 i A2, osobny poziom. */

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/* Minimalne środowisko przeglądarki dla playera (bez DOM). */
const storage = new Map();
globalThis.window = { addEventListener() {}, removeEventListener() {}, scrollTo() {}, setTimeout, clearTimeout };
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const cache = new Map();
function resolveFile(from, id) {
  const base = id.startsWith('@/') ? join(SRC, id.slice(2)) : resolve(dirname(from), id);
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), base]) if (existsSync(candidate) && /\.tsx?$/.test(candidate)) return candidate;
  throw new Error(`Nie znaleziono ${id} (z ${from})`);
}
function loadFile(file) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  const exports = {};
  cache.set(file, exports);
  const req = (id) => (MOCKS[id] ? MOCKS[id] : id.startsWith('.') || id.startsWith('@/') ? loadFile(resolveFile(file, id)) : require(id));
  new Function('require', 'exports', 'module', outputText)(req, exports, { exports });
  return exports;
}
const load = (path) => loadFile(join(ROOT, path));

const plDict = load('src/i18n/locales/pl.ts').pl;
const { lookup, interpolate } = load('src/i18n/types.ts');
const t = (key, params) => { const value = lookup(plDict, key); assert.ok(value, `brak tłumaczenia: ${key}`); return interpolate(value, params); };
const course = { id: 'pl-hr', specialCharacters: ['č', 'ć', 'đ', 'š', 'ž'], validation: { caseInsensitive: true, trimWhitespace: true, diacriticsMatter: true, foldMap: { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd' } } };
const MOCKS = {
  '@/i18n': { useT: () => t, useI18n: () => ({ t, locale: 'pl' }) },
  'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children) },
  '@/courses/CourseProvider': { useCourse: () => ({ course }) },
};

const { PL_HR_OUTLINE } = load('src/curriculum/data/a1.ts');
const { deriveLevel, nextLessonId } = load('src/curriculum/progress.ts');
const { checkLessonAnswer } = load('src/curriculum/answers.ts');
const { LessonPlayer } = load('src/curriculum/player/LessonPlayer.tsx');
const { walkLesson } = await import('./fixtures/lesson-walker.mjs');
const rules = course.validation;

const b1 = PL_HR_OUTLINE.levels.find((level) => level.id === 'B1');
const lessons = b1.modules.flatMap((m) => m.lessons);
const fileOf = (lesson) => join(SRC, 'curriculum/data/hr-b1', `module-${lesson.moduleId.slice(-2)}/lesson-${String(lesson.order).padStart(2, '0')}.ts`);
const generated = new Map(lessons.map((lesson) => [lesson.id, loadFile(fileOf(lesson)).LESSON]));
const PUBLIC = join(ROOT, 'public');

/** CSV (RFC 4180, pola w cudzysłowach) → rekordy z nagłówka. */
function parseCsvFile(path) {
  const rows = [[]];
  let field = '';
  let quoted = false;
  const src = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { rows.at(-1).push(field); field = ''; }
    else if (ch === '\n') { rows.at(-1).push(field); field = ''; rows.push([]); }
    else if (ch !== '\r') field += ch;
  }
  if (field) rows.at(-1).push(field);
  const [header, ...body] = rows.filter((r) => r.length > 1);
  return body.map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ''])));
}

test('B1: generator — wygenerowane pliki są aktualne względem CSV', () => {
  const run = spawnSync(process.execPath, ['scripts/generate-curriculum.mjs', '--level', 'hr-b1', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.doesNotMatch(run.stderr, /Ostrzeżenia/, run.stderr);
});

const MODULE_TITLES = ['Svakodnevica i navike', 'Uspomene i prošla ljeta'];

test('B1: poziom dostępny, każdy moduł ma 4 lekcje i powtórkę, A1 i A2 bez zmian', () => {
  assert.equal(b1.available, true);
  assert.deepEqual(b1.modules.map((m) => m.title), MODULE_TITLES);
  for (const [i, module] of b1.modules.entries()) {
    const m = String(i + 1).padStart(2, '0');
    assert.equal(module.levelId, 'B1');
    assert.deepEqual(module.lessons.map((l) => l.id), [1, 2, 3, 4, 5].map((n) => `b1-${m}-0${n}`));
    assert.deepEqual(module.lessons.map((l) => l.kind), ['lesson', 'lesson', 'lesson', 'lesson', 'review']);
  }
  for (const [id, count] of [['A1', 40], ['A2', 40]]) {
    assert.equal(PL_HR_OUTLINE.levels.find((level) => level.id === id).modules.flatMap((m) => m.lessons).length, count);
  }
  // Postęp B1 liczy się osobno: nowy uczeń zaczyna od b1-01-01.
  assert.equal(deriveLevel(b1, new Set()).current.lesson.lesson.id, 'b1-01-01');
  assert.equal(nextLessonId(b1, 'b1-01-04'), 'b1-01-05');
  for (let m = 1; m < MODULE_TITLES.length; m++) assert.equal(nextLessonId(b1, `b1-0${m}-05`), `b1-0${m + 1}-01`);
  assert.equal(nextLessonId(b1, lessons.at(-1).id), null);
  assert.equal(lessons.length, 5 * MODULE_TITLES.length);
});

test('B1: rdzeń lekcji nie powtarza słów, które uczeń zna z A1 i A2', () => {
  const known = new Set(['hr-a1/lexodromia_hr_A1_curriculum.csv', 'hr-a2/lexodromia_hr_A2_curriculum.csv']
    .flatMap((file) => parseCsvFile(join(ROOT, 'curriculum', file)))
    .filter((r) => r.record_type === 'vocabulary').map((r) => r.hr_text.toLocaleLowerCase('hr')));
  for (const [id, lesson] of generated) {
    for (const record of lesson.material.records.filter((r) => r.type === 'vocabulary' && r.tags.includes('active'))) {
      assert.ok(!known.has(record.hr.toLocaleLowerCase('hr')), `${id}: „${record.hr}” jest już w A1 albo A2`);
    }
  }
});

test('B1: nowe czasowniki dokonane mają poprawną odmianę na kartach słów', () => {
  const cards = new Map([...generated.values()].flatMap((lesson) => lesson.content.steps.filter((s) => s.type === 'word' && s.conjugation).map((s) => [s.target, s.conjugation])));
  assert.equal(cards.get('popiti').present[0], 'popijem');
  assert.deepEqual(cards.get('pojesti').past, ['pojeo', 'pojela', 'pojeli']);
  assert.equal(cards.get('obući se').present[0], 'obučem se');
  assert.equal(cards.get('prestati').present[0], 'prestanem');
  assert.equal(cards.get('početi').present[0], 'počnem');
  assert.deepEqual(cards.get('uspjeti').past, ['uspio', 'uspjela', 'uspjeli']);
});

test('B1: odpowiedzi wzorcowe przechodzą walidację, a opcje wyboru są spójne', () => {
  for (const [id, lesson] of generated) {
    for (const step of lesson.content.steps) {
      if (step.type === 'translate' || step.type === 'gap' || step.type === 'order') assert.equal(checkLessonAnswer(step.accepted[0], step.accepted, rules), 'hit', `${id}/${step.id}`);
      if (step.type === 'choice') {
        assert.equal(new Set(step.options).size, step.options.length, `${id}/${step.id}: powtórzone opcje`);
        assert.ok(step.correctIndex >= 0 && step.correctIndex < step.options.length);
      }
    }
  }
});

const reply = (id, n) => generated.get(id).content.steps.filter((s) => s.type === 'dialog').flatMap((s) => s.turns.filter((x) => x.kind === 'reply'))[n];
const verdict = (id, n, answer) => { const r = reply(id, n); return checkLessonAnswer(answer, r.accepted, rules, r.pattern); };

/** Otwarte repliki B1: naturalne odpowiedzi muszą przejść, błędne (krótka forma na początku, zły aspekt) — nie. */
const OPEN_REPLIES = [
  { lesson: 'b1-01-01', reply: 0, hit: ['Probudio sam se u sedam.', 'Probudila sam se u šest.', 'Jutros sam se probudila u pola sedam.', 'Danas sam se probudio oko osam.', 'U sedam.', 'Probudila sam se jutros u šest.'], miss: ['Sam se probudio u sedam.', 'Se probudio sam u sedam.'] },
  { lesson: 'b1-01-01', reply: 1, hit: ['Popio sam kavu.', 'Popila sam čaj.', 'Popila sam dvije kave.', 'Samo sam popio sok.', 'Jutros sam popila kavu s mlijekom.'], miss: ['Sam popio kavu.', 'Popiti kavu.'] },
  { lesson: 'b1-01-02', reply: 0, hit: ['Dok putujem na posao, slušam podcast.', 'Slušam glazbu.', 'Obično čitam vijesti.', 'Dok se vozim autobusom, čitam knjigu.', 'Uvijek slušam podcast.'], miss: ['Podcast.'] },
  { lesson: 'b1-01-02', reply: 1, hit: ['Dok kuham, slušam podcast.', 'Slušam podcast dok kuham.', 'Obično slušam glazbu.', 'Pijem kavu.'], miss: ['Glazba.'] },
  { lesson: 'b1-01-03', reply: 0, hit: ['Prije nego što krenemo, moram napuniti mobitel.', 'Moram još zaključati vrata.', 'Skoro, moram isključiti računalo.', 'Trebam se spakirati prije nego što krenemo.', 'Čekaj, moram ugasiti svjetlo.'], miss: ['Napuniti mobitel.', 'Prije nego što sam krenemo, moram napuniti mobitel.'] },
  { lesson: 'b1-01-03', reply: 2, hit: ['Nakon što izađemo, zaključat ću vrata.', 'Nakon što izađemo, nazvat ću taksi.', 'Zaključat ću vrata nakon što izađemo.', 'Nakon što krenemo, ja ću nazvati mamu.'], miss: ['Ću zaključati vrata.', 'Nakon što izađemo.'] },
  { lesson: 'b1-01-04', reply: 0, hit: ['Počeo sam trčati.', 'Počela sam češće kuhati kod kuće.', 'Ove godine sam počela učiti hrvatski.', 'Počeo sam više čitati.', 'Nedavno sam počeo plivati.'], miss: ['Sam počeo trčati.', 'Počeo sam trčim.'] },
  { lesson: 'b1-01-04', reply: 1, hit: ['Prestao sam pušiti.', 'Prestala sam jesti slatkiše.', 'Prošle godine sam prestao pušiti.', 'Prestala sam piti kavu navečer.'], miss: ['Sam prestao pušiti.', 'Prestao sam pušim.'] },
  { lesson: 'b1-01-04', reply: 2, hit: ['Jesam, već sam se naviknuo.', 'Već sam se navikla.', 'Naviknula sam se.', 'Nisam još.', 'Još se nisam naviknuo.', 'Jesam.'], miss: ['Sam se naviknuo.'] },
  { lesson: 'b1-01-05', reply: 0, hit: ['Moj dan počinje u sedam.', 'Moj tipičan radni dan počinje u sedam.', 'Dan mi počinje oko šest.', 'Ujutro pijem kavu i čitam vijesti.', 'Obično radim od osam do četiri.'], miss: ['U sedam počinje sam.'] },
  { lesson: 'b1-01-05', reply: 1, hit: ['Dok putujem na posao, slušam podcast.', 'Čitam vijesti.', 'Dok idem na posao, slušam glazbu.'], miss: ['Vijesti.'] },
  { lesson: 'b1-01-05', reply: 2, hit: ['Počela sam trčati.', 'Prestao sam pušiti.', 'Ove godine sam počeo učiti hrvatski.', 'Naviknula sam se na rano ustajanje.', 'Ništa posebno.'], miss: ['Sam počela trčati.'] },
  // Moduł 2: aspekt w przeszłości, čim / tek kad, szyk krótkich słów.
  { lesson: 'b1-02-01', reply: 0, hit: ['Bilo je super!', 'Odlično!', 'Bilo je jako lijepo.', 'Super, bilo je toplo.'], miss: ['Je bilo super.'] },
  { lesson: 'b1-02-01', reply: 1, hit: ['Svaki dan smo plivali i jedrili.', 'Svaki dan smo kupovali svježu ribu.', 'Plivali smo i sunčali se.', 'Ujutro smo išli na plažu.', 'Mi smo se kupali svaki dan.'], miss: ['Smo plivali svaki dan.'] },
  { lesson: 'b1-02-01', reply: 2, hit: ['Zadnji dan smo kupili suvenire za obitelj.', 'Kupili smo suvenire.', 'Jesmo, kupili smo maslinovo ulje.', 'Kupila sam školjke.'], miss: ['Smo kupili suvenire.', 'Kupujemo suvenire.'] },
  { lesson: 'b1-02-02', reply: 0, hit: ['Čim smo stigli na more, otišli smo na plažu.', 'Odmah smo otišli na plažu.', 'Prvo smo se raspakirali.', 'Otišli smo na plažu.'], miss: ['Smo otišli na plažu.'] },
  { lesson: 'b1-02-02', reply: 1, hit: ['Tek kad smo stigli u hotel, shvatio sam da nemam putovnicu.', 'Primijetila sam da je more hladno.', 'Shvatili smo da nemamo ključ.', 'Ne, nije bilo problema.'], miss: ['Sam shvatio da nemam ključ.'] },
  { lesson: 'b1-02-04', reply: 0, hit: ['Slučajno smo sreli prijatelje iz Poljske.', 'Izgubio sam se u Zagrebu.', 'Jednom sam se izgubila u Rimu.', 'Zalutali smo u šumi.', 'Da, doživjeli smo pravu avanturu.'], miss: ['Sam se izgubio u Zagrebu.'] },
  { lesson: 'b1-02-04', reply: 1, hit: ['Na kraju smo našli hotel.', 'Onda smo pitali policajca.', 'Napokon smo stigli kući.'], miss: ['Smo našli hotel.'] },
  { lesson: 'b1-02-05', reply: 0, hit: ['Bio sam na Visu.', 'Ljetos sam bila u Istri.', 'Na moru.', 'Bili smo u Dalmaciji.'], miss: ['Sam bio na Visu.'] },
  { lesson: 'b1-02-05', reply: 1, hit: ['Čim smo stigli, otišli smo na plažu.', 'Prvi dan smo se odmarali.', 'Odmah smo otišli na plažu.'], miss: ['Smo otišli na plažu.'] },
  { lesson: 'b1-02-05', reply: 2, hit: ['U jednom trenutku je počela jaka kiša.', 'Odjednom je počela oluja.', 'Jednog dana smo se izgubili.', 'Ne.'], miss: ['Je počela kiša.'] },
];

test('B1: otwarte repliki przyjmują naturalne odpowiedzi i odrzucają błędny szyk', () => {
  for (const f of OPEN_REPLIES) {
    const r = reply(f.lesson, f.reply);
    assert.ok(r, `${f.lesson}#${f.reply}: brak repliki`);
    for (const answer of f.hit) assert.equal(verdict(f.lesson, f.reply, answer), 'hit', `${f.lesson}#${f.reply} [${r.prompt}] „${answer}”`);
    for (const answer of f.miss) assert.equal(verdict(f.lesson, f.reply, answer), 'miss', `${f.lesson}#${f.reply} [${r.prompt}] przepuszcza „${answer}”`);
  }
});

test('B1: lista otwartych replik w teście = repliki oznaczone „open” w didactics', () => {
  const didactics = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-b1/didactics.json'), 'utf8'));
  const flagged = Object.entries(didactics.lessons).flatMap(([key, lesson]) => {
    const n = Number(key.slice(3));
    const appId = `b1-${String(Math.ceil(n / 5)).padStart(2, '0')}-${String(((n - 1) % 5) + 1).padStart(2, '0')}`;
    return (lesson.dialog?.turns ?? []).filter((x) => x.reply).flatMap((x, i) => (x.reply.open ? [`${appId}#${i}`] : []));
  });
  assert.deepEqual(OPEN_REPLIES.map((f) => `${f.lesson}#${f.reply}`).sort(), flagged.sort());
});

test('B1: wszystkie repliki — interpunkcja, wielkość liter i grzecznościowa rama nie zmieniają wyniku', () => {
  for (const [id, lesson] of generated) {
    const turns = lesson.content.steps.filter((s) => s.type === 'dialog').flatMap((s) => s.turns.filter((x) => x.kind === 'reply'));
    for (const turn of turns) {
      const bare = turn.suggestion.toLocaleLowerCase('hr').replace(/[.,!?]/g, '');
      for (const v of [turn.suggestion, bare, turn.suggestion.toLocaleUpperCase('hr'), `${bare}!`, `${turn.suggestion} Hvala.`, `Bok, ${turn.suggestion}`]) {
        assert.equal(checkLessonAnswer(v, turn.accepted, rules, turn.pattern), 'hit', `${id} [${turn.prompt}] „${v}”`);
      }
    }
  }
});

test('B1: każdy chorwacki tekst lekcji ma nagranie, a każde audioSrc wskazuje istniejący plik', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-b1/audio-manifest.json'), 'utf8'));
  for (const item of manifest.items) {
    assert.match(item.audioPath, /^\/audio\/hr\/b1\/module-\d\d\/[a-z0-9-]+\.mp3$/, item.audioPath);
    assert.ok(existsSync(join(PUBLIC, item.audioPath)), `brak pliku ${item.audioPath} („${item.text}”)`);
  }
  for (const [id, lesson] of generated) {
    const content = structuredClone(lesson.content);
    const slots = audioSlots(content);
    const json = JSON.stringify(lesson.content);
    const attached = [...json.matchAll(/"(?:audioSrc|promptAudioSrc|answerAudioSrc|suggestionAudioSrc|sampleAudioSrc|audio)":"([^"]+)"/g)].map((m) => m[1]);
    assert.ok(attached.length >= slots.length, `${id}: ${slots.length - attached.length} tekstów bez nagrania`);
    for (const src of attached) assert.ok(existsSync(join(PUBLIC, src)), `${id}: brak pliku ${src}`);
  }
});

test('B1: wszystkie lekcje da się zaliczyć poprawnymi odpowiedziami, a błędne odpowiedzi nie zaliczają lekcji', async () => {
  for (const lesson of lessons) {
    const content = generated.get(lesson.id).content;
    const options = { React, Renderer, act, LessonPlayer, t, content };
    const right = await walkLesson({ ...options, answers: 'right' });
    assert.equal(right.completed, 1, `${lesson.id}: poprawne odpowiedzi → zaliczenie`);
    assert.equal(right.mistakes, false, `${lesson.id}: poprawne odpowiedzi bez błędów`);
    assert.equal((await walkLesson({ ...options, answers: 'wrong' })).completed, 0, `${lesson.id}: błędne odpowiedzi nie zaliczają`);
  }
});
