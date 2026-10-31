import type { ListeningKind, ListeningLevel, ListeningManifest, ListeningSet } from "./types";

export const AVAILABLE_LISTENING_LEVELS = ["A1", "A2", "B1"] as const satisfies readonly ListeningLevel[];
export const LISTENING_KINDS = ["dialogues", "stories"] as const satisfies readonly ListeningKind[];

const DEFAULT_SPEAKERS: Record<string, string> = { ana: "Ana", marko: "Marko" };

export async function loadListeningManifest(level: ListeningLevel, signal?: AbortSignal, kind: ListeningKind = "dialogues"): Promise<ListeningSet> {
  if (!AVAILABLE_LISTENING_LEVELS.includes(level as (typeof AVAILABLE_LISTENING_LEVELS)[number])) {
    throw new Error(`Unsupported listening level: ${level}`);
  }
  const response = await fetch(`/data/listening/hr-${level.toLowerCase()}-${kind}.json`, { signal });
  if (!response.ok) throw new Error(`Listening manifest HTTP ${response.status}`);
  const payload = await response.json() as ListeningManifest;
  const items = (kind === "stories" ? payload.stories : payload.dialogues) ?? [];
  if (payload.version !== 1 || payload.language !== "hr" || !items.length || items.some(item => item.level !== level)) {
    throw new Error("Unsupported or empty listening manifest");
  }
  return { items, speakers: { ...DEFAULT_SPEAKERS, ...payload.speakers } };
}
