import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
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
const cheatsheets = await compile('../src/grammar/cheatsheets.ts');
const { grammarSheetFor, grammarHref, listeningSuggestion } = await compile('../src/practice/suggestions.ts', { '@/grammar/cheatsheets': cheatsheets });

test('grammar suggestion follows the course module', () => {
  assert.equal(grammarSheetFor('A1', 2).id, 'prezent');
  assert.equal(grammarSheetFor('A1', 4).id, 'padezi');
  // A1 moduł 6 nie ma własnej ściągi — ostatni wcześniejszy temat.
  assert.equal(grammarSheetFor('A1', 6).id, 'padezi');
  assert.equal(grammarSheetFor('B1', 1).id, 'vid');
  // Moduł z kilkoma tematami — kolejne lekcje podpowiadają różne ściągi.
  assert.notEqual(grammarSheetFor('A1', 8, 0).id, grammarSheetFor('A1', 8, 1).id);
  assert.equal(grammarHref(grammarSheetFor('A2', 2, 0)), '/gramatyka#' + grammarSheetFor('A2', 2, 0).id);
});

test('every cheat sheet maps to course modules', () => {
  for (const sheet of cheatsheets.CHEATSHEETS) assert.ok(Object.values(sheet.modules).some(list => list.length), sheet.id);
});

test('listening suggestion alternates dialogues and stories at the lesson level', () => {
  assert.equal(listeningSuggestion('A1', 2).href, '/gry/listening?level=A1&kind=stories');
  assert.equal(listeningSuggestion('A2', 3).href, '/gry/listening?level=A2&kind=dialogues');
  assert.equal(listeningSuggestion('B2', 0).level, 'B1');
});
