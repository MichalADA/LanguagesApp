import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCourse } from "@/courses/CourseProvider";
import { parseDataset, topicTags } from "./adapter";
import type { VocabularyEntry } from "./types";

interface VocabularyState {
  entries: VocabularyEntry[];
  topics: string[];
  loading: boolean;
  error: string | null;
  /** Pełny adres datasetu aktywnego kursu — pokazywany w Ustawieniach. */
  datasetUrl: string;
}

const Ctx = createContext<VocabularyState>({
  entries: [],
  topics: [],
  loading: true,
  error: null,
  datasetUrl: "",
});

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const { course } = useCourse();
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const datasetUrl = `${import.meta.env.BASE_URL}${course.dataset.url}`;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(datasetUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((txt) => {
        if (!alive) return;
        setEntries(parseDataset(course, txt));
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setEntries([]);
        setError(e.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [course, datasetUrl]);

  const value = useMemo<VocabularyState>(
    () => ({
      entries,
      topics: topicTags(entries, course.dataset.blockTagPattern),
      loading,
      error,
      datasetUrl,
    }),
    [entries, loading, error, datasetUrl, course.dataset.blockTagPattern],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVocabulary() {
  return useContext(Ctx);
}
