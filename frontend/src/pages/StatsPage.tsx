import { useEffect, useMemo, useState } from "react";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { isLearned, masteryOf, statFor, summarize } from "@/progress/service";
import { StatCard, ProgressBar } from "@/components/StatCard";
import { GAMES } from "@/games/registry";
import { currentStreak, formatRelative } from "@/utils/date";
import { useT } from "@/i18n";
import { useAuth } from "@/auth/useAuth";
import { fetchUserStatistics } from "@/statistics/statisticsApi";
import type { UserStatistics } from "@/statistics/statisticsApi";
import { entriesForLevel, LEARNING_LEVELS } from "@/config/learningLevels";

export function StatsPage() {
  const t = useT();
  const { status, apiRequest } = useAuth();
  const { course } = useCourse();
  const { entries } = useVocabulary();
  const { state, current, courseId } = useProgress();
  const summary = summarize(state, courseId);
  const [accountStatistics, setAccountStatistics] = useState<UserStatistics | null>(null);
  const [statisticsError, setStatisticsError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") {
      setAccountStatistics(null);
      setStatisticsError(false);
      return;
    }
    let active = true;
    setAccountStatistics(null);
    setStatisticsError(false);
    void fetchUserStatistics(apiRequest, course.id)
      .then((result) => {
        if (active) setAccountStatistics(result);
      })
      .catch(() => {
        if (active) setStatisticsError(true);
      });
    return () => {
      active = false;
    };
  }, [status, apiRequest, course.id, reload]);

  const lastActivity = useMemo(() => {
    const times = Object.values(current.words).map((w) => w.lastSeen);
    return times.length ? Math.max(...times) : 0;
  }, [current.words]);

  const byPos = useMemo(() => {
    const total = new Map<string, number>();
    const learned = new Map<string, number>();
    for (const e of entries) {
      total.set(e.partOfSpeech, (total.get(e.partOfSpeech) ?? 0) + 1);
      if (isLearned(statFor(state, courseId, e)))
        learned.set(e.partOfSpeech, (learned.get(e.partOfSpeech) ?? 0) + 1);
    }
    return [...total.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([pos, count]) => ({ pos, count, learned: learned.get(pos) ?? 0 }));
  }, [entries, state, courseId]);

  if (status === "authenticated") {
    return (
      <div className="page">
        <header className="page-head">
          <span className="eyebrow">{t("stats.eyebrow")}</span>
          <h1>{t("stats.title")}</h1>
          <p className="lede">{t("stats.accountData")}</p>
        </header>

        {!accountStatistics && !statisticsError && (
          <section className="panel panel-pad">
            <span className="loading">{t("stats.loadingAccount")}</span>
          </section>
        )}

        {statisticsError && (
          <section className="panel panel-pad stack" style={{ gap: 12 }}>
            <p className="form-message error" role="alert">{t("stats.loadError")}</p>
            <button type="button" className="btn-ghost" onClick={() => setReload((value) => value + 1)}>
              {t("stats.retry")}
            </button>
          </section>
        )}

        {accountStatistics && (
          <section className="grid grid-3">
            <StatCard value={accountStatistics.totalAnswers} label={t("stats.attempts")} />
            <StatCard value={accountStatistics.correctAnswers} label={t("stats.correct")} />
            <StatCard value={`${accountStatistics.accuracy}%`} label={t("dashboard.accuracy")} />
            <StatCard value={accountStatistics.wordsLearned} label={t("stats.wordsLearned")} />
            <StatCard tone="gold" value={accountStatistics.currentStreak} label={t("dashboard.streak")} />
            <StatCard value={accountStatistics.totalSessions} label={t("stats.sessions")} />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("stats.eyebrow")}</span>
        <h1>{t("stats.title")}</h1>
      </header>

      <section className="grid grid-3">
        <StatCard value={current.totalAttempts} label={t("stats.attempts")} />
        <StatCard value={current.totalCorrect} label={t("stats.correct")} />
        <StatCard value={`${summary.accuracy}%`} label={t("dashboard.accuracy")} />
        <StatCard value={summary.seen} label={t("stats.seen")} />
        <StatCard tone="gold" value={currentStreak(current.activeDays)} label={t("dashboard.streak")} />
        <StatCard value={formatRelative(lastActivity)} label={t("dashboard.lastSeen")} />
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <span className="eyebrow">{t("stats.levels")}</span>
        <div className="stack" style={{ gap: 16 }}>
          {LEARNING_LEVELS.map((level) => {
            const inLevel = entriesForLevel(entries, level.id, course.blocks);
            const pct = masteryOf(state, courseId, inLevel);
            return (
              <div key={level.id} className="stack" style={{ gap: 7 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {level.id} · {t(level.nameKey)}
                  </span>
                  <span className="mono dim" style={{ fontSize: 13 }}>
                    {pct}%
                  </span>
                </div>
                <ProgressBar percent={pct} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <span className="eyebrow">{t("stats.pos")}</span>
        <div className="list">
          {byPos.map((r) => (
            <div key={r.pos} className="list-row">
              <span className="muted">{r.pos}</span>
              <span className="mono" style={{ fontSize: 13 }}>
                {r.learned} / {r.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <span className="eyebrow">{t("stats.records")}</span>
        <div className="list">
          {GAMES.filter((g) => g.status === "active").map((g) => {
            const rec = current.games[g.id];
            return (
              <div key={g.id} className="list-row">
                <span>{t(g.nameKey)}</span>
                <span className="mono dim" style={{ fontSize: 13 }}>
                  {rec
                    ? t("games.record", { score: rec.bestScore, rounds: rec.rounds })
                    : t("games.noRound")}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
