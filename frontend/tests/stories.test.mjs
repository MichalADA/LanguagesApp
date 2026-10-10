/**
 * Lexodromia Stories: walidacja scenariuszy, silnik dialogów, progresja misji, trwały zapis,
 * integracja z FSRS (te same karty co lekcje) i przejście misji przez UI sceny.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

const storage = new Map();
globalThis.window = { addEventListener() {}, removeEventListener() {}, scrollTo() {}, setTimeout, clearTimeout, dispatchEvent() {} };
globalThis.Event = class { constructor(type) { this.type = type; } };
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
if (!globalThis.crypto?.getRandomValues) globalThis.crypto = (await import('node:crypto')).webcrypto;

const MOCKS = {};
const cache = new Map();
function resolveFile(from, id) {
  const base = id.startsWith('@/') ? join(SRC, id.slice(2)) : resolve(dirname(from), id);
  for (const c of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), base]) if (existsSync(c) && /\.tsx?$/.test(c)) return c;
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
const src = (p) => load(join(ROOT, p));

const plDict = src('src/i18n/locales/pl.ts').pl;
const enDict = src('src/i18n/locales/en.ts').en;
const { lookup, interpolate } = src('src/i18n/types.ts');
const t = (key, params) => { const v = lookup(plDict, key); assert.ok(v, `brak tłumaczenia: ${key}`); assert.ok(lookup(enDict, key), `brak tłumaczenia EN: ${key}`); return interpolate(v, params); };
const course = { id: 'pl-hr', specialCharacters: ['č', 'ć', 'đ', 'š', 'ž'], validation: { caseInsensitive: true, trimWhitespace: true, diacriticsMatter: true, foldMap: { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd' } } };
Object.assign(MOCKS, {
  '@/i18n': { useT: () => t, useI18n: () => ({ t, locale: 'pl' }) },
  'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children) },
  '@/courses/CourseProvider': { useCourse: () => ({ course }) },
});

const engine = src('src/stories/engine.ts');
const { validateStory, validateGraph } = src('src/stories/validate.ts');
const progressLib = src('src/stories/progress.ts');
const repo = src('src/stories/repository.ts');
const { SPLIT_A1 } = src('src/stories/data/split-a1/story.ts');
const { STORIES } = src('src/stories/data/index.ts');
const builders = src('src/stories/data/builders.ts');
const rules = course.validation;
const vars = { name: 'Michał' };
const mission = (id) => SPLIT_A1.missions.find((m) => m.id === id);

/* ---------- Gracz-automat: przechodzi graf według polityki ---------- */

/**
 * policy "right" — zawsze poprawnie; "wrong-first" — w każdym zadaniu najpierw błąd (wybór błędnej
 * opcji / zła odpowiedź), potem poprawnie; "stubborn" — w zadaniach z odpowiedzią zawsze błąd.
 * `prefer` — id opcji wybieranych, gdy są dostępne (alternatywne ścieżki).
 */
function play(m, { policy = 'right', world = { flags: [], completed: [], vars }, prefer = [] } = {}) {
  const graph = m.dialogue.graph;
  let run = engine.startRun(graph, world);
  const tried = new Set();
  for (let guard = 0; guard < 300 && !run.finished; guard++) {
    if (run.pending) { run = engine.proceed(graph, run, world); continue; }
    const node = engine.currentNode(graph, run);
    if (node.kind === 'say') { run = engine.answer(graph, run, { kind: 'continue' }, world, rules); continue; }
    if (node.kind === 'choice') {
      const options = engine.visibleOptions(node, run, world);
      const wrong = options.find((o) => o.verdict === 'wrong');
      const preferred = options.find((o) => prefer.includes(o.id));
      const good = preferred ?? options.find((o) => o.verdict === 'correct') ?? options.find((o) => o.verdict === 'neutral');
      const pick = policy !== 'right' && wrong && !tried.has(node.id) ? wrong : good;
      tried.add(node.id);
      run = engine.answer(graph, run, { kind: 'choice', optionId: pick.id }, world, rules);
      continue;
    }
    if (node.kind === 'build' || node.kind === 'type') {
      const bad = policy === 'stubborn' || (policy === 'wrong-first' && !tried.has(node.id));
      tried.add(node.id);
      run = engine.answer(graph, run, { kind: 'text', value: bad ? 'nešto krivo' : engine.fill(node.accepted[0], vars) }, world, rules);
      continue;
    }
    throw new Error(`Nieoczekiwany węzeł ${node.kind}`);
  }
  assert.ok(run.finished, `${m.id}: rozmowa nie dobiegła końca (${policy})`);
  return run;
}

/* ---------- Dane ---------- */

test('Split A1: 3 lokacje z misjami, 3 postacie, 5 misji i poprawna struktura wszystkich dialogów', () => {
  assert.deepEqual(validateStory(SPLIT_A1), []);
  assert.equal(SPLIT_A1.missions.length, 5);
  assert.equal(SPLIT_A1.npcs.length, 3);
  assert.deepEqual(SPLIT_A1.locations.filter((l) => !l.comingSoon).map((l) => l.id), ['apartman', 'kafic', 'trgovina']);
  assert.ok(SPLIT_A1.locations.filter((l) => l.comingSoon).length >= 5, 'przygotowane miejsca na port, plażę, dworzec, piekarnię i targ');
  assert.equal(SPLIT_A1.languageReview, 'unverified', 'treść nie jest oznaczona jako sprawdzona przez native speakera');
  // Architektura miast: A1 grywalne, A2 i B1 zapowiedziane.
  assert.deepEqual(STORIES.map((s) => [s.city.hr, s.level, Boolean(s.load)]), [['Split', 'A1', true], ['Zagreb', 'A2', false], ['Dubrovnik', 'B1', false]]);
});

test('każda misja ma progresję rozpoznanie → układanie → wpisywanie i kilka interakcji', () => {
  for (const m of SPLIT_A1.missions) {
    const nodes = Object.values(m.dialogue.graph.nodes);
    const kinds = new Set(nodes.map((n) => n.kind));
    assert.ok(kinds.has('choice') && kinds.has('type'), `${m.id}: wybór i wpisywanie`);
    assert.ok(nodes.filter((n) => ['choice', 'build', 'type'].includes(n.kind)).length >= 4, `${m.id}: co najmniej 4 interakcje`);
    assert.ok(nodes.some((n) => n.kind === 'choice' && n.options.some((o) => o.verdict === 'wrong')), `${m.id}: błędne odpowiedzi z reakcją`);
    assert.ok(m.objectives.length >= 2 && m.debrief.length >= 2 && m.goal && m.story, `${m.id}: cel, historia, podsumowanie`);
  }
  // W całym mieście są też zadania z układaniem zdania (w 4 z 5 misji).
  assert.ok(SPLIT_A1.missions.filter((m) => Object.values(m.dialogue.graph.nodes).some((n) => n.kind === 'build')).length >= 4);
});

test('walidacja wykrywa błędy w scenariuszu', () => {
  const { graph, say, choice, option, build, type, end } = builders;
  const speakers = new Set(['ana', 'narrator']);
  const broken = graph('a', [
    say('a', 'ana', 'Bok', 'Cześć', 'c'),
    choice('c', 'x', [option('w', 'Laku noć', 'Dobranoc', 'wrong', 'c')]),
    build('b', { instruction: 'x', tokens: ['Bok'], accepted: ['Dobar dan'], next: 'zz', onWrong: 'end' }),
    say('dead', 'kto', '', '', 'dead'),
    end('end'),
  ]);
  const errors = validateGraph(broken, 't', speakers).join('\n');
  for (const fragment of ['co najmniej dwóch opcji', 'blokada postępu', 'nieistniejący węzeł „zz”', 'nie da się ułożyć', 'nieosiągalny', 'nieznana postać', 'bez wyjaśnienia', 'nie wraca do zadania', 'nie da się dojść do końca']) {
    assert.ok(errors.includes(fragment), `brak błędu: ${fragment}\n${errors}`);
  }
  assert.ok(validateGraph(graph('a', [type('a', { instruction: 'x', accepted: ['Živim u Splitu.'], pattern: '^(', explanation: 'x', next: 'e' }), end('e')]), 't', speakers).some((e) => e.includes('błędna rama')));
  const loop = graph('a', [builders.event('a', [], 'b'), builders.branch('b', [], 'a'), end('e')]);
  assert.ok(validateGraph(loop, 't', speakers).some((e) => e.includes('pętla bez udziału gracza')));
  const story = { ...SPLIT_A1, missions: SPLIT_A1.missions.map((m) => (m.id === 'm1-welcome' ? { ...m, requires: ['m5-shop'] } : m)) };
  assert.ok(validateStory(story).some((e) => e.includes('cykl')));
});

/* ---------- Silnik ---------- */

test('silnik: każda misja kończy się przy poprawnych odpowiedziach z wynikiem 100% i ustawia flagi celów', () => {
  for (const m of SPLIT_A1.missions) {
    const run = play(m);
    assert.equal(engine.scoreOf(run).percent, 100, m.id);
    for (const o of m.objectives) assert.ok(engine.evaluate(o.done, run.flags, []), `${m.id}: cel „${o.text}” nie został odhaczony`);
  }
});

test('silnik: błędy prowadzą do reakcji postaci, ale nigdy nie blokują postępu', () => {
  for (const m of SPLIT_A1.missions) {
    const wrongFirst = play(m, { policy: 'wrong-first' });
    const score = engine.scoreOf(wrongFirst);
    assert.ok(score.percent < 100, `${m.id}: błędy obniżają wynik`);
    // Nawet uparcie błędne odpowiedzi w zadaniach pisemnych kończą rozmowę (odpowiedź zostaje pokazana).
    const stubborn = play(m, { policy: 'stubborn' });
    assert.ok(stubborn.finished, m.id);
  }
});

test('silnik: kawiarnia — złe zamówienie ma konsekwencję i da się je naprawić; wybór mleka zmienia przebieg', () => {
  const m = mission('m3-coffee');
  const graph = m.dialogue.graph;
  const world = { flags: [], completed: [], vars };
  let run = engine.startRun(graph, world);
  run = engine.answer(graph, run, { kind: 'continue' }, world, rules); // narrator → Dobro jutro
  run = engine.answer(graph, run, { kind: 'continue' }, world, rules);
  run = engine.answer(graph, run, { kind: 'continue' }, world, rules); // Izvolite → wybór
  assert.equal(run.nodeId, 'c-order');
  run = engine.answer(graph, run, { kind: 'choice', optionId: 'tea' }, world, rules);
  assert.equal(run.pending.feedback.verdict, 'wrong');
  assert.ok(run.pending.feedback.explanation.includes('herbata'));
  run = engine.proceed(graph, run, world);
  assert.equal(run.lastLine.text.hr, 'Jedan čaj, može!', 'Ana podaje herbatę');
  run = engine.answer(graph, run, { kind: 'continue' }, world, rules);
  assert.equal(engine.currentNode(graph, run).id, 'c-fix');
  // Ścieżka z mlekiem kończy się „bijela kava”, bez mleka — „kava”.
  const withMilk = play(m, { prefer: ['with'] });
  const black = play(m, { prefer: ['without'] });
  assert.ok(withMilk.transcript.some((l) => l.text.hr.includes('bijela kava')));
  assert.ok(black.transcript.some((l) => l.text.hr === 'Izvolite: kava bez šećera.'));
  assert.ok(withMilk.flags.includes('coffee-milk') && black.flags.includes('coffee-black'));
});

test('silnik: odpowiedzi pisemne — warianty, rama zdania, diakrytyki, dwie próby, imię gracza', () => {
  const m1 = mission('m1-welcome');
  const g = m1.dialogue.graph;
  const world = { flags: [], completed: [], vars };
  const at = (id) => ({ ...engine.startRun(g, world), nodeId: id, lastLine: null });
  // Rama „Živim u …” przyjmuje dowolne miasto; brak diakrytyków = „near” (zaliczone z poprawką).
  let run = engine.answer(g, at('t-live'), { kind: 'text', value: 'zivim u Splitu' }, world, rules);
  assert.equal(run.pending.feedback.verdict, 'near');
  run = engine.answer(g, at('t-live'), { kind: 'text', value: 'Ja živim u Zadru.' }, world, rules);
  assert.equal(run.pending.feedback.verdict, 'correct');
  // Kafelki: obie kolejności są poprawne.
  for (const value of ['Iz Poljske sam', 'Ja sam iz Poljske']) assert.equal(engine.answer(g, at('b-from'), { kind: 'text', value }, world, rules).pending.feedback.verdict, 'correct');
  // Pierwszy błąd → reakcja Marka i ponowna próba; drugi → poprawna odpowiedź i dalej.
  run = engine.answer(g, at('b-from'), { kind: 'text', value: 'Poljska je' }, world, rules);
  assert.equal(run.pending.feedback.retry, true);
  assert.ok(run.pending.feedback.explanation.includes('iz Poljske'));
  run = engine.proceed(g, run, world);
  assert.equal(run.lastLine.text.hr, 'Odakle? Iz Hrvatske? Iz Poljske?');
  run = engine.proceed(g, engine.answer(g, run, { kind: 'continue' }, world, rules), world);
  assert.equal(run.nodeId, 'b-from');
  run = engine.answer(g, run, { kind: 'text', value: 'Poljska je' }, world, rules);
  assert.equal(run.pending.feedback.revealed, true);
  assert.equal(run.pending.feedback.expected, 'Ja sam iz Poljske.');
  assert.equal(run.firstTry['b-from'], false, 'liczy się pierwsza próba');
  run = engine.proceed(g, run, world);
  assert.equal(run.nodeId, 'poland');
  // {name} w wypowiedziach i wyjaśnieniach.
  const named = engine.answer(g, { ...engine.startRun(g, world), nodeId: 'c-name' }, { kind: 'choice', optionId: 'se-first' }, world, rules);
  assert.ok(named.pending.feedback.explanation.includes('Zovem se Michał'));
});

test('silnik: opcje warunkowe, gałęzie i efekty działają na flagach świata', () => {
  const { graph, say, choice, option, branch, event, end, flag } = builders;
  const g = graph('e', [
    event('e', [flag('a')], 'c'),
    choice('c', 'x', [option('base', 'Bok', 'Cześć', 'correct', 'b'), option('secret', 'Tajna', 'Sekret', 'correct', 'b', { when: { flag: 'vip' } })]),
    branch('b', [{ when: { all: [{ flag: 'a' }, { mission: 'm0' }] }, next: 'yes' }], 'no'),
    say('yes', 'narrator', 'Da', 'Tak', 'end'),
    say('no', 'narrator', 'Ne', 'Nie', 'end'),
    end(),
  ]);
  const plain = { flags: [], completed: [] };
  let run = engine.startRun(g, plain);
  assert.deepEqual(engine.visibleOptions(g.nodes.c, run, plain).map((o) => o.id), ['base']);
  assert.deepEqual(engine.visibleOptions(g.nodes.c, run, { ...plain, flags: ['vip'] }).map((o) => o.id), ['base']);
  const vip = { flags: ['vip'], completed: ['m0'] };
  run = engine.startRun(g, vip);
  assert.deepEqual(engine.visibleOptions(g.nodes.c, run, vip).map((o) => o.id), ['base', 'secret']);
  run = engine.proceed(g, engine.answer(g, run, { kind: 'choice', optionId: 'secret' }, vip, rules), vip);
  assert.equal(run.lastLine.text.hr, 'Da');
  run = engine.startRun(g, plain);
  run = engine.proceed(g, engine.answer(g, run, { kind: 'choice', optionId: 'base' }, plain, rules), plain);
  assert.equal(run.lastLine.text.hr, 'Ne');
  // Interfejs sterownika — miejsce na przyszły dialog „ai” z tym samym kontraktem.
  const driver = engine.scriptedDriver(g, rules);
  assert.equal(typeof driver.start, 'function');
  assert.ok(driver.start(plain).nodeId === 'c');
});

/* ---------- Progresja ---------- */

test('progresja: odblokowanie lokacji i misji, nagroda tylko raz, najlepszy wynik', () => {
  let p = progressLib.emptyProgress('split-a1');
  const status = () => Object.fromEntries(SPLIT_A1.missions.map((m) => [m.id, progressLib.missionStatus(SPLIT_A1, p, m)]));
  const loc = (id) => progressLib.isLocationUnlocked(SPLIT_A1.locations.find((l) => l.id === id), p);
  // Od początku: apartament i kawiarnia (od razu można porozmawiać z Aną); sklep wymaga klucza.
  assert.deepEqual(status(), { 'm1-welcome': 'available', 'm2-key': 'locked', 'm3-coffee': 'available', 'm4-price': 'locked', 'm5-shop': 'locked' });
  assert.deepEqual([loc('apartman'), loc('kafic'), loc('trgovina'), loc('luka')], [true, true, false, false]);
  assert.equal(progressLib.nextMission(SPLIT_A1, p).id, 'm1-welcome');

  let r = progressLib.completeMission(p, mission('m1-welcome'), 60, ['met-marko']);
  assert.deepEqual([r.firstCompletion, r.xpAwarded], [true, 30]);
  p = r.progress;
  assert.equal(status()['m2-key'], 'available', 'klucz po meldunku');
  assert.equal(loc('trgovina'), false);
  r = progressLib.completeMission(p, mission('m1-welcome'), 100, ['extra']);
  assert.deepEqual([r.firstCompletion, r.xpAwarded, r.progress.xp], [false, 0, 30]);
  assert.deepEqual(r.progress.missions[0].bestScore, 100);
  assert.deepEqual(r.progress.missions[0].plays, 2);
  p = progressLib.completeMission(r.progress, mission('m2-key'), 80, []).progress;
  assert.equal(loc('trgovina'), true, 'sklep po kluczu');
  assert.equal(p.xp, 60);
  // Zmanipulowany zapis: XP liczone z misji, śmieci odrzucone.
  const dirty = progressLib.sanitizeProgress('split-a1', { flags: ['a', 1, 'a'], xp: 99999, missions: [p.missions[0], p.missions[0], { missionId: 3 }] });
  assert.deepEqual([dirty.flags, dirty.xp, dirty.missions.length], [['a'], 30, 1]);
});

/* ---------- Trwały zapis ---------- */

test('zapis gościa: localStorage per profil i kurs, przetrwa ponowne wczytanie', async () => {
  storage.clear();
  const scope = { owner: 'guest', courseId: 'pl-hr', story: SPLIT_A1 };
  const first = await repo.loadStoryProgress(scope);
  assert.equal(first.progress.xp, 0);
  const saved = await repo.saveMissionCompletion(scope, first.progress, mission('m1-welcome'), 90, ['met-marko']);
  assert.equal(saved.firstCompletion, true);
  const again = await repo.loadStoryProgress(scope);
  assert.equal(again.progress.xp, 30);
  assert.deepEqual(again.progress.flags, ['met-marko']);
  assert.equal((await repo.loadStoryProgress({ ...scope, owner: 'other' })).progress.xp, 0, 'inny profil nie widzi postępu');
});

test('zapis konta: backend, kolejka z tym samym eventId po błędzie sieci, bez podwójnej nagrody', async () => {
  storage.clear();
  const server = { xp: 0, flags: [], missions: [], events: new Set() };
  let online = false;
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, body: init?.body ? JSON.parse(init.body) : null });
    if (!online) throw new Error('offline');
    if (path.startsWith('/stories/split-a1/progress')) return { storyId: 'split-a1', ...server, events: undefined };
    const body = JSON.parse(init.body);
    if (!server.events.has(body.eventId)) {
      server.events.add(body.eventId);
      if (!server.missions.some((m) => m.missionId === 'm1-welcome')) {
        server.missions.push({ missionId: 'm1-welcome', firstCompletedAt: 'x', lastCompletedAt: 'x', plays: 1, bestScore: body.score, xp: body.xp });
        server.xp += body.xp;
      }
      server.flags = [...new Set([...server.flags, ...body.flags])].sort();
    }
    return { progress: { storyId: 'split-a1', xp: server.xp, flags: server.flags, missions: server.missions } };
  };
  const scope = { owner: 'u1', courseId: 'pl-hr', story: SPLIT_A1, request };
  const offline = await repo.saveMissionCompletion(scope, progressLib.emptyProgress('split-a1'), mission('m1-welcome'), 70, ['met-marko']);
  assert.equal(offline.pending, 1, 'ukończenie czeka w kolejce');
  assert.equal(offline.progress.xp, 30, 'widok uwzględnia niewysłane ukończenie');
  const outbox = repo.readOutbox('u1', 'pl-hr', 'split-a1');
  online = true;
  const loaded = await repo.loadStoryProgress(scope);
  assert.equal(loaded.pending, 0);
  assert.equal(loaded.progress.xp, 30);
  const posts = calls.filter((c) => c.path.includes('/complete'));
  assert.equal(new Set(posts.map((c) => c.body.eventId)).size, 1, 'ponowienie z tym samym eventId');
  assert.equal(posts[0].body.eventId, outbox[0].eventId);
  // Powtórka misji: nowy eventId, serwer nie przyznaje nagrody drugi raz.
  const replay = await repo.saveMissionCompletion(scope, loaded.progress, mission('m1-welcome'), 100, []);
  assert.equal(replay.progress.xp, 30);
  assert.equal(replay.firstCompletion, false);
});

/* ---------- Integracja z kursem i FSRS ---------- */

test('słownictwo misji używa tych samych kart FSRS co lekcje kursu (bez duplikatów)', () => {
  const lessonRefs = new Map();
  const dir = join(SRC, 'curriculum/data/hr-a1');
  for (const m of readdirSync(dir).filter((f) => f.startsWith('module'))) {
    for (const f of readdirSync(join(dir, m))) {
      const text = readFileSync(join(dir, m, f), 'utf8');
      const content = JSON.parse(text.slice(text.indexOf('content: ') + 9, text.indexOf(',\n  material:')));
      for (const v of content.vocabulary) lessonRefs.set(v.target, v.review);
    }
  }
  const phrases = src('src/curriculum/data/hr-a1/review-items.ts').HR_A1_REVIEW_ITEMS;
  for (const m of SPLIT_A1.missions) {
    for (const w of m.vocabulary) assert.deepEqual(w.review, lessonRefs.get(w.hr), `${m.id}: „${w.hr}” ma inną kartę niż w lekcji`);
    for (const n of Object.values(m.dialogue.graph.nodes)) {
      if ((n.kind === 'build' || n.kind === 'type') && n.practice) {
        const ref = m.vocabulary.find((w) => w.hr === n.practice).review;
        assert.ok(ref.itemType === 'WORD' || phrases[ref.itemId], `${m.id}/${n.id}: ćwiczone słowo musi mieć kartę możliwą do powtórki`);
      }
    }
  }
});

test('nagrania: tylko dokładnie te same teksty i istniejące pliki; mapa aktualna', () => {
  const run = spawnSync(process.execPath, ['scripts/stories-audio.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const { SPLIT_A1_AUDIO } = src('src/stories/data/split-a1/audio.ts');
  const { audioFor } = src('src/stories/integration.ts');
  for (const entry of Object.values(SPLIT_A1_AUDIO)) for (const p of Object.values(entry)) assert.ok(existsSync(join(ROOT, 'public', p)), p);
  // Głos zgodny z postacią: „Izvolite.” ma oba głosy, Marko dostaje męski.
  assert.match(audioFor(SPLIT_A1_AUDIO, 'Izvolite.', 'male'), /-m\.mp3$/);
  assert.doesNotMatch(audioFor(SPLIT_A1_AUDIO, 'Izvolite.', 'female'), /-m\.mp3$/);
  assert.equal(audioFor(SPLIT_A1_AUDIO, 'Dobro jutro!', 'male'), undefined, 'bez nagrania w złym głosie');
});

test('rejestr gier: Stories jest w sekcji Gry i prowadzi do /stories', () => {
  const registry = readFileSync(join(SRC, 'games/registry.ts'), 'utf8');
  assert.match(registry, /id: "stories", category: "main"[^\n]*href: "\/stories"/);
  assert.ok(lookup(plDict, 'gameNames.stories') && lookup(plDict, 'gameList.stories.description'));
});

/* ---------- UI sceny ---------- */

test('UI: misja w kawiarni rozegrana w scenie — wybór, kafelki, wpisywanie, tłumaczenie na żądanie', async () => {
  MOCKS['@/components/AudioButton'] = { AudioButton: ({ src }) => (src ? React.createElement('button', { className: 'audio-btn', 'data-src': src }) : null) };
  MOCKS['@/components/AnswerInput'] = { AnswerInput: ({ value, onChange, onSubmit }) => React.createElement('input', { value, onChange: (e) => onChange(e.target.value), onKeyDown: () => onSubmit() }) };
  const { DialogueScene } = src('src/stories/components/DialogueScene.tsx');
  const { SPLIT_A1_AUDIO } = src('src/stories/data/split-a1/audio.ts');
  const m = mission('m3-coffee');
  const world = { flags: [], completed: ['m1-welcome'], vars };
  const driver = engine.scriptedDriver(m.dialogue.graph, rules);
  let hints = 0;
  function Harness() {
    const [run, setRun] = React.useState(() => driver.start(world));
    return run.finished
      ? React.createElement('p', { className: 'done' }, 'koniec')
      : React.createElement(DialogueScene, {
          story: SPLIT_A1, mission: m, run, world, audio: SPLIT_A1_AUDIO, xp: 30,
          onAnswer: (input) => setRun((r) => driver.answer(r, input, world)),
          onProceed: () => setRun((r) => driver.proceed(r, world)),
          onHint: () => { hints++; setRun((r) => engine.markHint(r)); },
          onExit: () => {},
        });
  }
  let view;
  await act(async () => { view = Renderer.create(React.createElement(Harness)); });
  const text = (n) => (typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : n?.props ? text(n.props.children) : '');
  const byClass = (cls) => view.root.findAll((n) => typeof n.props?.className === 'string' && n.props.className.split(' ').includes(cls) && typeof n.type === 'string');
  const click = async (node) => act(async () => node.props.onClick());
  const buttonText = (label) => view.root.findAll((n) => n.type === 'button' && text(n).includes(label))[0];

  // Narrator → Ana: imię, nagranie w jej głosie, tłumaczenie ukryte domyślnie.
  await click(buttonText(t('stories.continue')));
  assert.equal(text(byClass('vn-nametag')[0]), 'Ana');
  assert.ok(view.root.findAll((n) => n.props?.['data-src'] === '/audio/hr/a1/module-01/dobro-jutro.mp3').length, 'nagranie wypowiedzi');
  assert.equal(byClass('vn-translation').length, 0);
  assert.equal(byClass('vn-objectives').length, 1, 'cele misji widoczne');
  await click(buttonText(t('stories.continue')));
  await click(buttonText(t('stories.continue')));

  // Wybór: zła opcja → wyjaśnienie i zmieszana mina, potem konsekwencja (herbata).
  await click(buttonText('Jedan čaj, molim.'));
  assert.ok(text(byClass('vn-feedback')[0]).includes('herbata'));
  assert.equal(byClass('mood-puzzled').length > 0, true);
  await click(buttonText(t('stories.continue')));
  assert.ok(text(byClass('vn-text')[0]).includes('Jedan čaj, može!'));
  // Tłumaczenie przy samej wypowiedzi to nie pomoc w zadaniu…
  await click(buttonText(t('stories.showTranslation')));
  assert.ok(text(byClass('vn-translation')[0]).includes('herbata'));
  assert.equal(hints, 0);
  await click(buttonText(t('stories.continue')));
  assert.equal(byClass('vn-translation').length, 0, 'tłumaczenie chowa się przy kolejnym kroku');
  // …ale odsłonięte, gdy trzeba odpowiedzieć, jest odnotowane jako podpowiedź (FSRS: trudne).
  await click(buttonText(t('stories.showTranslation')));
  assert.equal(hints, 1);
  await click(buttonText('Oprostite, ne čaj, nego kavu, molim.'));
  await click(buttonText(t('stories.continue')));
  await click(buttonText(t('stories.continue'))); // Ah, kavu!
  await click(buttonText(t('stories.continue'))); // S mlijekom ili bez?
  await click(buttonText('S mlijekom, molim.'));
  await click(buttonText(t('stories.continue')));
  await click(buttonText(t('stories.continue'))); // A šećer?

  // Kafelki: Bez · šećera · molim.
  for (const token of ['Bez', 'šećera', 'molim']) await click(view.root.findAll((n) => n.type === 'button' && n.props.className === 'order-token' && text(n) === token)[0]);
  await click(buttonText(t('stories.check')));
  assert.equal(text(byClass('vn-feedback-title')[0]), t('stories.fbCorrect'));
  await click(buttonText(t('stories.continue')));
  assert.ok(text(byClass('vn-text')[0]).includes('bijela kava'), 'ścieżka z mlekiem');
  await click(buttonText(t('stories.continue')));
  await click(buttonText(t('stories.continue'))); // Još nešto?

  // Wpisywanie (z paskiem znaków w prawdziwym AnswerInput).
  const input = view.root.findByType('input');
  await act(async () => input.props.onChange({ target: { value: 'Casu vode, molim' } }));
  await click(buttonText(t('stories.check')));
  assert.equal(text(byClass('vn-feedback-title')[0]), t('stories.fbNear'), 'brak diakrytyków = prawie dobrze');
  await click(buttonText(t('stories.continue')));
  await click(buttonText(t('stories.continue'))); // Naravno! Izvolite.
  assert.equal(view.root.findAll((n) => n.props?.className === 'done').length, 1, 'misja zakończona');
  act(() => view.unmount());
});
