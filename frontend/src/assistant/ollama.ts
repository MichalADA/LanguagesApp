import type { AssistantSettings, ChatMessage } from "./types";
import { RESPONSE_SCHEMA } from "./prompt";

/**
 * Klient Ollamy wołany wprost z przeglądarki (http://localhost:11434). Ollama domyślnie wpuszcza
 * strony z localhost; inną domenę trzeba dopisać w OLLAMA_ORIGINS.
 */
const url = (settings: AssistantSettings, path: string) => `${settings.baseUrl.replace(/\/+$/, "")}${path}`;

export class OllamaUnavailableError extends Error {}

/** Lista zainstalowanych modeli — przy okazji sprawdza, czy Ollama w ogóle działa. */
export async function listModels(settings: AssistantSettings, signal?: AbortSignal): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(url(settings, "/api/tags"), { signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new OllamaUnavailableError("Ollama is not reachable");
  }
  if (!response.ok) throw new OllamaUnavailableError(`Ollama HTTP ${response.status}`);
  const data = (await response.json()) as { models?: { name: string }[] };
  return (data.models ?? []).map((model) => model.name);
}

/** Jedna odpowiedź modelu (bez strumienia — czekamy na cały obiekt JSON). Zwraca surową treść. */
export async function chat(settings: AssistantSettings, messages: readonly ChatMessage[], signal?: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url(settings, "/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream: false,
        format: RESPONSE_SCHEMA,
        // Model zostaje w pamięci między pytaniami — inaczej każde ładowanie to ~10 s.
        keep_alive: "30m",
        options: { temperature: 0.6, num_predict: 220 },
      }),
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new OllamaUnavailableError("Ollama is not reachable");
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Ollama HTTP ${response.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await response.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}
