import type { AssistantTurn, ChatMessage, Scenario } from "./types";

/** Tematy błędów = ściągi z /gramatyka (link pod poprawką). */
export const GRAMMAR_TOPICS = ["prezent", "padezi", "enklitike", "perfekt", "futur", "vid", "kondicional", "komparacija"] as const;

/**
 * Format odpowiedzi wymuszany przez Ollamę (`format` = JSON Schema → gramatyka dekodowania),
 * więc nawet mały model zwraca poprawny JSON z tymi polami.
 */
export const RESPONSE_SCHEMA = {
  type: "object",
  // Kolejność ma znaczenie: model generuje pola po kolei. Krótka poprawka najpierw (zwykle ""),
  // potem odpowiedź — ją pokazujemy na żywo. Tłumaczenie nie jest generowane (na CPU to +40% czasu);
  // dostaje się je na żądanie (TRANSLATION_SCHEMA).
  properties: {
    correction: { type: "string" },
    topic: { type: "string", enum: [...GRAMMAR_TOPICS, "none"] },
    reply: { type: "string" },
  },
  required: ["correction", "topic", "reply"],
} as const;

export const TRANSLATION_SCHEMA = {
  type: "object",
  properties: { translation: { type: "string" } },
  required: ["translation"],
} as const;

/**
 * Prośba o tłumaczenie doklejana na końcu tej samej rozmowy — wspólny początek promptu
 * zostaje w pamięci podręcznej Ollamy, więc ani tłumaczenie, ani następna odpowiedź nie czytają wszystkiego od nowa.
 */
export const TRANSLATE_REQUEST = 'Translate your last "reply" into Polish. Answer only with {"translation": "..."}.';

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
    "Answer only with the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Kwestia asystenta zapisana w historii tak, jak model ją zwraca — stały prefiks = cache promptu w Ollamie. */
export const serializeTurn = (turn: AssistantTurn) =>
  JSON.stringify({ correction: turn.correction, topic: turn.topic, reply: turn.reply });

export function openerTurn(scenario: Scenario): AssistantTurn {
  return { correction: "", topic: "none", reply: scenario.opener.hr, translation: scenario.opener.pl };
}

/** Odpowiedź modelu → AssistantTurn. Gdy JSON się nie uda (np. inny serwer), cały tekst traktujemy jako odpowiedź. */
/**
 * Wartość pola tekstowego z niepełnego JSON-a (strumień): `{"correction":"","topic":"none","reply":"Bok, ka`
 * → "Bok, ka". Null, dopóki pole się nie zaczęło.
 */
export function partialField(raw: string, key: string): string | null {
  const match = new RegExp(`"${key}"\\s*:\\s*"`).exec(raw);
  if (!match) return null;
  let out = "";
  for (let i = match.index + match[0].length; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '"') return out;
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    if (next === undefined) return out;
    if (next === "u") {
      const hex = raw.slice(i + 2, i + 6);
      if (hex.length < 4) return out;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 5;
      continue;
    }
    out += next === "n" ? "\n" : next === "t" ? "\t" : next;
    i += 1;
  }
  return out;
}

export function parseTranslation(raw: string): string {
  try {
    const data = JSON.parse(raw) as { translation?: unknown };
    return typeof data.translation === "string" ? data.translation.trim() : "";
  } catch {
    return partialField(raw, "translation")?.trim() ?? "";
  }
}

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
