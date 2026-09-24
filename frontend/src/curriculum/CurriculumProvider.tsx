import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { useCourse } from "@/courses/CourseProvider";
import { deriveLevel, type LevelView } from "./progress";
import { fetchCompletedLessons, fetchCourseOutline, saveCompletedLessons } from "./repository";
import type { CefrLevelId, CourseOutline } from "./types";

interface CurriculumContextValue {
  status: "loading" | "ready" | "unavailable" | "error";
  outline: CourseOutline | null;
  completed: ReadonlySet<string>;
  /** Widok poziomu z wyliczonymi statusami; null, gdy poziom nie ma treści. */
  levelView: (levelId: CefrLevelId) => LevelView | null;
  completeLesson: (lessonId: string) => void;
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
  const { user } = useAuth();
  const owner = user?.id ?? "guest";
  const key = `${owner}:${course.id}`;
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

  const completeLesson = useCallback(
    (lessonId: string) => {
      setData((prev) => {
        if (!prev || prev.key !== key || prev.completed.includes(lessonId)) return prev;
        const next = [...prev.completed, lessonId];
        void saveCompletedLessons(owner, course.id, next);
        return { ...prev, completed: next };
      });
    },
    [key, owner, course.id],
  );

  const value = useMemo<CurriculumContextValue>(
    () => ({
      status: failed === key ? "error" : !current ? "loading" : current.outline ? "ready" : "unavailable",
      outline: current?.outline ?? null,
      completed,
      levelView,
      completeLesson,
      retry: () => setAttempt((n) => n + 1),
    }),
    [failed, key, current, completed, levelView, completeLesson],
  );

  return <CurriculumContext.Provider value={value}>{children}</CurriculumContext.Provider>;
}

export function useCurriculum(): CurriculumContextValue {
  const value = useContext(CurriculumContext);
  if (!value) throw new Error("useCurriculum must be used inside CurriculumProvider");
  return value;
}
