import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { COURSE_PL_HR: course } = await load('../src/courses/registry.ts');
const { parseDataset, splitRow } = await load('../src/vocabulary/adapter.ts');
const { checkAnswer, acceptedAnswers } = await load('../src/services/validation.ts');
const text = await readFile(new URL('../public/data/chorwacki_2000_PL-HR.csv', import.meta.url), 'utf8');
const words = parseDataset(course, text);
const word = (rank) => words.find((entry) => entry.rank === rank);

test('every CSV record is complete, has a stable unique rank and belongs to its tagged range', () => {
  const [header, ...rows] = text.replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/).map(splitRow);
  assert.equal(words.length, rows.length, 'parser must not silently skip records');
  assert.equal(new Set(header).size, header.length);
  assert.ok(header.includes('AcceptedAnswers'));
  const index = (name) => header.indexOf(name);
  rows.forEach((row, i) => {
    assert.equal(row.length, header.length, `column count at record ${i + 1}`);
    assert.equal(row[index('Rank')], String(i + 1), 'append records without renumbering existing cards');
    for (const name of ['Polish', 'Croatian', 'PartOfSpeech', 'ExampleCroatian', 'ExamplePolish', 'Tags']) {
      assert.ok(row[index(name)].trim(), `${i + 1}: missing ${name}`);
      assert.equal(row[index(name)], row[index(name)].trim(), `${i + 1}: surrounding whitespace in ${name}`);
    }
    assert.ok(['YES', 'NO'].includes(row[index('FalseFriend')]));
    if (row[index('FalseFriend')] === 'YES') assert.ok(row[index('FalseFriendNote')].trim());
    const ranges = row[index('Tags')].split(/\s+/).filter(tag => /^HR_\d+_\d+$/.test(tag));
    assert.equal(ranges.length, 1);
    const [, start, end] = ranges[0].split('_').map(Number);
    assert.ok(i + 1 >= start && i + 1 <= end);
    const variants = JSON.parse(row[index('AcceptedAnswers')]);
    assert.ok(Array.isArray(variants));
    assert.ok(variants.every(value => typeof value === 'string' && value.trim() && value === value.trim()));
    const answers = [row[index('Croatian')], ...variants].map(value => value.normalize('NFC').toLowerCase());
    assert.equal(new Set(answers).size, answers.length, `${i + 1}: duplicate answer`);
    assert.equal(words[i].id, `${course.id}:${i + 1}`);
  });
});

test('the default answer teaches the corrected word and keeps inflection distinct', () => {
  assert.equal(word(26).targetText, 'voljeti');
  assert.equal(checkAnswer(course, word(26), 'voljeti').verdict, 'hit');
  assert.equal(checkAnswer(course, word(26), 'volim').verdict, 'miss');
  assert.equal(checkAnswer(course, word(26), 'lubjiti').verdict, 'miss');
  assert.equal(word(2761).targetText, 'pecivo');
  assert.equal(word(2579).sourceText, 'około dziesięciu');
  assert.equal(word(2976).sourceText, 'złożyć wniosek');
});

test('explicit variants accept Croatian synonyms but never Polish explanatory notes', () => {
  assert.equal(checkAnswer(course, word(439), 'apoteka').verdict, 'hit');
  assert.equal(checkAnswer(course, word(409), 'bok').verdict, 'hit');
  assert.equal(checkAnswer(course, word(2181), 'trafić').verdict, 'miss');
  assert.equal(checkAnswer(course, word(2838), 'lek na receptę').verdict, 'miss');
  assert.deepEqual(acceptedAnswers({ ...word(26), grammar: 'też: niepoprawny opis', acceptedAnswers: [] }), ['voljeti']);
});

test('legacy datasets without the optional column still load and accept zwykle variants', () => {
  const legacy = 'Rank;Polish;Croatian;Grammar\n1;kochać;ljubiti;zwykle: voljeti';
  const [entry] = parseDataset(course, legacy);
  assert.equal(entry.acceptedAnswers, undefined);
  assert.equal(checkAnswer(course, entry, 'voljeti').verdict, 'hit');
});

test('malformed explicit answer lists fail instead of treating prose as answers', () => {
  for (const value of ['not-json', '{}', '[1]', '[null]']) {
    assert.throws(() => parseDataset(course, `Rank;Polish;Croatian;AcceptedAnswers\n1;słowo;riječ;${value}`));
  }
});

test('diacritics and case handling apply equally to explicit answer variants', () => {
  const entry = { ...word(409), acceptedAnswers: ['ćao'] };
  assert.equal(checkAnswer(course, entry, ' ĆAO ').verdict, 'hit');
  assert.equal(checkAnswer(course, entry, 'cao').verdict, 'near');
});

test('5000 cards preserve the original 3000 bytes and append unique, registered targets', async () => {
  const { createHash } = await import('node:crypto');
  assert.equal(words.length, 5000);
  const prefix = text.split(/(?<=\n)/).slice(0, 3001).join('');
  assert.equal(createHash('sha256').update(prefix).digest('hex'), '548cb75792a50c2ee5b8550c4e4ae43fbf946a2ebec4e0d1489fbb9430b6d21e');
  const normalized = value => value.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}_\s]/gu, '').trim().replace(/\s+/g, ' ');
  const seen = new Set(words.slice(0, 3000).map(entry => normalized(entry.targetText)));
  const blocks = new Set(course.blocks.map(block => block.id));
  const additions = words.slice(3000);
  assert.equal(words.filter(entry => entry.tags.includes('uzupełnienie')).length, 2000);
  for (const entry of additions) {
    const target = normalized(entry.targetText);
    assert.ok(!seen.has(target), `duplicate new target: ${entry.targetText}`);
    seen.add(target);
    assert.ok(blocks.has(entry.block));
    assert.ok(entry.tags.includes('uzupełnienie'));
    for (const value of [entry.targetText, entry.sourceText, entry.exampleTarget, entry.exampleSource]) {
      assert.equal(value, value.normalize('NFC'));
      assert.ok(!/[\p{Cf}\uFFFD]/u.test(value), `invalid invisible character: ${entry.id}`);
    }
  }
});

test('introductions teach usable phrases and accept explicit variants and punctuation', () => {
  const intro = words.find(entry => entry.targetText === 'zovem se');
  assert.equal(intro.rank, 3001);
  assert.equal(intro.sourceText, 'nazywam się');
  assert.equal(intro.exampleTarget, 'Zovem se Marko.');
  for (const value of ['zovem se', 'ja se zovem', 'Zovem se.', 'Ja se zovem.']) {
    assert.equal(checkAnswer(course, intro, value).verdict, 'hit', value);
  }
  assert.equal(checkAnswer(course, intro, 'nazywam się').verdict, 'miss');
  assert.equal(checkAnswer(course, intro, 'zvati se').verdict, 'miss');
  const myName = words.find(entry => entry.targetText === 'moje ime je');
  assert.equal(checkAnswer(course, myName, 'ime mi je').verdict, 'hit');
});
