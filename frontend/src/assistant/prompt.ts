import type { AssistantTurn, ChatMessage, Scenario } from "./types";

/** Tematy błędów = ściągi z /gramatyka (link pod poprawką). */
export const GRAMMAR_TOPICS = ["prezent", "padezi", "enklitike", "perfekt", "futur", "vid", "kondicional", "komparacija"] as const;

/**
 * Format odpowiedzi wymuszany przez Ollamę (`format` = JSON Schema → gramatyka dekodowania),
 * więc nawet mały model zwraca poprawny JSON z tymi polami.
 */
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    correction: { type: "string" },
    topic: { type: "string", enum: [...GRAMMAR_TOPICS, "none"] },
    reply: { type: "string" },
    translation: { type: "string" },
  },
  required: ["correction", "topic", "reply", "translation"],
} as const;

/** Ile ostatnich wiadomości trafia do modelu — na CPU każdy token wejścia kosztuje czas. */
export const HISTORY_LIMIT = 16;

export interface PromptContext {
  level: string;
  scenario: Scenario;
  /** Słowa z bieżącego modułu kursu (chorwackie). */
  words: readonly string[];
}

/**
 * Instrukcja systemowa. Krótka (na CPU czytanie promptu to ~20 tokenów/s) i z twardymi regułami
 * przeciw formom serbskim — w teście gemma3:12b bez nich pisała „šta” i „sačekaću”.
 * Model nie tłumaczy gramatyki (małe modele zmyślają reguły) — tylko podaje poprawione zdanie,
 * a aplikacja linkuje do sprawdzonej ściągi.
 */
export function systemPrompt({ level, scenario, words }: PromptContext): string {
  return [
    `You are a friendly Croatian conversation partner for a Polish learner at CEFR level ${level}.`,
    `Scenario: ${scenario.brief}`,
    "Rules:",
    "- Write ONLY standard Croatian (ijekavian). Never Serbian or Bosnian forms: što (not šta), tko (not ko), tjedan, kruh, mlijeko, vlak, kava, future \"pričekat ću\" (not \"sačekaću\"), \"moram ići\" (not \"moram da idem\").",
    `- "reply": 1-2 short, simple sentences suited to level ${level}; usually end with a question so the conversation goes on. Stay in the scenario.`,
    words.length ? `- Prefer words the learner already knows: ${words.join(", ")}.` : "",
    '- "correction": if the learner\'s last message has a grammar or spelling mistake, the whole corrected sentence in Croatian, otherwise "". Do not explain the rule.',
    `- "topic": the grammar area of that mistake (${GRAMMAR_TOPICS.join(", ")}), or "none".`,
    '- "translation": the Polish translation of "reply".',
    "Answer only with the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Kwestia asystenta zapisana w historii tak, jak model ją zwraca — stały prefiks = cache promptu w Ollamie. */
export const serializeTurn = (turn: AssistantTurn) => JSON.stringify(turn);

export function openerTurn(scenario: Scenario): AssistantTurn {
  return { correction: "", topic: "none", reply: scenario.opener.hr, translation: scenario.opener.pl };
}

/** Odpowiedź modelu → AssistantTurn. Gdy JSON się nie uda (np. inny serwer), cały tekst traktujemy jako odpowiedź. */
export function parseTurn(raw: string): AssistantTurn {
  try {
    const data = JSON.parse(raw) as Partial<AssistantTurn>;
    if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("no reply");
    const topic = typeof data.topic === "string" && (GRAMMAR_TOPICS as readonly string[]).includes(data.topic) ? data.topic : "none";
    return {
      correction: typeof data.correction === "string" ? data.correction.trim() : "",
      topic,
      reply: data.reply.trim(),
      translation: typeof data.translation === "string" ? data.translation.trim() : "",
    };
  } catch {
    return { correction: "", topic: "none", reply: raw.trim(), translation: "" };
  }
}

/** Poprawka, która niczego nie zmienia (model czasem przepisuje zdanie bez zmian), nie jest poprawką. */
export function isRealCorrection(original: string, correction: string): boolean {
  const norm = (value: string) => value.toLowerCase().replace(/[.!?,;:„”"«»…]+/g, "").replace(/\s+/g, " ").trim();
  return Boolean(correction) && norm(original) !== norm(correction);
}

/** System + ostatnie wiadomości (zaczynając zawsze od kwestii asystenta albo ucznia — bez urwanej pary). */
export function buildMessages(system: string, history: readonly ChatMessage[]): ChatMessage[] {
  const recent = history.slice(-HISTORY_LIMIT);
  return [{ role: "system", content: system }, ...recent];
}
