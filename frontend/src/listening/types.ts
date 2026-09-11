export type ListeningSourceType = "TAKO_LAKO" | "USER_UPLOAD" | "PODCAST" | "VIDEO" | "YOUTUBE";

export type ListeningContentStatus =
  | "NOT_IMPORTED"
  | "IMPORTED"
  | "PARTIAL"
  | "FAILED"
  | "UNAVAILABLE";

export type ListeningContentBlockType =
  | "HEADING"
  | "PARAGRAPH"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "TRANSCRIPT"
  | "EXERCISE"
  | "NOTE";

export interface ListeningContentBlock {
  id: string;
  lessonId: string;
  type: ListeningContentBlockType;
  position: number;
  text: string | null;
  url: string | null;
  metadataJson: string | null;
}

export interface ListeningSource {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sourceUrl: string | null;
  license: string | null;
  attribution: string | null;
  type: ListeningSourceType;
  createdAt: string;
  updatedAt: string;
}

export interface ListeningLessonSummary {
  id: string;
  title: string;
  position: number;
  sourceUrl: string | null;
}

export interface ListeningUnit {
  id: string;
  sourceId: string;
  title: string;
  level: string | null;
  position: number;
  sourceUrl: string | null;
  unitNumber: number | null;
  moduleNumber: number | null;
  lessons: ListeningLessonSummary[];
}

export interface ListeningSourceWithUnits {
  source: ListeningSource;
  units: ListeningUnit[];
}

export interface ListeningLesson {
  id: string;
  unitId: string;
  title: string;
  position: number;
  lessonNumber: number | null;
  sourceUrl: string | null;
  transcript: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  grammarUrl: string | null;
  vocabularyUrl: string | null;
  pronunciationUrl: string | null;
  contentStatus: ListeningContentStatus;
  contentImportedAt: string | null;
  contentNote: string | null;
  unit: ListeningUnit & { source: ListeningSource };
  blocks: ListeningContentBlock[];
}
