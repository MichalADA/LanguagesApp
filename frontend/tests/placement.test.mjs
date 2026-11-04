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
const { moduleVerdict, pickModuleQuestions, placementLessons, placementModules } = await compile('../src/curriculum/placement.ts');

test('module verdict is decided as early as possible (2 of 3)', () => {
  assert.equal(moduleVerdict(2, 2), 'pass');
  assert.equal(moduleVerdict(0, 2), 'fail');
  assert.equal(moduleVerdict(1, 2), null);
  assert.equal(moduleVerdict(1, 3), 'fail');
  assert.equal(moduleVerdict(1, 1, 1), 'pass');
});

test('placement skips modules in order and lists their lessons', () => {
  const mod = (id, n) => ({ id, lessons: Array.from({ length: n }, (_, i) => ({ id: `${id}-0${i + 1}` })) });
  const outline = { levels: [
    { id: 'A1', available: true, modules: [mod('a1-01', 2), mod('a1-02', 2)] },
    { id: 'A2', available: false, modules: [mod('a2-01', 2)] },
  ] };
  const modules = placementModules(outline);
  assert.deepEqual(modules.map(item => item.module.id), ['a1-01', 'a1-02']);
  assert.deepEqual(placementLessons(modules.slice(0, 1)), ['a1-01-01', 'a1-01-02']);
});

test('every course module gives three placement tasks: two choices and one typed', async () => {
  for (const level of ['hr-a1', 'hr-a2', 'hr-b1']) {
    const root = new URL(`../src/curriculum/data/${level}/`, import.meta.url);
    const dirs = (await readdir(root)).filter(name => name.startsWith('module-')).sort();
    assert.ok(dirs.length >= 8);
    for (const dir of dirs) {
      const files = (await readdir(new URL(`${dir}/`, root))).filter(name => name.endsWith('.ts'));
      const contents = await Promise.all(files.map(async file => (await compile(`../src/curriculum/data/${level}/${dir}/${file}`)).LESSON.content));
      const questions = pickModuleQuestions(contents, () => 0.5);
      assert.equal(questions.length, 3, `${level}/${dir}`);
      assert.ok(questions.some(q => q.type === 'choice'), `${level}/${dir}: wybór`);
      assert.ok(questions.some(q => q.type !== 'choice'), `${level}/${dir}: zadanie do wpisania`);
      for (const q of questions) {
        if (q.type === 'choice') assert.ok(q.options[q.correctIndex] !== undefined);
        else assert.ok(q.accepted.length);
      }
    }
  }
});
