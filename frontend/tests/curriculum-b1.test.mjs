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

/* Kurs B1 (powstaje moduł po module, plan: curriculum/hr-b1/README.md) — ten sam generator i player co A1 i A2, osobny poziom. */

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
const { walkLesson } = await import('./fixtures/lesson-walker.mjs');
const rules = course.validation;

const b1 = PL_HR_OUTLINE.levels.find((level) => level.id === 'B1');
const lessons = b1.modules.flatMap((m) => m.lessons);
const fileOf = (lesson) => join(SRC, 'curriculum/data/hr-b1', `module-${lesson.moduleId.slice(-2)}/lesson-${String(lesson.order).padStart(2, '0')}.ts`);
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

test('B1: generator — wygenerowane pliki są aktualne względem CSV', () => {
  const run = spawnSync(process.execPath, ['scripts/generate-curriculum.mjs', '--level', 'hr-b1', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.doesNotMatch(run.stderr, /Ostrzeżenia/, run.stderr);
});

const MODULE_TITLES = ['Svakodnevica i navike', 'Uspomene i prošla ljeta', 'Želje i vikend planovi', 'Zdravlje, forma i savjeti', 'Uspoređivanje: Gdje je bolje?', 'Na putu: Trajekt, autocesta i smještaj', 'Stanovanje i dogovor s vlasnikom', 'Online kupovina i reklamacije', 'Posao, projekti i tim'];

test('B1: poziom dostępny, każdy moduł ma 4 lekcje i powtórkę, A1 i A2 bez zmian', () => {
  assert.equal(b1.available, true);
  assert.deepEqual(b1.modules.map((m) => m.title), MODULE_TITLES);
  for (const [i, module] of b1.modules.entries()) {
    const m = String(i + 1).padStart(2, '0');
    assert.equal(module.levelId, 'B1');
    assert.deepEqual(module.lessons.map((l) => l.id), [1, 2, 3, 4, 5].map((n) => `b1-${m}-0${n}`));
    assert.deepEqual(module.lessons.map((l) => l.kind), ['lesson', 'lesson', 'lesson', 'lesson', 'review']);
  }
  for (const [id, count] of [['A1', 40], ['A2', 40]]) {
    assert.equal(PL_HR_OUTLINE.levels.find((level) => level.id === id).modules.flatMap((m) => m.lessons).length, count);
  }
  // Postęp B1 liczy się osobno: nowy uczeń zaczyna od b1-01-01.
  assert.equal(deriveLevel(b1, new Set()).current.lesson.lesson.id, 'b1-01-01');
  assert.equal(nextLessonId(b1, 'b1-01-04'), 'b1-01-05');
  for (let m = 1; m < MODULE_TITLES.length; m++) assert.equal(nextLessonId(b1, `b1-0${m}-05`), `b1-0${m + 1}-01`);
  assert.equal(nextLessonId(b1, lessons.at(-1).id), null);
  assert.equal(lessons.length, 5 * MODULE_TITLES.length);
});

test('B1: rdzeń lekcji nie powtarza słów, które uczeń zna z A1 i A2', () => {
  const known = new Set(['hr-a1/lexodromia_hr_A1_curriculum.csv', 'hr-a2/lexodromia_hr_A2_curriculum.csv']
    .flatMap((file) => parseCsvFile(join(ROOT, 'curriculum', file)))
    .filter((r) => r.record_type === 'vocabulary').map((r) => r.hr_text.toLocaleLowerCase('hr')));
  for (const [id, lesson] of generated) {
    for (const record of lesson.material.records.filter((r) => r.type === 'vocabulary' && r.tags.includes('active'))) {
      assert.ok(!known.has(record.hr.toLocaleLowerCase('hr')), `${id}: „${record.hr}” jest już w A1 albo A2`);
    }
  }
});

test('B1: nowe czasowniki dokonane mają poprawną odmianę na kartach słów', () => {
  const cards = new Map([...generated.values()].flatMap((lesson) => lesson.content.steps.filter((s) => s.type === 'word' && s.conjugation).map((s) => [s.target, s.conjugation])));
  assert.equal(cards.get('popiti').present[0], 'popijem');
  assert.deepEqual(cards.get('pojesti').past, ['pojeo', 'pojela', 'pojeli']);
  assert.equal(cards.get('obući se').present[0], 'obučem se');
  assert.equal(cards.get('prestati').present[0], 'prestanem');
  assert.equal(cards.get('početi').present[0], 'počnem');
  assert.deepEqual(cards.get('uspjeti').past, ['uspio', 'uspjela', 'uspjeli']);
});

test('B1: odpowiedzi wzorcowe przechodzą walidację, a opcje wyboru są spójne', () => {
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

/** Otwarte repliki B1: naturalne odpowiedzi muszą przejść, błędne (krótka forma na początku, zły aspekt) — nie. */
const OPEN_REPLIES = [
  { lesson: 'b1-01-01', reply: 0, hit: ['Probudio sam se u sedam.', 'Probudila sam se u šest.', 'Jutros sam se probudila u pola sedam.', 'Danas sam se probudio oko osam.', 'U sedam.', 'Probudila sam se jutros u šest.'], miss: ['Sam se probudio u sedam.', 'Se probudio sam u sedam.'] },
  { lesson: 'b1-01-01', reply: 1, hit: ['Popio sam kavu.', 'Popila sam čaj.', 'Popila sam dvije kave.', 'Samo sam popio sok.', 'Jutros sam popila kavu s mlijekom.'], miss: ['Sam popio kavu.', 'Popiti kavu.'] },
  { lesson: 'b1-01-02', reply: 0, hit: ['Dok putujem na posao, slušam podcast.', 'Slušam glazbu.', 'Obično čitam vijesti.', 'Dok se vozim autobusom, čitam knjigu.', 'Uvijek slušam podcast.'], miss: ['Podcast.'] },
  { lesson: 'b1-01-02', reply: 1, hit: ['Dok kuham, slušam podcast.', 'Slušam podcast dok kuham.', 'Obično slušam glazbu.', 'Pijem kavu.'], miss: ['Glazba.'] },
  { lesson: 'b1-01-03', reply: 0, hit: ['Prije nego što krenemo, moram napuniti mobitel.', 'Moram još zaključati vrata.', 'Skoro, moram isključiti računalo.', 'Trebam se spakirati prije nego što krenemo.', 'Čekaj, moram ugasiti svjetlo.'], miss: ['Napuniti mobitel.', 'Prije nego što sam krenemo, moram napuniti mobitel.'] },
  { lesson: 'b1-01-03', reply: 2, hit: ['Nakon što izađemo, zaključat ću vrata.', 'Nakon što izađemo, nazvat ću taksi.', 'Zaključat ću vrata nakon što izađemo.', 'Nakon što krenemo, ja ću nazvati mamu.'], miss: ['Ću zaključati vrata.', 'Nakon što izađemo.'] },
  { lesson: 'b1-01-04', reply: 0, hit: ['Počeo sam trčati.', 'Počela sam češće kuhati kod kuće.', 'Ove godine sam počela učiti hrvatski.', 'Počeo sam više čitati.', 'Nedavno sam počeo plivati.'], miss: ['Sam počeo trčati.', 'Počeo sam trčim.'] },
  { lesson: 'b1-01-04', reply: 1, hit: ['Prestao sam pušiti.', 'Prestala sam jesti slatkiše.', 'Prošle godine sam prestao pušiti.', 'Prestala sam piti kavu navečer.'], miss: ['Sam prestao pušiti.', 'Prestao sam pušim.'] },
  { lesson: 'b1-01-04', reply: 2, hit: ['Jesam, već sam se naviknuo.', 'Već sam se navikla.', 'Naviknula sam se.', 'Nisam još.', 'Još se nisam naviknuo.', 'Jesam.'], miss: ['Sam se naviknuo.'] },
  { lesson: 'b1-01-05', reply: 0, hit: ['Moj dan počinje u sedam.', 'Moj tipičan radni dan počinje u sedam.', 'Dan mi počinje oko šest.', 'Ujutro pijem kavu i čitam vijesti.', 'Obično radim od osam do četiri.'], miss: ['U sedam počinje sam.'] },
  { lesson: 'b1-01-05', reply: 1, hit: ['Dok putujem na posao, slušam podcast.', 'Čitam vijesti.', 'Dok idem na posao, slušam glazbu.'], miss: ['Vijesti.'] },
  { lesson: 'b1-01-05', reply: 2, hit: ['Počela sam trčati.', 'Prestao sam pušiti.', 'Ove godine sam počeo učiti hrvatski.', 'Naviknula sam se na rano ustajanje.', 'Ništa posebno.'], miss: ['Sam počela trčati.'] },
  // Moduł 2: aspekt w przeszłości, čim / tek kad, szyk krótkich słów.
  { lesson: 'b1-02-01', reply: 0, hit: ['Bilo je super!', 'Odlično!', 'Bilo je jako lijepo.', 'Super, bilo je toplo.'], miss: ['Je bilo super.'] },
  { lesson: 'b1-02-01', reply: 1, hit: ['Svaki dan smo plivali i jedrili.', 'Svaki dan smo kupovali svježu ribu.', 'Plivali smo i sunčali se.', 'Ujutro smo išli na plažu.', 'Mi smo se kupali svaki dan.'], miss: ['Smo plivali svaki dan.'] },
  { lesson: 'b1-02-01', reply: 2, hit: ['Zadnji dan smo kupili suvenire za obitelj.', 'Kupili smo suvenire.', 'Jesmo, kupili smo maslinovo ulje.', 'Kupila sam školjke.'], miss: ['Smo kupili suvenire.', 'Kupujemo suvenire.'] },
  { lesson: 'b1-02-02', reply: 0, hit: ['Čim smo stigli na more, otišli smo na plažu.', 'Odmah smo otišli na plažu.', 'Prvo smo se raspakirali.', 'Otišli smo na plažu.'], miss: ['Smo otišli na plažu.'] },
  { lesson: 'b1-02-02', reply: 1, hit: ['Tek kad smo stigli u hotel, shvatio sam da nemam putovnicu.', 'Primijetila sam da je more hladno.', 'Shvatili smo da nemamo ključ.', 'Ne, nije bilo problema.'], miss: ['Sam shvatio da nemam ključ.'] },
  { lesson: 'b1-02-04', reply: 0, hit: ['Slučajno smo sreli prijatelje iz Poljske.', 'Izgubio sam se u Zagrebu.', 'Jednom sam se izgubila u Rimu.', 'Zalutali smo u šumi.', 'Da, doživjeli smo pravu avanturu.'], miss: ['Sam se izgubio u Zagrebu.'] },
  { lesson: 'b1-02-04', reply: 1, hit: ['Na kraju smo našli hotel.', 'Onda smo pitali policajca.', 'Napokon smo stigli kući.'], miss: ['Smo našli hotel.'] },
  { lesson: 'b1-02-05', reply: 0, hit: ['Bio sam na Visu.', 'Ljetos sam bila u Istri.', 'Na moru.', 'Bili smo u Dalmaciji.'], miss: ['Sam bio na Visu.'] },
  { lesson: 'b1-02-05', reply: 1, hit: ['Čim smo stigli, otišli smo na plažu.', 'Prvi dan smo se odmarali.', 'Odmah smo otišli na plažu.'], miss: ['Smo otišli na plažu.'] },
  { lesson: 'b1-02-05', reply: 2, hit: ['U jednom trenutku je počela jaka kiša.', 'Odjednom je počela oluja.', 'Jednog dana smo se izgubili.', 'Ne.'], miss: ['Je počela kiša.'] },
  // Moduł 3: tryb przypuszczający (bih / bismo / biste), kad bih, radije bih.
  { lesson: 'b1-03-01', reply: 0, hit: ['Volio bih jednog dana živjeti na moru.', 'Voljela bih naučiti jedriti.', 'Moja najveća želja je putovati oko svijeta.', 'Jednog dana bih se volio preseliti u Split.', 'Htjela bih imati vlastiti kafić.'], miss: ['Bih volio živjeti na moru.'] },
  { lesson: 'b1-03-01', reply: 1, hit: ['Za vikend bih se htjela samo opustiti.', 'Htio bih ići na izlet.', 'Rado bih išao u kino.', 'U subotu bih volio dugo spavati.'], miss: ['Bih htio ići na izlet.'] },
  { lesson: 'b1-03-01', reply: 2, hit: ['Ne bih htio raditi u subotu.', 'U subotu ne bih htjela čistiti.', 'Ne bih volio ići u grad.'], miss: ['Bih ne htio raditi.'] },
  { lesson: 'b1-03-02', reply: 0, hit: ['Mogli bismo zajedno otići na piknik.', 'Kako bi bilo da odemo na roštilj?', 'Mogli bismo ići u kino.', 'Možda bismo mogli igrati društvene igre.'], miss: ['Bismo mogli ići u kino.'] },
  { lesson: 'b1-03-03', reply: 0, hit: ['Kad bih imao više vremena, više bih čitao.', 'Putovala bih.', 'Više bih spavao.', 'Da imam više vremena, učio bih španjolski.'], miss: ['Bih čitao.'] },
  { lesson: 'b1-03-03', reply: 1, hit: ['Kupio bih kuću na moru.', 'Prvo bih putovala.', 'Sigurno bih pomogao obitelji.'], miss: ['Bih kupio kuću.'] },
  { lesson: 'b1-03-03', reply: 2, hit: ['Ne bih, volim svoj posao.', 'Bih!', 'Naravno da bih.', 'Ne, nikad.'], miss: ['Nisam.'] },
  { lesson: 'b1-03-04', reply: 0, hit: ['Na tvom mjestu bih prihvatio ponudu.', 'Ja bih prihvatila.', 'Mislim da bih odbio.', 'Na tvom mjestu ne bih išao.'], miss: ['Bih prihvatio ponudu.'] },
  { lesson: 'b1-03-04', reply: 1, hit: ['Ne bih, radije bih ostao ovdje.', 'Bih, zašto ne.', 'Radije bih ostala u Zagrebu.', 'Možda bih se preselio.'], miss: ['Sam se preselio.'] },
  { lesson: 'b1-03-04', reply: 2, hit: ['Meni je važnija obitelj.', 'Obitelj.', 'Važnija je plaća.', 'Svejedno mi je.'], miss: ['Obitelj važan.'] },
  { lesson: 'b1-03-05', reply: 0, hit: ['Savršen vikend bi za mene bio na moru.', 'Volio bih dugo spavati i ići na more.', 'Htjela bih samo čitati.'], miss: ['Bih volio spavati.'] },
  { lesson: 'b1-03-05', reply: 1, hit: ['Mogli bismo ići na more, a sljedeći vikend u planine.', 'Dobro, mogli bismo ići u planine.', 'Kako bi bilo da idemo na Plitvice?', 'Napravimo kompromis.'], miss: ['Ne znam.'] },
  // Moduł 4: objawy, nemoj / nemojte, trebao bi, zdrowy styl życia.
  { lesson: 'b1-04-01', reply: 0, hit: ['Loše, imam prehladu.', 'Boli me glava i imam vrtoglavicu.', 'Slabo mi je.', 'Osjećam se loše.', 'Potpuno sam iscrpljena.', 'Mislim da imam prehladu.'], miss: ['Prehlada.'] },
  { lesson: 'b1-04-01', reply: 1, hit: ['Nemam, ali imam mučninu.', 'Imam, trideset osam.', 'Nemam.', 'Mislim da nemam.'], miss: ['Temperatura.'] },
  { lesson: 'b1-04-01', reply: 2, hit: ['Imam alergiju na mačke.', 'Nisam.', 'Alergična sam na pelud.', 'Ne, nisam.'], miss: ['Alergija.'] },
  { lesson: 'b1-04-02', reply: 0, hit: ['Nemoj učiti cijelu noć.', 'Nemoj piti kavu.', 'Ne pij kavu navečer.', 'Slušaj, nemoj se brinuti.'], miss: ['Ne učiti.'] },
  { lesson: 'b1-04-02', reply: 1, hit: ['Nemoj pretjerivati, odmori se.', 'Odmori se.', 'Nemoj se brinuti.', 'Popij čaj i spavaj.'], miss: ['Pretjerivati.'] },
  { lesson: 'b1-04-02', reply: 2, hit: ['Nemoj čekati, idi liječniku!', 'Idi liječniku.', 'Onda idi odmah kod doktora.'], miss: ['Liječnik.'] },
  { lesson: 'b1-04-03', reply: 0, hit: ['Trebao bi se odmoriti.', 'Trebao bi manje raditi.', 'Mislim da bi trebao više spavati.', 'Bilo bi dobro da ideš na jogu.'], miss: ['Bi trebao spavati.'] },
  { lesson: 'b1-04-03', reply: 1, hit: ['Bilo bi dobro da ideš na kontrolu.', 'Da, trebao bi se naručiti kod liječnika.', 'Naravno.'], miss: ['Kontrola.'] },
  { lesson: 'b1-04-03', reply: 2, hit: ['Ne bi trebao piti kavu navečer.', 'Trebao bi ranije ići spavati.', 'Nemoj gledati mobitel u krevetu.'], miss: ['Kava.'] },
  { lesson: 'b1-04-04', reply: 0, hit: ['Pokušavam se zdravo hraniti.', 'Svaki dan šetam.', 'Izbjegavam slatkiše.', 'Redovito trčim.'], miss: ['Zdravlje.'] },
  { lesson: 'b1-04-04', reply: 1, hit: ['Izbjegavam brzu hranu i slatka pića.', 'Uglavnom izbjegavam šećer.', 'Pokušavam izbjegavati stres.'], miss: ['Šećer.'] },
  { lesson: 'b1-04-04', reply: 2, hit: ['Za opuštanje čitam ili šetam.', 'Navečer slušam glazbu.', 'Vikendom idem na jogu.'], miss: ['Glazba.'] },
  { lesson: 'b1-04-05', reply: 0, hit: ['Žao mi je! Trebao bi se odmoriti.', 'Joj, nemoj se brinuti.', 'Imaš li temperaturu?', 'Jao!'], miss: ['Prehlada.'] },
  { lesson: 'b1-04-05', reply: 1, hit: ['Nemoj ići na posao bolestan.', 'Ne idi na posao!', 'Molim te, nemoj ići.'], miss: ['Idi na posao.'] },
  { lesson: 'b1-04-05', reply: 2, hit: ['Pazi na sebe i brzo ozdravi!', 'Čuvaj se!', 'Drži se!', 'Nema na čemu, brzo ozdravi.'], miss: ['Bok.'] },
  // Moduł 5: stopień wyższy i najwyższy, što… to…, strony świata.
  { lesson: 'b1-05-01', reply: 0, hit: ['Život u manjem gradu je mirniji i jeftiniji nego u Zagrebu.', 'Mislim da je bolje u malom gradu.', 'U velikom gradu je život zanimljiviji.', 'Mali grad je mirniji.'], miss: ['Grad.', 'Mali grad.'] },
  { lesson: 'b1-05-01', reply: 1, hit: ['Zrak je čišći u planinama.', 'U planinama je zrak čišći nego na moru.', 'Mislim da je na moru čišći.'], miss: ['Planine.'] },
  { lesson: 'b1-05-01', reply: 2, hit: ['Hrvatski mi je sve lakši.', 'Da, sve lakši!', 'Iskreno, sve je teži.'], miss: ['Hrvatski.'] },
  { lesson: 'b1-05-02', reply: 0, hit: ['Izvan sezone, jer je jeftinije.', 'U rujnu.', 'Najbolje je ići u lipnju.', 'Na jesen, kad nema gužve.'], miss: ['More.'] },
  { lesson: 'b1-05-02', reply: 1, hit: ['Što prije, to bolje.', 'Unaprijed.', 'Odmah!', 'Trebamo rezervirati što prije.'], miss: ['Sutra.'] },
  { lesson: 'b1-05-02', reply: 2, hit: ['Što manje stvari nosiš, to lakše putuješ.', 'Ne, što manje stvari nosimo, to je lakše.'], miss: ['Da, veliki kofer.'] },
  { lesson: 'b1-05-03', reply: 0, hit: ['Izabrao bih onaj, jer je bliže plaži.', 'Onaj, jer je bliže plaži.', 'Radije bih ovaj, jer je jeftiniji.', 'Izabrala bih prvi.'], miss: ['Plaža.'] },
  { lesson: 'b1-05-03', reply: 1, hit: ['Kvaliteta je važnija od cijene.', 'Meni je cijena važnija.', 'Važnija je kvaliteta.', 'Cijena.'], miss: ['Važno.'] },
  { lesson: 'b1-05-04', reply: 0, hit: ['Sa sjevera Poljske, iz Gdanjska.', 'Iz Krakova.', 'Ja sam s juga Poljske.', 'Dolazim iz Varšave.'], miss: ['Poljska.'] },
  { lesson: 'b1-05-04', reply: 1, hit: ['Zime su hladnije, a ljeta su kraća.', 'Kod nas je hladnije.', 'Klima je slična, ali zime su duže.'], miss: ['Hladno.'] },
  { lesson: 'b1-05-04', reply: 2, hit: ['Radije bih živio na moru, jer je toplije.', 'Na moru.', 'Ja bih živjela u unutrašnjosti.'], miss: ['More.'] },
  { lesson: 'b1-05-05', reply: 0, hit: ['S jedne strane, hotel je udobniji.', 'Hotel je bolji, ali je skuplji.', 'Apartman je znatno jeftiniji.'], miss: ['Hotel.'] },
  { lesson: 'b1-05-05', reply: 1, hit: ['Što duže ostajemo, to se više isplati apartman.', 'Više se isplati apartman.', 'Apartman se više isplati.'], miss: ['Isplati.'] },
  { lesson: 'b1-05-05', reply: 2, hit: ['Glavni razlog je cijena.', 'Cijena.', 'Zbog cijene.'], miss: ['Razlog.'] },
  // Moduł 6: kamo / kuda / odakle, czasowniki ruchu z przedrostkami, autostrada i prom.
  { lesson: 'b1-06-01', reply: 0, hit: ['Idem u Dalmaciju.', 'Ovo ljeto idem na Hvar.', 'Putujemo u Istru.', 'Ići ću u Split.', 'Na more.'], miss: ['Dalmacija.'] },
  { lesson: 'b1-06-01', reply: 1, hit: ['Iz Krakova.', 'Krećem iz Varšave.', 'Polazimo iz Zagreba ujutro.'], miss: ['Krakov.'] },
  { lesson: 'b1-06-01', reply: 2, hit: ['Autocestom, jer je brže.', 'Uz obalu.', 'Ići ću preko Zagreba.'], miss: ['Brzo.'] },
  { lesson: 'b1-06-02', reply: 1, hit: ['Dakle, prijeći most i skrenuti desno?', 'Prijeći most i skrenuti desno.', 'Znači, prijeđem most i skrenem desno?'], miss: ['Most.'] },
  { lesson: 'b1-06-03', reply: 0, hit: ['Na sljedećem odmorištu.', 'Mogli bismo stati na benzinskoj postaji.', 'Stanimo na prvom odmorištu.'], miss: ['Kava.'] },
  { lesson: 'b1-06-03', reply: 1, hit: ['Platit ću karticom.', 'Karticom.', 'Gotovinom.', 'Možemo platiti mobitelom.'], miss: ['Novac.'] },
  { lesson: 'b1-06-03', reply: 2, hit: ['Dok čekamo, možemo popiti kavu.', 'Možemo ići na sladoled.', 'Nema veze, idemo u šetnju.'], miss: ['Kava.'] },
  { lesson: 'b1-06-04', reply: 0, hit: ['Polazi u deset i petnaest.', 'U deset.', 'Sljedeći polazi za pola sata.', 'Za dvadeset minuta.'], miss: ['Autobus.'] },
  { lesson: 'b1-06-04', reply: 1, hit: ['U Zagrebu moramo presjesti na drugi vlak.', 'Ne moramo.', 'Moramo presjesti u Karlovcu.', 'Ne, ne treba.'], miss: ['Vlak.'] },
  { lesson: 'b1-06-04', reply: 2, hit: ['Ako uhvatimo autobus u deset, stići ćemo na vrijeme.', 'Stići ćemo, ne brini.', 'Hoćemo, sigurno.'], miss: ['Vrijeme.'] },
  { lesson: 'b1-06-05', reply: 0, hit: ['Prvo autocestom do Splita, onda trajektom.', 'Iz Zagreba autocestom.', 'Krenuli smo rano ujutro.'], miss: ['Trajekt.'] },
  { lesson: 'b1-06-05', reply: 1, hit: ['Je, na autocesti je bila kolona.', 'Nije.', 'Bilo je puno ljudi u luci.', 'Da, u luci je bila gužva.'], miss: ['Gužva.'] },
  { lesson: 'b1-06-05', reply: 2, hit: ['Katamaranom, jer je brži od trajekta.', 'Trajektom.', 'Vratio sam se brodom.'], miss: ['Brzo.'] },
  // Moduł 7: najem, dopełniacz liczby mnogiej, usterki, nedostajati.
  { lesson: 'b1-07-01', reply: 0, hit: ['Dobar dan, zovem zbog oglasa za stan.', 'Zovem u vezi stana.', 'Vidjela sam vaš oglas na internetu.'], miss: ['Stan.'] },
  { lesson: 'b1-07-01', reply: 1, hit: ['Koliko iznosi stanarina i jesu li režije uključene?', 'Koliko je stanarina?', 'Jesu li režije uključene?'], miss: ['Novac.'] },
  { lesson: 'b1-07-01', reply: 2, hit: ['Koliki je otkazni rok?', 'Jesu li kućni ljubimci dopušteni?', 'Smijem li imati psa?', 'A na koliko se potpisuje ugovor?'], miss: ['Pas.'] },
  { lesson: 'b1-07-02', reply: 0, hit: ['Moj stan ima tri sobe.', 'Stan ima pet soba.', 'Imam dvije sobe i kuhinju.', 'Dvije sobe.'], miss: ['Sobe.'] },
  { lesson: 'b1-07-02', reply: 1, hit: ['Nemam, u kuhinji nema dovoljno utičnica.', 'Imam dovoljno utičnica.', 'Nemam.', 'U dnevnom boravku ima samo dvije utičnice.'], miss: ['Struja.'] },
  { lesson: 'b1-07-02', reply: 2, hit: ['Trebam nekoliko vješalica i zavjese.', 'Trebaju mi nove žarulje.', 'Moram kupiti tepih.'], miss: ['Ništa.'] },
  { lesson: 'b1-07-03', reply: 0, hit: ['Dobar dan, želim prijaviti kvar.', 'Ovdje Ana iz stana broj pet. Želim prijaviti kvar.', 'Imam problem s bojlerom.'], miss: ['Kvar.'] },
  { lesson: 'b1-07-03', reply: 1, hit: ['Odvod u kupaonici je začepljen.', 'Grijanje ne radi.', 'Pukla je cijev.', 'U kupaonici ima plijesni.', 'Voda curi iz slavine.'], miss: ['Kupaonica.'] },
  { lesson: 'b1-07-03', reply: 2, hit: ['To je hitno, može li danas?', 'Može li ranije?', 'Molim vas, pošaljite ga danas.', 'To je jako hitno!'], miss: ['Sutra.'] },
  { lesson: 'b1-07-04', reply: 0, hit: ['Lijep je, ali namještaj je star.', 'Super je!', 'Stan je mali, ali svijetao.', 'Nije loše.'], miss: ['Stan.'] },
  { lesson: 'b1-07-04', reply: 1, hit: ['Nedostaje mi kauč.', 'Nedostaju nam još dvije stolice.', 'Još mi nedostaje stol.'], miss: ['Mi nedostaje stol.'] },
  { lesson: 'b1-07-04', reply: 2, hit: ['Hoću, obojit ću ih u bijelo.', 'Neću.', 'Moram prvo pitati vlasnika.', 'Obojit ću zidove u žuto.'], miss: ['Bijelo.'] },
  { lesson: 'b1-07-05', reply: 0, hit: ['Želim vas obavijestiti da se selim.', 'Sve je u redu, ali moram vam reći da se selim.', 'Selim se sljedeći mjesec.'], miss: ['Stan.'] },
  { lesson: 'b1-07-05', reply: 1, hit: ['Do kraja mjeseca.', 'Ostajem do prvog studenog.', 'Još mjesec dana.'], miss: ['Mjesec.'] },
  { lesson: 'b1-07-05', reply: 2, hit: ['Kada ćete mi vratiti polog?', 'Dobro, a kad ću dobiti polog natrag?'], miss: ['Polog.'] },
  // Moduł 8: zakupy online, da + czas teraźniejszy, kako bih, reklamacja.
  { lesson: 'b1-08-01', reply: 0, hit: ['Da, često kupujem odjeću preko interneta.', 'Rijetko.', 'Ponekad naručim knjige.', 'Ne baš, kupujem u trgovini.'], miss: ['Odjeća.'] },
  { lesson: 'b1-08-01', reply: 1, hit: ['Obično plaćam karticom.', 'Karticom.', 'Pouzećem.', 'Plaćam preko aplikacije.'], miss: ['Novac.'] },
  { lesson: 'b1-08-01', reply: 2, hit: ['Naručio sam knjigu preko interneta, ali paket još nije stigao.', 'Jednom, paket je kasnio tjedan dana.', 'Nije.'], miss: ['Kurir.'] },
  { lesson: 'b1-08-02', reply: 0, hit: ['Zovem da provjerim status narudžbe.', 'Dobar dan, zovem da pitam za paket.', 'Javljam se da se raspitam za narudžbu.'], miss: ['Paket.', 'Zovem provjeriti paket.'] },
  { lesson: 'b1-08-02', reply: 1, hit: ['Broj je tri, osam, jedan, dva.', 'Tri osam jedan dva.', 'Moj broj narudžbe je 4572.'], miss: ['Ne znam.'] },
  { lesson: 'b1-08-02', reply: 2, hit: ['Molim vas da mi potvrdite novi termin.', 'Možete li mi javiti kad stiže?', 'Razumijem. Molim vas da mi pošaljete poruku.'], miss: ['Termin.'] },
  { lesson: 'b1-08-03', reply: 0, hit: ['Htio bih vratiti ovaj proizvod.', 'Želim zamijeniti jaknu.', 'Htjela bih zamijeniti veličinu.'], miss: ['Jakna.'] },
  { lesson: 'b1-08-03', reply: 1, hit: ['Imam. Što još trebam?', 'Evo ga.', 'Nemam, izgubila sam ga.'], miss: ['Račun.'] },
  { lesson: 'b1-08-03', reply: 2, hit: ['Što još trebam napraviti kako bih dobio novac natrag?', 'Kada ću dobiti novac?', 'A što još moram napraviti?'], miss: ['Novac.'] },
  { lesson: 'b1-08-04', reply: 0, hit: ['Paket je stigao oštećen.', 'Dobio sam pogrešan broj cipela.', 'Mobitel ne radi.', 'Ekran je razbijen.'], miss: ['Problem.'] },
  { lesson: 'b1-08-04', reply: 1, hit: ['Je, još godinu dana.', 'Da, pod garancijom je.', 'Nije.', 'Još šest mjeseci.'], miss: ['Garancija.'] },
  { lesson: 'b1-08-04', reply: 2, hit: ['Tražim zamjenu ili povrat novca.', 'Zamjenu.', 'Htjela bih povrat novca.', 'Radije bih novi mobitel.'], miss: ['Ništa.'] },
  { lesson: 'b1-08-05', reply: 0, hit: ['Želim uložiti reklamaciju na neispravan proizvod.', 'Zovem zbog reklamacije.', 'Htjela bih reklamirati tablet.'], miss: ['Reklamacija.'] },
  { lesson: 'b1-08-05', reply: 1, hit: ['Mobitel je neispravan, ne puni se.', 'Paket je stigao oštećen.'], miss: ['Mobitel.'] },
  { lesson: 'b1-08-05', reply: 2, hit: ['Tražim zamjenu, molim vas u najkraćem roku.', 'Molim vas da mi vratite novac.', 'Želim povrat novca.'], miss: ['Ne znam.'] },
  // Moduł 9: -ima / -ama, rozmowa o pracę, praca zdalna, spotkanie.
  { lesson: 'b1-09-01', reply: 0, hit: ['Radim s kolegama iz marketinga.', 'S klijentima.', 'Surađujem s partnerima iz Njemačke.', 'Radim sama.'], miss: ['Kolege.'] },
  { lesson: 'b1-09-01', reply: 1, hit: ['Često imam sastanke s klijentima.', 'S partnerima.', 'Svaki tjedan imam sastanke sa šefom.'], miss: ['Klijenti.'] },
  { lesson: 'b1-09-01', reply: 2, hit: ['Suradnja s klijentima je jako dobra.', 'Suradnja je odlična.', 'Odlična!', 'Nije loša.'], miss: ['Tim.'] },
  { lesson: 'b1-09-02', reply: 0, hit: ['Na sastancima uvijek pričamo o novim projektima.', 'Pišem izvještaje.', 'Imam puno sastanaka.', 'Ovaj tjedan sam na poslovnom putovanju.'], miss: ['Posao.'] },
  { lesson: 'b1-09-02', reply: 1, hit: ['Šaljem ih svim kolegama u odjelu.', 'Klijentima.', 'Šaljem izvještaje šefu.', 'Direktoru.'], miss: ['Izvještaj.'] },
  { lesson: 'b1-09-02', reply: 2, hit: ['Razgovaramo o novim projektima.', 'O rokovima.', 'Uglavnom pričamo o klijentima i projektima.'], miss: ['Projekti.'] },
  { lesson: 'b1-09-03', reply: 0, hit: ['Zato što volim raditi s ljudima.', 'Jer tražim novi izazov.', 'Vaša tvrtka ima odličan tim.'], miss: ['Posao.'] },
  { lesson: 'b1-09-03', reply: 1, hit: ['Moja jaka strana je timski rad.', 'Dobar sam u komunikaciji.', 'Timski rad.', 'Jaka strana mi je organizacija.'], miss: ['Strana.'] },
  { lesson: 'b1-09-03', reply: 2, hit: ['Imam pet godina radnog iskustva u turizmu.', 'Tri godine.', 'Nemam puno iskustva.', 'Radim kao konobar već dvije godine.'], miss: ['Iskustvo.'] },
  { lesson: 'b1-09-04', reply: 0, hit: ['Dva dana tjedno radim od kuće.', 'U uredu.', 'Radim kombinirano.', 'Uglavnom radim od kuće.'], miss: ['Kuća.'] },
  { lesson: 'b1-09-04', reply: 1, hit: ['U uredu je lakše surađivati s kolegama.', 'Od kuće mi je lakše.', 'Mislim da je ured bolji.'], miss: ['Ured.'] },
  { lesson: 'b1-09-04', reply: 2, hit: ['Ovaj mjesec sam preopterećena poslom.', 'Moram predati izvještaj do petka.', 'Da, imam puno posla.', 'Ne.'], miss: ['Posao.'] },
  { lesson: 'b1-09-05', reply: 0, hit: ['Ja ću voditi zapisnik.', 'Mogu ja.', 'Ja mogu.'], miss: ['Zapisnik.'] },
  { lesson: 'b1-09-05', reply: 1, hit: ['Dobro, imamo sastanke s klijentima svaki tjedan.', 'Odlično.', 'Dobro, razgovaramo s partnerima svaki dan.'], miss: ['Klijenti.'] },
  { lesson: 'b1-09-05', reply: 2, hit: ['Sljedeći korak je sastanak s klijentima.', 'Trebamo napisati izvještaj.', 'Moramo raspodijeliti zadatke.'], miss: ['Korak.'] },
];

test('B1: otwarte repliki przyjmują naturalne odpowiedzi i odrzucają błędny szyk', () => {
  for (const f of OPEN_REPLIES) {
    const r = reply(f.lesson, f.reply);
    assert.ok(r, `${f.lesson}#${f.reply}: brak repliki`);
    for (const answer of f.hit) assert.equal(verdict(f.lesson, f.reply, answer), 'hit', `${f.lesson}#${f.reply} [${r.prompt}] „${answer}”`);
    for (const answer of f.miss) assert.equal(verdict(f.lesson, f.reply, answer), 'miss', `${f.lesson}#${f.reply} [${r.prompt}] przepuszcza „${answer}”`);
  }
});

test('B1: lista otwartych replik w teście = repliki oznaczone „open” w didactics', () => {
  const didactics = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-b1/didactics.json'), 'utf8'));
  const flagged = Object.entries(didactics.lessons).flatMap(([key, lesson]) => {
    const n = Number(key.slice(3));
    const appId = `b1-${String(Math.ceil(n / 5)).padStart(2, '0')}-${String(((n - 1) % 5) + 1).padStart(2, '0')}`;
    return (lesson.dialog?.turns ?? []).filter((x) => x.reply).flatMap((x, i) => (x.reply.open ? [`${appId}#${i}`] : []));
  });
  assert.deepEqual(OPEN_REPLIES.map((f) => `${f.lesson}#${f.reply}`).sort(), flagged.sort());
});

test('B1: wszystkie repliki — interpunkcja, wielkość liter i grzecznościowa rama nie zmieniają wyniku', () => {
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

test('B1: każdy chorwacki tekst lekcji ma nagranie, a każde audioSrc wskazuje istniejący plik', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-b1/audio-manifest.json'), 'utf8'));
  for (const item of manifest.items) {
    assert.match(item.audioPath, /^\/audio\/hr\/b1\/module-\d\d\/[a-z0-9-]+\.mp3$/, item.audioPath);
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

test('B1: wszystkie lekcje da się zaliczyć poprawnymi odpowiedziami, a błędne odpowiedzi nie zaliczają lekcji', async () => {
  for (const lesson of lessons) {
    const content = generated.get(lesson.id).content;
    const options = { React, Renderer, act, LessonPlayer, t, content };
    const right = await walkLesson({ ...options, answers: 'right' });
    assert.equal(right.completed, 1, `${lesson.id}: poprawne odpowiedzi → zaliczenie`);
    assert.equal(right.mistakes, false, `${lesson.id}: poprawne odpowiedzi bez błędów`);
    assert.equal((await walkLesson({ ...options, answers: 'wrong' })).completed, 0, `${lesson.id}: błędne odpowiedzi nie zaliczają`);
  }
});
