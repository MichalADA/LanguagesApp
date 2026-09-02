import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Course } from "./types";
import { COURSES, DEFAULT_COURSE_ID, findCourse } from "./registry";

const ACTIVE_KEY = "lexodromia.activeCourse";

interface CourseApi {
  course: Course;
  courses: Course[];
  setCourse: (id: string) => void;
}

const Ctx = createContext<CourseApi | null>(null);

function readStored(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? DEFAULT_COURSE_ID;
  } catch {
    return DEFAULT_COURSE_ID;
  }
}

export function CourseProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string>(() => (findCourse(readStored()) ? readStored() : DEFAULT_COURSE_ID));

  const setCourse = useCallback((next: string) => {
    if (!findCourse(next)) return;
    setId(next);
    try {
      localStorage.setItem(ACTIVE_KEY, next);
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo<CourseApi>(
    () => ({ course: findCourse(id) ?? COURSES[0], courses: COURSES, setCourse }),
    [id, setCourse],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourse(): CourseApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCourse musi być wewnątrz <CourseProvider>");
  return ctx;
}
