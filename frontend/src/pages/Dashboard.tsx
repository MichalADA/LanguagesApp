import { ReviewSummary } from "@/reviews/ReviewSummary";
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
import { entriesForLevel, LEARNING_LEVELS, type LearningLevelId } from "@/config/learningLevels";

export function Dashboard() {
  const { t, locale } = useI18n();
  const { course } = useCourse();
  const { entries, loading: vocabularyLoading, error: vocabularyError } = useVocabulary();
  const { state, current, courseId, ready } = useProgress();
  const { status, apiRequest, user } = useAuth();
  const [remote, setRemote] = useState<{ key: string; rows: FlashcardProgress[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
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
  const percent = pool.length ? Math.round(levelMastered / pool.length * 100) : 0;
  const last = findGame(current.lastActivity?.gameId);
  const flashcardStart = (mode: FlashcardMode) => {
    writePreferences({ ...readPreferences(), mode, sessionSize: 10 });
  };
  const shortcuts = [
    { key: "flashcards", href: "/fiszki", symbol: "▤" },
    { key: "quick", href: "/gry/kategoria/quick", symbol: "ϟ" },
    ...(course.id === "pl-hr" ? [{ key: "sentences", href: "/gry/kategoria/sentences", symbol: "Aa" }] : []),
    { key: "grammar", href: "/gry/kategoria/grammar", symbol: "↔" },
    ...(course.id === "pl-hr" ? [{ key: "radio", href: "/radio", symbol: "♫" }] : []),
  ];

  return <div className="page dashboard-page">
    <header className="page-head dashboard-heading">
      <div><span className="eyebrow">{course.name[locale]}</span><h1>{t("home.title")}</h1><p className="lede">{t("home.subtitle")}</p></div>
      {last?.status === "active" && <Link className="btn-ghost dashboard-last" to={last.href ?? `/gry/${last.id}`}><span className="eyebrow">{t("home.lastMode")}</span><strong>{t(last.nameKey)} →</strong></Link>}
    </header>

    <ReviewSummary />
    <section className="stack" aria-labelledby="training-title">
      <h2 id="training-title">{t("home.training")}</h2>
      <div className="grid grid-3 dashboard-training">
        <article className="panel panel-pad stack dashboard-training-card dashboard-primary">
          <span className="dashboard-icon" aria-hidden="true">↻</span><h3>{t("home.reviewTitle")}</h3>
          <p className="muted">{available ? t(due ? "home.reviewCount" : "home.noReviews", { n: due }) : t("home.reviewDescription")}</p>
          {available && due === 0 ? <Link className="btn-ghost" to={account ? "/fiszki" : "/powtorki"}>{t("home.openReviews")}</Link> : <Link className="btn" to="/powtorki" onClick={() => flashcardStart("REVIEW")}>{t("home.reviewAction")}</Link>}
        </article>
        <article className="panel panel-pad stack dashboard-training-card">
          <span className="dashboard-icon" aria-hidden="true">＋</span><h3>{t("home.newTitle")}</h3>
          <p className="muted">{t(account ? "home.newDescription" : "home.guestNewDescription")}</p>
          <Link className="btn-ghost" to={account ? "/fiszki/sesja" : "/gry/bura"} onClick={() => flashcardStart("NEW")}>{t("home.newAction")}</Link>
        </article>
        <article className="panel panel-pad stack dashboard-training-card">
          <span className="dashboard-icon" aria-hidden="true">Aa</span><h3>{t(course.id === "pl-hr" ? "home.sentenceTitle" : "home.gamesTitle")}</h3>
          <p className="muted">{t(course.id === "pl-hr" ? "home.sentenceDescription" : "home.gamesDescription")}</p>
          <Link className="btn-ghost" to={course.id === "pl-hr" ? "/gry/sentence-builder" : "/gry"}>{t("home.sentenceAction")}</Link>
        </article>
      </div>
    </section>

    <section className="panel panel-pad stack" aria-labelledby="progress-title" aria-busy={loading}>
      <div className="dashboard-section-head"><div><span className="eyebrow">{t("home.progressEyebrow")}</span><h2 id="progress-title">{t("home.progressTitle")}</h2></div>
        <div className="row" role="group" aria-label={t("home.chooseLevel")}>{LEARNING_LEVELS.map(item => <button className={level === item.id ? "chip on" : "chip"} aria-pressed={level === item.id} key={item.id} onClick={() => setLevel(item.id)}>{item.id}</button>)}</div>
      </div>
      {loading && <p role="status">{t("home.loading")}</p>}
      {error && <div role="alert"><p>{t("home.error")}</p>{!vocabularyError && <button className="btn-ghost" onClick={() => setRetry(n => n + 1)}>{t("home.retry")}</button>}</div>}
      {available && <>
        <div className="dashboard-section-head"><p><strong>{level}</strong> · {t(LEARNING_LEVELS.find(item => item.id === level)!.nameKey)}</p><span className="mono">{t("home.masteryCount", { n: levelMastered, total: pool.length })}</span></div>
        <div className="dashboard-progress" role="img" aria-label={t("home.progressLabel", { mastered: levelMastered, learning, untouched })}>
          <span className="dashboard-mastered" style={{ width: `${pool.length ? levelMastered / pool.length * 100 : 0}%` }} /><span className="dashboard-learning" style={{ width: `${pool.length ? learning / pool.length * 100 : 0}%` }} />
        </div>
        <div className="dashboard-legend"><span><i className="dashboard-mastered" />{t("home.mastered")}: <strong>{levelMastered}</strong></span><span><i className="dashboard-learning" />{t("home.learning")}: <strong>{learning}</strong></span><span><i />{t("home.untouched")}: <strong>{untouched}</strong></span></div>
        <p className="stat-note">{t("home.materialNote", { n: percent })}</p>
        <dl className="dashboard-totals">{[{ label: "seen", value: seen }, { label: "mastered", value: mastered }, { label: account ? "due" : "mistakes", value: due }].map(item => <div key={item.label}><dt>{t(`home.${item.label}`)}</dt><dd>{item.value}</dd></div>)}</dl>
        <p className="stat-note">{t(account ? "home.accountSource" : "home.guestSource")}</p>
      </>}
    </section>

    <section className="stack" aria-labelledby="explore-title"><div className="dashboard-section-head"><h2 id="explore-title">{t("home.explore")}</h2><Link className="mono" to="/gry">{t("home.allGames")} →</Link></div>
      <div className="dashboard-shortcuts">{shortcuts.map(item => <Link className="panel dashboard-shortcut" key={item.key} to={item.href}><span aria-hidden="true">{item.symbol}</span><strong>{t(`home.shortcuts.${item.key}`)}</strong><span aria-hidden="true">→</span></Link>)}</div>
    </section>
  </div>;
}
