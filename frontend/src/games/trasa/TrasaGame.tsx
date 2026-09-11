import { useCallback, useEffect, useMemo, useState } from "react";
import type { CourseRoute } from "@/courses/types";
import type { JourneyProgress, PoolSelection } from "@/progress/types";
import type { VocabularyEntry } from "@/vocabulary/types";
import type { Verdict } from "@/services/validation";
import { checkAnswer } from "@/services/validation";
import { useCourse } from "@/courses/CourseProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useWordPool, DEFAULT_POOL } from "@/hooks/useWordPool";
import { PoolPicker } from "@/components/PoolPicker";
import { AnswerInput } from "@/components/AnswerInput";
import { RouteMap } from "@/components/maps/RouteMap";
import { useI18n } from "@/i18n";
import { useLearningSession } from "@/learning/useLearningSession";
import { sample } from "@/utils/random";

export const TRASA_ID = "trasa";

type Phase = "menu" | "playing" | "arrived" | "finished";

function emptyJourney(): JourneyProgress {
  return { stopIndex: 0, answersInLeg: 0, correct: 0, incorrect: 0 };
}

/**
 * Trasa — spokojne przeciwieństwo Bury. Bez zegara i bez żyć: liczy się tylko
 * to, ile poprawnych odpowiedzi dzieli cię od następnego miasta. Postęp podróży
 * przeżywa odświeżenie strony, bo siedzi w tym samym WordProgress co reszta.
 */
export function TrasaGame() {
  const { t, locale } = useI18n();
  const { course } = useCourse();
  const { loading } = useVocabulary();
  const { current, recordRound, saveJourney, rememberActivity } = useProgress();
  const {
    start: startLearning,
    record: recordLearning,
    finish: finishLearning,
  } = useLearningSession({ gameType: "trasa" });

  const route: CourseRoute | undefined = course.routes[0];

  const [selection, setSelection] = useState<PoolSelection>(
    current.lastActivity?.gameId === TRASA_ID ? current.lastActivity.pool : DEFAULT_POOL,
  );
  const pool = useWordPool(selection);

  const stored = route ? (current.journeys[route.id] ?? emptyJourney()) : emptyJourney();
  const [journey, setJourney] = useState<JourneyProgress>(stored);
  const [phase, setPhase] = useState<Phase>("menu");
  const [entry, setEntry] = useState<VocabularyEntry | null>(null);
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  // Postęp wczytuje się asynchronicznie — dopóki stoimy w menu, bierzemy zapis z dysku.
  const storedKey = route ? JSON.stringify(current.journeys[route.id] ?? null) : null;
  useEffect(() => {
    if (!route || phase !== "menu") return;
    const saved = current.journeys[route.id];
    if (saved) setJourney(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedKey, phase, route]);

  const drawNext = useCallback(
    (from: VocabularyEntry[]) => {
      const candidates = from.length > 1 && entry ? from.filter((e) => e.id !== entry.id) : from;
      setEntry(sample(candidates, 1)[0] ?? null);
      setTyped("");
      setVerdict(null);
    },
    [entry],
  );

  const persist = useCallback(
    (next: JourneyProgress) => {
      if (!route) return;
      setJourney(next);
      saveJourney(route.id, next);
    },
    [route, saveJourney],
  );

  const start = useCallback(() => {
    if (!route || pool.length === 0) return;
    rememberActivity(TRASA_ID, selection);
    startLearning(course.id);
    setPhase("playing");
    drawNext(pool);
  }, [route, pool, rememberActivity, selection, startLearning, course.id, drawNext]);

  const submit = useCallback(() => {
    if (!route || !entry || verdict) return;
    const { verdict: v } = checkAnswer(course, entry, typed, { lenient: false });
    setVerdict(v);
    recordLearning({ wordRef: entry.id, answer: typed.trim(), correct: v !== "miss" });

    // Każda odpowiedź od razu ląduje we wspólnym postępie słowa.
    recordRound({
      gameId: TRASA_ID,
      answered: [{ entry, verdict: v }],
      activity: { gameId: TRASA_ID, pool: selection, at: Date.now() },
    });

    if (v === "miss") {
      persist({ ...journey, incorrect: journey.incorrect + 1 });
      return;
    }

    const answersInLeg = journey.answersInLeg + 1;
    const correct = journey.correct + 1;

    if (answersInLeg >= route.answersPerLeg) {
      const stopIndex = journey.stopIndex + 1;
      const done = stopIndex >= route.stops.length - 1;
      const next: JourneyProgress = {
        stopIndex,
        answersInLeg: 0,
        correct,
        incorrect: journey.incorrect,
        completedAt: done ? Date.now() : journey.completedAt,
      };
      persist(next);
      void finishLearning();
      if (done) {
        recordRound({ gameId: TRASA_ID, score: correct, bestStreak: 0, answered: [] });
        setPhase("finished");
      } else {
        setPhase("arrived");
      }
      return;
    }

    persist({ ...journey, answersInLeg, correct });
  }, [
    route,
    entry,
    verdict,
    course,
    typed,
    recordLearning,
    finishLearning,
    recordRound,
    selection,
    journey,
    persist,
  ]);

  const restart = useCallback(() => {
    persist(emptyJourney());
    startLearning(course.id);
    setPhase("playing");
    drawNext(pool);
  }, [persist, startLearning, course.id, drawNext, pool]);

  const accuracy = useMemo(() => {
    const total = journey.correct + journey.incorrect;
    return total ? Math.round((journey.correct / total) * 100) : 0;
  }, [journey]);

  // Enter przechodzi do następnego słowa, tak samo jak w Burze.
  useEffect(() => {
    if (phase !== "playing" || !verdict) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        drawNext(pool);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, verdict, drawNext, pool]);

  if (loading) return <span className="loading">{t("common.loading")}</span>;
  if (!route) return <div className="panel empty">{t("games.notReady")}</div>;

  const stops = route.stops;
  const currentStop = stops[Math.min(journey.stopIndex, stops.length - 1)];
  const nextStop = stops[Math.min(journey.stopIndex + 1, stops.length - 1)];
  const legProgress = journey.answersInLeg / route.answersPerLeg;
  const remaining = route.answersPerLeg - journey.answersInLeg;

  const map = (
    <RouteMap
      route={route}
      stopIndex={journey.stopIndex}
      legProgress={legProgress}
      labels={{
        here: t("trasa.currentCity"),
        visited: t("trasa.visited"),
        ahead: t("trasa.ahead"),
      }}
    />
  );

  const stats = (
    <div className="grid grid-3 journey-stats">
      <div className="stat">
        <span className="stat-value">{journey.correct}</span>
        <span className="stat-label">{t("trasa.correct")}</span>
      </div>
      <div className="stat">
        <span className="stat-value">{journey.incorrect}</span>
        <span className="stat-label">{t("trasa.incorrect")}</span>
      </div>
      <div className="stat">
        <span className="stat-value">{accuracy}%</span>
        <span className="stat-label">{t("trasa.accuracy")}</span>
      </div>
    </div>
  );

  if (phase === "menu") {
    return (
      <div className="stack" style={{ gap: 24 }}>
        {map}
        <PoolPicker value={selection} onChange={setSelection} poolSize={pool.length} />
        <div className="row" style={{ gap: 16 }}>
          <button type="button" className="btn" onClick={start} disabled={pool.length === 0}>
            {journey.correct > 0 ? t("common.continue") : t("trasa.startJourney")}
          </button>
          <span className="stat-note">{t("trasa.noTimer")}</span>
        </div>
        {journey.correct > 0 && stats}
      </div>
    );
  }

  if (phase === "arrived" || phase === "finished") {
    const finished = phase === "finished";
    return (
      <div className="stack" style={{ gap: 22 }}>
        {map}
        <div className="panel result-card">
          <span className="eyebrow">{t("trasa.eyebrow")}</span>
          <span className="arrival-title">
            {finished ? t("trasa.finished") : t("trasa.arrived", { city: currentStop.name })}
          </span>
          <span className="muted" style={{ fontSize: 16 }}>
            {finished ? t("trasa.finishedNote") : t("trasa.arrivedNote")}
          </span>
          {stats}
          <div className="row" style={{ gap: 10, justifyContent: "center", marginTop: 6 }}>
            {finished ? (
              <button type="button" className="btn" onClick={restart}>
                {t("trasa.restart")}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  startLearning(course.id);
                  setPhase("playing");
                  drawNext(pool);
                }}
              >
                {t("trasa.onward")}
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => setPhase("menu")}>
              {t("game.changePool")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      {map}

      <div className="hud">
        <span className="mono dim">
          {t("trasa.checkpoint", { current: journey.stopIndex + 1, total: stops.length })}
        </span>
        <span className="mono muted">
          {t("trasa.legProgress", { done: journey.answersInLeg, need: route.answersPerLeg })}
        </span>
      </div>

      <div className="bar">
        <span style={{ width: `${legProgress * 100}%`, transition: "width .3s ease" }} />
      </div>

      <div className="arena">
        <span className="eyebrow">{entry?.partOfSpeech}</span>
        <span className="prompt">{entry?.sourceText}</span>

        {!verdict ? (
          <div className="stack" style={{ alignItems: "center", gap: 12, width: "100%" }}>
            <AnswerInput
              value={typed}
              onChange={setTyped}
              onSubmit={submit}
              placeholder={t("game.placeholder", { language: course.targetName[locale] })}
              characters={course.specialCharacters}
              focusKey={entry?.id}
            />
            <button
              type="button"
              className="btn"
              style={{ padding: "10px 22px", fontSize: 14 }}
              onClick={submit}
            >
              {t("game.check")} ⏎
            </button>
            <span className="stat-note">
              {t("trasa.nextIn", { n: remaining, city: nextStop.name })}
            </span>
          </div>
        ) : (
          <div className="stack" style={{ alignItems: "center", gap: 14, width: "100%" }}>
            <span
              className="eyebrow"
              style={{ color: verdict === "miss" ? "var(--bad)" : "var(--good)" }}
            >
              {verdict === "miss" ? (typed ? t("game.wrong") : t("game.timeUp")) : t("game.correct")}
            </span>
            <span className="answer">{entry?.targetText}</span>
            <span className="muted" style={{ fontSize: 14 }}>
              {entry?.grammar}
            </span>
            <div className="example">
              <div className="example-hr">{entry?.exampleTarget}</div>
              <div className="example-pl">{entry?.exampleSource}</div>
            </div>
            {entry?.falseFriendNote && <div className="note-warn">⚠ {entry.falseFriendNote}</div>}
            <button type="button" className="btn" onClick={() => drawNext(pool)}>
              {t("trasa.keepGoing")} ⏎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
