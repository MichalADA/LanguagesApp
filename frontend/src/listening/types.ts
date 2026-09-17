export type ListeningSpeaker = "ana" | "marko";
export type ListeningLevel = "A1" | "A2" | "B1";

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

export interface ListeningDialogue {
  id: string;
  level: ListeningLevel;
  titlePl: string;
  titleEn: string;
  topic: string;
  reviewStatus: "needs-native-review" | "reviewed";
  lines: ListeningLine[];
  question: {
    promptPl: string;
    options: ListeningOption[];
    correctOptionId: string;
  };
}

export interface ListeningManifest {
  version: number;
  language: "hr";
  sourceLanguage: "pl";
  dialogues: ListeningDialogue[];
}
