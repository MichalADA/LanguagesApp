import type { ListeningManifest } from "./types";

export async function loadListeningManifest(signal?: AbortSignal): Promise<ListeningManifest> {
  const response = await fetch("/data/listening/hr-a1-dialogues.json", { signal });
  if (!response.ok) throw new Error(`Listening manifest HTTP ${response.status}`);
  const payload = await response.json() as ListeningManifest;
  if (payload.version !== 1 || payload.language !== "hr" || !payload.dialogues.length) {
    throw new Error("Unsupported or empty listening manifest");
  }
  return payload;
}
