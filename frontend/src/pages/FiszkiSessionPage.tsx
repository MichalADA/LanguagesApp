import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useCourse } from "@/courses/CourseProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import type { VocabularyEntry } from "@/vocabulary/types";
import { AnswerInput } from "@/components/AnswerInput";
import { checkAnswer } from "@/services/validation";
import { useT } from "@/i18n";
import { readPreferences } from "@/flashcards/preferences";
import type { FlashcardPreferences } from "@/flashcards/preferences";
import { buildQueue, type QueueItem } from "@/flashcards/queue";
import { segmentDiff } from "@/flashcards/diff";
import { fetchProgress, startSession, finishSession, submitAnswer } from "@/flashcards/flashcardsApi";
import type {
  FlashcardDirection,
  FlashcardProgress,
  FlashcardRating,
} from "@/flashcards/types";

type Phase = "loading" | "empty" | "answering" | "reviewing" | "finished" | "error";
type DirectionOne = "SOURCE_TO_TARGET" | "TARGET_TO_SOURCE";

interface CardState {
  item: QueueItem;
  direction: DirectionOne;
}

interface Feedback {
  correct: boolean;
  near: boolean;
  typed: string;
  expected: string;
  card: CardState;
}

const RATINGS: { id: FlashcardRating; labelKey: string; shortcut: string }[] = [
  { id: "AGAIN", labelKey: "flashcards.rate.again", shortcut: "1" },
  { id: "HARD", labelKey: "flashcards.rate.hard", shortcut: "2" },
  { id: "GOOD", labelKey: "flashcards.rate.good", shortcut: "3" },
  { id: "EASY", labelKey: "flashcards.rate.easy", shortcut: "4" },
];

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

        const items = buildQueue(entries, progressByRef, prefs.mode, prefs.sessionSize);
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
  const percent = total ? Math.round(((index + (feedback ? 1 : 0)) / total) * 100) : 0;

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
      const canon = (s: string) => s.normalize("NFC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
      correct = canon(typed) === canon(entry.sourceText);
    }

    setFeedback({
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
      if (!feedback) return;
      const card = feedback.card;
      const wasCorrect = feedback.correct;

      const answerPayload = {
        course: course.id,
        wordRef: card.item.entry.id,
        direction: card.direction,
        answer: feedback.typed,
        correct: rating !== "AGAIN" && wasCorrect,
        rating,
        sessionId: sessionId ?? undefined,
      } as const;

      // Optimistic advance — even if the server rejects, the local session
      // still counts (users hate a ratings button that seems to freeze).
      void submitAnswer(apiRequest, answerPayload).catch(() => undefined);

      if (rating === "AGAIN") {
        // Requeue the card near the end of the session so the user retries it
        // once fresher cards drift through.
        setQueue((prev) => {
          const rest = prev.slice(0, index).concat(prev.slice(index + 1));
          const insertAt = Math.min(rest.length, index + 3);
          const next = rest.slice(0, insertAt).concat(card, rest.slice(insertAt));
          return next;
        });
        setRequeueCount((n) => n + 1);
      } else {
        setIndex((i) => i + 1);
      }

      setFeedback(null);
      setTyped("");

      if (rating !== "AGAIN" && index + 1 >= queue.length) {
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
    [apiRequest, course.id, feedback, index, queue.length, sessionId],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "reviewing" || !feedback) return;
      if (e.key === "1") void applyRating("AGAIN");
      if (e.key === "2") void applyRating("HARD");
      if (e.key === "3" || e.key === "Enter") void applyRating("GOOD");
      if (e.key === "4") void applyRating("EASY");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, feedback, applyRating]);

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
          <p className="form-message error" role="alert">{error}</p>
          <Link to="/fiszki" className="btn-ghost">{t("common.back")}</Link>
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
          <Link to="/fiszki" className="btn" style={{ alignSelf: "flex-start" }}>
            {t("common.back")}
          </Link>
        </section>
      </div>
    );
  }

  if (phase === "finished") {
    const accuracy = correctCount + wrongCount > 0
      ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
      : 0;
    return (
      <div className="page">
        <section className="panel panel-pad result-card">
          <span className="eyebrow">{t("flashcards.session.finished")}</span>
          <div className="result-score">{accuracy}%</div>
          <p className="muted">
            {t("flashcards.session.summary", {
              total: queue.length,
              correct: correctCount,
              wrong: wrongCount,
              newWords: newCount,
              requeues: requeueCount,
            })}
          </p>
          <div className="row" style={{ gap: 10, marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => navigate("/fiszki")}>
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
    <div className="page">
      <header className="page-head">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="eyebrow">
            {t("flashcards.session.progress", { current: index + 1, total })}
          </span>
          <Link to="/fiszki" className="mono dim" style={{ fontSize: 12 }}>
            {t("common.back")}
          </Link>
        </div>
        <div className="bar"><span style={{ width: `${percent}%` }} /></div>
      </header>

      <section className="panel panel-pad game-stage" style={{ minHeight: 300 }}>
        <span className="eyebrow" style={{ alignSelf: "center" }}>
          {isTargetSide ? t("flashcards.card.plHr") : t("flashcards.card.hrPl")}
        </span>
        <div className="prompt">{promptText}</div>

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
            <button type="button" className="btn" onClick={judge}>
              {t("flashcards.card.check")}
            </button>
          </>
        )}

        {phase === "reviewing" && feedback && (
          <FeedbackBlock feedback={feedback} onRate={(r) => void applyRating(r)} t={t} />
        )}
      </section>

      <div className="hud" style={{ padding: "0 4px" }}>
        <span>
          {t("flashcards.session.hudScore", { correct: correctCount, wrong: wrongCount })}
        </span>
        <span className="mono dim">
          {t("flashcards.session.hudRequeues", { n: requeueCount })}
        </span>
      </div>
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
  const diff = feedback.correct ? [] : segmentDiff(feedback.typed, feedback.expected);
  const banner = feedback.correct
    ? t("flashcards.feedback.correct")
    : feedback.near
      ? t("flashcards.feedback.near")
      : t("flashcards.feedback.wrong");

  return (
    <div className="stack" style={{ gap: 14, width: "100%", alignItems: "center" }}>
      <span
        className="eyebrow"
        style={{ color: feedback.correct ? "var(--gold-light)" : "var(--accent-text)" }}
      >
        {banner}
      </span>

      {!feedback.correct && (
        <div className="answer-compare stack" style={{ gap: 6, alignItems: "center" }}>
          <div className="dim mono" style={{ fontSize: 13 }}>
            {t("flashcards.feedback.yourAnswer")}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--muted)" }}>
            {feedback.typed || "—"}
          </div>
          <div className="dim mono" style={{ fontSize: 13, marginTop: 4 }}>
            {t("flashcards.feedback.correctAnswer")}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>
            {diff.length > 0
              ? diff.map((seg, i) => (
                  <span
                    key={i}
                    style={{ color: seg.match ? "var(--gold-light)" : "var(--accent-text)" }}
                  >
                    {seg.text}
                  </span>
                ))
              : feedback.expected}
          </div>
        </div>
      )}

      {feedback.correct && (
        <div className="answer">{feedback.expected}</div>
      )}

      <WordDetails entry={entry} />

      <div className="row" style={{ gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {RATINGS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={ratingClass(r.id)}
            onClick={() => onRate(r.id)}
            title={t(`${r.labelKey}Hint`)}
          >
            <span className="mono" style={{ opacity: 0.6, marginRight: 6 }}>{r.shortcut}</span>
            {t(r.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

function WordDetails({ entry }: { entry: VocabularyEntry }) {
  const grammar = [entry.partOfSpeech, entry.grammar].filter(Boolean).join(" · ");
  return (
    <div className="stack" style={{ gap: 8, width: "100%", maxWidth: 520 }}>
      {grammar && (
        <span className="dim" style={{ fontSize: 13, textAlign: "center" }}>{grammar}</span>
      )}
      {(entry.exampleTarget || entry.exampleSource) && (
        <div className="example">
          {entry.exampleTarget && <div className="example-hr">{entry.exampleTarget}</div>}
          {entry.exampleSource && <div className="example-pl">{entry.exampleSource}</div>}
        </div>
      )}
      {entry.falseFriend && entry.falseFriendNote && (
        <div className="note-warn">⚠ {entry.falseFriendNote}</div>
      )}
    </div>
  );
}

function ratingClass(id: FlashcardRating): string {
  if (id === "AGAIN") return "chip flashcard-rate flashcard-rate-again";
  if (id === "HARD") return "chip flashcard-rate flashcard-rate-hard";
  if (id === "EASY") return "chip flashcard-rate flashcard-rate-easy";
  return "chip on flashcard-rate flashcard-rate-good";
}

function resolveDirection(pref: FlashcardDirection): DirectionOne {
  if (pref === "SOURCE_TO_TARGET") return "SOURCE_TO_TARGET";
  if (pref === "TARGET_TO_SOURCE") return "TARGET_TO_SOURCE";
  // MIXED: gently biased toward PL → HR since active recall is what the
  // Chorwacki course primarily practises.
  return Math.random() < 0.6 ? "SOURCE_TO_TARGET" : "TARGET_TO_SOURCE";
}
