/** Osoby czasu teraźniejszego. Kolejność jest kolejnością tabeli odmiany. */
export type PersonId = "ja" | "ti" | "on" | "mi" | "vi" | "oni";

export interface PersonDef {
  id: PersonId;
  /** Zaimek języka docelowego — pokazywany w tabeli odmiany. */
  pronoun: string;
  /** Etykieta pytania, wersalikami. */
  label: string;
}

export const PERSONS: readonly PersonDef[] = [
  { id: "ja", pronoun: "ja", label: "JA" },
  { id: "ti", pronoun: "ti", label: "TI" },
  { id: "on", pronoun: "on / ona / ono", label: "ON / ONA / ONO" },
  { id: "mi", pronoun: "mi", label: "MI" },
  { id: "vi", pronoun: "vi", label: "VI" },
  { id: "oni", pronoun: "oni / one / ona", label: "ONI / ONE / ONA" },
];

export function personDef(id: PersonId): PersonDef {
  return PERSONS.find((p) => p.id === id) ?? PERSONS[0];
}

export type VerbType = "irregular" | "irregular_or_difficult";

/**
 * Jeden czasownik z datasetu gramatycznego. Neutralny wobec języka —
 * mapowanie kolumn siedzi w kursie, tak samo jak przy słownictwie.
 */
export interface VerbEntry {
  /** `${courseId}:verb:${rank}` — stabilny klucz postępu. */
  id: string;
  courseId: string;
  rank: number;
  infinitive: string;
  translation: string;
  forms: Record<PersonId, string>;
  exampleTarget: string;
  exampleSource: string;
  type: VerbType;
  note: string;
  tags: string[];
  /** Czasownik z rdzenia języka — pula łatwego poziomu. */
  core: boolean;
}

/** Klucz postępu pojedynczej formy: czasownik + osoba. */
export function formKey(verbId: string, person: PersonId): string {
  return `${verbId}:${person}`;
}
