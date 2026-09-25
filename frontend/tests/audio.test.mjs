import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { audioSlots, slugify } from '../scripts/lib/course-audio.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const manifest = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-a1/audio-manifest.json'), 'utf8'));
const config = JSON.parse(readFileSync(join(ROOT, 'curriculum/hr-a1/audio.json'), 'utf8'));

function loadTs(path, req = () => ({})) {
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  new Function('require', 'exports', outputText)(req, exports);
  return exports;
}
const lessonFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lessonFiles(join(dir, e.name)) : e.name.startsWith('lesson-') ? [join(dir, e.name)] : []));
const lessons = lessonFiles(join(ROOT, 'src/curriculum/data/hr-a1')).map((file) => ({ file, lesson: loadTs(file).LESSON }));
const moduleOf = (file) => Number(file.match(/module-(\d\d)/)[1]);

test('slugi nagrań są czytelne, deterministyczne i bezpieczne dla URL', () => {
  assert.equal(slugify('Kako si?'), 'kako-si');
  assert.equal(slugify('Doviđenja!'), 'dovidjenja');
  assert.equal(slugify('Živim u Poljskoj.'), 'zivim-u-poljskoj');
  assert.equal(slugify('Zovem se Michał.'), 'zovem-se-michal');
  assert.equal(slugify('Kako si?'), slugify('Kako si?'));
});

test('manifest audio pokrywa moduły z audio.json i ma bezpieczne, unikalne ścieżki', () => {
  assert.deepEqual(manifest.modules, config.modules);
  assert.equal(manifest.provider, 'edge-tts');
  const paths = manifest.items.map((i) => i.audioPath);
  assert.equal(new Set(paths).size, paths.length, 'powtórzone ścieżki');
  for (const item of manifest.items) {
    assert.match(item.audioPath, /^\/audio\/hr\/a1\/module-\d\d\/[a-z0-9-]+\.mp3$/, item.audioPath);
    assert.ok([config.voices.female, config.voices.male].includes(item.voice), item.voice);
    assert.ok(item.text.trim() && !item.text.includes('___'));
  }
  assert.equal(manifest.characters, manifest.items.reduce((s, i) => s + [...i.text].length, 0));
});

test('każdy chorwacki tekst modułów z audio.json, który warto odsłuchać, jest w manifeście', () => {
  const spoken = (t) => t.toLocaleLowerCase('hr').replace(/[.,!?;:„”"«»…]/g, '').replace(/\s+/g, ' ').trim();
  const known = new Set(manifest.items.map((i) => spoken(i.text)));
  const module1 = lessons.filter(({ file }) => config.modules.includes(moduleOf(file)));
  assert.equal(module1.length, 5 * config.modules.length);
  for (const { lesson } of module1) {
    const slots = audioSlots(structuredClone(lesson.content));
    assert.ok(slots.length > 20, `${lesson.content.lessonId}: za mało tekstów`);
    for (const slot of slots) assert.ok(known.has(spoken(slot.text)), `${lesson.content.lessonId}: brak „${slot.text}”`);
    const kinds = new Set(slots.map((s) => s.kind));
    // Test poziomu (tryb „test”) nie ma dialogów — słuchanie idzie tam z nagranego wcześniej pliku.
    const required = lesson.content.mode === 'test' ? ['vocabulary', 'answer'] : ['vocabulary', 'answer', 'dialog', 'phrase'];
    for (const kind of required) assert.ok(kinds.has(kind), `${lesson.content.lessonId}: brak ${kind}`);
  }
});

test('każde audioSrc i nagranie dialogu w lekcjach wskazuje istniejący plik (brak 404)', () => {
  let checked = 0;
  for (const { lesson } of lessons) {
    const json = JSON.stringify(lesson.content);
    for (const [, src] of json.matchAll(/"(?:audioSrc|promptAudioSrc|answerAudioSrc|suggestionAudioSrc|sampleAudioSrc|audio)":"([^"]+)"/g)) {
      assert.ok(existsSync(join(PUBLIC, src)), `${lesson.content.lessonId}: brak pliku ${src}`);
      checked++;
    }
  }
  assert.ok(checked > 0, 'żadnych referencji audio do sprawdzenia');
});

test('wspólny odtwarzacz: nowe nagranie zatrzymuje poprzednie, ponowne kliknięcie gra od początku', async () => {
  const created = [];
  globalThis.Audio = class {
    constructor(src) { this.src = src; this.paused = true; created.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() {}
  };
  const { playAudio, stopAudio, subscribeAudio } = loadTs(join(ROOT, 'src/audio/player.ts'));
  const seen = [];
  const unsubscribe = subscribeAudio((src) => seen.push(src));
  playAudio('/a.mp3');
  playAudio('/b.mp3');
  assert.equal(created[0].paused, true, 'pierwsze nagranie zatrzymane');
  assert.equal(created[1].paused, false);
  playAudio('/b.mp3');
  assert.equal(created.length, 3, 'ponowne kliknięcie tworzy świeży odtwarzacz od początku');
  assert.equal(created[1].paused, true);
  created[2].onended();
  assert.equal(seen.at(-1), null, 'po zakończeniu kanał jest wolny');
  stopAudio();
  unsubscribe();
  delete globalThis.Audio;
});
