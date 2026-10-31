#!/usr/bin/env node
/**
 * Głosy postaci w Lexodromia Stories.
 *
 *   node scripts/stories-audio.mjs            # zapisuje manifest nagrań + src/stories/data/<historia>/audio.ts
 *   node scripts/stories-audio.mjs --check    # błąd, gdy pliki są nieaktualne (npm test)
 *
 * Każda wypowiedź postaci i narratora ma nagranie głosem tej postaci (profil: płeć głosu, wysokość,
 * tempo — story.ts). Gdy kurs ma już nagranie DOKŁADNIE tego tekstu tym samym głosem (bez zmiany barwy),
 * używamy go zamiast nowej syntezy. Brakujące pliki syntezuje istniejące narzędzie:
 *   python tools/listening/generate_tts.py --course-manifest frontend/curriculum/stories/<historia>-audio-manifest.json
 * a potem ponownie `npm run stories:audio`. W audio.ts trafiają tylko pliki, które istnieją —
 * brak nagrania oznacza brak głosu, nigdy błąd 404. Teksty z {name} nie są nagrywane.
 *
 * Historia z polem `elevenlabs` (model + voice_id per mówiący) jest nagrywana w ElevenLabs (płatne):
 * każda wypowiedź dostaje własne nagranie (bez reużycia nagrań kursu, żeby głos postaci był spójny),
 * pliki trafiają do /audio/hr/stories/<historia>/elevenlabs/<mówiący>/, a generowanie wymaga --allow-paid:
 *   python tools/listening/generate_tts.py --course-manifest frontend/curriculum/stories/<historia>-audio-manifest.json --allow-paid
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { slugify } from "./lib/course-audio.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");
const CHECK = process.argv.includes("--check");

const VOICES = { female: "hr-HR-GabrijelaNeural", male: "hr-HR-SreckoNeural" };
const COURSE_RATE = "-8%";
/** Gracz nie ma postaci — jego wzorcowe odpowiedzi czyta neutralny głos kursu. */
const PLAYER = { gender: "female" };

/** Głosy ElevenLabs (voice_id z biblioteki, język chorwacki). */
const EL = {
  sara: "4vkn1E85GfXGoH86xgU7", // Sara – Sharp and Professional
  tomislav: "O9XgmQnaZveORWl6mTHm", // Tomislav – Calm, Clear and Narrative
  ivan: "jJ1MUnCKtrOI23TlUUHc", // Ivan – Clear Croatian Narrator
  nina: "FXlzTee7Zx2caYKIAwBF", // Nina – Calm, Warm & Resonant
  mila: "eqAqnItEUARzEkoDCTJ1", // Mila – Pleasant and gentle
  boris: "ocaele7kOTNS1wQzhbSM", // Boris – Deep, Calm and Narrative
  milena: "7IVTG9LKLYndnFiFDLU2", // Milena – Balkan Pro
  mihael: "jVBTQrP67HZEE22UqQGF", // Mihael – HQ Croatian Radio TV Voice over (młody)
  ida: "d3l4f3HgkE3P6Fo91lYA", // Ida – Clear & Confident
  branimir: "WxQSzlR1UORgKEiMk1n4", // Branimir – Professional Croatian Studio
};

const STORIES = [
  {
    dir: "split-a1",
    exportName: "SPLIT_A1",
    courseManifests: ["curriculum/hr-a1/audio-manifest.json"],
    elevenlabs: {
      model: "eleven_multilingual_v2",
      voices: {
        narrator: EL.tomislav,
        marko: EL.ivan,
        ana: EL.sara,
        ivana: EL.nina,
        player: EL.mila,
        josip: EL.boris,
        mare: EL.milena,
        toni: EL.mihael,
        petra: EL.ida,
        davor: EL.branimir,
      },
    },
  },
];

function loadTs(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  cache.set(file, exports);
  const req = (id) => {
    if (!id.startsWith(".")) return {};
    const base = resolve(dirname(file), id);
    return loadTs([`${base}.ts`, join(base, "index.ts")].find(existsSync), cache);
  };
  new Function("require", "exports", outputText)(req, exports);
  return exports;
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
let stale = 0;

for (const { dir, exportName, courseManifests, elevenlabs } of STORIES) {
  const story = loadTs(join(ROOT, "src/stories/data", dir, "story.ts"))[exportName];
  const profiles = { narrator: story.narratorVoice, player: PLAYER, ...Object.fromEntries(story.npcs.map((n) => [n.id, n.voice])) };

  // Nagrania kursu: tekst + głos → ścieżka (tylko istniejące pliki, nagrane tempem kursu bez zmiany barwy).
  const course = new Map();
  for (const path of courseManifests) {
    const manifest = JSON.parse(readFileSync(join(ROOT, path), "utf8"));
    for (const item of manifest.items) {
      if ((manifest.rate ?? COURSE_RATE) !== COURSE_RATE || !existsSync(join(ROOT, "public", item.audioPath))) continue;
      const key = `${item.voice}|${item.text}`;
      if (!course.has(key)) course.set(key, item.audioPath);
    }
  }

  // Kto co mówi: postacie i narrator (say), gracz (opcje wyboru, wzorcowe odpowiedzi).
  const lines = new Map();
  const add = (speaker, text) => {
    if (!text || text.includes("{")) return;
    lines.set(`${speaker}|${text}`, { speaker, text });
  };
  for (const mission of story.missions) {
    for (const node of Object.values(mission.dialogue.graph.nodes)) {
      if (node.kind === "say") add(node.speaker, node.text.hr);
      if (node.kind === "choice") node.options.forEach((o) => add("player", o.text.hr));
      if (node.kind === "build" || node.kind === "type") add("player", node.accepted[0]);
    }
    mission.vocabulary.forEach((w) => add("player", w.hr));
  }

  const items = [...lines.values()]
    .sort((a, b) => a.speaker.localeCompare(b.speaker) || a.text.localeCompare(b.text))
    .map(({ speaker, text }) => {
      const profile = profiles[speaker];
      if (!profile) throw new Error(`${dir}: brak profilu głosu dla „${speaker}”`);
      if (elevenlabs) {
        const voice = elevenlabs.voices[speaker];
        if (!voice) throw new Error(`${dir}: brak głosu ElevenLabs dla „${speaker}”`);
        return {
          speaker,
          text,
          voice,
          rate: profile.rate ?? COURSE_RATE,
          audioPath: `/audio/hr/stories/${dir}/elevenlabs/${speaker}/${slugify(text)}.mp3`,
        };
      }
      const voice = VOICES[profile.gender];
      const plain = !profile.pitch && (profile.rate ?? COURSE_RATE) === COURSE_RATE;
      const reused = plain ? course.get(`${voice}|${text}`) : undefined;
      return {
        speaker,
        text,
        voice,
        rate: profile.rate ?? COURSE_RATE,
        ...(profile.pitch ? { pitch: profile.pitch } : {}),
        audioPath: reused ?? `/audio/hr/stories/${dir}/${speaker}/${slugify(text)}.mp3`,
        ...(reused ? { reused: true } : {}),
      };
    });
  const manifest = elevenlabs
    ? { provider: "elevenlabs", model: elevenlabs.model, rate: COURSE_RATE, story: story.id, items }
    : { provider: "edge-tts", rate: COURSE_RATE, story: story.id, items: items.filter((i) => !i.reused) };

  const audio = {};
  for (const item of items) {
    if (!existsSync(join(ROOT, "public", item.audioPath))) continue;
    (audio[item.speaker] ??= {})[item.text] = item.audioPath;
  }
  const recorded = Object.values(audio).reduce((n, m) => n + Object.keys(m).length, 0);
  const body =
    `// AUTO-GENERATED by scripts/stories-audio.mjs — nie edytuj ręcznie.\n` +
    `// Nagrania wypowiedzi per mówiący: ${recorded} z ${items.length} (${items.filter((i) => i.reused).length} z nagrań kursu).\n` +
    `import type { StoryAudio } from "../../types";\n\n` +
    `export const ${exportName}_AUDIO: StoryAudio = ${JSON.stringify(audio, null, 2)};\n`;

  const audioFile = join(ROOT, "src/stories/data", dir, "audio.ts");
  const manifestFile = join(ROOT, "curriculum/stories", `${dir}-audio-manifest.json`);
  if (CHECK) {
    const outdated = [
      [audioFile, body],
      [manifestFile, json(manifest)],
    ].filter(([file, content]) => !existsSync(file) || readFileSync(file, "utf8") !== content);
    if (outdated.length) {
      console.error(`Nieaktualne nagrania historii ${dir} — uruchom: npm run stories:audio`);
      stale++;
    }
    const missing = items.length - recorded;
    console.log(`${dir}: ${recorded} z ${items.length} wypowiedzi ma nagranie${missing ? ` (brakuje ${missing})` : ""}`);
  } else {
    mkdirSync(dirname(manifestFile), { recursive: true });
    writeFileSync(manifestFile, json(manifest));
    writeFileSync(audioFile, body);
    console.log(`${dir}: ${recorded} z ${items.length} wypowiedzi ma nagranie; do syntezy w manifeście: ${manifest.items.filter((i) => !existsSync(join(ROOT, "public", i.audioPath))).length}`);
  }
}
if (stale) process.exit(1);
