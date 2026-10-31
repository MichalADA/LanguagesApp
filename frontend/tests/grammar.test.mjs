import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
async function compile(path, mocks = {}) {
  const text = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function('require', 'exports', outputText)((id) => mocks[id] ?? require(id), exports);
  return exports;
}

const validation = await compile('../src/services/validation.ts');
const { DRILL_TOPICS } = await compile('../src/grammar/drills.ts');
const { CHEATSHEETS } = await compile('../src/grammar/cheatsheets.ts');
const logic = await compile('../src/grammar/drillLogic.ts', { '@/services/validation': validation });
const registryText = await readFile(new URL('../src/courses/registry.ts', import.meta.url), 'utf8');
const rules = { caseInsensitive: true, trimWhitespace: true, diacriticsMatter: true, foldMap: { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd' } };

const words = (s) => s.toLocaleLowerCase('hr').replace(/[.,!?;:„”"…()]/g, ' ').split(/\s+/).filter(Boolean).sort();

test('zestawy zadań: unikalne id, poprawne luki, odpowiedzi i kafelki; każdy ma ściągę', () => {
  const sheets = new Set(CHEATSHEETS.map((s) => s.id));
  assert.deepEqual(DRILL_TOPICS.map((t) => t.id), ['padezi', 'enklitike', 'vid', 'komparacija', 'vremena']);
  for (const topic of DRILL_TOPICS) {
    assert.ok(sheets.has(topic.sheet), `${topic.id}: brak ściągi ${topic.sheet}`);
    assert.ok(topic.items.length >= 20, `${topic.id}: co najmniej 20 zadań`);
    assert.equal(new Set(topic.items.map((i) => i.id)).size, topic.items.length, `${topic.id}: powtórzone id`);
    for (const item of topic.items) {
      const where = `${topic.id}/${item.id}`;
      assert.ok(item.pl && item.explanation, `${where}: tłumaczenie i wyjaśnienie`);
      if (item.kind === 'gap') {
        assert.equal(item.prompt.split('___').length, 2, `${where}: dokładnie jedna luka`);
        assert.ok(item.hint && item.answers.length, where);
      }
      if (item.kind === 'choice') {
        assert.ok(item.options.length >= 2 && item.answer >= 0 && item.answer < item.options.length, where);
        assert.equal(item.prompt.split('___').length, 2, `${where}: dokładnie jedna luka`);
      }
      if (item.kind === 'order') {
        for (const a of item.answers) assert.deepEqual(words(a), words(item.tokens.join(' ')), `${where}: „${a}” nie składa się dokładnie z kafelków`);
      }
    }
  }
});

test('ściągi: tabele mają równe wiersze, ćwiczenia wskazują istniejące gry', () => {
  const games = new Set(['odmiana', ...DRILL_TOPICS.map((t) => t.id)]);
  assert.equal(CHEATSHEETS.length, 8);
  for (const sheet of CHEATSHEETS) {
    for (const table of sheet.tables) for (const row of table.rows) assert.equal(row.length, table.head.length, `${sheet.id}: wiersz „${row[0]}”`);
    assert.ok(sheet.rules.length && sheet.examples.length, sheet.id);
    if (sheet.practice) assert.ok(games.has(sheet.practice), `${sheet.id}: nieznana gra ${sheet.practice}`);
  }
  assert.ok(registryText.includes('diacriticsMatter'), 'reguły walidacji z kursu');
});

test('ocena: wielkość liter i interpunkcja nie mają znaczenia, brak diakrytyków to „prawie”', () => {
  assert.equal(logic.judgeText(['školu'], 'Školu', rules), 'hit');
  assert.equal(logic.judgeText(['školu'], 'skolu', rules), 'near');
  assert.equal(logic.judgeText(['školu'], 'skolu', rules, false), 'miss');
  assert.equal(logic.judgeText(['školu'], 'školi', rules), 'miss');
  assert.equal(logic.judgeText(['Zovem se Marko.'], 'zovem se marko', rules), 'hit');
  const choice = DRILL_TOPICS.find((t) => t.id === 'vid').items[0];
  assert.equal(logic.judgeItem(choice, choice.answer, rules), 'hit');
  assert.equal(logic.judgeItem(choice, 1 - choice.answer, rules), 'miss');
  // Kafelki: brak diakrytyków nie jest możliwy, więc nie ma taryfy ulgowej.
  const order = DRILL_TOPICS.find((t) => t.id === 'enklitike').items[0];
  assert.equal(logic.judgeItem(order, 'Se zovem Marko', rules), 'miss');
  assert.equal(logic.judgeItem(order, 'Zovem se Marko', rules), 'hit');
});

test('runda: bez powtórzeń, mylone zadania częściej', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `i${i}` }));
  const round = logic.pickRound(items, () => undefined);
  assert.equal(round.length, logic.DRILL_ROUND);
  assert.equal(new Set(round.map((i) => i.id)).size, round.length);
  const mastered = { attempts: 10, correctAnswers: 10, incorrectAnswers: 0, difficulty: 0, currentStreak: 8 };
  const troubled = { attempts: 4, correctAnswers: 1, incorrectAnswers: 3, difficulty: 0.75, currentStreak: 0 };
  assert.ok(logic.weightFor(troubled) > logic.weightFor(undefined));
  assert.ok(logic.weightFor(mastered) < 0.5);
  assert.equal(logic.drillKey('padezi', 'u-skolu'), 'drill:padezi:u-skolu');
});
