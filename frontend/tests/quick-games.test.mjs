import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

// Compile pure TS modules in memory; no new runtime/test dependency is needed.
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { buildQuestions, uniqueWords, scrambledLetters, topicsOf, QUICK_GAME_IDS } = await load('../src/quick-games/helpers.ts');
const { LEARNING_LEVELS, entriesForLevel, levelForLegacyBlock } = await load('../src/config/learningLevels.ts');
const { COURSE_PL_HR: course } = await load('../src/courses/registry.ts');
const { parseDataset } = await load('../src/vocabulary/adapter.ts');
const words = parseDataset(course, await readFile(new URL('../public/data/chorwacki_2000_PL-HR.csv', import.meta.url), 'utf8'));

test('levels are cumulative and have exactly 500 / 1000 / 3000 words', () => {
  assert.deepEqual(LEARNING_LEVELS.map(level => level.id), ['A1', 'A2', 'B1']);
  for (const level of LEARNING_LEVELS) {
    const pool = entriesForLevel(words, level.id, course.blocks);
    assert.equal(pool.length, level.wordCount);
    assert.equal(Math.max(...pool.map(word => word.rank)), level.wordCount);
  }
  assert.equal(levelForLegacyBlock(course.blocks[1].id, course.blocks), 'A2');
});
test('all seven generators run on every current level and stay in that pool', () => {
  for (const level of LEARNING_LEVELS) {
    const pool = entriesForLevel(words, level.id, course.blocks);
    const ids = new Set(pool.map(word => word.id));
    for (const mode of QUICK_GAME_IDS) {
      const questions = buildQuestions(mode, pool);
      assert.ok(questions.length > 0, `${mode} ${level.id} has usable questions`);
      for (const question of questions) {
        assert.ok(ids.has(question.word.id));
        for (const option of question.options ?? []) assert.ok(ids.has(option.id));
      }
    }
  }
});
test('choice questions always have four unique options and one correct ID', () => {
  for (let iteration = 0; iteration < 30; iteration++) for (const question of buildQuestions('multiple-choice', words)) {
    assert.equal(new Set(question.options.map(word => word.targetText.toLowerCase())).size, 4);
    assert.equal(question.options.filter(word => word.id === question.word.id).length, 1);
  }
});
test('true/false is balanced and false translations are not synonymous records', () => {
  const questions = buildQuestions('true-false', words);
  assert.equal(questions.filter(question => question.correct).length, 10);
  for (const question of questions) assert.equal(question.translation === question.word.sourceText, question.correct);
});
test('odd one out has three unambiguous topic members and one outsider', () => {
  for (const question of buildQuestions('odd-one-out', words)) {
    assert.equal(question.options.filter(word => word.tags.includes(question.topic)).length, 3);
    assert.ok(!question.word.tags.includes(question.topic));
    for (const word of question.options) assert.equal(topicsOf(word).length, 1);
  }
  assert.deepEqual(buildQuestions('odd-one-out', words.filter(word => topicsOf(word).length === 1 && topicsOf(word)[0] === 'food')), []);
});
test('duplicate visible translations are removed without using text as pair identity', () => {
  const word = words[0];
  assert.equal(uniqueWords([word, { ...word, id: 'other' }, { ...word, id: 'third', targetText: 'different' }]).length, 1);
  assert.equal(new Set(buildQuestions('pairs', words).map(question => question.word.id)).size, 6);
});
test('scrambled letters preserve Croatian diacritics and repeated letter IDs', () => {
  for (const text of ['kuća', 'čćđšž', 'banana']) {
    const letters = scrambledLetters(text);
    assert.equal(new Set(letters.map(item => item.id)).size, Array.from(text).length);
    assert.deepEqual(letters.map(item => item.letter).sort(), Array.from(text).sort());
    assert.notEqual(letters.map(item => item.letter).join(''), text);
  }
  for (const question of buildQuestions('scrambled-word', words)) assert.match(question.word.targetText, /^[\p{L}]{2,18}$/u);
});
test('empty and too-small pools never create invalid distractors', () => {
  for (const mode of QUICK_GAME_IDS) assert.deepEqual(buildQuestions(mode, []), []);
  assert.deepEqual(buildQuestions('multiple-choice', words.slice(0, 3)), []);
  assert.deepEqual(buildQuestions('true-false', words.slice(0, 1)), []);
});
