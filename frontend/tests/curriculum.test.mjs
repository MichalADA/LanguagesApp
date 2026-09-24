import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
async function compile(path, mocks = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function('require', 'exports', outputText)((id) => mocks[id] ?? require(id), exports);
  return exports;
}
const validation = await compile('../src/services/validation.ts');
const { PL_HR_OUTLINE } = await compile('../src/curriculum/data/a1.ts');
const { LESSON_A1_01_02 } = await compile('../src/curriculum/data/lessons/a1-01-02.ts');
const { deriveLevel, nextLessonId } = await compile('../src/curriculum/progress.ts');
const { checkLessonAnswer, reviewFreeResponse } = await compile('../src/curriculum/answers.ts', { '@/services/validation': validation });
const rules = { caseInsensitive: true, trimWhitespace: true, diacriticsMatter: true, foldMap: { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd' } };
const a1 = PL_HR_OUTLINE.levels.find(level => level.id === 'A1');
const seeded = new Set(a1.modules.flatMap(m => m.lessons).filter(l => l.status === 'completed').map(l => l.id));

test('A1 mock has 8 modules x 5 lessons with unique ids and required fields', () => {
  assert.equal(a1.modules.length, 8);
  const lessons = a1.modules.flatMap(m => m.lessons);
  assert.equal(lessons.length, 40);
  assert.equal(new Set(lessons.map(l => l.id)).size, 40);
  for (const lesson of lessons) {
    for (const key of ['id', 'moduleId', 'order', 'title', 'shortDescription', 'estimatedMinutes', 'status']) assert.ok(lesson[key] !== undefined, `${lesson.id}.${key}`);
  }
  assert.deepEqual(PL_HR_OUTLINE.levels.map(l => [l.id, l.available]), [['A1', true], ['A2', false], ['B1', false], ['B2', false]]);
});

test('statuses: seeded progress gives 12/40, current lesson in module 3, later modules locked', () => {
  const view = deriveLevel(a1, seeded);
  assert.equal(view.completedCount, 12);
  assert.equal(view.percent, 30);
  assert.equal(view.completedModules, 2);
  assert.equal(view.current.lesson.lesson.id, 'a1-03-03');
  assert.equal(view.current.lesson.number, 13);
  assert.deepEqual(view.modules.map(m => m.status), ['completed', 'completed', 'in_progress', 'locked', 'locked', 'locked', 'locked', 'locked']);
  assert.deepEqual(view.modules[2].lessons.map(l => l.status), ['completed', 'completed', 'current', 'available', 'available']);
  assert.equal(view.modules[3].lessons[0].status, 'locked');
});

test('completing lessons moves the current lesson and ends the level', () => {
  const view = deriveLevel(a1, new Set([...seeded, 'a1-03-03']));
  assert.equal(view.current.lesson.lesson.id, 'a1-03-04');
  const all = new Set(a1.modules.flatMap(m => m.lessons.map(l => l.id)));
  const done = deriveLevel(a1, all);
  assert.equal(done.current, null);
  assert.equal(done.percent, 100);
  assert.equal(done.minutesLeft, 0);
  assert.equal(nextLessonId(a1, 'a1-01-05'), 'a1-02-01');
  assert.equal(nextLessonId(a1, 'a1-08-05'), null);
});

test('demo lesson follows the rhythm and every exercise has a correct answer', () => {
  const steps = LESSON_A1_01_02.steps;
  assert.equal(steps[0].type, 'intro');
  assert.equal(steps.at(-1).type, 'summary');
  // Pierwsze ćwiczenie pojawia się zaraz po pierwszym nowym słowie, nie po bloku teorii.
  const firstWord = steps.findIndex(s => s.type === 'word');
  assert.ok(['choice', 'translate', 'gap'].includes(steps[firstWord + 1].type));
  for (const type of ['word', 'choice', 'translate', 'gap', 'dialog', 'free', 'structure']) assert.ok(steps.some(s => s.type === type), type);
  const stages = steps.map(s => s.stage);
  assert.deepEqual([...new Set(stages)], ['intro', 'words', 'structure', 'practice', 'dialog', 'summary']);
  for (const step of steps) {
    if (step.type === 'translate' || step.type === 'gap') assert.equal(checkLessonAnswer(step.accepted[0], step.accepted, rules), 'hit');
    if (step.type === 'dialog') for (const turn of step.turns.filter(t => t.kind === 'reply')) assert.equal(checkLessonAnswer(turn.suggestion, turn.accepted, rules, turn.pattern), 'hit');
  }
});

test('answer checking: punctuation ignored, diacritics are "near", patterns accept own city', () => {
  assert.equal(checkLessonAnswer('živim u poljskoj', ['Živim u Poljskoj.'], rules), 'hit');
  assert.equal(checkLessonAnswer('Zivim u Poljskoj', ['Živim u Poljskoj.'], rules), 'near');
  assert.equal(checkLessonAnswer('Iz Poljske sam', ['Živim u Poljskoj.'], rules), 'miss');
  assert.equal(checkLessonAnswer('   ', ['u'], rules), 'miss');
  const pattern = '^(ja )?živim u [a-zčćđšž]+[.!]?$';
  assert.equal(checkLessonAnswer('Živim u Krakovu.', [], rules, pattern), 'hit');
  assert.equal(checkLessonAnswer('Zivim u Krakovu', [], rules, pattern), 'near');
});

test('free response feedback counts sentences and spots the key structures', () => {
  const step = LESSON_A1_01_02.steps.find(s => s.type === 'free');
  const full = reviewFreeResponse('Ja sam iz Poljske. Zivim u Gdanjsku.', step.keywords, rules);
  assert.equal(full.sentences, 2);
  assert.equal(full.missing.length, 0);
  const partial = reviewFreeResponse('Ja sam iz Poljske.', step.keywords, rules);
  assert.deepEqual(partial.missing, ['gdzie mieszkasz (živim u …)']);
});
