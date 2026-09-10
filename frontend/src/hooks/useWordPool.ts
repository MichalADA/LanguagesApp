import { useMemo } from "react";
import type { PoolSelection } from "@/progress/types";
import type { VocabularyEntry } from "@/vocabulary/types";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { isDifficult, isLearned, needsReview, statFor } from "@/progress/service";
import { useCourse } from "@/courses/CourseProvider";
import { entriesForLevel } from "@/config/learningLevels";

/**
 * Wspólne dla wszystkich gier: zamienia wybór użytkownika na listę słów.
 * Żadna gra nie filtruje słownika samodzielnie.
 */
export function useWordPool(selection: PoolSelection): VocabularyEntry[] {
  const { entries } = useVocabulary();
  const { state, courseId } = useProgress();
  const { course } = useCourse();

  return useMemo(() => {
    let pool = entries;
    const { source, topic } = selection;

    switch (source.kind) {
      case "level": {
        pool = entriesForLevel(pool, source.level, course.blocks);
        break;
      }
      case "block":
        pool = pool.filter((e) => e.block === source.block);
        break;
      case "learned":
        pool = pool.filter((e) => isLearned(statFor(state, courseId, e)));
        break;
      case "difficult":
        pool = pool.filter((e) => isDifficult(statFor(state, courseId, e)));
        break;
      case "mistakes":
        pool = pool.filter((e) => needsReview(statFor(state, courseId, e)));
        break;
      case "all":
      default:
        break;
    }

    if (topic) pool = pool.filter((e) => e.tags.includes(topic));
    return pool;
  }, [entries, state, courseId, selection, course.blocks]);
}

export const DEFAULT_POOL: PoolSelection = { source: { kind: "all" }, topic: null };
