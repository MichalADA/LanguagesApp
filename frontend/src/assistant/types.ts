/** Gdzie działa model. Dziś: Ollama na komputerze użytkownika; „claude” (przez backend) — kolejny krok. */
export type AssistantProvider = "ollama";

export interface AssistantSettings {
  provider: AssistantProvider;
  /** Adres Ollamy — domyślnie ta sama maszyna. */
  baseUrl: string;
  model: string;
}

/** Odpowiedź asystenta (wymuszony format JSON). */
export interface AssistantTurn {
  /** Poprawione zdanie ucznia; pusty, gdy nie było błędu. */
  correction: string;
  /** Temat błędu (id ściągi z /gramatyka) albo "none". */
  topic: string;
  /** Odpowiedź po chorwacku. */
  reply: string;
  /** Tłumaczenie odpowiedzi na polski. */
  translation: string;
}

/** Wiadomość w historii przekazywanej modelowi (format Ollama /api/chat). */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Scenario {
  id: string;
  /** Opis dla modelu (po angielsku — tak model najlepiej trzyma się instrukcji). */
  brief: string;
  /** Pierwsza kwestia asystenta — gotowa, żeby rozmowa ruszyła bez czekania na model. */
  opener: { hr: string; pl: string };
}
