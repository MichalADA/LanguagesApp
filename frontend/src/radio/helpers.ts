import type { RadioFilter, RadioStation } from "./types";

export function httpUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export function normalizeStations(data: unknown): RadioStation[] {
  if (!Array.isArray(data)) throw new Error("Invalid station response");
  const seen = new Set<string>();
  const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
  return data.flatMap((value): RadioStation[] => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const id = text(row.stationuuid), name = text(row.name), stream = httpUrl(row.url_resolved);
    if (text(row.countrycode).toUpperCase() !== "HR" || row.lastcheckok !== 1 || !id || !name || !stream || seen.has(id)) return [];
    seen.add(id);
    return [{ stationuuid: id, name, url_resolved: stream, homepage: httpUrl(row.homepage), favicon: httpUrl(row.favicon),
      tags: [...new Set(text(row.tags).split(",").map(tag => tag.trim().toLowerCase()).filter(Boolean))],
      state: text(row.state), language: text(row.language), codec: text(row.codec), bitrate: number(row.bitrate), votes: number(row.votes),
      countrycode: "HR", lastcheckok: 1 }];
  });
}

export function filterStations(stations: readonly RadioStation[], query: string, filter: RadioFilter): RadioStation[] {
  const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return stations.filter(station => fold(station.name).includes(fold(query.trim())) && (filter === "all" || station.tags.some(tag =>
    (filter === "talk" ? /talk|news|vijesti|spoken|informativ/ : /music|glazba|muzika|pop|rock|dance|folk|jazz|electronic|hits|hip.?hop|classical|zabavn/).test(tag))));
}
