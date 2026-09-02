import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCourse } from "@/courses/CourseProvider";
import { useAuth } from "@/auth/useAuth";
import { emptyProgress, LocalProgressRepository, progressStorageKey } from "./repository";
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
  storageKey: string | null;
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
  const { status, user } = useAuth();
  const [state, setState] = useState<ProgressState>(emptyProgress);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);

  const owner = status === "authenticated" && user
    ? `user.${user.id}`
    : status === "guest"
      ? "guest"
      : null;
  const storageKey = owner ? progressStorageKey(owner) : null;
  const repository = useMemo(
    () => storageKey ? new LocalProgressRepository(storageKey, owner === "guest") : null,
    [storageKey, owner],
  );

  useEffect(() => {
    dirty.current = false;
    setState(emptyProgress());
    setReady(false);
    if (!repository) return;
    let active = true;
    void repository.load().then((loaded) => {
      if (!active) return;
      setState(loaded);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (!ready || !dirty.current || !repository) return;
    const t = setTimeout(() => void repository.save(state), 250);
    return () => clearTimeout(t);
  }, [state, ready, repository]);

  const mutate = useCallback((fn: (s: ProgressState) => ProgressState) => {
    dirty.current = true;
    setState(fn);
  }, []);

  const courseId = course.id;

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      courseId,
      storageKey,
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
        if (repository) void repository.clear();
        setState(emptyProgress());
      },
    }),
    [state, ready, mutate, courseId, storageKey, repository],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress musi być wewnątrz <ProgressProvider>");
  return ctx;
}
