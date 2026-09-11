export type ListeningSourceType = "TAKO_LAKO" | "USER_UPLOAD" | "PODCAST" | "VIDEO" | "YOUTUBE";

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
  sourceUrl: string | null;
  transcript: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  unit: ListeningUnit & { source: ListeningSource };
}
