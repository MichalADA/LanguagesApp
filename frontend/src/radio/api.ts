import { normalizeStations } from "./helpers";
import type { RadioStation } from "./types";

export const STATIONS_URL = "https://de1.api.radio-browser.info/json/stations/search?countrycode=HR&hidebroken=true&order=votes&reverse=true&limit=20";
export const RADIO_USER_AGENT = "Lexodromia/0.1";

/** Browsers may override User-Agent (notably Chromium). No backend/proxy needed. */
export async function fetchCroatianStations(signal?: AbortSignal): Promise<RadioStation[]> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await fetch(STATIONS_URL, { signal: controller.signal, credentials: "omit",
      headers: { Accept: "application/json", "User-Agent": RADIO_USER_AGENT } });
    if (!response.ok) throw new Error(`Radio-Browser HTTP ${response.status}`);
    return normalizeStations(await response.json());
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
