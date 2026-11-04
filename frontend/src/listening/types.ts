/** Dialogi: Ana i Marko. Historie: narrator i postacie (lista mówiących w manifeście). */
export type ListeningSpeaker = string;
export type ListeningLevel = "A1" | "A2" | "B1";
/** Dialogi (krótkie rozmowy, jedno pytanie) albo Historie (opowiadania z narratorem, kilka pytań). */
export type ListeningKind = "dialogues" | "stories";

export interface ListeningLine {
  speaker: ListeningSpeaker;
  textHr: string;
  textPl: string;
  audioPath: string;
}

export interface ListeningOption {
  id: string;
  textPl: string;
}

export interface ListeningQuestion {
  promptPl: string;
  options: ListeningOption[];
  correctOptionId: string;
}

export interface ListeningGlossaryEntry {
  hr: string;
  pl: string;
}

export interface ListeningDialogue {
  id: string;
  level: ListeningLevel;
  titlePl: string;
  titleEn: string;
  topic: string;
  reviewStatus: "needs-native-review" | "reviewed";
  lines: ListeningLine[];
  /** Dialogi mają jedno pytanie… */
  question?: ListeningQuestion;
  /** …historie kilka. */
  questions?: ListeningQuestion[];
  /** Opcjonalny słowniczek (np. monologi A1). */
  glossary?: ListeningGlossaryEntry[];
}

export interface ListeningManifest {
  version: number;
  language: "hr";
  sourceLanguage: "pl";
  /** Imiona mówiących (historie). */
  speakers?: Record<string, string>;
  dialogues?: ListeningDialogue[];
  stories?: ListeningDialogue[];
}

/** Wczytany zestaw słuchanek jednego rodzaju i poziomu. */
export interface ListeningSet {
  items: ListeningDialogue[];
  speakers: Record<string, string>;
}

export function questionsOf(item: ListeningDialogue): ListeningQuestion[] {
  return item.questions ?? (item.question ? [item.question] : []);
}
