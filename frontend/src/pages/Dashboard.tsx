import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { useAuth } from "@/auth/useAuth";
import { isLearned, needsReview, statFor } from "@/progress/service";
import { useI18n } from "@/i18n";
import { fetchProgress } from "@/flashcards/flashcardsApi";
import { readPreferences, writePreferences } from "@/flashcards/preferences";
import type { FlashcardProgress, FlashcardMode } from "@/flashcards/types";
import { fetchReviewStats, type ReviewStats } from "@/reviews/api";
import { entriesForLevel, LEARNING_LEVELS, type LearningLevelId } from "@/config/learningLevels";
import { currentStreak, todayKey } from "@/utils/date";
import { useCurriculum } from "@/curriculum/CurriculumProvider";
import { coursePaths } from "@/curriculum/components/format";
import { DailyGoalCard } from "@/xp/DailyGoal";
import { PracticeSuggestions } from "@/practice/PracticeSuggestions";

interface PlanStep {
  key: string;
  title: string;
  /** Tytuł po chorwacku (lekcja kursu) — składany krojem słowa, nie interfejsu. */
  target?: string;
  meta: string;
  count: string | null;
  href: string;
  onStart?: () => void;
  done?: boolean;
}

/** Ok. pół minuty na pozycję powtórki — tyle wychodzi średnio w sesji FSRS. */
const reviewMinutes = (n: number) => Math.max(1, Math.round(n / 2));

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
  const curriculum = useCurriculum();
  // Kurs to główna ścieżka — pokazujemy go nad treningiem, gdy dla języka istnieje.
  const courseView = curriculum.status === "ready" ? curriculum.levelView("A1") : null;
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
  const streak = currentStreak(current.activeDays);
  const activeToday = current.activeDays.includes(todayKey(new Date()));

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
    title: t("home.planNew"),
    meta: t(account ? "home.planNewMeta" : "home.planNewGuest"),
    count: "10",
    href: account ? "/fiszki/sesja" : "/gry/bura",
    onStart: () => flashcardStart("NEW"),
  };
  const reviewMeta = reviewCount === 0
    ? t("home.planReviewsNone")
    : [t(account ? "home.planReviewsMeta" : "home.planReviewsGuest"), reviewCount ? t("home.aboutMin", { n: reviewMinutes(reviewCount) }) : null]
        .filter(Boolean).join(" · ");
  const reviewStep: PlanStep = {
    key: "reviews",
    title: t("home.planReviews"),
    meta: reviewMeta,
    count: reviewsFailed ? "—" : reviewCount === null ? "…" : String(reviewCount),
    href: reviewCount === 0 ? (account ? "/fiszki" : "/powtorki") : "/powtorki",
    onStart: reviewCount === 0 ? undefined : () => flashcardStart("REVIEW"),
    done: reviewCount === 0,
  };
  const practiceStep: PlanStep = hasSentences
    ? { key: "sentences", title: t("home.planSentences"), meta: t("home.planSentencesMeta"), count: "10", href: "/gry/sentence-builder" }
    : { key: "games", title: t("home.planGames"), meta: t("home.planGamesMeta"), count: null, href: "/gry" };
  // Lekcja kursu jest krokiem planu (a nie osobnym blokiem nad nim): jej słowa trafiają potem do FSRS,
  // więc zastępuje losowe nowe słowa z talii — fiszki zostają w trybach.
  const currentView = courseView?.current;
  const currentLesson = currentView?.lesson.lesson;
  const lessonStep: PlanStep | null = currentLesson
    ? {
        key: "lesson",
        title: t("home.planLesson", { n: currentView.lesson.number ?? currentLesson.order ?? 1 }),
        target: currentLesson.title,
        meta: [
          currentView.module?.module ? t("home.planLessonModule", { n: currentView.module.module.order }) : null,
          t("home.aboutMin", { n: currentLesson.estimatedMinutes }),
          courseView?.total ? t("home.planLessonDone", { done: courseView.completedCount, total: courseView.total }) : null,
        ].filter(Boolean).join(" · "),
        count: null,
        href: coursePaths.lesson(currentLesson.id),
      }
    : null;
  const plan = [reviewStep, lessonStep ?? newStep, practiceStep];
  // Krok „next” sam jest główną akcją strony — nie ma osobnego przycisku, który by go dublował.
  const next = plan.find(step => !step.done) ?? newStep;
  const headline = next === reviewStep && reviewCount
    ? t("home.headReviews", { n: reviewCount, m: reviewMinutes(reviewCount) })
    : next === lessonStep
      ? t("home.headLesson")
      : next === newStep
        ? t("home.headNew", { n: 10 })
        : next.key === "sentences" ? t("home.headSentences", { n: 10 }) : t("home.headGames");

  const dateLocale = locale === "pl" ? "pl-PL" : "en-GB";
  const today = new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" });

  return <div className="page page-wide dashboard">
    <div className="dashboard-main">
      <section className="today" aria-labelledby="today-title">
        <header className="today-head">
          <span className="eyebrow">{today} · {course.name[locale]}</span>
          <h1 id="today-title">
            {headline}
            {next === lessonStep && lessonStep?.target && <> <span className="today-target" lang="hr">{lessonStep.target}</span></>}
          </h1>
        </header>

        <ol className="plan-steps" aria-label={t("home.planLabel")}>
          {plan.map((step, index) => (
            <li key={step.key}>
              <Link
                className={["plan-step", step.done && "done", step === next && "next"].filter(Boolean).join(" ")}
                to={step.href}
                onClick={step.onStart}
                aria-current={step === next ? "step" : undefined}
              >
                <span className="plan-step-index" aria-hidden="true">{step.done ? "✓" : index + 1}</span>
                <span className="plan-step-body">
                  <span className="plan-step-title">
                    {step.title}
                    {step.target && <span className="plan-step-target" lang="hr">{step.target}</span>}
                  </span>
                  <span className="plan-step-meta">{step.meta}</span>
                </span>
                {step.count !== null && <span className="plan-step-count">{step.count}</span>}
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
        <Link className="text-link today-more" to="/gry">{t("home.allGames")}</Link>
      </section>

      {hasSentences && (
        <PracticeSuggestions
          level="A1"
          module={currentView?.module?.module?.order}
          lessonNumber={currentView?.lesson.number ?? 0}
          title={t("practice.onHome")}
          className="home-practice"
        />
      )}

      <section className="level-line ruled" aria-labelledby="level-title" aria-busy={loading}>
        {loading && <p className="loading" role="status">{t("home.loading")}</p>}
        {error && (
          <div className="inline-alert" role="alert">
            <span>{t("home.error")}</span>
            {!vocabularyError && <button className="linklike" onClick={() => setRetry(n => n + 1)}>{t("home.retry")}</button>}
          </div>
        )}
        {available && (
          <details className="details level-details">
            <summary>
              <span id="level-title">{t("home.levelLine", { level, known, total: pool.length, pct: percent })}</span>
            </summary>
            <div className="level-body">
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
              <div
                className="level-bar"
                role="img"
                aria-label={t("home.progressLabel", { mastered: levelMastered, learning, untouched })}
              >
                <span className="gold" style={{ width: `${pool.length ? levelMastered / pool.length * 100 : 0}%` }} />
                <span className="burgundy" style={{ width: `${pool.length ? learning / pool.length * 100 : 0}%` }} />
              </div>
              <ul className="legend">
                <li><i className="swatch gold" />{t("home.mastered")}<strong>{levelMastered}</strong></li>
                <li><i className="swatch burgundy" />{t("home.learning")}<strong>{learning}</strong></li>
                <li><i className="swatch" />{t("home.untouched")}<strong>{untouched}</strong></li>
              </ul>
              <dl className="details-grid">
                {[{ label: "seen", value: seen }, { label: "mastered", value: mastered }, { label: account ? "due" : "mistakes", value: due }].map(item => (
                  <div key={item.label}><dt>{t(`home.${item.label}`)}</dt><dd>{item.value}</dd></div>
                ))}
              </dl>
              <p className="meta">{t("home.materialNote", { n: percent })} {t(account ? "home.accountSource" : "home.guestSource")}</p>
            </div>
          </details>
        )}
      </section>
    </div>

    <aside className="dashboard-rail">
      <DailyGoalCard />
      <section className="streak ruled" aria-labelledby="streak-title">
        <span className={streak > 0 ? "streak-value on" : "streak-value"}>{streak}</span>
        <div>
          <h2 id="streak-title" className="streak-label">{t("home.streakDays")}</h2>
          <span className="meta">{t(activeToday ? "home.streakToday" : streak > 0 ? "home.streakKeep" : "home.streakStart")}</span>
        </div>
      </section>
    </aside>
  </div>;
}
