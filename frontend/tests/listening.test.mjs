import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { normalizeTranscript, tokenizeTranscript, buildKnownSet, analyzeTranscript } =
  await load('../src/listening/transcriptAnalysis.ts');

test('normalizeTranscript keeps Croatian diacritics', () => {
  const normalized = normalizeTranscript('Često Ćuti Đak Šuma Žaba');
  assert.match(normalized, /često/);
  assert.match(normalized, /žaba/);
});

test('normalizeTranscript strips speaker labels', () => {
  const normalized = normalizeTranscript('Mario: Bok!\nLaura: Bok, kako si?');
  assert.doesNotMatch(normalized, /mario:/);
  assert.doesNotMatch(normalized, /laura:/);
  assert.match(normalized, /bok/);
});

test('tokenizeTranscript drops punctuation but keeps diacritics', () => {
  assert.deepEqual(tokenizeTranscript('Često plivam, tenis igram!'), ['često', 'plivam', 'tenis', 'igram']);
});

test('tokenizeTranscript counts duplicates', () => {
  assert.deepEqual(tokenizeTranscript('bok bok bok'), ['bok', 'bok', 'bok']);
});

test('analyzeTranscript splits known and missing tokens', () => {
  const known = new Set(['bok', 'kako', 'si', 'dobro', 'sam']);
  const result = analyzeTranscript('Bok! Zapravo često plivam.', known);
  assert.equal(result.totalWords, 4);
  assert.equal(result.uniqueWords, 4);
  assert.equal(result.knownWords, 1);
  assert.equal(result.missingWords, 3);
  assert.equal(result.missing.length, 3);
  assert.ok(result.missing.includes('često'));
  assert.ok(result.missing.includes('plivam'));
  assert.ok(result.missing.includes('zapravo'));
  assert.equal(result.coveragePercent, 25);
});

test('analyzeTranscript reports 100% when everything is known', () => {
  const known = new Set(['bok', 'kako', 'si']);
  const result = analyzeTranscript('Bok, kako si?', known);
  assert.equal(result.coveragePercent, 100);
  assert.deepEqual(result.missing, []);
});

test('analyzeTranscript handles an empty transcript', () => {
  const result = analyzeTranscript('', new Set(['x']));
  assert.equal(result.totalWords, 0);
  assert.equal(result.uniqueWords, 0);
  assert.equal(result.coveragePercent, 0);
});

test('buildKnownSet tokenizes vocabulary entries with diacritics', () => {
  const entries = [
    { targetText: 'često', acceptedAnswers: ['često'] },
    { targetText: 'plivati', acceptedAnswers: ['plivati'] },
    { targetText: 'bok', acceptedAnswers: [] },
  ];
  const known = buildKnownSet(entries);
  assert.ok(known.has('često'));
  assert.ok(known.has('plivati'));
  assert.ok(known.has('bok'));
});
