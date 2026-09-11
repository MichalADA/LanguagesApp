import { useT } from "@/i18n";
import { fetchAllProgress } from "@/reviews/api";
import { toggleDifficult } from "@/flashcards/flashcardsApi";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useCourse } from "@/courses/CourseProvider";
import { useAuth } from "@/auth/useAuth";
import {
  emptyProgress,
  LocalProgressRepository,
  progressStorageKey,
} from "./repository";
import {
  applyGrammarRound,
  applyRound,
  courseProgress,
  setJourney,
  statFor,
} from "./service";
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
  syncError?: boolean;
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
  const t = useT();
  const { status, user, apiRequest } = useAuth();
  const [state, setState] = useState<ProgressState>(emptyProgress);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);
  const [server, setServer] = useState<{
    key: string;
    items: Awaited<ReturnType<typeof fetchAllProgress>>;
  } | null>(null);
  const [syncError, setSyncError] = useState(false);
  const accountKey = `${user?.id}:${course.id}`;
  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true,
      timer: ReturnType<typeof setTimeout>;
    let requestNumber = 0;
    const refresh = async () => {
      const number = ++requestNumber;
      try {
        const items = await fetchAllProgress(apiRequest, course.id);
        if (alive && number === requestNumber) {
          setServer({ key: accountKey, items });
          setSyncError(false);
        }
      } catch {
        if (alive && number === requestNumber) setSyncError(true);
      }
    };
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 500);
    };
    void refresh();
    window.addEventListener("review-updated", update);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("review-updated", update);
    };
  }, [status, accountKey, apiRequest, course.id]);

  const owner =
    status === "authenticated" && user
      ? `user.${user.id}`
      : status === "guest"
        ? "guest"
        : null;
  const storageKey = owner ? progressStorageKey(owner) : null;
  const repository = useMemo(
    () =>
      storageKey
        ? new LocalProgressRepository(storageKey, owner === "guest")
        : null,
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

  const displayState = useMemo(() => {
    if (status !== "authenticated") return state;
    const cp = {
      ...courseProgress(state, courseId),
      words: {},
      forms: {},
    } as CourseProgress;
    for (const row of server?.key === accountKey ? server.items : []) {
      const value = {
        attempts: row.correctAnswers + row.wrongAnswers,
        correctAnswers: row.correctAnswers,
        incorrectAnswers: row.wrongAnswers,
        lastSeen: Date.parse(row.lastReviewedAt ?? row.firstSeenAt),
        lastCorrect: 0,
        currentStreak: 0,
        difficulty: row.difficultyScore,
        markedDifficult: row.markedDifficult,
        reviewStatus:
          row.status === "DIFFICULT" ? ("LEARNING" as const) : row.status,
        nextReview: row.nextReviewAt ? Date.parse(row.nextReviewAt) : 0,
      };
      if (row.itemType === "WORD") cp.words[row.wordRef] = value;
      if (row.itemType === "VERB") {
        const parts = row.wordRef.split(":");
        const person = parts.pop()!;
        cp.forms[row.wordRef] = {
          ...value,
          verbId: parts.join(":"),
          person,
          label: row.wordRef,
        };
      }
    }
    return { ...state, courses: { ...state.courses, [courseId]: cp } };
  }, [state, status, server, accountKey, courseId]);

  const api = useMemo<ProgressApi>(
    () => ({
      state: displayState,
      courseId,
      storageKey,
      current: courseProgress(displayState, courseId),
      ready:
        ready && (status !== "authenticated" || server?.key === accountKey),
      syncError,
      statOf: (entry) => statFor(displayState, courseId, entry),
      recordRound: (result) =>
        mutate((s) => applyRound(s, { ...result, courseId })),
      recordGrammarRound: (result) =>
        mutate((s) => applyGrammarRound(s, { ...result, courseId })),
      saveJourney: (routeId, journey) =>
        mutate((s) => setJourney(s, courseId, routeId, journey)),
      rememberActivity: (gameId, pool) =>
        mutate((s) => {
          const cp = { ...courseProgress(s, courseId) };
          cp.lastActivity = { gameId, pool, at: Date.now() };
          return { ...s, courses: { ...s.courses, [courseId]: cp } };
        }),
      toggleFlag: (entry) => {
        if (status === "authenticated") {
          void toggleDifficult(apiRequest, {
            course: courseId,
            wordRef: entry.id,
            markedDifficult: !statFor(displayState, courseId, entry)
              .markedDifficult,
          })
            .then(() => window.dispatchEvent(new Event("review-updated")))
            .catch(() => setSyncError(true));
          return;
        }
        mutate((s) => {
          const cp = { ...courseProgress(s, courseId) };
          const prev = statFor(s, courseId, entry);
          cp.words = {
            ...cp.words,
            [entry.id]: { ...prev, markedDifficult: !prev.markedDifficult },
          };
          return { ...s, courses: { ...s.courses, [courseId]: cp } };
        });
      },
      updateSettings: (patch) =>
        mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      reset: () => {
        dirty.current = true;
        if (repository) void repository.clear();
        setState(emptyProgress());
      },
    }),
    [
      state,
      displayState,
      ready,
      mutate,
      courseId,
      storageKey,
      repository,
      status,
      server,
      accountKey,
      syncError,
      apiRequest,
    ],
  );

  return (
    <Ctx.Provider value={api}>
      {status === "authenticated" && syncError && (
        <div className="panel panel-pad" role="alert">
          <p>{t("reviews.error")}</p>
          <button
            className="btn-ghost"
            onClick={() => window.dispatchEvent(new Event("review-updated"))}
          >
            {t("reviews.retry")}
          </button>
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
}

export function useProgress(): ProgressApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress musi być wewnątrz <ProgressProvider>");
  return ctx;
}
