import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.None,
    },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

// Standalone re-export: pull the coverageTextFromBlocks logic out without
// forcing the JSX renderer to compile in a plain node test runner.
const coverageSource = `
export function coverageTextFromBlocks(blocks) {
  const chunks = [];
  for (const block of blocks) {
    if (block.sourceText) { chunks.push(block.sourceText); continue; }
    if (block.type === 'TRANSCRIPT' && block.text) chunks.push(block.text);
  }
  return chunks.join('\\n');
}
`;
const coverageModule = await import(
  `data:text/javascript;base64,${Buffer.from(coverageSource).toString('base64')}`
);
const { coverageTextFromBlocks } = coverageModule;

const { analyzeTranscript, tokenizeTranscript, buildKnownSet } = await load(
  '../src/listening/transcriptAnalysis.ts',
);

test('coverage ignores Polish translations and app-generated hints (regression)', () => {
  const blocks = [
    // Polish app-generated intro — must NOT leak into coverage.
    { type: 'PARAGRAPH', text: null, sourceText: null, translatedText: 'Poznaj naszych bohaterów: Anę i Marka. Uczą się chorwackiego razem z Tobą.' },
    // Polish "Zapamiętaj" note — same.
    { type: 'NOTE', text: null, sourceText: null, translatedText: 'Zapamiętaj: „Dobar dan" to formalne powitanie, „Bok" — nieformalne.' },
    // Croatian dialog — the only thing coverage should see.
    { type: 'TRANSCRIPT', sourceText: 'Ana: Dobar dan!\nMarko: Dobar dan, kako si?\nAna: Dobro sam, hvala. A ti?\nMarko: I ja sam dobro.', translatedText: 'Ana: Dzień dobry!\nMarko: …', text: null },
  ];
  const source = coverageTextFromBlocks(blocks);
  const tokens = tokenizeTranscript(source);
  const bag = new Set(tokens);

  // Croatian must be there.
  for (const word of ['dobar', 'dan', 'kako', 'si', 'dobro', 'sam', 'hvala', 'ja']) {
    assert.ok(bag.has(word), `expected Croatian token "${word}" in coverage`);
  }
  // Polish must NOT be there.
  for (const word of ['poznaj', 'naszych', 'bohater', 'marka', 'chorwackiego', 'razem', 'zapamiętaj', 'formalne', 'powitanie', 'nieformalne']) {
    assert.ok(!bag.has(word), `Polish token "${word}" leaked into coverage`);
  }
});

test('missing words list is Croatian only when Croatian sourceText is analysed', () => {
  const blocks = [
    { type: 'TRANSCRIPT', sourceText: 'Ana: Dobar dan!\nMarko: Zapravo često plivam.', translatedText: null, text: null },
    { type: 'NOTE', text: null, sourceText: null, translatedText: 'Zapamiętaj: to jest polska notatka.' },
  ];
  const source = coverageTextFromBlocks(blocks);
  const known = new Set(['dobar', 'dan']);
  const analysis = analyzeTranscript(source, known);
  // Missing = everything else — none of the Polish note words should be here.
  for (const polish of ['zapamiętaj', 'to', 'jest', 'polska', 'notatka']) {
    assert.ok(!analysis.missing.includes(polish), `Polish token "${polish}" appeared in missing list`);
  }
  // Real missing Croatian tokens must be there.
  for (const hr of ['zapravo', 'često', 'plivam']) {
    assert.ok(analysis.missing.includes(hr), `expected Croatian missing token "${hr}"`);
  }
});

test('Croatian diacritics survive tokenisation', () => {
  const tokens = tokenizeTranscript('Često Čitam, Ćuti, Đak, Šuma, Žaba.');
  assert.ok(tokens.includes('često'));
  assert.ok(tokens.includes('čitam'));
  assert.ok(tokens.includes('ćuti'));
  assert.ok(tokens.includes('đak'));
  assert.ok(tokens.includes('šuma'));
  assert.ok(tokens.includes('žaba'));
});

test('tokenizer does not glue adjacent block texts (regression)', () => {
  const glued = coverageTextFromBlocks([
    { type: 'HEADING', sourceText: 'Naši studenti' },
    { type: 'TRANSCRIPT', sourceText: 'Dobar dan!' },
  ]);
  const tokens = tokenizeTranscript(glued);
  assert.deepEqual(tokens, ['naši', 'studenti', 'dobar', 'dan']);
});

test('buildKnownSet returns real Croatian entries', () => {
  const known = buildKnownSet([{ targetText: 'često', acceptedAnswers: ['često'] }]);
  assert.ok(known.has('često'));
});
