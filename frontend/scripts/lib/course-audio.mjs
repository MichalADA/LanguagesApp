/**
 * Audio kursu: które chorwackie teksty w lekcji warto odsłuchać i gdzie leżą ich nagrania.
 *
 * Jedna funkcja `audioSlots` opisuje wszystkie miejsca w treści lekcji, które mają dostać
 * `audioSrc`. Używa jej zarówno zbieranie tekstów do syntezy (manifest), jak i dopisywanie
 * ścieżek do wygenerowanych danych — dzięki temu nie ma dwóch rozjeżdżających się list.
 * Działa dla dowolnego modułu; nie zależy od konkretnej lekcji.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";

const FOLD = { č: "c", ć: "c", š: "s", ž: "z", đ: "dj", ł: "l", Č: "c", Ć: "c", Š: "s", Ž: "z", Đ: "dj", Ł: "l" };

/** „Kako si?” → „kako-si”; bezpieczne dla URL, deterministyczne. */
export function slugify(text, max = 60) {
  const ascii = text.replace(/[čćšžđłČĆŠŽĐŁ]/g, (c) => FOLD[c]).normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const slug = ascii.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (slug.slice(0, max).replace(/-+$/g, "") || "audio");
}

const shortHash = (value) => createHash("sha1").update(value).digest("hex").slice(0, 6);

/**
 * Teksty różniące się tylko wielkością liter i interpunkcją („dobar dan” / „Dobar dan!”)
 * brzmią tak samo — dostają jedno nagranie (syntezowany jest pierwszy napotkany wariant).
 */
const spokenKey = (voice, text) =>
  `${voice}\u0000${text.toLocaleLowerCase("hr").replace(/[.,!?;:„”"«»…]/g, "").replace(/\s+/g, " ").trim()}`;

/**
 * Wszystkie miejsca z chorwackim tekstem w treści lekcji.
 * Każdy slot: { text, speaker?, kind, set(src) }. Polskie tłumaczenia i UI są pomijane.
 */
export function audioSlots(content) {
  const slots = [];
  const add = (kind, text, set, speaker) => {
    const value = typeof text === "string" ? text.trim() : "";
    if (value && !value.includes("___")) slots.push({ kind, text: value, speaker, set });
  };
  const bilingual = (kind, item, speaker) => item && typeof item === "object" && add(kind, item.target, (src) => { item.audioSrc = src; }, speaker);

  content.vocabulary?.forEach((word) => add("vocabulary", word.target, (src) => { word.audioSrc = src; }));

  for (const step of content.steps) {
    bilingual("instruction", step.instructionTarget);
    switch (step.type) {
      case "intro":
        step.goals.forEach((goal) => bilingual("phrase", goal));
        break;
      case "word":
        add("vocabulary", step.target, (src) => { step.audioSrc = src; });
        bilingual("example", step.example);
        step.related?.forEach((item) => bilingual("vocabulary", item));
        break;
      case "structure":
        step.examples?.forEach((item) => bilingual("example", item));
        break;
      case "listen":
        step.lines.forEach((line) => add("dialog", line.text, (src) => { line.audioSrc = src; }, line.speaker));
        break;
      case "choice": {
        const side = step.targetText;
        if (side === "prompt" || side === "both") add("question", step.prompt, (src) => { step.promptAudioSrc = src; });
        if (side === "options" || side === "both") add("answer", step.options[step.correctIndex], (src) => { step.answerAudioSrc = src; });
        break;
      }
      case "translate":
      case "order":
        add("answer", step.accepted[0], (src) => { step.answerAudioSrc = src; });
        break;
      case "gap": {
        const [, punct = "", rest = ""] = step.after.match(/^([.,!?;:]*)\s*(.*)$/) ?? [];
        const sentence = [step.before, `${step.accepted[0]}${punct}`, rest].filter(Boolean).join(" ");
        add("answer", sentence, (src) => { step.answerAudioSrc = src; });
        break;
      }
      case "dialog":
        for (const turn of step.turns) {
          if (turn.kind === "line") add("dialog", turn.line.text, (src) => { turn.line.audioSrc = src; }, turn.line.speaker);
          else add("answer", turn.suggestion, (src) => { turn.suggestionAudioSrc = src; });
        }
        break;
      case "free":
        add("answer", step.sample, (src) => { step.sampleAudioSrc = src; });
        break;
      case "vocabList":
        step.items.forEach((item) => bilingual("vocabulary", item));
        break;
      case "reading":
        step.text.forEach((line) => bilingual("reading", line));
        break;
      case "summary":
        step.recap.forEach((item) => bilingual("phrase", item));
        bilingual("instruction", step.closing);
        break;
      // „listening” ma własne, nagrane wcześniej pliki (pole `audio`) — nie syntezujemy ich ponownie.
      default:
        break;
    }
  }
  return slots;
}

/** Głos zależy od mówiącego: rozmówcy-mężczyźni dostają głos męski, reszta żeński. */
export function voiceFor(config, speaker) {
  return speaker && config.maleSpeakers.includes(speaker) ? config.voices.male : config.voices.female;
}

/**
 * Buduje manifest nagrań: każdy unikalny (tekst, głos) dostaje jedną, stałą ścieżkę.
 * Istniejące wpisy są zachowywane (te same pliki przy kolejnych uruchomieniach),
 * a teksty powtarzające się w późniejszych modułach używają już istniejącego nagrania.
 */
export function buildManifest(config, previous, lessonsByModule) {
  const items = new Map((previous?.items ?? []).map((item) => [spokenKey(item.voice, item.text), { ...item, kinds: [], modules: [] }]));
  const usedPaths = new Set([...items.values()].map((item) => item.audioPath));

  for (const [moduleNo, lessons] of lessonsByModule) {
    const dir = `${config.pathPrefix}/module-${String(moduleNo).padStart(2, "0")}`;
    for (const { content } of lessons) {
      for (const slot of audioSlots(content)) {
        const voice = voiceFor(config, slot.speaker);
        const key = spokenKey(voice, slot.text);
        let item = items.get(key);
        if (!item) {
          const suffix = voice === config.voices.female ? "" : "-m";
          let path = `${dir}/${slugify(slot.text)}${suffix}.mp3`;
          if (usedPaths.has(path)) path = `${dir}/${slugify(slot.text)}${suffix}-${shortHash(key)}.mp3`;
          usedPaths.add(path);
          item = { text: slot.text, voice, audioPath: path, kinds: [], modules: [] };
          items.set(key, item);
        }
        if (!item.modules.includes(moduleNo)) item.modules.push(moduleNo);
        if (!item.kinds.includes(slot.kind)) item.kinds.push(slot.kind);
      }
    }
  }

  // Wpisy, których żaden moduł już nie używa, znikają z manifestu (pliki zostają na dysku).
  const list = [...items.values()]
    .filter((item) => item.modules.length)
    .map((item) => ({ ...item, kinds: [...item.kinds].sort(), modules: [...item.modules].sort((a, b) => a - b) }))
    .sort((a, b) => a.audioPath.localeCompare(b.audioPath));
  return {
    provider: config.provider,
    rate: config.rate,
    voices: config.voices,
    modules: [...lessonsByModule.keys()],
    characters: list.reduce((sum, item) => sum + [...item.text].length, 0),
    items: list,
  };
}

/** Dopisuje audioSrc tylko tam, gdzie plik istnieje — aplikacja nigdy nie dostaje ścieżki do 404. */
export function attachAudio(content, config, manifest, publicDir) {
  const byKey = new Map(manifest.items.map((item) => [spokenKey(item.voice, item.text), item.audioPath]));
  let attached = 0;
  let missing = 0;
  for (const slot of audioSlots(content)) {
    const path = byKey.get(spokenKey(voiceFor(config, slot.speaker), slot.text));
    if (!path) continue;
    if (existsSync(join(publicDir, path))) {
      slot.set(path);
      attached++;
    } else missing++;
  }
  return { attached, missing };
}
