import type { AssistantSettings } from "./types";

const KEY = "lexodromia.assistant.v1";

export const DEFAULT_SETTINGS: AssistantSettings = {
  provider: "ollama",
  baseUrl: "http://localhost:11434",
  model: "gemma3:12b",
};

export function readSettings(): AssistantSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AssistantSettings>;
    return {
      provider: "ollama",
      baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl.trim() ? parsed.baseUrl.trim() : DEFAULT_SETTINGS.baseUrl,
      model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model.trim() : DEFAULT_SETTINGS.model,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: AssistantSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Tryb prywatny — ustawienia zostają tylko w pamięci.
  }
}
