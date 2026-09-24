import type { CourseLesson, CourseLevel, CourseModule, LessonStatus, ModuleStatus } from "./types";

export interface LessonView {
  lesson: CourseLesson;
  status: LessonStatus;
  /** Numer lekcji w całym poziomie (1–40). */
  number: number;
}

export interface ModuleView {
  module: CourseModule;
  status: ModuleStatus;
  lessons: LessonView[];
  completedCount: number;
  minutes: number;
  percent: number;
}

export interface LevelView {
  level: CourseLevel;
  modules: ModuleView[];
  total: number;
  completedCount: number;
  completedModules: number;
  percent: number;
  /** Pozostały szacowany czas nauki w minutach. */
  minutesLeft: number;
  current: { lesson: LessonView; module: ModuleView } | null;
}

/**
 * Statusy wyliczamy z listy ukończonych lekcji, nigdy ich nie zapisujemy:
 * - completed — lekcja ukończona,
 * - current   — pierwsza nieukończona lekcja w kolejności kursu,
 * - available — pozostałe lekcje bieżącego i wcześniejszych modułów,
 * - locked    — lekcje w modułach po bieżącym (widoczne, ale jeszcze zamknięte).
 */
export function deriveLevel(level: CourseLevel, completed: ReadonlySet<string>): LevelView {
  const flat = level.modules.flatMap((module) => module.lessons);
  const currentLesson = flat.find((lesson) => !completed.has(lesson.id)) ?? null;
  const currentModuleOrder = currentLesson
    ? level.modules.find((module) => module.id === currentLesson.moduleId)!.order
    : Infinity;

  let number = 0;
  const modules: ModuleView[] = level.modules.map((module) => {
    const lessons: LessonView[] = module.lessons.map((lesson) => {
      number += 1;
      let status: LessonStatus;
      if (completed.has(lesson.id)) status = "completed";
      else if (lesson.id === currentLesson?.id) status = "current";
      else if (module.order <= currentModuleOrder) status = "available";
      else status = "locked";
      return { lesson, status, number };
    });
    const completedCount = lessons.filter((row) => row.status === "completed").length;
    let status: ModuleStatus;
    if (completedCount === lessons.length) status = "completed";
    else if (module.order === currentModuleOrder || completedCount > 0) status = "in_progress";
    else if (module.order < currentModuleOrder) status = "not_started";
    else status = "locked";
    return {
      module,
      status,
      lessons,
      completedCount,
      minutes: module.lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0),
      percent: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
    };
  });

  const total = flat.length;
  const completedCount = flat.filter((lesson) => completed.has(lesson.id)).length;
  let current: LevelView["current"] = null;
  for (const module of modules) {
    const lesson = module.lessons.find((row) => row.status === "current");
    if (lesson) current = { lesson, module };
  }

  return {
    level,
    modules,
    total,
    completedCount,
    completedModules: modules.filter((module) => module.status === "completed").length,
    percent: total ? Math.round((completedCount / total) * 100) : 0,
    minutesLeft: flat.filter((lesson) => !completed.has(lesson.id)).reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0),
    current,
  };
}

/** Lekcja następna po podanej w kolejności poziomu (albo null na końcu). */
export function nextLessonId(level: CourseLevel, lessonId: string): string | null {
  const flat = level.modules.flatMap((module) => module.lessons);
  const index = flat.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 && index < flat.length - 1 ? flat[index + 1].id : null;
}

/** „około 55 min” / „około 1 h 5 min” — czas bez udawanej precyzji. */
export function splitMinutes(minutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}
