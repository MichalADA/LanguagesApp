import type { Course } from "@/courses/types";
import { splitRow } from "@/vocabulary/adapter";
import type { PersonId, VerbEntry, VerbType } from "./types";
import { PERSONS } from "./types";

/**
 * Adapter datasetu gramatycznego → VerbEntry.
 * Tak jak przy słownictwie: kolumny czytamy po nazwach z nagłówka, wg mapowania
 * z kursu, więc kolejność kolumn w pliku może się zmienić.
 */
export function parseVerbDataset(course: Course, text: string): VerbEntry[] {
  const config = course.grammar;
  if (!config) return [];

  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = splitRow(lines[0]).map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const col = config.columns;

  const map = {
    rank: idx(col.rank),
    infinitive: idx(col.infinitive),
    translation: idx(col.translation),
    exampleTarget: idx(col.exampleTarget),
    exampleSource: idx(col.exampleSource),
    type: idx(col.type),
    note: idx(col.note),
    tags: idx(col.tags),
  };

  if (map.infinitive < 0) {
    throw new Error(
      `Dataset gramatyczny kursu ${course.id} nie ma kolumny ${col.infinitive}. Nagłówek: ${header.join(", ")}`,
    );
  }

  const personCols = PERSONS.map((p) => ({ id: p.id, at: idx(col.persons[p.id]) }));
  const at = (cols: string[], i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");
  const out: VerbEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    const infinitive = at(cols, map.infinitive);
    if (!infinitive) continue;

    const forms = {} as Record<PersonId, string>;
    let complete = true;
    for (const p of personCols) {
      const value = at(cols, p.at);
      if (!value) complete = false;
      forms[p.id] = value;
    }
    if (!complete) continue;

    const rank = Number(at(cols, map.rank)) || i;
    const tags = at(cols, map.tags).split(/\s+/).filter(Boolean);
    const rawType = at(cols, map.type);
    const type: VerbType = rawType === "irregular" ? "irregular" : "irregular_or_difficult";

    out.push({
      id: `${course.id}:verb:${rank}`,
      courseId: course.id,
      rank,
      infinitive,
      translation: at(cols, map.translation),
      forms,
      exampleTarget: at(cols, map.exampleTarget),
      exampleSource: at(cols, map.exampleSource),
      type,
      note: at(cols, map.note),
      tags,
      core: tags.includes(config.coreTag),
    });
  }

  return out.sort((a, b) => a.rank - b.rank);
}
