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

/* ---------- Odmiana: czas przeszły i przyszły ---------- */

const grammarTypes = await compile('../src/grammar/types.ts');
const odmiana = await compile('../src/games/odmiana/logic.ts', { '@/services/validation': validation, '@/grammar/types': grammarTypes });
const course = { validation: rules };

const verb = (infinitive, masculine, feminine, extra = {}) => ({
  id: `pl-hr:verb:${infinitive}`, courseId: 'pl-hr', rank: 1, infinitive, translation: '', exampleTarget: '', exampleSource: '', type: 'irregular_or_difficult', note: '', tags: [], core: true,
  forms: { ja: 'x', ti: 'x', on: 'x', mi: 'x', vi: 'x', oni: 'x' }, past: { masculine, feminine }, ...extra,
});

test('Odmiana: czas przeszły — biti + imiesłów, rodzaj żeński i odwrotna kolejność też poprawne', () => {
  const raditi = odmiana.inTense(verb('raditi', 'radio', 'radila'), 'past');
  assert.equal(raditi.id, 'pl-hr:verb:raditi:past');
  assert.deepEqual(raditi.forms, { ja: 'sam radio', ti: 'si radio', on: 'je radio', mi: 'smo radili', vi: 'ste radili', oni: 'su radili' });
  for (const ok of ['sam radio', 'sam radila', 'radila sam', 'Radio sam']) assert.equal(odmiana.judgeForm(course, raditi, 'ja', ok), 'hit', ok);
  assert.equal(odmiana.judgeForm(course, raditi, 'on', 'je radilo'), 'hit');
  assert.equal(odmiana.judgeForm(course, raditi, 'mi', 'smo radile'), 'hit');
  assert.equal(odmiana.judgeForm(course, raditi, 'ja', 'radim'), 'miss');
  const ici = odmiana.inTense(verb('ići', 'išao', 'išla'), 'past');
  assert.equal(ici.forms.oni, 'su išli');
  assert.equal(odmiana.judgeForm(course, ici, 'ja', 'sam isao'), 'near', 'brak diakrytyków to „prawie”');
});

test('Odmiana: czasowniki zwrotne — „se” po biti, w 3. osobie bez „je”', () => {
  const smijati = odmiana.inTense(verb('smijati se', 'smijao', 'smijala'), 'past');
  assert.equal(smijati.forms.ja, 'sam se smijao');
  assert.equal(smijati.forms.on, 'se smijao');
  assert.equal(odmiana.judgeForm(course, smijati, 'on', 'smijala se'), 'hit');
  const future = odmiana.inTense(verb('smijati se', 'smijao', 'smijala'), 'future');
  assert.equal(future.forms.ja, 'ću se smijati');
  assert.equal(odmiana.judgeForm(course, future, 'ja', 'smijat ću se'), 'hit');
});

test('Odmiana: czas przyszły — ću + bezokolicznik albo skrócony bezokolicznik + ću; -ći bez skracania', () => {
  const raditi = odmiana.inTense(verb('raditi', 'radio', 'radila'), 'future');
  assert.equal(raditi.forms.mi, 'ćemo raditi');
  assert.equal(odmiana.judgeForm(course, raditi, 'mi', 'radit ćemo'), 'hit');
  assert.equal(odmiana.judgeForm(course, raditi, 'mi', 'raditi ćemo'), 'miss');
  const ici = odmiana.inTense(verb('ići', 'išao', 'išla'), 'future');
  assert.equal(odmiana.judgeForm(course, ici, 'ja', 'ići ću'), 'hit');
  // Bez imiesłowu w datasetcie czasownik nie trafia do puli czasu przeszłego, ale do przyszłego tak.
  const bare = { ...verb('znati', 'znao', 'znala'), past: undefined };
  assert.equal(odmiana.tensePool([bare], 'past').length, 0);
  assert.equal(odmiana.tensePool([bare], 'future').length, 1);
  assert.equal(odmiana.formLabel(raditi, 'mi'), 'raditi (futur) — mi');
});

test('dataset czasowników: każdy ma imiesłów rodzaju męskiego i żeńskiego', async () => {
  const text = await readFile(new URL('../public/data/chorwacki_czasowniki_PL-HR.csv', import.meta.url), 'utf8');
  const [head, ...rows] = text.trim().split('\n').map((l) => l.split(';'));
  const m = head.indexOf('PastMasculine');
  const f = head.indexOf('PastFeminine');
  assert.ok(m > 0 && f > 0);
  for (const row of rows) {
    assert.match(row[m], /(o|io|ao|eo|uo)$/u, `${row[1]}: ${row[m]}`);
    assert.match(row[f], /la$/u, `${row[1]}: ${row[f]}`);
  }
});
