import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import ts from 'typescript';

const require = createRequire(import.meta.url);
async function compile(path, mocks = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } });
  const exports = {};
  new Function('require', 'exports', outputText)(id => mocks[id] ?? require(id), exports);
  return exports;
}
const { COURSE_PL_HR: course } = await compile('../src/courses/registry.ts');
const levels = await compile('../src/config/learningLevels.ts');
const vocabularyTypes = await compile('../src/vocabulary/types.ts');
const { parseDataset } = await compile('../src/vocabulary/adapter.ts');
const entries = parseDataset(course, await readFile(new URL('../public/data/chorwacki_2000_PL-HR.csv', import.meta.url), 'utf8'));
const topics = ['uzupełnienie', 'food', 'home'];
const shared = {
  '@/courses/CourseProvider': { useCourse: () => ({ course }) },
  '@/vocabulary/VocabularyProvider': { useVocabulary: () => ({ entries, topics }) },
  '@/vocabulary/types': vocabularyTypes,
  '@/config/learningLevels': levels,
};
const { useWordPool } = await compile('../src/hooks/useWordPool.ts', {
  ...shared,
  react: { useMemo: fn => fn() },
  '@/progress/ProgressProvider': { useProgress: () => ({ state: {}, courseId: course.id }) },
  '@/progress/service': {},
});
const pool = (source, topic = null) => useWordPool({ source, topic });

test('new pool and topic intersect; all and existing CEFR pools keep their own ranges', () => {
  assert.equal(pool({ kind: 'all' }).length, 5000);
  const supplement = pool({ kind: 'supplement' });
  assert.equal(supplement.length, 2000);
  assert.ok(supplement.every(entry => entry.rank > 3000));
  const food = pool({ kind: 'supplement' }, 'food');
  assert.ok(food.length > 0 && food.length < supplement.length);
  assert.ok(food.every(entry => entry.rank > 3000 && entry.tags.includes('food')));
  assert.equal(pool({ kind: 'supplement' }, 'nonexistent').length, 0);
  for (const [level, count] of [['A1', 1000], ['A2', 2000], ['B1', 5000]]) {
    const selected = pool({ kind: 'level', level });
    assert.equal(selected.length, count);
  }
});

test('picker switches sources independently, preserves topic, and hides supplement for sentences', async () => {
  const { PoolPicker } = await compile('../src/components/PoolPicker.tsx', {
    ...shared, '@/i18n': { useT: () => key => key },
  });
  let selection = { source: { kind: 'all' }, topic: null };
  let view;
  const props = () => ({ value: selection, poolSize: pool(selection.source, selection.topic).length,
    onChange: next => { selection = next; view.update(React.createElement(PoolPicker, props())); } });
  act(() => { view = Renderer.create(React.createElement(PoolPicker, props())); });
  const button = label => view.root.findAllByType('button').find(node =>
    node.children.includes(label) || node.findAllByType('span').some(span => span.children.includes(label)));
  act(() => button('pool.supplement').props.onClick());
  assert.equal(selection.source.kind, 'supplement');
  assert.equal(button('pool.supplement').props.className, 'tile on');
  assert.equal(button('pool.allWords').props.className, 'tile');
  act(() => button('food').props.onClick());
  assert.deepEqual(selection, { source: { kind: 'supplement' }, topic: 'food' });
  assert.ok(pool(selection.source, selection.topic).every(entry => entry.rank > 3000));
  assert.equal(button('uzupełnienie'), undefined);
  act(() => button('pool.allWords').props.onClick());
  assert.deepEqual(selection, { source: { kind: 'all' }, topic: 'food' });
  act(() => button('A1').props.onClick());
  assert.deepEqual(selection.source, { kind: 'level', level: 'A1' });
  act(() => view.update(React.createElement(PoolPicker, { ...props(), sentenceCounts: { A1: 1, A2: 1, B1: 1 } })));
  assert.equal(button('pool.supplement'), undefined);
  act(() => view.unmount());
});

test('all seven quick games can generate questions from the supplement', async () => {
  const { QUICK_GAME_IDS, buildQuestions } = await compile('../src/quick-games/helpers.ts');
  for (const mode of QUICK_GAME_IDS) {
    const questions = buildQuestions(mode, pool({ kind: 'supplement' }));
    assert.ok(questions.length > 0, mode);
    assert.ok(questions.every(question => question.word.rank > 3000));
  }
});
