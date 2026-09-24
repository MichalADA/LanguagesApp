/**
 * Model kursu (ścieżki nauki A1 → B2). Celowo niezależny od gier i FSRS:
 * kurs to uporządkowana progresja, trening to osobny świat.
 *
 * Kształt odpowiada temu, czego spodziewamy się z przyszłego API, więc
 * podmiana mocka na backend nie wymaga zmian w komponentach.
 */

export type CefrLevelId = "A1" | "A2" | "B1" | "B2";

/** Status zapisany w danych (mock / backend). */
export type StoredLessonStatus = "completed" | "not_started";

/** Status widoczny w UI — wyliczany z postępu, nie przechowywany. */
export type LessonStatus = "completed" | "current" | "available" | "locked";

export type ModuleStatus = "completed" | "in_progress" | "not_started" | "locked";

export interface CourseLesson {
  id: string;
  moduleId: string;
  /** Kolejność w module, od 1. */
  order: number;
  title: string;
  shortDescription: string;
  estimatedMinutes: number;
  status: StoredLessonStatus;
  /** Czy lekcja ma już pełną treść. */
  hasContent?: boolean;
  /** Rodzaj lekcji: zwykła, powtórka modułu, rozmowa integrująca, test poziomu. */
  kind?: LessonKind;
  /** Metadane źródła (CSV) — nie są pokazywane w playerze. */
  source?: LessonSourceMeta;
}

export type LessonKind = "lesson" | "review" | "conversation" | "spiral" | "test";

export interface LessonSourceMeta {
  /** lesson_id z CSV, np. "a1-02". */
  lessonId: string;
  grammarFocus: string;
  communicativeGoal: string;
  /** source_url — metadane researchowe (audyt treści), nie do UI. */
  sources: string[];
}

export interface CourseModule {
  id: string;
  levelId: CefrLevelId;
  /** Numer modułu w poziomie, od 1. */
  order: number;
  title: string;
  description: string;
  /** „Po tym module potrafisz…” — krótkie, konkretne umiejętności. */
  canDo: string[];
  lessons: CourseLesson[];
}

export interface CourseLevel {
  id: CefrLevelId;
  title: string;
  available: boolean;
  modules: CourseModule[];
}

/** Cała ścieżka dla jednego kursu językowego (np. pl-hr). */
export interface CourseOutline {
  courseId: string;
  levels: CourseLevel[];
}

/* ---------- Treść lekcji ---------- */

/** Etapy lekcji — pokazywane w nagłówku playera. */
export type LessonStage = "intro" | "words" | "structure" | "practice" | "dialog" | "summary";

export const LESSON_STAGES: LessonStage[] = ["intro", "words", "structure", "practice", "dialog", "summary"];

export interface DialogLine {
  speaker: string;
  text: string;
  translation: string;
}

/** Sekcje testu poziomu — liczone osobno w wyniku. */
export type TestSection = "vocabulary" | "reading" | "listening" | "grammar" | "translation" | "production";

export const TEST_SECTIONS: TestSection[] = ["vocabulary", "reading", "listening", "grammar", "translation", "production"];

/** Zdanie w dwóch językach — wspólny kształt przykładów i poleceń. */
export interface Bilingual {
  target: string;
  source: string;
}

interface StepBase {
  id: string;
  stage: LessonStage;
  /** Tylko w trybie testu: sekcja, do której liczy się wynik kroku. */
  section?: TestSection;
  /** Polecenie po chorwacku (z CSV), pokazywane nad instrukcją. */
  instructionTarget?: Bilingual;
}

export interface IntroStep extends StepBase {
  type: "intro";
  title: string;
  body: string;
  goals: string[];
  /** Nagłówek listy celów; domyślnie „Po tej lekcji”. */
  goalsTitle?: string;
}

/** Krótki dialog do przeczytania / wysłuchania — kontekst przed nauką. */
export interface ListenStep extends StepBase {
  type: "listen";
  title: string;
  lines: DialogLine[];
  note?: string;
}

export interface WordStep extends StepBase {
  type: "word";
  target: string;
  source: string;
  partOfSpeech?: string;
  example?: { target: string; source: string };
  /** Powiązane słowa pokazywane pod kartą. */
  related?: { target: string; source: string }[];
  note?: string;
}

export interface StructureStep extends StepBase {
  type: "structure";
  title: string;
  explanation: string;
  /** Pary „forma podstawowa → forma w konstrukcji”. */
  table?: { label: string; rows: { base: string; form: string; meaning: string }[] }[];
  /** Przykładowe zdania z lekcji ilustrujące wzorzec. */
  examples?: Bilingual[];
  note?: string;
}

export interface ChoiceStep extends StepBase {
  type: "choice";
  instruction: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface TranslateStep extends StepBase {
  type: "translate";
  instruction: string;
  prompt: string;
  accepted: string[];
  hint?: string;
}

export interface GapStep extends StepBase {
  type: "gap";
  instruction: string;
  before: string;
  after: string;
  accepted: string[];
  translation: string;
  hint?: string;
}

export interface DialogStep extends StepBase {
  type: "dialog";
  title: string;
  /** Tury rozmowy — `reply` oznacza, że użytkownik odpowiada. */
  turns: (
    | { kind: "line"; line: DialogLine }
    | { kind: "reply"; prompt: string; accepted: string[]; pattern?: string; suggestion: string }
  )[];
}

export interface FreeResponseStep extends StepBase {
  type: "free";
  instruction: string;
  points: string[];
  /** Słowa kluczowe, po których dajemy łagodną informację zwrotną. */
  keywords: { any: string[]; label: string }[];
  minSentences: number;
  sample: string;
}

export interface SummaryStep extends StepBase {
  type: "summary";
  title: string;
  recap: string[];
  /** „Po tym module potrafisz” — w powtórkach modułów. */
  canDo?: string[];
  /** Zdanie zamykające test (z CSV). */
  closing?: Bilingual;
}

/** Ułóż zdanie z rozsypanych słów. */
export interface OrderStep extends StepBase {
  type: "order";
  instruction: string;
  translation: string;
  tokens: string[];
  accepted: string[];
}

export interface ComprehensionQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
}

/** Krótki tekst + pytania na rozumienie. */
export interface ReadingStep extends StepBase {
  type: "reading";
  instruction: string;
  title: string;
  text: Bilingual[];
  questions: ComprehensionQuestion[];
}

/** Dialog do odsłuchania (nagranie lub TTS) + pytania. */
export interface ListeningStep extends StepBase {
  type: "listening";
  instruction: string;
  title: string;
  lines: (DialogLine & { audio?: string })[];
  questions: ComprehensionQuestion[];
}

/** Zwarta lista słów — np. słownictwo pomocnicze w powtórce. */
export interface VocabListStep extends StepBase {
  type: "vocabList";
  title: string;
  note?: string;
  items: (Bilingual & { partOfSpeech?: string })[];
}

export type LessonStep =
  | IntroStep
  | ListenStep
  | WordStep
  | StructureStep
  | ChoiceStep
  | TranslateStep
  | GapStep
  | DialogStep
  | FreeResponseStep
  | SummaryStep
  | OrderStep
  | ReadingStep
  | ListeningStep
  | VocabListStep;

/** Słowo z lekcji — materiał do przyszłych powtórek (FSRS). */
export interface LessonVocabularyItem {
  target: string;
  source: string;
  lemma?: string;
  partOfSpeech?: string;
  /** record_id z CSV. */
  recordId?: string;
}

export interface LessonContent {
  lessonId: string;
  /** Zwykła lekcja albo test poziomu (osobny wynik per sekcja). */
  mode?: "lesson" | "test";
  /** Słowa, które lekcja wprowadza — trafiają na ekran podsumowania. */
  vocabulary: LessonVocabularyItem[];
  steps: LessonStep[];
}

/** Rekord CSV zachowany 1:1 (poza source_url, który jest na poziomie lekcji). */
export interface CurriculumRecord {
  recordId: string;
  type: "lesson" | "vocabulary" | "sentence" | "exercise_blueprint";
  sequence: number;
  hr: string;
  pl: string;
  lemma: string;
  partOfSpeech: string;
  exerciseType: string;
  acceptedAnswers: string[];
  notes: string;
  tags: string[];
  /** Tylko gdy różni się od źródeł lekcji. */
  sources?: string[];
}

/** Pełny materiał lekcji z CSV — do audytu, FSRS i przyszłego panelu admina. */
export interface LessonMaterial {
  sourceLessonId: string;
  grammarFocus: string;
  communicativeGoal: string;
  sources: string[];
  records: CurriculumRecord[];
}

/** Lekcja wygenerowana z CSV: treść dla playera + pełny materiał źródłowy. */
export interface GeneratedLesson {
  content: LessonContent;
  material: LessonMaterial;
}
