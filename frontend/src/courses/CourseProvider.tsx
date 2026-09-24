import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Course } from "./types";
import { COURSES, DEFAULT_COURSE_ID, findCourse } from "./registry";

const ACTIVE_KEY = "lexodromia.activeCourse";
const COURSE_CHOSEN_KEY = "lexodromia.courseChosen";

interface CourseApi {
  course: Course;
  courses: Course[];
  hasChosenCourse: boolean;
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
  const [hasChosenCourse, setHasChosenCourse] = useState(() => {
    try {
      return localStorage.getItem(COURSE_CHOSEN_KEY) === "true";
    } catch {
      return false;
    }
  });

  const setCourse = useCallback((next: string) => {
    if (!findCourse(next)) return;
    setId(next);
    setHasChosenCourse(true);
    try {
      localStorage.setItem(ACTIVE_KEY, next);
      localStorage.setItem(COURSE_CHOSEN_KEY, "true");
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo<CourseApi>(
    () => ({ course: findCourse(id) ?? COURSES[0], courses: COURSES, hasChosenCourse, setCourse }),
    [hasChosenCourse, id, setCourse],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourse(): CourseApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCourse musi być wewnątrz <CourseProvider>");
  return ctx;
}
