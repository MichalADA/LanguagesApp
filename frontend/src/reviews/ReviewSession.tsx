import { createEventId } from "@/utils/eventId";
import {
  startLearningSession,
  finishLearningSession,
} from "@/learning/learningApi";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { useCourse } from "@/courses/CourseProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useGrammar } from "@/grammar/GrammarProvider";
import { useI18n } from "@/i18n";
import { loadSentences } from "@/sentences/loader";
import { fetchDue, submitReview, type ReviewAnswer } from "./api";
import {
  createReviewTasks,
  isReviewCorrect,
  repeatAfterError,
  type ReviewTask,
} from "./tasks";

export function ReviewSession() {
  const { course } = useCourse();
  return <Session key={course.id} />;
}
function Session() {
  const { t, locale } = useI18n(),
    { apiRequest, status } = useAuth(),
    { course } = useCourse();
  const { entries, loading: vocabLoading, error: vocabError } = useVocabulary(),
    { verbs, loading: grammarLoading, error: grammarError } = useGrammar();
  const [queue, setQueue] = useState<ReviewTask[]>([]),
    [index, setIndex] = useState(0),
    [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<
    "loading" | "play" | "done" | "empty" | "error"
  >("loading");
  const [feedback, setFeedback] = useState<boolean | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [correct, setCorrect] = useState(0),
    [wrong, setWrong] = useState(0);
  const [saving, setSaving] = useState(false),
    [unavailable, setUnavailable] = useState(0);
  const busy = useRef(false),
    pending = useRef<ReviewAnswer | null>(null),
    started = useRef(Date.now()),
    failures = useRef(new Map<string, number>());
  const inFlight = useRef<Promise<unknown>>(Promise.resolve());
  const [finishing, setFinishing] = useState(false),
    [finishError, setFinishError] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const task = queue[index];
  useEffect(() => {
    if (status !== "authenticated" || vocabLoading || grammarLoading) return;
    if (vocabError || grammarError) {
      setPhase("error");
      return;
    }
    let alive = true;
    setPhase("loading");
    Promise.all([
      fetchDue(apiRequest, course.id),
      course.id === "pl-hr" ? loadSentences() : Promise.resolve([]),
    ])
      .then(async ([items, sentences]) => {
        if (!alive) return;
        const tasks = createReviewTasks(items, entries, verbs, sentences);
        setUnavailable(items.length - tasks.length);
        if (tasks.length) {
          const session = await startLearningSession(apiRequest, course.id);
          if (!alive) {
            await finishLearningSession(apiRequest, session.id);
            return;
          }
          sessionRef.current = session.id;
        }
        setQueue(tasks);
        setIndex(0);
        setCorrect(0);
        setWrong(0);
        setFeedback(null);
        setAnswer("");
        setError(false);
        pending.current = null;
        failures.current.clear();
        started.current = Date.now();
        setPhase(tasks.length ? "play" : "empty");
      })
      .catch(() => {
        if (alive) setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, [
    apiRequest,
    status,
    course.id,
    entries,
    verbs,
    vocabLoading,
    grammarLoading,
    vocabError,
    grammarError,
    retry,
  ]);
  useEffect(
    () => () => {
      const id = sessionRef.current;
      if (id)
        void inFlight.current
          .catch(() => undefined)
          .then(() => finishLearningSession(apiRequest, id))
          .catch(() => undefined);
    },
    [apiRequest],
  );
  async function closeSession() {
    const id = sessionRef.current;
    if (!id) return;
    setFinishing(true);
    setFinishError(false);
    try {
      await finishLearningSession(apiRequest, id);
      sessionRef.current = null;
    } catch {
      setFinishError(true);
    } finally {
      setFinishing(false);
    }
  }
  async function submit(value = answer) {
    if (busy.current || feedback !== null || !task || !value.trim()) return;
    busy.current = true;
    setSaving(true);
    setError(false);
    const hit = isReviewCorrect(task, value);
    pending.current ??= {
      sessionId: sessionRef.current ?? undefined,
      eventId: createEventId(),
      course: course.id,
      itemType: task.item.itemType,
      itemId: task.item.itemId,
      gameType: task.gameType,
      direction: task.direction,
      answer: value,
      correct: hit,
      usedHint: false,
      responseTimeMs: Math.min(86400000, Date.now() - started.current),
      attemptsBeforeCorrect: failures.current.get(task.item.itemId) ?? 0,
    };
    try {
      inFlight.current = submitReview(apiRequest, pending.current);
      await inFlight.current;
      setFeedback(pending.current.correct);
      if (pending.current.correct) setCorrect((n) => n + 1);
      else {
        setWrong((n) => n + 1);
        failures.current.set(
          task.item.itemId,
          (failures.current.get(task.item.itemId) ?? 0) + 1,
        );
        if ((failures.current.get(task.item.itemId) ?? 0) <= 2)
          setQueue((q) => repeatAfterError(q, index));
      }
      pending.current = null;
    } catch {
      setError(true);
      busy.current = false;
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    busy.current = false;
  }, [index, phase, feedback]);
  function next() {
    if (feedback === null || busy.current) return;
    busy.current = true;
    setFeedback(null);
    setAnswer("");
    started.current = Date.now();
    if (index + 1 >= queue.length) {
      setPhase("done");
      void closeSession();
    } else setIndex((n) => n + 1);
  }
  const optionHandlers = useMemo<Array<(() => void) | null>>(() => {
    if (phase !== "play" || !task?.options || feedback !== null || saving || error) return [];
    return task.options.slice(0, 4).map((option) => () => {
      setAnswer(option);
      void submit(option);
    });
  }, [phase, task, feedback, saving, error]);
  useQuizKeyboard({
    answers: optionHandlers,
    onSubmit: phase === "play" && feedback !== null ? next : undefined,
  });
  if (status !== "authenticated")
    return (
      <div className="page">
        <h1>{t("reviews.title")}</h1>
        <p>{t("reviews.login")}</p>
        <Link to="/login" className="btn">
          {t("reviews.loginAction")}
        </Link>
      </div>
    );
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{course.name[locale]}</span>
        <h1>{t("reviews.title")}</h1>
        <p>{t("reviews.description")}</p>
      </header>
      {phase === "loading" && <p role="status">{t("reviews.loading")}</p>}
      {phase === "error" && (
        <section role="alert">
          <p>{t("reviews.loadError")}</p>
          <button className="btn" onClick={() => setRetry((n) => n + 1)}>
            {t("reviews.retry")}
          </button>
        </section>
      )}
      {(phase === "empty" || phase === "done") && (
        <section className="panel panel-pad stack">
          <h2>{t(phase === "done" ? "reviews.done" : "reviews.empty")}</h2>
          {phase === "done" && (
            <p>
              {t("reviews.score", {
                correct,
                wrong,
                accuracy: Math.round((100 * correct) / (correct + wrong || 1)),
              })}
            </p>
          )}
          <p>{t("reviews.nextDue")}</p>
          {unavailable > 0 && (
            <p>{t("reviews.unavailable", { n: unavailable })}</p>
          )}
          {finishError && (
            <div role="alert">
              <p>{t("reviews.finishError")}</p>
              <button
                className="btn"
                disabled={finishing}
                onClick={() => void closeSession()}
              >
                {t("reviews.retry")}
              </button>
            </div>
          )}
          <button
            className="btn"
            disabled={finishing || finishError}
            onClick={() => setRetry((n) => n + 1)}
          >
            {t("reviews.refresh")}
          </button>
          <Link to="/gry" className="btn-ghost">
            {t("reviews.games")}
          </Link>
        </section>
      )}
      {phase === "play" && task && (
        <section className="panel panel-pad stack">
          <p>{t("reviews.progress", { n: index + 1, total: queue.length })}</p>
          <progress
            value={index}
            max={queue.length}
            aria-label={t("reviews.progress", {
              n: index,
              total: queue.length,
            })}
          />
          <span className="eyebrow">
            {t(`reviews.types.${task.item.itemType}`)}
          </span>
          <h2>{task.prompt}</h2>
          {task.options ? (
            <div className="grid grid-2">
              {task.options.map((option) => (
                <button
                  key={option}
                  className="btn-ghost"
                  disabled={saving || feedback !== null || error}
                  onClick={() => {
                    setAnswer(option);
                    void submit(option);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label>
                {t("reviews.answer")}
                <input
                  className="login-input"
                  autoComplete="off"
                  maxLength={500}
                  value={answer}
                  disabled={saving || feedback !== null || error}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              </label>
              <button
                className="btn"
                disabled={
                  saving || feedback !== null || !answer.trim() || error
                }
              >
                {t("reviews.check")}
              </button>
            </form>
          )}
          {error && (
            <div role="alert">
              <p>{t("reviews.saveError")}</p>
              <button
                className="btn"
                disabled={saving}
                onClick={() => void submit(pending.current?.answer)}
              >
                {t("reviews.retry")}
              </button>
            </div>
          )}
          {feedback !== null && (
            <div className="stack" role="status">
              <strong>
                {t(feedback ? "reviews.correct" : "reviews.incorrect")}
              </strong>
              <p>
                {t("reviews.expected")}: {task.expected[0]}
              </p>
              <button className="btn" onClick={next}>
                {t("reviews.next")}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
