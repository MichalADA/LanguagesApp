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

interface ChatOptions {
  signal?: AbortSignal;
  /** Wywoływane z całym dotychczasowym tekstem po każdym kawałku strumienia. */
  onText?: (soFar: string) => void;
  format?: object;
  /** Limit tokenów odpowiedzi. */
  maxTokens?: number;
}

async function post(settings: AssistantSettings, body: object, signal?: AbortSignal): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url(settings, "/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      // Model zostaje w pamięci między pytaniami — inaczej każde ładowanie to ~10 s.
      body: JSON.stringify({ model: settings.model, keep_alive: "30m", ...body }),
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new OllamaUnavailableError("Ollama is not reachable");
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Ollama HTTP ${response.status}: ${detail.slice(0, 200)}`);
  }
  return response;
}

/**
 * Odpowiedź modelu strumieniem (NDJSON z Ollamy) — tekst pokazujemy, zanim model skończy.
 * Zwraca całą surową treść.
 */
export async function chat(settings: AssistantSettings, messages: readonly ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const response = await post(
    settings,
    {
      messages,
      stream: true,
      format: options.format ?? RESPONSE_SCHEMA,
      options: { temperature: 0.6, num_predict: options.maxTokens ?? 160 },
    },
    options.signal,
  );
  if (!response.body) {
    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = done ? "" : lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (chunk.error) throw new Error(chunk.error);
      if (chunk.message?.content) {
        text += chunk.message.content;
        options.onText?.(text);
      }
    }
    if (done) return text;
  }
}

/**
 * Rozgrzewka: ładuje model do pamięci i przetwarza instrukcję systemową, zanim uczeń coś napisze
 * (Ollama trzyma przetworzony początek rozmowy i używa go przy następnym pytaniu).
 */
export async function warmUp(settings: AssistantSettings, messages: readonly ChatMessage[], signal?: AbortSignal): Promise<void> {
  await post(settings, { messages, stream: false, options: { num_predict: 1 } }, signal);
}
