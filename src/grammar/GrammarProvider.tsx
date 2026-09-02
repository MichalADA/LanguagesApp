import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCourse } from "@/courses/CourseProvider";
import { parseVerbDataset } from "./adapter";
import type { VerbEntry } from "./types";

interface GrammarState {
  verbs: VerbEntry[];
  loading: boolean;
  error: string | null;
  /** Czy aktywny kurs w ogóle ma dataset gramatyczny. */
  available: boolean;
  datasetUrl: string;
}

const EMPTY: GrammarState = {
  verbs: [],
  loading: false,
  error: null,
  available: false,
  datasetUrl: "",
};

const Ctx = createContext<GrammarState>(EMPTY);

/**
 * Dataset gramatyczny aktywnego kursu. Osobny plik i osobny provider, bo
 * gramatyka ma inny kształt niż słownictwo — gry słownikowe nic o niej nie wiedzą.
 */
export function GrammarProvider({ children }: { children: ReactNode }) {
  const { course } = useCourse();
  const config = course.grammar;
  const datasetUrl = config ? `${import.meta.env.BASE_URL}${config.url}` : "";

  const [verbs, setVerbs] = useState<VerbEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(config));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) {
      setVerbs([]);
      setLoading(false);
      setError(null);
      return;
    }
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
        setVerbs(parseVerbDataset(course, txt));
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setVerbs([]);
        setError(e.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [course, config, datasetUrl]);

  const value = useMemo<GrammarState>(
    () => ({ verbs, loading, error, available: Boolean(config), datasetUrl }),
    [verbs, loading, error, config, datasetUrl],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGrammar(): GrammarState {
  return useContext(Ctx);
}
