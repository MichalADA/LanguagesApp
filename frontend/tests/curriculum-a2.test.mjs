import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import ts from 'typescript';
import { audioSlots } from '../scripts/lib/course-audio.mjs';

/* Kurs A2 (8 modułów, jak A1: rozmowa, Wielka powtórka i test na końcu) — ten sam generator i player co A1, osobny poziom. */

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/* Minimalne środowisko przeglądarki dla playera (bez DOM). */
const storage = new Map();
globalThis.window = { addEventListener() {}, removeEventListener() {}, scrollTo() {}, setTimeout, clearTimeout };
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const cache = new Map();
function resolveFile(from, id) {
  const base = id.startsWith('@/') ? join(SRC, id.slice(2)) : resolve(dirname(from), id);
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), base]) if (existsSync(candidate) && /\.tsx?$/.test(candidate)) return candidate;
  throw new Error(`Nie znaleziono ${id} (z ${from})`);
}
function loadFile(file) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  const exports = {};
  cache.set(file, exports);
  const req = (id) => (MOCKS[id] ? MOCKS[id] : id.startsWith('.') || id.startsWith('@/') ? loadFile(resolveFile(file, id)) : require(id));
  new Function('require', 'exports', 'module', outputText)(req, exports, { exports });
  return exports;
}
const load = (path) => loadFile(join(ROOT, path));

const plDict = load('src/i18n/locales/pl.ts').pl;
const { lookup, interpolate } = load('src/i18n/types.ts');
const t = (key, params) => { const value = lookup(plDict, key); assert.ok(value, `brak tłumaczenia: ${key}`); return interpolate(value, params); };
const course = { id: 'pl-hr', specialCharacters: ['č', 'ć', 'đ', 'š', 'ž'], validation: { caseInsensitive: true, trimWhitespace: true, diacriticsMatter: true, foldMap: { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd' } } };
const MOCKS = {
  '@/i18n': { useT: () => t, useI18n: () => ({ t, locale: 'pl' }) },
  'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children) },
  '@/courses/CourseProvider': { useCourse: () => ({ course }) },
};

const { PL_HR_OUTLINE } = load('src/curriculum/data/a1.ts');
const { deriveLevel, nextLessonId } = load('src/curriculum/progress.ts');
const { checkLessonAnswer } = load('src/curriculum/answers.ts');
const { LessonPlayer } = load('src/curriculum/player/LessonPlayer.tsx');
const rules = course.validation;

const a2 = PL_HR_OUTLINE.levels.find((level) => level.id === 'A2');
const lessons = a2.modules.flatMap((m) => m.lessons);
const fileOf = (lesson) => join(SRC, 'curriculum/data/hr-a2', `module-${lesson.moduleId.slice(-2)}/lesson-${String(lesson.order).padStart(2, '0')}.ts`);
const generated = new Map(lessons.map((lesson) => [lesson.id, loadFile(fileOf(lesson)).LESSON]));
const PUBLIC = join(ROOT, 'public');

/** CSV (RFC 4180, pola w cudzysłowach) → rekordy z nagłówka. */
function parseCsvFile(path) {
  const rows = [[]];
  let field = '';
  let quoted = false;
  const src = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { rows.at(-1).push(field); field = ''; }
    else if (ch === '\n') { rows.at(-1).push(field); field = ''; rows.push([]); }
    else if (ch !== '\r') field += ch;
  }
  if (field) rows.at(-1).push(field);
  const [header, ...body] = rows.filter((r) => r.length > 1);
  return body.map((cells) => Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ''])));
}

test('A2: generator — wygenerowane pliki są aktualne względem CSV', () => {
  const run = spawnSync(process.execPath, ['scripts/generate-curriculum.mjs', '--level', 'hr-a2', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.doesNotMatch(run.stderr, /Ostrzeżenia/, run.stderr);
});

test('A2: poziom dostępny, każdy moduł ma 4 lekcje i powtórkę, A1 bez zmian', () => {
  assert.equal(a2.available, true);
  assert.deepEqual(a2.modules.map((m) => [m.id, m.title]), [['a2-01', 'Opowiadam o przeszłości'], ['a2-02', 'Plany i obowiązki'], ['a2-03', 'Zdrowie'], ['a2-04', 'Praca i nauka'], ['a2-05', 'Zakupy i usługi'], ['a2-06', 'Mieszkanie'], ['a2-07', 'Urzędy i usługi'], ['a2-08', 'Ja i świat']]);
  for (const [i, module] of a2.modules.entries()) {
    const m = String(i + 1).padStart(2, '0');
    assert.equal(module.levelId, 'A2');
    assert.deepEqual(module.lessons.map((l) => l.id), [1, 2, 3, 4, 5].map((n) => `a2-${m}-0${n}`));
    const kinds = i === 7 ? ['lesson', 'lesson', 'conversation', 'spiral', 'test'] : ['lesson', 'lesson', 'lesson', 'lesson', 'review'];
    assert.deepEqual(module.lessons.map((l) => l.kind), kinds);
  }
  const a1 = PL_HR_OUTLINE.levels.find((level) => level.id === 'A1');
  assert.equal(a1.modules.flatMap((m) => m.lessons).length, 40);
  // Postęp A2 liczy się osobno: nowy uczeń zaczyna od a2-01-01.
  assert.equal(deriveLevel(a2, new Set()).current.lesson.lesson.id, 'a2-01-01');
  assert.equal(nextLessonId(a2, 'a2-01-05'), 'a2-02-01');
  assert.equal(nextLessonId(a2, 'a2-02-05'), 'a2-03-01');
  assert.equal(nextLessonId(a2, 'a2-04-05'), 'a2-05-01');
  assert.equal(nextLessonId(a2, 'a2-05-05'), 'a2-06-01');
  assert.equal(nextLessonId(a2, 'a2-08-05'), null);
  assert.equal(lessons.length, 40);
  // Moduł 2 otwiera się po bieżącym module, tak jak w A1.
  assert.equal(deriveLevel(a2, new Set()).modules[1].status, 'locked');
});

test('A2: rdzeń lekcji nie powtarza słów, które uczeń zna z A1', () => {
  const a1Words = new Set(parseCsvFile(join(ROOT, 'curriculum/hr-a1/lexodromia_hr_A1_curriculum.csv'))
    .filter((r) => r.record_type === 'vocabulary').map((r) => r.hr_text.toLocaleLowerCase('hr')));
  for (const [id, lesson] of generated) {
    for (const record of lesson.material.records.filter((r) => r.type === 'vocabulary' && r.tags.includes('active'))) {
      assert.ok(!a1Words.has(record.hr.toLocaleLowerCase('hr')), `${id}: „${record.hr}” jest już w A1`);
    }
  }
});

test('A2: odpowiedzi wzorcowe przechodzą walidację, a opcje wyboru są spójne', () => {
  for (const [id, lesson] of generated) {
    for (const step of lesson.content.steps) {
      if (step.type === 'translate' || step.type === 'gap' || step.type === 'order') assert.equal(checkLessonAnswer(step.accepted[0], step.accepted, rules), 'hit', `${id}/${step.id}`);
      if (step.type === 'choice') {
        assert.equal(new Set(step.options).size, step.options.length, `${id}/${step.id}: powtórzone opcje`);
        assert.ok(step.correctIndex >= 0 && step.correctIndex < step.options.length);
      }
    }
  }
});

const reply = (id, n) => generated.get(id).content.steps.filter((s) => s.type === 'dialog').flatMap((s) => s.turns.filter((x) => x.kind === 'reply'))[n];
const verdict = (id, n, answer) => { const r = reply(id, n); return checkLessonAnswer(answer, r.accepted, rules, r.pattern); };

/** Otwarte repliki A2: naturalne odpowiedzi muszą przejść, błędne (szyk klityk, brak „sam”) — nie. */
const OPEN_REPLIES = [
  { lesson: 'a2-01-01', reply: 0, hit: ['Vikend sam proveo na moru.', 'Vikend sam provela kod kuće.', 'Bila sam kod bake.', 'Prošli vikend smo posjetili baku.', 'U subotu sam igrao nogomet.', 'Bok, bio sam u gradu, a ti?', 'Za vikend sam gledala filmove.', 'Mi smo bili na izletu.'],
    miss: ['Sam bio na moru.', 'Bio na moru.', 'Ja proveo vikend na moru.'] },
  { lesson: 'a2-01-01', reply: 1, hit: ['Gledali smo film.', 'Navečer smo bili u gradu.', 'Bile smo u kinu.', 'Sinoć smo gledali seriju.'],
    miss: ['Smo gledali film.', 'Gledali film.'] },
  { lesson: 'a2-01-02', reply: 0, hit: ['Zakasnio sam jer je autobus kasnio.', 'Nisam imala vremena.', 'Bila sam bolesna.', 'Žao mi je, nisam imao vremena.', 'Jer sam bio bolestan.', 'Propustila sam vlak.', 'Zaboravio sam.'],
    miss: ['Sam zakasnio.', 'Ne sam imao vremena.', 'Nisam imam vremena.'] },
  { lesson: 'a2-01-03', reply: 0, hit: ['Jesam, bio sam prošle godine.', 'Jesam.', 'Nisam.', 'Nisam, još nisam bila.', 'Da, jesam.', 'Ne, nisam.', 'Jesam, bila sam ljetos.'],
    miss: ['Sam.', 'Da sam.', 'Jesam bio.'] },
  { lesson: 'a2-01-03', reply: 1, hit: ['Bio sam u Splitu.', 'Bila sam na moru.', 'Ja sam bio u Zagrebu.', 'U Zadru.', 'Na moru.', 'Bila sam kod prijatelja u Splitu.'],
    miss: ['Sam bio u Splitu.', 'Bio u Splitu.'] },
  { lesson: 'a2-01-03', reply: 2, hit: ['Vratio sam se jučer.', 'Vratila sam se prošli tjedan.', 'Jučer sam se vratila.', 'Jučer.', 'Prošli tjedan.', 'U nedjelju.'],
    miss: ['Vratio se jučer.', 'Sam se vratio jučer.'] },
  { lesson: 'a2-01-04', reply: 0, hit: ['Prvo smo otišli u hotel.', 'Prvo sam išla na plažu.', 'Najprije smo ručali.'],
    miss: ['Prvo otišli smo u hotel.', 'Smo prvo otišli u hotel.'] },
  { lesson: 'a2-01-04', reply: 1, hit: ['Poslije smo ručali u gradu.', 'Onda smo išli na plažu.', 'Zatim sam srela prijateljicu.', 'Na kraju smo našli apartman.', 'Napokon smo stigli u hotel.'],
    miss: ['Onda išli smo na plažu.', 'Poslije ručali.'] },
  { lesson: 'a2-01-05', reply: 0, hit: ['Bio sam na moru.', 'Bila sam u Istri.', 'Prošle godine smo bili u Istri.', 'Ljetos sam bila u Splitu.', 'Bili smo na otoku.', 'Na moru.'],
    miss: ['Sam bio na moru.', 'Bio na moru.'] },
  { lesson: 'a2-01-05', reply: 1, hit: ['Plivali smo i jeli ribu.', 'Svaki dan smo plivali.', 'Plivala sam u moru.', 'Navečer smo gledali filmove.'],
    miss: ['Smo plivali.', 'Plivali.'] },
  { lesson: 'a2-01-05', reply: 2, hit: ['Nismo imali nikakvih problema.', 'Nažalost, nisam vidio Dubrovnik.', 'Ne, nije.', 'Ništa loše.', 'Nisam vidjela Zagreb.'],
    miss: ['Ne sam vidio Dubrovnik.', 'Sam nisam vidio.'] },
  // Moduł 2: plany i obowiązki
  { lesson: 'a2-02-01', reply: 0, hit: ['Ići ću na izlet.', 'Ostat ću kod kuće.', 'U subotu ću raditi.', 'Za vikend ćemo ići na more.', 'Ja ću se odmarati.', 'Vjerojatno ću gledati filmove.', 'Bok, igrat ću tenis, a ti?'],
    miss: ['Ću ići na izlet.', 'Ostati ću kod kuće.', 'Idem ću na izlet.'] },
  { lesson: 'a2-02-01', reply: 1, hit: ['Ana će ostati kod kuće.', 'Ona će raditi.', 'Ostat će kod kuće.', 'Ana će ići u grad.'],
    miss: ['Ana ostati kod kuće.', 'Će ostati kod kuće.'] },
  { lesson: 'a2-02-02', reply: 0, hit: ['Ne mogu, moram raditi.', 'Nažalost, ne mogu. Imam termin kod liječnika.', 'Žao mi je, ne mogu.', 'Ne mogu jer moram ići kod liječnika.', 'Ispričavam se, ne mogu, moram hitno nazvati šefa.'],
    miss: ['Mogu.', 'Ne moram raditi.'] },
  { lesson: 'a2-02-02', reply: 1, hit: ['Možemo sutra u deset.', 'Može u petak?', 'Sutra u devet.', 'U ponedjeljak ujutro.', 'Možemo ga odgoditi za petak.'],
    miss: ['Ne mogu.', 'Možemo.'] },
  { lesson: 'a2-02-03', reply: 0, hit: ['Ako bude lijepo, idemo!', 'Ako bude sunčano, ići ćemo na plažu.', 'Može, ako bude lijepo.', 'Ako ne pada kiša, idemo.', 'Ako bude toplo, ići ćemo na more.'],
    miss: ['Ako sunčano, idemo.', 'Idemo na plažu.', 'Ako bude sunčano, išli smo na plažu.'] },
  { lesson: 'a2-02-03', reply: 1, hit: ['Onda ćemo ostati kod kuće.', 'Ostat ćemo kod kuće.', 'Onda idemo u kino.', 'Gledat ćemo filmove.', 'U tom slučaju ćemo ići u kino.'],
    miss: ['Ostati ćemo kod kuće.', 'Ćemo ostati kod kuće.'] },
  { lesson: 'a2-02-04', reply: 0, hit: ['Nažalost, ne mogu jer moram raditi.', 'Hvala na pozivu, ali ne mogu.', 'Ne mogu, idem kod bake.', 'Žao mi je, ne mogu jer putujem.', 'Hvala, ali nažalost ne mogu.'],
    miss: ['Mogu.', 'Ne moram.'] },
  { lesson: 'a2-02-04', reply: 1, hit: ['Može, u deset.', 'Rado! Može u deset?', 'Može u osam.', 'Dogovoreno!', 'Da, može.'],
    miss: ['Ne mogu.', 'Nažalost ne.'] },
  { lesson: 'a2-02-04', reply: 2, hit: ['Javit ću ti se. Bok!', 'Nazvat ću te sutra.', 'Dobro, čujemo se!', 'Super, vidimo se u subotu!', 'Ja ću te nazvati.'],
    miss: ['Ću te nazvati.', 'Nazvat te ću.'] },
  { lesson: 'a2-02-05', reply: 0, hit: ['Radit ću cijeli tjedan.', 'Sljedeći tjedan imam godišnji odmor.', 'U ponedjeljak ću ići na sastanak.', 'Imam puno obveza.', 'Ja ću putovati.'],
    miss: ['Ću raditi.', 'Raditi ću cijeli tjedan.'] },
  { lesson: 'a2-02-05', reply: 1, hit: ['Ne mogu, moram raditi.', 'Ako stignem, doći ću.', 'Mogu.', 'Naravno, mogu doći.', 'Nažalost, ne mogu jer putujem.'],
    miss: ['Bio sam kod kuće.'] },
  { lesson: 'a2-02-05', reply: 2, hit: ['Javit ću ti se.', 'Nazvat ću te sutra.', 'Dobro, javit ću ti se kasnije.', 'Naravno, ja ću te nazvati.', 'Svakako ću ti se javiti.'],
    miss: ['Ću te nazvati.', 'Javit ću se ti.'] },
  // Moduł 3: zdrowie
  { lesson: 'a2-03-01', reply: 0, hit: ['Boli me glava.', 'Bole me leđa.', 'Glava me boli.', 'Loše sam, boli me grlo.', 'Prehlađena sam.', 'Imam temperaturu.', 'Boli me trbuh i glava.'],
    miss: ['Me boli glava.', 'Boli glava.'] },
  { lesson: 'a2-03-01', reply: 1, hit: ['Nemam, ali imam kašalj.', 'Imam, trideset osam.', 'Mislim da imam.', 'Ne, nemam.', 'Da, imam temperaturu.'],
    miss: ['Jesam.', 'Sam imam.'] },
  { lesson: 'a2-03-02', reply: 0, hit: ['Već tri dana kašljem.', 'Boli me grlo i kašljem.', 'Kašljem i imam temperaturu.', 'Imam temperaturu već dva dana.', 'Teško dišem.'],
    miss: ['Kašljati.', 'Imam kašljem.'] },
  { lesson: 'a2-03-03', reply: 0, hit: ['Trebam nešto protiv kašlja.', 'Imate li nešto protiv bolova?', 'Molim nešto protiv temperature.', 'Htjela bih nešto protiv kašlja.', 'Tražim sirup protiv kašlja.'],
    miss: ['Trebam protiv.', 'Boli me glava.'] },
  { lesson: 'a2-03-03', reply: 1, hit: ['Koliko puta dnevno?', 'Koliko puta dnevno ih trebam uzeti?', 'Koliko često?', 'Koliko puta na dan?'],
    miss: ['Kada?', 'Koliko košta?'] },
  { lesson: 'a2-03-04', reply: 0, hit: ['Trebam više spavati.', 'Želim manje raditi.', 'Moram se više kretati.', 'Želim jesti manje slatkiša.', 'Htjela bih više čitati.'],
    miss: ['Više spavati.', 'Trebam spavam više.', 'Trebam više spavam.'] },
  { lesson: 'a2-03-04', reply: 1, hit: ['Bicikl je bolji nego autobus.', 'Bolje je ići biciklom.', 'Mislim da je bicikl bolji.', 'Bicikl je zdraviji.', 'Autobus je brži nego bicikl.'],
    miss: ['Bicikl je dobar.', 'Bolji bicikl.'] },
  { lesson: 'a2-03-05', reply: 0, hit: ['Osjećam se puno bolje.', 'Puno bolje, hvala.', 'Sad sam dobro.', 'Još sam malo bolesna.', 'Bolje.'],
    miss: ['Sam bolje.', 'Osjećam bolje.'] },
  { lesson: 'a2-03-05', reply: 1, hit: ['Imao sam gripu.', 'Imala sam temperaturu.', 'Bolio me trbuh.', 'Boljelo me grlo.', 'Bila sam prehlađena.'],
    miss: ['Sam imao gripu.', 'Gripa sam.'] },
  { lesson: 'a2-03-05', reply: 2, hit: ['Jesam. Rekao je da se odmorim.', 'Jesam, dao mi je recept.', 'Nisam.', 'Da, rekla je da moram spavati.', 'Jesam, moram piti puno vode.'],
    miss: ['Sam bio.', 'Bio.'] },
  // Moduł 4: praca i nauka
  { lesson: 'a2-04-01', reply: 0, hit: ['Radim kao konobar.', 'Bavim se programiranjem.', 'Ja sam inženjer.', 'Student sam.', 'Radim kao programer u tvrtki.', 'Nezaposlena sam.'],
    miss: ['Radim konobar.', 'Bavim programiranjem.'] },
  { lesson: 'a2-04-01', reply: 1, hit: ['Radim s kupcima.', 'Radim s kolegama.', 'S kolegama.', 'Sa šefom.', 'Radim sam.'],
    miss: ['Radim kupcima.'] },
  { lesson: 'a2-04-02', reply: 0, hit: ['Imam pet godina iskustva.', 'Radim kao konobar već tri godine.', 'Radim već dvije godine.', 'Radim od prošle godine.', 'Nemam puno iskustva.', 'Imam godinu dana iskustva.'],
    miss: ['Imam iskustvo pet godina.'] },
  { lesson: 'a2-04-02', reply: 1, hit: ['Tražim posao na puno radno vrijeme.', 'Želim raditi na daljinu.', 'Jer tražim novi posao.', 'Volim raditi s ljudima.'],
    miss: ['Posao.'] },
  { lesson: 'a2-04-03', reply: 0, hit: ['Poslao sam vam e-mail.', 'Poslala sam vam e-mail.', 'Dobar dan, ovdje Ana. Jučer sam vam poslala e-mail.', 'Ja sam Marek, poslao sam vam životopis.'],
    miss: ['Sam vam poslao e-mail.', 'Poslao vam e-mail.'] },
  { lesson: 'a2-04-03', reply: 1, hit: ['Možete li potvrditi termin?', 'Molim vas da mi pošaljete račun.', 'Pošaljite mi račun, molim.', 'Možete li mi poslati račun?', 'Molim vas, potvrdite termin.'],
    miss: ['Pošalji račun.', 'Hoću račun.'] },
  { lesson: 'a2-04-04', reply: 0, hit: ['Učim hrvatski godinu dana.', 'Godinu dana.', 'Već dvije godine.', 'Tri mjeseca.', 'Od prošle godine.', 'Učim već šest mjeseci.'],
    miss: ['Učio sam.', 'Dugo.'] },
  { lesson: 'a2-04-04', reply: 1, hit: ['Izgovor je težak.', 'Gramatika mi je teška.', 'Gramatika.', 'Padeži su teški.', 'Najteža je gramatika.'],
    miss: ['Teško je.'] },
  { lesson: 'a2-04-04', reply: 2, hit: ['Možeš li govoriti sporije?', 'Možete li govoriti malo glasnije?', 'Govori sporije, molim te.', 'Molim vas, govorite glasnije.', 'Možete li sporije?'],
    miss: ['Govori brzo.', 'Sporije govoriti.'] },
  { lesson: 'a2-04-05', reply: 0, hit: ['Dobro, radim s kupcima.', 'Super, radim kao konobar.', 'Odlično!', 'Nije loše, imam dobre kolege.', 'Radim puno.'],
    miss: ['Radio.'] },
  { lesson: 'a2-04-05', reply: 1, hit: ['Sve bolje, hvala!', 'Učim godinu dana i napredujem.', 'Polako, ali napredujem.', 'Dobro.', 'Napredujem.'],
    miss: ['Bolje sve.'] },
  { lesson: 'a2-04-05', reply: 2, hit: ['Moj cilj je položiti ispit iz hrvatskog.', 'Želim tečno govoriti hrvatski.', 'Cilj mi je raditi u Hrvatskoj.', 'Planiram položiti ispit.'],
    miss: ['Cilj.', 'Ispit.'] },
  // Moduł 5: zakupy i usługi
  { lesson: 'a2-05-01', reply: 0, hit: ['Tražim crnu jaknu.', 'Trebam nove cipele.', 'Tražim haljinu.', 'Htjela bih bijelu košulju.', 'Tražim plavu majicu za ljeto.'],
    miss: ['Tražim crna jakna.', 'Tražim jakna.'] },
  { lesson: 'a2-05-01', reply: 1, hit: ['Nosim srednju veličinu.', 'Srednju.', 'Veličinu M.', 'Obično nosim L.', 'Broj četrdeset.'],
    miss: [] },
  { lesson: 'a2-05-02', reply: 0, hit: ['Sviđa mi se, jako je moderna.', 'Super je, stoji ti odlično.', 'Jako mi se sviđa!', 'Sviđa mi se boja.', 'Lijepa je.'],
    miss: ['Sviđa se mi.', 'Sviđam se.'] },
  { lesson: 'a2-05-02', reply: 1, hit: ['Sviđaju mi se.', 'Ne sviđaju mi se, preuske su.', 'Jako mi se sviđaju!', 'Lijepe su.'],
    miss: ['Sviđa mi se.', 'Sviđaju se mi.'] },
  { lesson: 'a2-05-03', reply: 0, hit: ['Imate li veći broj?', 'Male su. Imate li veći broj?', 'Trebam manju veličinu.', 'Velike su mi.', 'Imate li manji broj?'],
    miss: ['Imate li veću broj?', 'Imate li veći veličinu?'] },
  { lesson: 'a2-05-03', reply: 1, hit: ['Koliko koštaju?', 'Ima li popusta?', 'Koliko košta?', 'Je li to na popustu?'],
    miss: ['Koliko sati?'] },
  { lesson: 'a2-05-03', reply: 2, hit: ['Uzet ću ih.', 'Hvala, ali preskupe su.', 'Dobro, kupit ću ih.', 'Razmislit ću.'],
    miss: ['Uzeti ću ih.'] },
  { lesson: 'a2-05-04', reply: 0, hit: ['Kupila sam ovaj telefon jučer, ali ne radi.', 'Kupio sam ovaj punjač, ali ne radi.', 'Moj telefon ne radi.', 'Kupila sam ove slušalice, ali ne rade.', 'Ova kutija je oštećena.'],
    miss: ['Kupio ovaj telefon, ne radi.', 'Sam kupio telefon.'] },
  { lesson: 'a2-05-04', reply: 1, hit: ['Imam, izvolite.', 'Nažalost, nemam račun.', 'Da, imam ga.', 'Imam, evo ga.'],
    miss: ['Sam.', 'Jesam račun.'] },
  { lesson: 'a2-05-04', reply: 2, hit: ['Htio bih novi.', 'Želim povrat novca.', 'Radije bih povrat novca.', 'Zamjenu, molim.', 'Htjela bih novu.'],
    miss: ['Novac.'] },
  { lesson: 'a2-05-05', reply: 0, hit: ['Kupio sam crnu jaknu.', 'Kupila sam nove cipele.', 'Kupila sam haljinu za ljeto.', 'Ja sam kupio bijelu košulju.'],
    miss: ['Kupio sam crna jakna.', 'Sam kupio jaknu.'] },
  { lesson: 'a2-05-05', reply: 1, hit: ['Sviđa mi se, jako je udobna.', 'Da, jako mi se sviđa.', 'Sviđaju mi se.', 'Ne sviđa mi se boja.'],
    miss: ['Sviđa se.'] },
  { lesson: 'a2-05-05', reply: 2, hit: ['Ne, bilo je na popustu.', 'Bilo je jeftinije nego prošli put.', 'Bilo je skupo.', 'Trideset eura.', 'Malo preskupo.'],
    miss: ['Ne znam.'] },
  // Moduł 6: mieszkanie
  { lesson: 'a2-06-01', reply: 0, hit: ['Živim u stanu na trećem katu.', 'Živim u kući s vrtom.', 'U stanu u centru.', 'Ja živim u maloj kući.'], miss: ['Živim stan.'] },
  { lesson: 'a2-06-01', reply: 1, hit: ['Stan ima dvije spavaće sobe.', 'Ima tri sobe.', 'Dvije sobe.', 'Moj stan ima jednu sobu i kuhinju.'], miss: ['Ima dva soba.'] },
  { lesson: 'a2-06-01', reply: 2, hit: ['Na terasi.', 'U dnevnom boravku.', 'Najradije sjedim na balkonu.', 'Čitam u kuhinji.'], miss: ['Terasa.'] },
  { lesson: 'a2-06-02', reply: 0, hit: ['Da. Koliko iznosi stanarina?', 'Koliko je stanarina?', 'Da, zovem zbog stana. Koliko iznosi najam?', 'Kolika je stanarina?'], miss: ['Stanarina?'] },
  { lesson: 'a2-06-03', reply: 0, hit: ['Ključevi su na stolu.', 'Ispod kreveta.', 'Na polici pored televizora.', 'Tvoji ključevi su u ormaru.'], miss: ['Stol.'] },
  { lesson: 'a2-06-03', reply: 1, hit: ['Mačka spava ispod kreveta.', 'Na kauču.', 'Mačka je na fotelji.', 'Iza televizora.'], miss: ['Spava.'] },
  { lesson: 'a2-06-04', reply: 0, hit: ['Pokvario se bojler.', 'Grijanje ne radi.', 'Nemamo struje.', 'Perilica se pokvarila.', 'Iz slavine curi voda.', 'Nemamo tople vode od jučer.'], miss: ['Bojler pokvario.', 'Se pokvario bojler.'] },
  { lesson: 'a2-06-04', reply: 1, hit: ['Jučer navečer.', 'Od jutros.', 'Prije dva dana.', 'To je bilo jučer.'], miss: ['Sutra.'] },
  { lesson: 'a2-06-04', reply: 2, hit: ['U koliko sati će doći?', 'Kada će doći majstor?', 'Kad dolazi?', 'U koliko sati majstor dolazi?'], miss: ['Majstor?'] },
  { lesson: 'a2-06-05', reply: 0, hit: ['Malen je, ali ima balkon.', 'Stan je velik i svijetao.', 'Iz dnevnog boravka imam lijep pogled na more.', 'Ima dvije sobe i terasu.'], miss: [] },
  { lesson: 'a2-06-05', reply: 1, hit: ['Susjedi su vrlo ljubazni.', 'Ljubazni su.', 'Malo glasni.', 'Moji susjedi su jako dragi.'], miss: ['Ljubazan.'] },
  { lesson: 'a2-06-05', reply: 2, hit: ['Ne, hvala, majstor je popravio grijanje.', 'Da, trebam pomoć s ormarom.', 'Ne, hvala.'], miss: ['Možda.'] },
  // Moduł 7: urzędy i usługi
  { lesson: 'a2-07-01', reply: 0, hit: ['Htio bih poslati paket u Poljsku.', 'Htjela bih poslati pismo u Hrvatsku.', 'Trebam poslati razglednicu u Njemačku.', 'Želim poslati paket preporučeno u Poljsku.'], miss: ['Poslati paket.', 'Htio bih poslati paket u Poljskoj.'] },
  { lesson: 'a2-07-01', reply: 2, hit: ['Da, trebam tri marke.', 'Imate li omotnicu?', 'Molim pet maraka.', 'Trebam jednu marku za Poljsku.'], miss: ['Marka.'] },
  { lesson: 'a2-07-02', reply: 0, hit: ['Htio bih otvoriti tekući račun.', 'Moram podići novac.', 'Želim uplatiti petsto eura.', 'Htjela bih mijenjati novac.'], miss: ['Račun.'] },
  { lesson: 'a2-07-02', reply: 1, hit: ['Imam, izvolite.', 'Nemam, ali imam putovnicu.', 'Da, imam je.'], miss: ['Sam.'] },
  { lesson: 'a2-07-02', reply: 2, hit: ['Ima li naknade za podizanje novca?', 'Gdje je najbliži bankomat?', 'Koliko je naknada?', 'Ima li bankomat ovdje?'], miss: ['Bankomat.'] },
  { lesson: 'a2-07-03', reply: 0, hit: ['Htjela bih rezervirati sobu od petog do sedmog srpnja.', 'Htio bih rezervirati sobu od prvog do petog kolovoza.', 'Trebam dvokrevetnu sobu.', 'Htio bih rezervirati sobu za dvije osobe.'], miss: ['Soba od petog.'] },
  { lesson: 'a2-07-03', reply: 1, hit: ['Je li doručak uključen?', 'Je li otkazivanje besplatno?', 'Imate li parking?', 'Je li parking besplatan?'], miss: ['Doručak.'] },
  { lesson: 'a2-07-04', reply: 0, hit: ['Trebam prijaviti boravak.', 'Htio bih predati zahtjev.', 'Moram potpisati dokument.', 'Došla sam zbog putovnice.'], miss: ['Zahtjev.'] },
  { lesson: 'a2-07-04', reply: 1, hit: ['Gdje se plaća?', 'Gdje moram potpisati?', 'Gdje se plaća pristojba?', 'Gdje se predaje zahtjev?'], miss: ['Gdje plaća se?'] },
  { lesson: 'a2-07-05', reply: 0, hit: ['Bio sam na pošti i u banci.', 'Bila sam u uredu.', 'Ja sam bio u banci.'], miss: ['Sam bio na pošti.', 'Bio na pošti.'] },
  { lesson: 'a2-07-05', reply: 1, hit: ['Podigla sam novac na bankomatu.', 'Otvorio sam račun.', 'Uplatila sam novac.'], miss: ['Sam otvorio račun.'] },
  { lesson: 'a2-07-05', reply: 2, hit: ['Jesam, ali moram doći opet.', 'Nisam, nedostaje mi kopija.', 'Jesam.'], miss: ['Sam.'] },
  // Moduł 8: ja i świat
  { lesson: 'a2-08-01', reply: 0, hit: ['Odrastao sam u Krakovu.', 'Odrasla sam u malom gradu.', 'Na selu.', 'U Gdanjsku.'], miss: ['Sam odrastao u Krakovu.'] },
  { lesson: 'a2-08-01', reply: 1, hit: ['Volio sam igrati nogomet.', 'Nekad sam obožavao crtiće.', 'Voljela sam čitati.', 'Često smo se igrali vani.', 'Igrao sam se s prijateljima.'], miss: ['Sam volio nogomet.'] },
  { lesson: 'a2-08-01', reply: 2, hit: ['Sjećam se svog prvog bicikla.', 'Sjećam se ljeta kod bake.', 'Najviše se sjećam mora.'], miss: ['Sjećam svog bicikla.'] },
  { lesson: 'a2-08-02', reply: 0, hit: ['Mislim da je Zagreb lijep grad.', 'Po mom mišljenju, Zagreb je zanimljiv.', 'Zagreb je super grad.', 'Iskreno, malo je dosadan.'], miss: ['Lijep.'] },
  { lesson: 'a2-08-02', reply: 1, hit: ['Slažem se, Split je na moru.', 'Ne slažem se, Zagreb je zanimljiviji.', 'U pravu si.', 'Imaš pravo.', 'Možda.'], miss: ['Slažem.'] },
  { lesson: 'a2-08-03', reply: 0, hit: ['Iz Poljske sam i živim ovdje godinu dana.', 'Ja sam iz Poljske i tu sam tri mjeseca.', 'Iz Krakova sam.', 'Živim ovdje već dvije godine.'], miss: ['Poljska.'] },
  { lesson: 'a2-08-03', reply: 1, hit: ['Radim kao programer i jako mi se sviđa.', 'Bavim se turizmom.', 'Studiram i učim hrvatski.', 'Radim u banci, ali nije mi zanimljivo.'], miss: ['Programer.'] },
  { lesson: 'a2-08-03', reply: 2, hit: ['Prošli vikend sam bio na moru.', 'Bila sam kod kuće.', 'U subotu smo bili u gradu.'], miss: ['Sam bio na moru.'] },
  { lesson: 'a2-08-03', reply: 3, hit: ['Ljeti ću putovati po Dalmaciji.', 'Ići ću na more.', 'Planiram ići u Split.', 'U kolovozu ćemo ići u Istru.'], miss: ['Ću ići na more.'] },
  { lesson: 'a2-08-03', reply: 4, hit: ['Mislim da je odlična.', 'Odlična je!', 'Sviđa mi se riba.', 'Iskreno, malo je preslana.'], miss: ['Hrana.'] },
  { lesson: 'a2-08-03', reply: 5, hit: ['Naravno! Javit ću ti se.', 'Može, evo ga.', 'Radije ne, ali vidimo se ovdje.'], miss: ['Broj.'] },
  { lesson: 'a2-08-03', reply: 6, hit: ['I meni! Vidimo se!', 'Bilo mi je drago.', 'Vidimo se uskoro!', 'Bok, čujemo se!'], miss: ['Hvala, zdravo.'] },
  { lesson: 'a2-08-04', reply: 0, hit: ['Puno sam radio.', 'Bila sam u Zagrebu.', 'Ovaj tjedan sam učio hrvatski.'], miss: ['Sam radio.'] },
  { lesson: 'a2-08-04', reply: 1, hit: ['Ići ću na izlet.', 'Ostat ću kod kuće.', 'U subotu ću igrati tenis.'], miss: ['Ću ići.'] },
  { lesson: 'a2-08-04', reply: 2, hit: ['Onda ću ostati kod kuće.', 'Ostat ću kod kuće.', 'Onda idem u kino.'], miss: ['Ću ostati kod kuće.'] },
  { lesson: 'a2-08-04', reply: 3, hit: ['Mislim da je sve bolji.', 'Napredujem, ali još griješim.', 'Sve bolje!', 'Iskreno, još griješim.'], miss: ['Dobar.'] },
];

test('A2: otwarte repliki przyjmują naturalne odpowiedzi i odrzucają błędny szyk', () => {
  for (const f of OPEN_REPLIES) {
    const r = reply(f.lesson, f.reply);
    assert.ok(r, `${f.lesson}#${f.reply}: brak repliki`);
    for (const answer of f.hit) assert.equal(verdict(f.lesson, f.reply, answer), 'hit', `${f.lesson}#${f.reply} [${r.prompt}] „${answer}”`);
    for (const answer of f.miss) assert.equal(verdict(f.lesson, f.reply, answer), 'miss', `${f.lesson}#${f.reply} [${r.prompt}] przepuszcza „${answer}”`);
  }
});

test('A2: lista otwartych replik w teście = repliki oznaczone „open” w didactics', () => {
  const didactics = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-a2/didactics.json'), 'utf8'));
  const flagged = Object.entries(didactics.lessons).flatMap(([key, lesson]) => {
    const n = Number(key.slice(3));
    const appId = `a2-${String(Math.ceil(n / 5)).padStart(2, '0')}-${String(((n - 1) % 5) + 1).padStart(2, '0')}`;
    return (lesson.dialog?.turns ?? []).filter((x) => x.reply).flatMap((x, i) => (x.reply.open ? [`${appId}#${i}`] : []));
  });
  assert.deepEqual(OPEN_REPLIES.map((f) => `${f.lesson}#${f.reply}`).sort(), flagged.sort());
});

test('A2: wszystkie repliki — interpunkcja, wielkość liter i grzecznościowa rama nie zmieniają wyniku', () => {
  for (const [id, lesson] of generated) {
    const turns = lesson.content.steps.filter((s) => s.type === 'dialog').flatMap((s) => s.turns.filter((x) => x.kind === 'reply'));
    for (const turn of turns) {
      const bare = turn.suggestion.toLocaleLowerCase('hr').replace(/[.,!?]/g, '');
      for (const v of [turn.suggestion, bare, turn.suggestion.toLocaleUpperCase('hr'), `${bare}!`, `${turn.suggestion} Hvala.`, `Bok, ${turn.suggestion}`]) {
        assert.equal(checkLessonAnswer(v, turn.accepted, rules, turn.pattern), 'hit', `${id} [${turn.prompt}] „${v}”`);
      }
    }
  }
});

test('A2: każdy chorwacki tekst lekcji ma nagranie, a każde audioSrc wskazuje istniejący plik', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-a2/audio-manifest.json'), 'utf8'));
  for (const item of manifest.items) {
    assert.match(item.audioPath, /^\/audio\/hr\/a2\/module-\d\d\/[a-z0-9-]+\.mp3$/, item.audioPath);
    assert.ok(existsSync(join(PUBLIC, item.audioPath)), `brak pliku ${item.audioPath} („${item.text}”)`);
  }
  for (const [id, lesson] of generated) {
    const content = structuredClone(lesson.content);
    const slots = audioSlots(content);
    const json = JSON.stringify(lesson.content);
    const attached = [...json.matchAll(/"(?:audioSrc|promptAudioSrc|answerAudioSrc|suggestionAudioSrc|sampleAudioSrc|audio)":"([^"]+)"/g)].map((m) => m[1]);
    assert.ok(attached.length >= slots.length, `${id}: ${slots.length - attached.length} tekstów bez nagrania`);
    for (const src of attached) assert.ok(existsSync(join(PUBLIC, src)), `${id}: brak pliku ${src}`);
  }
});

/** Przechodzi lekcję w playerze jak użytkownik (odpowiada czymkolwiek) aż do podsumowania. */
async function walk(content) {
  let completed = 0;
  let renderer;
  const element = React.createElement(LessonPlayer, { content, header: { position: 'A2', title: 'T', meta: 'M', closeTo: '/m' }, nextHref: null, moduleHref: '/m', onComplete: () => { completed++; } });
  await act(async () => { renderer = Renderer.create(element); });
  const byClass = (type, cls) => renderer.root.findAll((n) => n.type === type && typeof n.props.className === 'string' && n.props.className.split(' ').includes(cls));
  for (let guard = 0; guard < 400; guard++) {
    if (byClass('div', 'step-summary').length) break;
    const footer = byClass('button', 'btn-lg')[0];
    if (footer && !footer.props.disabled) { await act(async () => footer.props.onClick()); continue; }
    const choice = byClass('button', 'choice').find((n) => n.props['aria-disabled'] !== true);
    if (choice) { await act(async () => choice.props.onClick()); continue; }
    const token = byClass('button', 'order-token').find((n) => !n.props.disabled && !n.props.className.includes('placed'));
    if (token) { await act(async () => token.props.onClick()); continue; }
    const input = renderer.root.findAll((n) => n.type === 'input' && !n.props.disabled && !n.props.readOnly)[0];
    if (input) { await act(async () => input.props.onChange({ target: { value: 'x' } })); continue; }
    const skip = byClass('button', 'btn-ghost').find((n) => n.props.children === t('curriculum.player.skip'));
    if (skip) { await act(async () => skip.props.onClick()); continue; }
    throw new Error(`Player utknął w ${content.lessonId}`);
  }
  assert.equal(byClass('div', 'step-summary').length, 1, `${content.lessonId}: nie doszedł do podsumowania`);
  act(() => renderer.unmount());
  return completed;
}

test('A2: wszystkie lekcje da się otworzyć i przejść w playerze bez błędów', async () => {
  for (const lesson of lessons) assert.equal(await walk(generated.get(lesson.id).content), 1, `${lesson.id}: onComplete`);
});

test('A2: lekcja 40 to test poziomu z sześcioma sekcjami, a 39 to Wielka powtórka A2', () => {
  const content = generated.get('a2-08-05').content;
  assert.equal(content.mode, 'test');
  const sections = new Set(content.steps.map((s) => s.section).filter(Boolean));
  assert.deepEqual([...sections].sort(), ['grammar', 'listening', 'production', 'reading', 'translation', 'vocabulary']);
  assert.ok(content.steps.find((s) => s.type === 'listening').lines.every((l) => l.audio && existsSync(join(PUBLIC, l.audio))));
  assert.equal(content.steps.at(-1).title, 'Wynik testu A2');
  const spiral = generated.get('a2-08-04').content;
  assert.match(spiral.steps[0].body, /całego A2/);
  assert.ok(spiral.steps.filter((s) => s.type === 'gap').length >= 4);
});
