import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
async function compile(path, mocks = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function('require', 'exports', outputText)((id) => mocks[id] ?? {}, exports);
  return exports;
}
const P = await compile('../src/curriculum/placement.ts');
const { placementLessons, placementModules, modulePool } = P;
const M = 28;
/** Kandydaci: z każdego modułu wybór (3 opcje) i zadanie do wpisania, każde ograniczone pulą. */
function simulate(trueLevel, answer) {
  let posterior = P.initialPosterior(M);
  let asked = 0;
  const used = {};
  while (!P.shouldStop(posterior, asked)) {
    const candidates = [];
    for (let m = 0; m < M; m++) {
      if ((used[`${m}c`] ?? 0) < 4) candidates.push({ module: m, kind: 'choice', options: 3 });
      if ((used[`${m}t`] ?? 0) < 2) candidates.push({ module: m, kind: 'typed' });
    }
    const item = P.chooseItem(posterior, candidates);
    used[`${item.module}${item.kind[0]}`] = (used[`${item.module}${item.kind[0]}`] ?? 0) + 1;
    posterior = P.update(posterior, item, answer(trueLevel, item));
    asked++;
  }
  return { ...P.estimate(posterior), asked };
}
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

test('model: knowing a module makes a correct answer likely, guessing stays at chance', () => {
  assert.ok(P.pCorrect(10, { module: 2, kind: 'typed' }) > 0.8);
  assert.ok(P.pCorrect(2, { module: 10, kind: 'typed' }) < 0.05);
  const guess = P.pCorrect(0, { module: 20, kind: 'choice', options: 3 });
  assert.ok(guess > 0.3 && guess < 0.36);
});

test('Bayes update moves the estimate up after a correct answer and down after a wrong one', () => {
  const prior = P.initialPosterior(M);
  const item = { module: 14, kind: 'typed' };
  assert.ok(P.estimate(P.update(prior, item, true)).start > P.estimate(prior).start);
  assert.ok(P.estimate(P.update(prior, item, false)).start < P.estimate(prior).start);
});

test('the first question is from the middle of the course (maximum information)', () => {
  const candidates = Array.from({ length: M }, (_, m) => ({ module: m, kind: 'typed' }));
  const first = P.chooseItem(P.initialPosterior(M), candidates);
  assert.ok(first.module >= 8 && first.module <= 18, `pierwsze pytanie z modułu ${first.module}`);
});

test('a consistent learner is placed exactly at their level, for every level', () => {
  for (let level = 0; level <= M; level++) {
    const result = simulate(level, (h, item) => item.module < h);
    assert.ok(Math.abs(result.start - level) <= 1, `poziom ${level} → ${result.start}`);
    assert.ok(result.asked <= P.MAX_QUESTIONS);
  }
});

test('a noisy learner (slips and lucky guesses) is placed within ±2 modules almost always', () => {
  const random = rng(7);
  let far = 0, total = 0, questions = 0;
  for (let round = 0; round < 20; round++) {
    for (let level = 0; level <= M; level++) {
      const result = simulate(level, (h, item) => random() < P.pCorrect(h, item));
      total++; questions += result.asked;
      if (Math.abs(result.start - level) > 2) far++;
    }
  }
  assert.ok(far / total < 0.05, `${far}/${total} wyników dalej niż 2 moduły`);
  assert.ok(questions / total <= 16, `średnio ${questions / total} pytań`);
});

test('placement lists lessons of known modules in course order', () => {
  const mod = (id, n) => ({ id, lessons: Array.from({ length: n }, (_, i) => ({ id: `${id}-0${i + 1}` })) });
  const outline = { levels: [
    { id: 'A1', available: true, modules: [mod('a1-01', 2), mod('a1-02', 2)] },
    { id: 'A2', available: false, modules: [mod('a2-01', 2)] },
  ] };
  const modules = placementModules(outline);
  assert.deepEqual(modules.map(item => item.module.id), ['a1-01', 'a1-02']);
  assert.deepEqual(placementLessons(modules.slice(0, 1)), ['a1-01-01', 'a1-01-02']);
});

test('every course module has both kinds of placement tasks', async () => {
  for (const level of ['hr-a1', 'hr-a2', 'hr-b1']) {
    const root = new URL(`../src/curriculum/data/${level}/`, import.meta.url);
    const dirs = (await readdir(root)).filter(name => name.startsWith('module-')).sort();
    assert.ok(dirs.length >= 8);
    for (const dir of dirs) {
      const files = (await readdir(new URL(`${dir}/`, root))).filter(name => name.endsWith('.ts'));
      const contents = await Promise.all(files.map(async file => (await compile(`../src/curriculum/data/${level}/${dir}/${file}`)).LESSON.content));
      const pool = modulePool(contents, () => 0.5);
      assert.ok(pool.choice.length >= 1, `${level}/${dir}: wybór`);
      assert.ok(pool.typed.length >= 1, `${level}/${dir}: zadanie do wpisania`);
      for (const q of [...pool.choice, ...pool.typed]) {
        if (q.type === 'choice') assert.ok(q.options[q.correctIndex] !== undefined);
        else assert.ok(q.accepted.length);
      }
    }
  }
});
