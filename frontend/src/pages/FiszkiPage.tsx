import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useCourse } from "@/courses/CourseProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { fetchSummary } from "@/flashcards/flashcardsApi";
import type { FlashcardsSummary, FlashcardDirection, FlashcardMode } from "@/flashcards/types";
import { StatCard } from "@/components/StatCard";
import { useT } from "@/i18n";
import { readPreferences, writePreferences } from "@/flashcards/preferences";
import type { FlashcardPreferences } from "@/flashcards/preferences";

const MODES: { id: FlashcardMode; labelKey: string; hintKey: string }[] = [
  { id: "MIXED", labelKey: "flashcards.mode.mixed", hintKey: "flashcards.mode.mixedHint" },
  { id: "NEW", labelKey: "flashcards.mode.new", hintKey: "flashcards.mode.newHint" },
  { id: "REVIEW", labelKey: "flashcards.mode.review", hintKey: "flashcards.mode.reviewHint" },
  { id: "DIFFICULT", labelKey: "flashcards.mode.difficult", hintKey: "flashcards.mode.difficultHint" },
];

const DIRECTIONS: { id: FlashcardDirection; labelKey: string }[] = [
  { id: "SOURCE_TO_TARGET", labelKey: "flashcards.dir.plHr" },
  { id: "TARGET_TO_SOURCE", labelKey: "flashcards.dir.hrPl" },
  { id: "MIXED", labelKey: "flashcards.dir.mixed" },
];

const SESSION_SIZES = [10, 20, 30, 50];

export function FiszkiPage() {
  const t = useT();
  const navigate = useNavigate();
  const { status, apiRequest } = useAuth();
  const { course } = useCourse();
  const { entries, loading: vocabLoading } = useVocabulary();
  const [prefs, setPrefs] = useState<FlashcardPreferences>(() => readPreferences());
  const [summary, setSummary] = useState<FlashcardsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    setError(null);
    void fetchSummary(apiRequest, course.id)
      .then((res) => {
        if (active) setSummary(res);
      })
      .catch(() => {
        if (active) setError(t("flashcards.loadError"));
      });
    return () => {
      active = false;
    };
  }, [status, apiRequest, course.id, reload, t]);

  const persistPrefs = useCallback((next: FlashcardPreferences) => {
    setPrefs(next);
    writePreferences(next);
  }, []);

  const deckSize = entries.length;
  const seenFromSummary = summary?.seenTotal ?? 0;
  const untouched = Math.max(0, deckSize - seenFromSummary);

  const startDisabled =
    vocabLoading ||
    (prefs.mode === "REVIEW" && (summary?.reviewDue ?? 0) === 0) ||
    (prefs.mode === "DIFFICULT" && (summary?.difficult ?? 0) === 0) ||
    (prefs.mode === "NEW" && untouched === 0);

  const startSession = () => {
    navigate("/fiszki/sesja");
  };

  const learningDisplay = useMemo(() => summary?.learning ?? 0, [summary]);
  const masteredDisplay = useMemo(() => summary?.mastered ?? 0, [summary]);
  const reviewDisplay = summary?.reviewDue ?? 0;
  const newToday = summary?.newToday ?? 0;

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("flashcards.eyebrow")}</span>
        <h1>{t("flashcards.title")}</h1>
        <p className="lede">
          {t("flashcards.subtitle", {
            total: deckSize || "…",
            language: course.name.pl,
          })}
        </p>
      </header>

      {status !== "authenticated" && (
        <section className="panel panel-pad stack" style={{ gap: 12 }}>
          <p style={{ margin: 0 }}>{t("flashcards.guestNotice")}</p>
          <Link to="/login" className="btn" style={{ alignSelf: "flex-start" }}>
            {t("flashcards.loginCta")}
          </Link>
        </section>
      )}

      {status === "authenticated" && (
        <>
          <section className="stat-grid">
            <StatCard value={newToday} label={t("flashcards.stat.newToday")} note={t("flashcards.stat.newTodayNote")} />
            <StatCard value={reviewDisplay} label={t("flashcards.stat.review")} note={t("flashcards.stat.reviewNote")} />
            <StatCard tone="gold" value={masteredDisplay} label={t("flashcards.stat.mastered")} note={t("flashcards.stat.masteredNote")} />
            <StatCard value={learningDisplay} label={t("flashcards.stat.learning")} note={t("flashcards.stat.learningNote")} />
            <StatCard value={untouched} label={t("flashcards.stat.remaining")} note={t("flashcards.stat.remainingNote", { total: deckSize || "…" })} />
            <StatCard value={`${summary?.accuracy ?? 0}%`} label={t("flashcards.stat.accuracy")} note={t("flashcards.stat.accuracyNote", { n: summary?.attempts ?? 0 })} />
          </section>

          {error && (
            <section className="panel panel-pad stack" style={{ gap: 10 }}>
              <p className="form-message error" role="alert">{error}</p>
              <button type="button" className="btn-ghost" onClick={() => setReload((n) => n + 1)}>
                {t("common.retry")}
              </button>
            </section>
          )}

          <section className="panel panel-pad stack" style={{ gap: 18 }}>
            <div>
              <span className="eyebrow">{t("flashcards.pickMode")}</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={prefs.mode === m.id ? "chip on" : "chip"}
                  onClick={() => persistPrefs({ ...prefs, mode: m.id })}
                  title={t(m.hintKey)}
                >
                  {t(m.labelKey)}
                </button>
              ))}
            </div>

            <div>
              <span className="eyebrow">{t("flashcards.pickDirection")}</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {DIRECTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={prefs.direction === d.id ? "chip on" : "chip"}
                  onClick={() => persistPrefs({ ...prefs, direction: d.id })}
                >
                  {t(d.labelKey)}
                </button>
              ))}
            </div>

            <div>
              <span className="eyebrow">{t("flashcards.sessionSize")}</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {SESSION_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={prefs.sessionSize === size ? "chip on" : "chip"}
                  onClick={() => persistPrefs({ ...prefs, sessionSize: size })}
                >
                  {size}
                </button>
              ))}
            </div>

            <div className="row" style={{ gap: 12, marginTop: 6 }}>
              <button type="button" className="btn" onClick={startSession} disabled={startDisabled}>
                {t("flashcards.start")}
              </button>
              <span className="mono dim" style={{ fontSize: 12 }}>
                {t("flashcards.hintKeyboard")}
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
