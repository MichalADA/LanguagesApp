import type { ListeningLesson, ListeningSource, ListeningSourceWithUnits } from "./types";

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE_URL = (configuredBaseUrl || "/api").replace(/\/+$/, "");

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export function fetchSources(signal?: AbortSignal): Promise<ListeningSource[]> {
  return getJson<ListeningSource[]>("/listening/sources", signal);
}

export function fetchSourceWithUnits(slug: string, signal?: AbortSignal): Promise<ListeningSourceWithUnits> {
  return getJson<ListeningSourceWithUnits>(`/listening/sources/${slug}/units`, signal);
}

export function fetchLesson(id: string, signal?: AbortSignal): Promise<ListeningLesson> {
  return getJson<ListeningLesson>(`/listening/lessons/${id}`, signal);
}
