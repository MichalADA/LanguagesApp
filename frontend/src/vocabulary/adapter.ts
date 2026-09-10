import type { Course } from "@/courses/types";
import type { VocabularyEntry } from "./types";

/**
 * Adapter datasetu → neutralny VocabularyEntry.
 * Kolumny odczytujemy po NAZWACH z nagłówka, wg mapowania z kursu, więc kolejność
 * kolumn w pliku może się zmienić bez psucia aplikacji.
 */
export function parseDataset(course: Course, text: string): VocabularyEntry[] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = splitRow(lines[0]).map((h) => h.trim());
  const col = course.dataset.columns;
  const idx = (name: string | undefined) => (name ? header.indexOf(name) : -1);

  const map = {
    rank: idx(col.rank),
    source: idx(col.source),
    target: idx(col.target),
    acceptedAnswers: idx(col.acceptedAnswers),
    partOfSpeech: idx(col.partOfSpeech),
    grammar: idx(col.grammar),
    exampleTarget: idx(col.exampleTarget),
    exampleSource: idx(col.exampleSource),
    falseFriend: idx(col.falseFriend),
    falseFriendNote: idx(col.falseFriendNote),
    tags: idx(col.tags),
    audioUrl: idx(col.audioUrl),
  };

  if (map.source < 0 || map.target < 0) {
    throw new Error(
      `Dataset kursu ${course.id} nie ma kolumn ${col.source}/${col.target}. Nagłówek: ${header.join(", ")}`,
    );
  }

  const blockRe = new RegExp(course.dataset.blockTagPattern);
  const at = (cols: string[], i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");
  const out: VocabularyEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    const sourceText = at(cols, map.source);
    const targetText = at(cols, map.target);
    if (!sourceText || !targetText) continue;

    const tags = at(cols, map.tags).split(/\s+/).filter(Boolean);
    const rank = Number(at(cols, map.rank)) || i;
    const audioUrl = at(cols, map.audioUrl);
    let acceptedAnswers: string[] | undefined;
    if (map.acceptedAnswers >= 0) {
      const value: unknown = JSON.parse(at(cols, map.acceptedAnswers) || "[]");
      if (!Array.isArray(value) || value.some((answer) => typeof answer !== "string" || !answer.trim())) {
        throw new Error(`Nieprawidłowe warianty odpowiedzi: ${course.id}:${rank}`);
      }
      acceptedAnswers = value.map((answer: string) => answer.trim());
    }

    out.push({
      id: `${course.id}:${rank}`,
      courseId: course.id,
      rank,
      sourceText,
      targetText,
      acceptedAnswers,
      partOfSpeech: at(cols, map.partOfSpeech),
      grammar: at(cols, map.grammar),
      exampleTarget: at(cols, map.exampleTarget),
      exampleSource: at(cols, map.exampleSource),
      falseFriend: at(cols, map.falseFriend).toUpperCase() === "YES",
      falseFriendNote: at(cols, map.falseFriendNote),
      tags,
      block: tags.find((t) => blockRe.test(t)) ?? course.blocks[0]?.id ?? "",
      audioUrl: audioUrl || undefined,
      contentStatus: "generated",
    });
  }

  return out;
}

/** Split z obsługą pól w cudzysłowach — dataset ich nie używa, ale ręczne edycje mogą. */
export function splitRow(line: string): string[] {
  if (!line.includes('"')) return line.split(";");
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === ";" && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Tagi tematyczne (bez tagów bloków), posortowane wg częstości. */
export function topicTags(entries: readonly VocabularyEntry[], blockPattern: string): string[] {
  const blockRe = new RegExp(blockPattern);
  const count = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.tags) {
      if (blockRe.test(t)) continue;
      count.set(t, (count.get(t) ?? 0) + 1);
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
