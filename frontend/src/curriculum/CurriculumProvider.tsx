import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { useCourse } from "@/courses/CourseProvider";
import { useXp } from "@/xp/XpProvider";
import { lessonXp } from "@/xp/goals";
import { deriveLevel, type LevelView } from "./progress";
import { fetchCompletedLessons, fetchCourseOutline, fetchLessonContent, saveCompletedLessons } from "./repository";
import { enrollmentRefs, pendingLessonVocabulary, queueLessonVocabulary, syncLessonVocabulary } from "./srs";
import type { CefrLevelId, CourseOutline, LessonVocabularyItem } from "./types";

/**
 * Stan zapisu słów z lekcji w powtórkach FSRS:
 * - local   — gość: słowa czekają na tym urządzeniu,
 * - syncing — wysyłamy,
 * - saved   — backend potwierdził karty,
 * - pending — błąd sieci; ponowimy przy następnej okazji (albo przyciskiem).
 */
export type ReviewSyncState = "local" | "syncing" | "saved" | "pending";

const resolveVocabulary = (lessonId: string) => fetchLessonContent(lessonId).then((content) => content?.vocabulary ?? null);

interface CurriculumContextValue {
  status: "loading" | "ready" | "unavailable" | "error";
  outline: CourseOutline | null;
  completed: ReadonlySet<string>;
  /** Widok poziomu z wyliczonymi statusami; null, gdy poziom nie ma treści. */
  levelView: (levelId: CefrLevelId) => LevelView | null;
  /** Ukończenie lekcji: zapis postępu i (dla słów obowiązkowych) nowe karty FSRS. */
  completeLesson: (lessonId: string, vocabulary?: LessonVocabularyItem[]) => void;
  reviewSync: ReviewSyncState;
  /** Ponowna próba wysłania słów, które czekają na zapis w FSRS. */
  syncReviews: () => void;
  retry: () => void;
}

const CurriculumContext = createContext<CurriculumContextValue | null>(null);

function seedFrom(outline: CourseOutline): string[] {
  return outline.levels.flatMap((level) =>
    level.modules.flatMap((module) => module.lessons.filter((lesson) => lesson.status === "completed").map((lesson) => lesson.id)),
  );
}

export function CurriculumProvider({ children }: { children: ReactNode }) {
  const { course } = useCourse();
  const { user, status: authStatus, apiRequest } = useAuth();
  const owner = user?.id ?? "guest";
  const authenticated = authStatus === "authenticated";
  const { award } = useXp();
  const [reviewSync, setReviewSync] = useState<ReviewSyncState>(authenticated ? "saved" : "local");
  const key = `${owner}:${course.id}`;
  const syncKey = useRef(key);
  const [data, setData] = useState<{ key: string; outline: CourseOutline | null; completed: string[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setFailed(null);
    Promise.all([fetchCourseOutline(course.id), fetchCompletedLessons(owner, course.id)])
      .then(([outline, stored]) => {
        if (!alive) return;
        setData({ key, outline, completed: stored ?? (outline ? seedFrom(outline) : []) });
      })
      .catch(() => {
        if (alive) setFailed(key);
      });
    return () => {
      alive = false;
    };
  }, [course.id, owner, key, attempt]);

  const current = data?.key === key ? data : null;
  const completed = useMemo(() => new Set(current?.completed ?? []), [current]);

  const levelView = useCallback(
    (levelId: CefrLevelId) => {
      const level = current?.outline?.levels.find((item) => item.id === levelId);
      return level && level.available && level.modules.length ? deriveLevel(level, completed) : null;
    },
    [current, completed],
  );

  const syncReviews = useCallback(() => {
    if (!authenticated) {
      setReviewSync("local");
      return;
    }
    const requestKey = key;
    syncKey.current = key;
    if (!pendingLessonVocabulary(owner, course.id).length) {
      setReviewSync("saved");
      return;
    }
    setReviewSync("syncing");
    void syncLessonVocabulary(apiRequest, owner, course.id, resolveVocabulary).then((result) => {
      if (syncKey.current === requestKey) setReviewSync(result.pending ? "pending" : "saved");
    });
  }, [authenticated, key, owner, course.id, apiRequest]);

  // Po zalogowaniu i przy każdym wejściu: dosyłamy to, czego nie udało się zapisać wcześniej.
  useEffect(() => {
    syncReviews();
    if (!authenticated) return;
    const online = () => syncReviews();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [syncReviews, authenticated]);

  const completeLesson = useCallback(
    (lessonId: string, vocabulary?: LessonVocabularyItem[]) => {
      // Najpierw zapis lokalny (przetrwa odświeżenie i brak sieci), potem wysyłka do FSRS.
      if (vocabulary && enrollmentRefs(vocabulary).length) {
        queueLessonVocabulary(owner, course.id, lessonId, vocabulary);
        syncReviews();
      }
      // XP za zaliczenie — tylko pierwsze (reguła „raz na lekcję” w backendzie i w księdze gościa).
      const kind = current?.outline?.levels.flatMap((l) => l.modules.flatMap((m) => m.lessons)).find((l) => l.id === lessonId)?.kind;
      void award({ courseId: course.id, source: "lesson", sourceId: lessonId, xp: lessonXp(kind) }).catch(() => undefined);
      setData((prev) => {
        if (!prev || prev.key !== key || prev.completed.includes(lessonId)) return prev;
        const next = [...prev.completed, lessonId];
        void saveCompletedLessons(owner, course.id, next);
        return { ...prev, completed: next };
      });
    },
    [key, owner, course.id, syncReviews, award, current],
  );

  const value = useMemo<CurriculumContextValue>(
    () => ({
      status: failed === key ? "error" : !current ? "loading" : current.outline ? "ready" : "unavailable",
      outline: current?.outline ?? null,
      completed,
      levelView,
      completeLesson,
      reviewSync,
      syncReviews,
      retry: () => setAttempt((n) => n + 1),
    }),
    [failed, key, current, completed, levelView, completeLesson, reviewSync, syncReviews],
  );

  return <CurriculumContext.Provider value={value}>{children}</CurriculumContext.Provider>;
}

export function useCurriculum(): CurriculumContextValue {
  const value = useContext(CurriculumContext);
  if (!value) throw new Error("useCurriculum must be used inside CurriculumProvider");
  return value;
}
