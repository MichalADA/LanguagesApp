import { createEventId } from "@/utils/eventId";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useCourse } from "@/courses/CourseProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import type { VocabularyEntry } from "@/vocabulary/types";
import { AnswerInput } from "@/components/AnswerInput";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { checkAnswer } from "@/services/validation";
import { useT } from "@/i18n";
import { readPreferences } from "@/flashcards/preferences";
import type { FlashcardPreferences } from "@/flashcards/preferences";
import { buildQueue, type QueueItem } from "@/flashcards/queue";
import { segmentDiff } from "@/flashcards/diff";
import {
  fetchProgress,
  startSession,
  finishSession,
  submitAnswer,
} from "@/flashcards/flashcardsApi";
import type {
  FlashcardDirection,
  FlashcardProgress,
  FlashcardRating,
} from "@/flashcards/types";

type Phase =
  "loading" | "empty" | "answering" | "reviewing" | "finished" | "error";
type DirectionOne = "SOURCE_TO_TARGET" | "TARGET_TO_SOURCE";

interface CardState {
  item: QueueItem;
  direction: DirectionOne;
}

interface Feedback {
  eventId: string;
  correct: boolean;
  near: boolean;
  typed: string;
  expected: string;
  card: CardState;
}

export function FiszkiSessionPage() {
  const t = useT();
  const navigate = useNavigate();
  const { status, apiRequest } = useAuth();
  const { course } = useCourse();
  const { entries, loading: vocabLoading } = useVocabulary();

  const [prefs] = useState<FlashcardPreferences>(() => readPreferences());
  const [phase, setPhase] = useState<Phase>("loading");
  const [queue, setQueue] = useState<CardState[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [requeueCount, setRequeueCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const finishedRef = useRef(false);
  const saving = useRef(false);
  const pendingAnswer = useRef<Parameters<typeof submitAnswer>[1] | null>(null);
  useEffect(() => {
    saving.current = false;
  }, [feedback]);
  const failures = useRef(new Map<string, number>());

  useEffect(() => {
    if (status !== "authenticated") return;
    if (vocabLoading) return;

    let alive = true;
    setPhase("loading");
    setError(null);

    void (async () => {
      try {
        const progressRows = await fetchProgress(apiRequest, course.id);
        if (!alive) return;
        const progressByRef = new Map<string, FlashcardProgress>(
          progressRows.map((row) => [row.wordRef, row]),
        );

        const items = buildQueue(
          entries,
          progressByRef,
          prefs.mode,
          prefs.sessionSize,
        );
        if (items.length === 0) {
          setPhase("empty");
          return;
        }

        const cards = items.map<CardState>((item) => ({
          item,
          direction: resolveDirection(prefs.direction),
        }));

        const session = await startSession(apiRequest, {
          course: course.id,
          mode: prefs.mode,
          direction: prefs.direction,
        });
        if (!alive) return;
        setSessionId(session.id);
        setQueue(cards);
        setIndex(0);
        setPhase("answering");
      } catch {
        if (!alive) return;
        setError(t("flashcards.session.loadError"));
        setPhase("error");
      }
    })();

    return () => {
      alive = false;
    };
  }, [status, apiRequest, course.id, entries, prefs, t, vocabLoading]);

  useEffect(
    () => () => {
      if (!finishedRef.current && sessionId) {
        void finishSession(apiRequest, sessionId).catch(() => undefined);
        finishedRef.current = true;
      }
    },
    [apiRequest, sessionId],
  );

  const currentCard = queue[index];
  const total = queue.length;
  const percent = total
    ? Math.round(((index + (feedback ? 1 : 0)) / total) * 100)
    : 0;

  const promptText = useMemo(() => {
    if (!currentCard) return "";
    return currentCard.direction === "SOURCE_TO_TARGET"
      ? currentCard.item.entry.sourceText
      : currentCard.item.entry.targetText;
  }, [currentCard]);

  const expectedText = useMemo(() => {
    if (!currentCard) return "";
    return currentCard.direction === "SOURCE_TO_TARGET"
      ? currentCard.item.entry.targetText
      : currentCard.item.entry.sourceText;
  }, [currentCard]);

  const isTargetSide = currentCard?.direction === "SOURCE_TO_TARGET";
  const characters = isTargetSide ? course.specialCharacters : [];

  const judge = useCallback(() => {
    if (!currentCard || feedback) return;
    const { entry } = currentCard.item;

    // The shared validator only checks target-language answers. For the
    // reverse direction we compare against sourceText directly with the same
    // canonicalisation the validator uses.
    let correct = false;
    let near = false;
    if (currentCard.direction === "SOURCE_TO_TARGET") {
      const check = checkAnswer(course, entry, typed, { lenient: true });
      correct = check.verdict === "hit";
      near = check.verdict === "near";
    } else {
      const canon = (s: string) =>
        s.normalize("NFC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
      correct = canon(typed) === canon(entry.sourceText);
    }

    setFeedback({
      eventId: createEventId(),
      correct,
      near,
      typed,
      expected: expectedText,
      card: currentCard,
    });

    if (correct) setCorrectCount((c) => c + 1);
    else setWrongCount((c) => c + 1);
    if (currentCard.item.isNew) setNewCount((c) => c + 1);

    setPhase("reviewing");
  }, [course, currentCard, expectedText, feedback, typed]);

  const applyRating = useCallback(
    async (rating: FlashcardRating) => {
      if (!feedback || saving.current) return;
      saving.current = true;
      const card = feedback.card;
      const wasCorrect = feedback.correct;

      const answerPayload =
        pendingAnswer.current ??
        ({
          eventId: feedback.eventId,
          attemptsBeforeCorrect: failures.current.get(card.item.entry.id) ?? 0,
          course: course.id,
          wordRef: card.item.entry.id,
          direction: card.direction,
          answer: feedback.typed,
          correct: rating !== "AGAIN" && wasCorrect,
          rating,
          sessionId: sessionId ?? undefined,
        } as const);

      pendingAnswer.current = answerPayload;
      try {
        await submitAnswer(apiRequest, answerPayload);
        window.dispatchEvent(new Event("review-updated"));
        setError(null);
        pendingAnswer.current = null;
      } catch {
        saving.current = false;
        setError(t("reviews.saveError"));
        return;
      }
      if (!answerPayload.correct)
        failures.current.set(
          card.item.entry.id,
          (failures.current.get(card.item.entry.id) ?? 0) + 1,
        );

      const requeue =
        !answerPayload.correct &&
        queue.length - index - 1 >= 3 &&
        (failures.current.get(card.item.entry.id) ?? 0) <= 2;
      if (requeue) {
        // Requeue the card near the end of the session so the user retries it
        // once fresher cards drift through.
        setQueue((prev) => {
          const rest = prev.slice(0, index).concat(prev.slice(index + 1));
          const insertAt = Math.min(rest.length, index + 3);
          const next = rest
            .slice(0, insertAt)
            .concat(card, rest.slice(insertAt));
          return next;
        });
        setRequeueCount((n) => n + 1);
      } else {
        setIndex((i) => i + 1);
      }

      setFeedback(null);
      setTyped("");

      if (!requeue && index + 1 >= queue.length) {
        setPhase("finished");
        if (sessionId && !finishedRef.current) {
          finishedRef.current = true;
          try {
            await finishSession(apiRequest, sessionId);
          } catch {
            // Non-blocking — the answers are already recorded.
          }
        }
      } else {
        setPhase("answering");
      }
    },
    [apiRequest, course.id, feedback, index, queue.length, sessionId, t],
  );

  useQuizKeyboard({
    enabled: phase === "reviewing" && Boolean(feedback),
    onSubmit: () => void applyRating("GOOD"),
  });

  if (status !== "authenticated") {
    return <Navigate to="/fiszki" replace />;
  }

  if (phase === "loading") {
    return (
      <div className="page">
        <span className="loading">{t("flashcards.session.loading")}</span>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="page">
        <section className="panel panel-pad stack" style={{ gap: 10 }}>
          <p className="form-message error" role="alert">
            {error}
          </p>
          <Link to="/fiszki" className="btn-ghost">
            {t("common.back")}
          </Link>
        </section>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="page">
        <section className="panel panel-pad stack" style={{ gap: 14 }}>
          <span className="eyebrow">{t("flashcards.eyebrow")}</span>
          <h2>{t("flashcards.session.emptyTitle")}</h2>
          <p className="muted">{t("flashcards.session.emptyBody")}</p>
          <Link
            to="/fiszki"
            className="btn"
            style={{ alignSelf: "flex-start" }}
          >
            {t("common.back")}
          </Link>
        </section>
      </div>
    );
  }

  if (phase === "finished") {
    const accuracy =
      correctCount + wrongCount > 0
        ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
        : 0;
    return (
      <div className="page session-page">
        <section className="session-result" aria-labelledby="session-result-title">
          <h1 id="session-result-title" className="session-result-label">{t("flashcards.session.finished")}</h1>
          <p className="session-result-score">{accuracy}%</p>
          <p className="muted">
            {t("flashcards.session.summary", {
              total: queue.length,
              correct: correctCount,
              wrong: wrongCount,
              newWords: newCount,
              requeues: requeueCount,
            })}
          </p>
          <div className="session-result-actions">
            <button
              type="button"
              className="btn"
              onClick={() => navigate("/fiszki")}
            >
              {t("flashcards.session.backToDashboard")}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => window.location.reload()}
            >
              {t("flashcards.session.oneMoreRound")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page session-page">
      <header className="session-top">
        <div className="session-top-row">
          <span className="session-count">
            {t("flashcards.session.progress", { current: index + 1, total })}
          </span>
          <span className="session-score">
            {t("flashcards.session.hudScore", { correct: correctCount, wrong: wrongCount })}
            {requeueCount > 0 && <> · {t("flashcards.session.hudRequeues", { n: requeueCount })}</>}
          </span>
          <Link to="/fiszki" className="text-link flashcard-back">
            {t("common.back")}
          </Link>
        </div>
        <div className="bar session-bar">
          <span style={{ width: `${percent}%` }} />
        </div>
      </header>

      <section className={phase === "reviewing" ? "flashcard is-reviewing" : "flashcard"}>
        <span className="flashcard-dir">
          {isTargetSide ? t("flashcards.card.plHr") : t("flashcards.card.hrPl")}
        </span>
        <div className="prompt" lang={isTargetSide ? "pl" : "hr"}>{promptText}</div>

        {phase === "answering" && currentCard && (
          <>
            <AnswerInput
              value={typed}
              onChange={setTyped}
              onSubmit={judge}
              placeholder={t("flashcards.card.placeholder")}
              characters={characters}
              focusKey={currentCard.item.entry.id}
            />
            <button type="button" className="btn flashcard-check" onClick={judge}>
              {t("flashcards.card.check")}
            </button>
          </>
        )}

        {error && phase === "reviewing" && <p role="alert">{error}</p>}
        {phase === "reviewing" && feedback && (
          <FeedbackBlock
            feedback={feedback}
            onRate={(r) => void applyRating(r)}
            t={t}
          />
        )}
      </section>
    </div>
  );
}

function FeedbackBlock({
  feedback,
  onRate,
  t,
}: {
  feedback: Feedback;
  onRate: (rating: FlashcardRating) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const entry = feedback.card.item.entry;
  const diff = feedback.correct
    ? []
    : segmentDiff(feedback.typed, feedback.expected);
  const banner = feedback.correct
    ? t("flashcards.feedback.correct")
    : feedback.near
      ? t("flashcards.feedback.near")
      : t("flashcards.feedback.wrong");

  const verdict = feedback.correct ? "hit" : feedback.near ? "near" : "miss";

  return (
    <div className={`flashcard-feedback ${verdict}`}>
      <p className="flashcard-verdict" role="status">{banner}</p>

      {feedback.correct ? (
        <div className="flashcard-answer" lang={answerLang(feedback.card)}>{feedback.expected}</div>
      ) : (
        <>
          <div className="flashcard-answer" lang={answerLang(feedback.card)}>
            <span className="sr-only">{t("flashcards.feedback.correctAnswer")}: </span>
            {diff.length > 0
              ? diff.map((seg, i) => (
                  <span key={i} className={seg.match ? undefined : "flashcard-diff"}>
                    {seg.text}
                  </span>
                ))
              : feedback.expected}
          </div>
          <p className="flashcard-typed">
            {t("flashcards.feedback.yourAnswer")}: <s>{feedback.typed || "—"}</s>
          </p>
        </>
      )}

      <WordDetails entry={entry} t={t} />

      <button type="button" className="btn flashcard-next" onClick={() => onRate("GOOD")}>
        {t("reviews.next")}
      </button>
    </div>
  );
}

/** Język, w którym wpisuje się odpowiedź — do atrybutu lang (czytniki ekranu, dzielenie wyrazów). */
function answerLang(card: CardState): string {
  return card.direction === "SOURCE_TO_TARGET" ? "hr" : "pl";
}

function WordDetails({
  entry,
  t,
}: {
  entry: VocabularyEntry;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const grammar = [entry.partOfSpeech, entry.grammar]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flashcard-details">
      {grammar && <span className="flashcard-grammar">{grammar}</span>}
      {(entry.exampleTarget || entry.exampleSource) && (
        <div className="example">
          {entry.exampleTarget && (
            <div className="example-hr" lang="hr">{entry.exampleTarget}</div>
          )}
          {entry.exampleSource && (
            <div className="example-pl">{entry.exampleSource}</div>
          )}
        </div>
      )}
      {entry.falseFriend && entry.falseFriendNote && (
        <div className="note-warn"><strong>{t("flashcards.feedback.falseFriend")}</strong> {entry.falseFriendNote}</div>
      )}
    </div>
  );
}

function resolveDirection(pref: FlashcardDirection): DirectionOne {
  if (pref === "SOURCE_TO_TARGET") return "SOURCE_TO_TARGET";
  if (pref === "TARGET_TO_SOURCE") return "TARGET_TO_SOURCE";
  // MIXED: gently biased toward PL → HR since active recall is what the
  // Chorwacki course primarily practises.
  return Math.random() < 0.6 ? "SOURCE_TO_TARGET" : "TARGET_TO_SOURCE";
}
