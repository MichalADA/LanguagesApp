import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCourse } from "@/courses/CourseProvider";
import { emptyProgress, progressRepository } from "./repository";
import { applyGrammarRound, applyRound, courseProgress, setJourney, statFor } from "./service";
import type { GrammarRoundResult, RoundResult } from "./service";
import type {
  CourseProgress,
  GameplaySettings,
  JourneyProgress,
  PoolSelection,
  ProgressState,
} from "./types";
import type { VocabularyEntry } from "@/vocabulary/types";

interface ProgressApi {
  state: ProgressState;
  /** Postęp aktywnego kursu — najczęściej to wystarcza. */
  current: CourseProgress;
  courseId: string;
  ready: boolean;
  statOf: (entry: VocabularyEntry) => ReturnType<typeof statFor>;
  recordRound: (result: Omit<RoundResult, "courseId">) => void;
  /** Zapis rundy gry gramatycznej — postęp per forma (czasownik + osoba). */
  recordGrammarRound: (result: Omit<GrammarRoundResult, "courseId">) => void;
  saveJourney: (routeId: string, journey: JourneyProgress) => void;
  rememberActivity: (gameId: string, pool: PoolSelection) => void;
  toggleFlag: (entry: VocabularyEntry) => void;
  updateSettings: (patch: Partial<GameplaySettings>) => void;
  reset: () => void;
}

const Ctx = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { course } = useCourse();
  const [state, setState] = useState<ProgressState>(emptyProgress);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    progressRepository.load().then((loaded) => {
      setState(loaded);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    const t = setTimeout(() => void progressRepository.save(state), 250);
    return () => clearTimeout(t);
  }, [state, ready]);

  const mutate = useCallback((fn: (s: ProgressState) => ProgressState) => {
    dirty.current = true;
    setState(fn);
  }, []);

  const courseId = course.id;

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      courseId,
      current: courseProgress(state, courseId),
      ready,
      statOf: (entry) => statFor(state, courseId, entry),
      recordRound: (result) => mutate((s) => applyRound(s, { ...result, courseId })),
      recordGrammarRound: (result) =>
        mutate((s) => applyGrammarRound(s, { ...result, courseId })),
      saveJourney: (routeId, journey) => mutate((s) => setJourney(s, courseId, routeId, journey)),
      rememberActivity: (gameId, pool) =>
        mutate((s) => {
          const cp = { ...courseProgress(s, courseId) };
          cp.lastActivity = { gameId, pool, at: Date.now() };
          return { ...s, courses: { ...s.courses, [courseId]: cp } };
        }),
      toggleFlag: (entry) =>
        mutate((s) => {
          const cp = { ...courseProgress(s, courseId) };
          const prev = statFor(s, courseId, entry);
          cp.words = {
            ...cp.words,
            [entry.id]: { ...prev, markedDifficult: !prev.markedDifficult },
          };
          return { ...s, courses: { ...s.courses, [courseId]: cp } };
        }),
      updateSettings: (patch) => mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      reset: () => {
        dirty.current = true;
        void progressRepository.clear();
        setState(emptyProgress());
      },
    }),
    [state, ready, mutate, courseId],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress musi być wewnątrz <ProgressProvider>");
  return ctx;
}
