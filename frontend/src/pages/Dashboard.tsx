import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { useAuth } from "@/auth/useAuth";
import { isLearned, needsReview, statFor } from "@/progress/service";
import { findGame } from "@/games/registry";
import { useI18n } from "@/i18n";
import { fetchProgress } from "@/flashcards/flashcardsApi";
import { readPreferences, writePreferences } from "@/flashcards/preferences";
import type { FlashcardProgress, FlashcardMode } from "@/flashcards/types";
import { fetchReviewStats, type ReviewStats } from "@/reviews/api";
import { entriesForLevel, LEARNING_LEVELS, type LearningLevelId } from "@/config/learningLevels";
import { currentStreak, todayKey } from "@/utils/date";
import { Icon, type IconName } from "@/components/Icon";
import { ProgressRing } from "@/components/StatCard";

interface PlanStep {
  key: string;
  icon: IconName;
  title: string;
  meta: string;
  count: string | null;
  href: string;
  onStart?: () => void;
  done?: boolean;
}

export function Dashboard() {
  const { t, locale } = useI18n();
  const { course } = useCourse();
  const { entries, loading: vocabularyLoading, error: vocabularyError } = useVocabulary();
  const { state, current, courseId, ready } = useProgress();
  const { status, apiRequest, user } = useAuth();
  const [remote, setRemote] = useState<{ key: string; rows: FlashcardProgress[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [reviews, setReviews] = useState<{ key: string; stats: ReviewStats } | null>(null);
  const [reviewsFailedKey, setReviewsFailedKey] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [level, setLevel] = useState<LearningLevelId>("A1");
  const account = status === "authenticated";
  const key = `${user?.id}:${course.id}`;

  useEffect(() => {
    if (!account) return;
    let alive = true;
    setFailedKey(null);
    fetchProgress(apiRequest, course.id).then(rows => {
      if (alive) setRemote({ key, rows });
    }).catch(() => { if (alive) setFailedKey(key); });
    return () => { alive = false; };
  }, [account, apiRequest, course.id, key, retry]);

  // Harmonogram FSRS obejmuje słowa, zdania i odmianę — to ta sama kolejka,
  // którą otwiera /powtorki, więc liczba w planie zgadza się z sesją.
  useEffect(() => {
    if (!account) return;
    let alive = true;
    setReviewsFailedKey(null);
    fetchReviewStats(apiRequest, course.id).then(stats => {
      if (alive) setReviews({ key, stats });
    }).catch(() => { if (alive) setReviewsFailedKey(key); });
    return () => { alive = false; };
  }, [account, apiRequest, course.id, key, retry]);

  const loading = vocabularyLoading || !ready || (account && remote?.key !== key && failedKey !== key);
  const error = Boolean(vocabularyError) || (account && failedKey === key);
  const available = !loading && !error;
  const progress = useMemo(() => {
    const byId = new Map(remote?.key === key ? remote.rows.map(row => [row.wordRef, row]) : []);
    return new Map(entries.map(entry => {
      const local = statFor(state, courseId, entry);
      const card = byId.get(entry.id);
      return [entry.id, account
        ? { seen: Boolean(card), mastered: card?.status === "MASTERED", due: Boolean(card?.isDue) }
        : { seen: local.attempts > 0, mastered: isLearned(local), due: needsReview(local) }];
    }));
  }, [remote, key, entries, state, courseId, account]);
  const all = [...progress.values()];
  const seen = all.filter(row => row.seen).length;
  const mastered = all.filter(row => row.mastered).length;
  const due = all.filter(row => row.due).length;
  const pool = entriesForLevel(entries, level, course.blocks);
  const levelRows = pool.map(entry => progress.get(entry.id)!);
  const levelMastered = levelRows.filter(row => row.mastered).length;
  const learning = levelRows.filter(row => row.seen && !row.mastered).length;
  const untouched = pool.length - levelMastered - learning;
  const known = levelMastered + learning;
  const percent = pool.length ? Math.round(levelMastered / pool.length * 100) : 0;
  const levelInfo = LEARNING_LEVELS.find(item => item.id === level)!;
  const last = findGame(current.lastActivity?.gameId);
  const streak = currentStreak(current.activeDays);

  const reviewStats = reviews?.key === key ? reviews.stats : null;
  const reviewsFailed = account && reviewsFailedKey === key;
  const reviewCount: number | null = account
    ? (reviewStats?.due ?? null)
    : (available ? due : null);

  const flashcardStart = (mode: FlashcardMode) => {
    writePreferences({ ...readPreferences(), mode, sessionSize: 10 });
  };

  const hasSentences = course.id === "pl-hr";
  const newStep: PlanStep = {
    key: "new",
    icon: "plus",
    title: t("home.planNew"),
    meta: t(account ? "home.planNewMeta" : "home.planNewGuest"),
    count: "10",
    href: account ? "/fiszki/sesja" : "/gry/bura",
    onStart: () => flashcardStart("NEW"),
  };
  const reviewStep: PlanStep = {
    key: "reviews",
    icon: "repeat",
    title: t("home.planReviews"),
    meta: reviewCount === 0
      ? t("home.planReviewsNone")
      : t(account ? "home.planReviewsMeta" : "home.planReviewsGuest"),
    count: reviewsFailed ? "—" : reviewCount === null ? "…" : String(reviewCount),
    href: reviewCount === 0 ? (account ? "/fiszki" : "/powtorki") : "/powtorki",
    onStart: reviewCount === 0 ? undefined : () => flashcardStart("REVIEW"),
    done: reviewCount === 0,
  };
  const practiceStep: PlanStep = hasSentences
    ? { key: "sentences", icon: "text", title: t("home.planSentences"), meta: t("home.planSentencesMeta"), count: "10", href: "/gry/sentence-builder" }
    : { key: "games", icon: "play", title: t("home.planGames"), meta: t("home.planGamesMeta"), count: null, href: "/gry" };
  const plan = [reviewStep, newStep, practiceStep];
  // Główne CTA prowadzi do pierwszego kroku, który ma coś do zrobienia.
  const next = plan.find(step => !step.done) ?? newStep;

  const shortcuts: { key: string; href: string; icon: IconName }[] = [
    { key: "flashcards", href: "/fiszki", icon: "cards" },
    { key: "quick", href: "/gry/kategoria/quick", icon: "bolt" },
    ...(hasSentences ? [{ key: "sentences", href: "/gry/kategoria/sentences", icon: "text" as const }] : []),
    { key: "grammar", href: "/gry/kategoria/grammar", icon: "swap" },
    ...(hasSentences ? [{ key: "radio", href: "/radio", icon: "radio" as const }] : []),
  ];

  const dateLocale = locale === "pl" ? "pl-PL" : "en-GB";
  const today = new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" });
  const activeDays = new Set(current.activeDays);
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    return {
      key: todayKey(day),
      label: day.toLocaleDateString(dateLocale, { weekday: "narrow" }),
      on: activeDays.has(todayKey(day)),
      today: index === 6,
    };
  });

  return <div className="page page-wide dashboard">
    <div className="dashboard-main">
      <section className="today" aria-labelledby="today-title">
        <header className="today-head">
          <span className="eyebrow">{today} · {course.name[locale]}</span>
          <h1 id="today-title" className="display">{t("home.title")}</h1>
          <p className="lede">{t("home.subtitle")}</p>
        </header>

        <div className="plan">
          <span className="plan-label">{t("home.planEyebrow")}</span>
          <ol className="plan-steps" aria-label={t("home.planLabel")}>
            {plan.map((step, index) => (
              <li key={step.key}>
                <Link
                  className={["plan-step", step.done && "done", step === next && "next"].filter(Boolean).join(" ")}
                  to={step.href}
                  onClick={step.onStart}
                >
                  <span className="plan-step-icon"><Icon name={step.done ? "check" : step.icon} /></span>
                  <span className="plan-step-body">
                    <span className="plan-step-title">
                      <span className="plan-step-index">{String(index + 1).padStart(2, "0")}</span>
                      {step.title}
                      {step === next && <span className="tag">{t("home.planNext")}</span>}
                    </span>
                    <span className="plan-step-meta">{step.meta}</span>
                  </span>
                  {step.count !== null && <span className="plan-step-count">{step.count}</span>}
                  <span className="plan-step-arrow"><Icon name="arrowRight" size={16} /></span>
                </Link>
              </li>
            ))}
          </ol>
          {reviewsFailed && (
            <div className="inline-alert" role="alert">
              <span>{t("reviews.error")}</span>
              <button className="linklike" onClick={() => setRetry(n => n + 1)}>{t("reviews.retry")}</button>
            </div>
          )}
        </div>

        <div className="today-cta">
          <Link className="btn btn-lg" to={next.href} onClick={next.onStart}>
            {t("home.start")}
            <Icon name="arrowRight" size={18} />
          </Link>
          <span className="today-cta-hint">{t("home.startsWith", { step: next.title.toLocaleLowerCase(dateLocale) })}</span>
        </div>
      </section>

      <section className="explore" aria-labelledby="explore-title">
        <div className="section-head">
          <h2 id="explore-title">{t("home.explore")}</h2>
          <Link className="text-link" to="/gry">{t("home.allGames")} <Icon name="arrowRight" size={14} /></Link>
        </div>
        <div className="explore-grid">
          {shortcuts.map(item => (
            <Link className="explore-item" key={item.key} to={item.href}>
              <Icon name={item.icon} size={20} />
              <span>{t(`home.shortcuts.${item.key}`)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>

    <aside className="dashboard-rail">
      <section className="surface rail-progress" aria-labelledby="progress-title" aria-busy={loading}>
        <div className="section-head">
          <div>
            <span className="eyebrow">{t("home.progressEyebrow")}</span>
            <h2 id="progress-title">{t("home.progressTitle")}</h2>
          </div>
        </div>
        <div className="segmented" role="group" aria-label={t("home.chooseLevel")}>
          {LEARNING_LEVELS.map(item => (
            <button
              className={level === item.id ? "on" : ""}
              aria-pressed={level === item.id}
              key={item.id}
              onClick={() => setLevel(item.id)}
            >
              {item.id}
            </button>
          ))}
        </div>

        {loading && <p className="loading" role="status">{t("home.loading")}</p>}
        {error && (
          <div className="inline-alert" role="alert">
            <span>{t("home.error")}</span>
            {!vocabularyError && <button className="linklike" onClick={() => setRetry(n => n + 1)}>{t("home.retry")}</button>}
          </div>
        )}
        {available && <>
          <div className="level-hero">
            <ProgressRing
              mastered={pool.length ? levelMastered / pool.length : 0}
              learning={pool.length ? learning / pool.length : 0}
              label={t("home.progressLabel", { mastered: levelMastered, learning, untouched })}
            >
              <strong>{percent}%</strong>
              <span>{t("home.masteredShort")}</span>
            </ProgressRing>
            <div className="level-hero-copy">
              <span className="level-known">
                <strong>{known}</strong>
                <span>/ {pool.length}</span>
              </span>
              <span className="level-known-label">{t("home.known")}</span>
              <span className="level-name">{t("home.levelOf", { level, name: t(levelInfo.nameKey) })}</span>
            </div>
          </div>
          <ul className="legend">
            <li><i className="swatch gold" />{t("home.mastered")}<strong>{levelMastered}</strong></li>
            <li><i className="swatch burgundy" />{t("home.learning")}<strong>{learning}</strong></li>
            <li><i className="swatch" />{t("home.untouched")}<strong>{untouched}</strong></li>
          </ul>
          <details className="details">
            <summary>{t("home.details")}</summary>
            <dl className="details-grid">
              {[{ label: "seen", value: seen }, { label: "mastered", value: mastered }, { label: account ? "due" : "mistakes", value: due }].map(item => (
                <div key={item.label}><dt>{t(`home.${item.label}`)}</dt><dd>{item.value}</dd></div>
              ))}
            </dl>
            <p className="meta">{t("home.materialNote", { n: percent })}</p>
            <p className="meta">{t(account ? "home.accountSource" : "home.guestSource")}</p>
          </details>
        </>}
      </section>

      <section className="rail-block" aria-labelledby="streak-title">
        <div className="streak">
          <span className="streak-icon"><Icon name="flame" size={20} /></span>
          <div>
            <span className="streak-value">{streak}</span>
            <h2 id="streak-title" className="streak-label">{t("dashboard.streak")}</h2>
          </div>
          <span className="streak-hint">{t(streak > 0 ? "dashboard.streakOn" : "dashboard.streakOff")}</span>
        </div>
        <div className="week" role="img" aria-label={t("home.week")}>
          {week.map(day => (
            <span key={day.key} className={["week-day", day.on && "on", day.today && "is-today"].filter(Boolean).join(" ")} title={day.key}>
              <i />
              {day.label}
            </span>
          ))}
        </div>
      </section>

      {last?.status === "active" && (
        <Link className="rail-block continue" to={last.href ?? `/gry/${last.id}`}>
          <span className="continue-icon"><Icon name="clock" size={18} /></span>
          <span className="continue-copy">
            <span className="meta">{t("home.lastMode")}</span>
            <strong>{t(last.nameKey)}</strong>
          </span>
          <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </aside>
  </div>;
}
