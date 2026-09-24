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
  /** Czy lekcja ma już pełną treść (w demo: tylko jedna). */
  hasContent?: boolean;
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

interface StepBase {
  id: string;
  stage: LessonStage;
}

export interface IntroStep extends StepBase {
  type: "intro";
  title: string;
  body: string;
  goals: string[];
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
  example: { target: string; source: string };
  /** Powiązane słowa pokazywane pod kartą. */
  related?: { target: string; source: string }[];
  note?: string;
}

export interface StructureStep extends StepBase {
  type: "structure";
  title: string;
  explanation: string;
  /** Pary „forma podstawowa → forma w konstrukcji”. */
  table: { label: string; rows: { base: string; form: string; meaning: string }[] }[];
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
  | SummaryStep;

export interface LessonContent {
  lessonId: string;
  /** Słowa, które lekcja wprowadza — trafiają na ekran podsumowania. */
  vocabulary: { target: string; source: string }[];
  steps: LessonStep[];
}
