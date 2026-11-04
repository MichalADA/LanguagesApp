import type { ChoiceStep, CourseModule, CourseOutline, GapStep, LessonContent, TranslateStep } from "./types";

/**
 * Test poziomujący: moduły po kolei (A1 → A2 → B1), z każdego trzy zadania wzięte z jego lekcji
 * (dwa wybory słówek i jedno do wpisania). Moduł zaliczony przy 2 z 3. Pierwszy niezaliczony
 * moduł kończy test — od niego zaczynasz kurs; wszystkie wcześniejsze lekcje są oznaczane jako ukończone.
 */
export type PlacementQuestion = ChoiceStep | GapStep | TranslateStep;

export const QUESTIONS_PER_MODULE = 3;
export const MODULE_PASS = 2;

export interface PlacementModule {
  module: CourseModule;
  levelId: string;
}

/** Moduły całego kursu w kolejności nauki (tylko poziomy z treścią). */
export function placementModules(outline: CourseOutline): PlacementModule[] {
  return outline.levels
    .filter((level) => level.available && level.modules.length)
    .flatMap((level) => level.modules.map((module) => ({ module, levelId: level.id })));
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Dwa pytania z wyborem i jedno do wpisania (luka, a gdy jej brak — tłumaczenie). */
export function pickModuleQuestions(contents: readonly (LessonContent | null)[], random: () => number = Math.random): PlacementQuestion[] {
  const steps = contents.flatMap((content) => (content && content.mode !== "test" ? content.steps : [])).filter((step) => !step.optional);
  const choices = shuffle(steps.filter((step): step is ChoiceStep => step.type === "choice"), random);
  const gaps = shuffle(steps.filter((step): step is GapStep => step.type === "gap"), random);
  const translations = shuffle(steps.filter((step): step is TranslateStep => step.type === "translate"), random);
  const typed = [...gaps, ...translations];
  const picked: PlacementQuestion[] = [...choices.slice(0, QUESTIONS_PER_MODULE - 1), ...typed.slice(0, 1)];
  // Za mało wyborów → dobieramy zadania do wpisania (i odwrotnie), żeby zawsze były trzy.
  for (const extra of [...typed.slice(1), ...choices.slice(QUESTIONS_PER_MODULE - 1)]) {
    if (picked.length >= QUESTIONS_PER_MODULE) break;
    picked.push(extra);
  }
  return picked;
}

/** Wynik modułu jest przesądzony, zanim padną wszystkie pytania (2 dobre albo 2 złe). */
export function moduleVerdict(correct: number, answered: number, total = QUESTIONS_PER_MODULE): "pass" | "fail" | null {
  const needed = Math.min(MODULE_PASS, total);
  if (correct >= needed) return "pass";
  if (correct + (total - answered) < needed) return "fail";
  return null;
}

/** Lekcje do oznaczenia jako ukończone: wszystkie z zaliczonych modułów. */
export function placementLessons(passed: readonly PlacementModule[]): string[] {
  return passed.flatMap((item) => item.module.lessons.map((lesson) => lesson.id));
}
