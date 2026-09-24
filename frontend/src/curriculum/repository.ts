import type { CourseOutline, LessonContent } from "./types";
import { PL_HR_OUTLINE } from "./data/a1";

/**
 * Warstwa dostępu do danych kursu. DZIŚ: mock w pamięci.
 *
 * Podłączenie backendu = podmiana ciał tych funkcji, np.:
 *   fetchCourseOutline → GET /curriculum/:courseId            (CourseOutline)
 *   fetchLessonContent → GET /curriculum/lessons/:lessonId     (LessonContent)
 *   fetchCompletedLessons / saveLessonCompletion → GET/POST /curriculum/progress
 * Funkcje są już asynchroniczne, więc komponenty mają stany ładowania
 * i błędu i nie wymagają zmian. Dla zalogowanych można przekazać
 * `apiRequest` z useAuth — tak jak robią to fiszki i powtórki.
 */

const OUTLINES: Record<string, CourseOutline> = {
  "pl-hr": PL_HR_OUTLINE,
};

const LESSON_LOADERS: Record<string, () => Promise<LessonContent>> = {
  "a1-01-02": () => import("./data/lessons/a1-01-02").then((m) => m.LESSON_A1_01_02),
};

export async function fetchCourseOutline(courseId: string): Promise<CourseOutline | null> {
  return OUTLINES[courseId] ?? null;
}

export async function fetchLessonContent(lessonId: string): Promise<LessonContent | null> {
  const load = LESSON_LOADERS[lessonId];
  return load ? load() : null;
}

/* ---------- Postęp: lokalnie, per profil i kurs ---------- */

const PROGRESS_KEY = "lexodromia.curriculum.v1";

interface StoredProgress {
  completed: string[];
}

const keyFor = (owner: string, courseId: string) => `${PROGRESS_KEY}.${owner}.${courseId}`;

/** Zwraca null, gdy profil nie ma jeszcze zapisu — wtedy obowiązuje seed z danych. */
export async function fetchCompletedLessons(owner: string, courseId: string): Promise<string[] | null> {
  try {
    const raw = localStorage.getItem(keyFor(owner, courseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProgress;
    return Array.isArray(parsed.completed) ? parsed.completed.filter((id) => typeof id === "string") : null;
  } catch {
    return null;
  }
}

export async function saveCompletedLessons(owner: string, courseId: string, completed: string[]): Promise<void> {
  try {
    localStorage.setItem(keyFor(owner, courseId), JSON.stringify({ completed } satisfies StoredProgress));
  } catch {
    // Brak dostępu do storage (tryb prywatny) — postęp zostaje w pamięci sesji.
  }
}
