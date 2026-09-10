import type { UiLocale } from "@/i18n/types";

/** Kod języka wg ISO 639-1. Nie ograniczamy się do listy — kursy dokładamy danymi. */
export type LanguageCode = string;

export type WritingSystem = "latin" | "cyrillic" | "greek" | "other";

/** Reguły porównywania odpowiedzi. Każdy kurs może mieć własne. */
export interface ValidationRules {
  /** Wielkość liter bez znaczenia. */
  caseInsensitive: boolean;
  /** Przytnij białe znaki z obu stron i zwiń wielokrotne spacje. */
  trimWhitespace: boolean;
  /**
   * Czy znaki diakrytyczne mają znaczenie. Dla chorwackiego: TAK.
   * Gdy true, odpowiedź bez diakrytyków może być uznana za częściową ("almost"),
   * ale nigdy za pełne trafienie.
   */
  diacriticsMatter: boolean;
  /**
   * Mapa upraszczająca znaki, używana wyłącznie do wykrycia „prawie".
   * Dla cyrylicy w przyszłości można tu wpisać transliterację.
   */
  foldMap?: Record<string, string>;
}

/**
 * Skąd i jak czytać dane kursu. Nazwy kolumn są cechą DATASETU, nie aplikacji —
 * dlatego mapowanie siedzi w kursie, a nie w parserze.
 */
export interface DatasetConfig {
  url: string;
  format: "csv-semicolon";
  columns: {
    rank: string;
    source: string;
    target: string;
    /** Opcjonalna kolumna: tablica JSON poprawnych wariantów. */
    acceptedAnswers?: string;
    partOfSpeech: string;
    grammar: string;
    exampleTarget: string;
    exampleSource: string;
    falseFriend: string;
    falseFriendNote: string;
    tags: string;
    /** Opcjonalna kolumna z nagraniem — dziś nieużywana. */
    audioUrl?: string;
  };
  /** Wzorzec tagu wyznaczającego blok nauki. */
  blockTagPattern: string;
}

/**
 * Dataset gramatyczny kursu — tabele odmiany. Kurs bez tej sekcji po prostu
 * nie oferuje gier gramatycznych.
 */
export interface GrammarDatasetConfig {
  url: string;
  format: "csv-semicolon";
  columns: {
    rank: string;
    infinitive: string;
    translation: string;
    /** Nazwa kolumny dla każdej osoby czasu teraźniejszego. */
    persons: Record<"ja" | "ti" | "on" | "mi" | "vi" | "oni", string>;
    exampleTarget: string;
    exampleSource: string;
    type: string;
    note: string;
    tags: string;
  };
  /** Tag wyznaczający pulę „łatwego" poziomu. */
  coreTag: string;
}

export interface CourseBlock {
  id: string;
  /** Etykieta niezależna od języka UI, np. "1–500". */
  range: string;
  noteKey?: string;
}

export interface Course {
  id: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  /** Nazwa kursu w językach interfejsu. */
  name: Record<UiLocale, string>;
  /** Nazwa języka docelowego w nim samym. */
  nativeName: string;
  /** Nazwa języka źródłowego w językach interfejsu — do zdań typu „z polskiego". */
  sourceName: Record<UiLocale, string>;
  targetName: Record<UiLocale, string>;
  flag: string;
  writingSystem: WritingSystem;
  /** Znaki dokładane paskiem pod polem odpowiedzi. */
  specialCharacters: string[];
  validation: ValidationRules;
  dataset: DatasetConfig;
  /** Opcjonalny dataset odmiany — używa go gra Odmiana. */
  grammar?: GrammarDatasetConfig;
  blocks: CourseBlock[];
  /** Trasy dla gry Trasa. Kurs bez tras po prostu jej nie oferuje. */
  routes: CourseRoute[];
  status: "available" | "planned";
}

export interface RouteStop {
  id: string;
  name: string;
  /** Pozycja na stylizowanej mapie, w układzie viewBox 0–320 × 0–200. */
  x: number;
  y: number;
}

export interface CourseRoute {
  id: string;
  name: Record<UiLocale, string>;
  /** Ile poprawnych odpowiedzi dzieli dwa przystanki. */
  answersPerLeg: number;
  stops: RouteStop[];
}
