import type { ListeningLevel, ListeningManifest } from "./types";

export const AVAILABLE_LISTENING_LEVELS = ["A1", "A2"] as const satisfies readonly ListeningLevel[];

export async function loadListeningManifest(level: ListeningLevel, signal?: AbortSignal): Promise<ListeningManifest> {
  if (!AVAILABLE_LISTENING_LEVELS.includes(level as (typeof AVAILABLE_LISTENING_LEVELS)[number])) {
    throw new Error(`Unsupported listening level: ${level}`);
  }
  const response = await fetch(`/data/listening/hr-${level.toLowerCase()}-dialogues.json`, { signal });
  if (!response.ok) throw new Error(`Listening manifest HTTP ${response.status}`);
  const payload = await response.json() as ListeningManifest;
  if (payload.version !== 1 || payload.language !== "hr" || !payload.dialogues.length || payload.dialogues.some(item => item.level !== level)) {
    throw new Error("Unsupported or empty listening manifest");
  }
  return payload;
}
