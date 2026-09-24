import type { CourseOutline } from "../types";
import { HR_A1_MODULES } from "./hr-a1/outline";

/**
 * Ścieżka kursu polski → chorwacki.
 *
 * A1 (8 modułów × 5 lekcji) pochodzi z CSV: curriculum/hr-a1/lexodromia_hr_A1_curriculum.csv,
 * wygenerowanego do src/curriculum/data/hr-a1/ przez `npm run curriculum:a1`.
 * Treści edytujesz w CSV i didactics.json — nie w wygenerowanych plikach.
 */
export const PL_HR_OUTLINE: CourseOutline = {
  courseId: "pl-hr",
  levels: [
    { id: "A1", title: "Podstawy", available: true, modules: HR_A1_MODULES },
    { id: "A2", title: "Codzienna komunikacja", available: false, modules: [] },
    { id: "B1", title: "Samodzielna komunikacja", available: false, modules: [] },
    { id: "B2", title: "Swobodna komunikacja", available: false, modules: [] },
  ],
};
