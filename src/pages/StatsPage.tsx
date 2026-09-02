import { useMemo } from "react";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { isLearned, masteryOf, statFor, summarize } from "@/progress/service";
import { StatCard, ProgressBar } from "@/components/StatCard";
import { GAMES } from "@/games/registry";
import { currentStreak, formatRelative } from "@/utils/date";
import { useT } from "@/i18n";

export function StatsPage() {
  const t = useT();
  const { course } = useCourse();
  const { entries } = useVocabulary();
  const { state, current, courseId } = useProgress();
  const summary = summarize(state, courseId);

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
        <span className="eyebrow">{t("stats.blocks")}</span>
        <div className="stack" style={{ gap: 16 }}>
          {course.blocks.map((b, i) => {
            const inBlock = entries.filter((e) => e.block === b.id);
            const pct = masteryOf(state, courseId, inBlock);
            return (
              <div key={b.id} className="stack" style={{ gap: 7 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {t("pool.block", { n: i + 1, range: b.range })}
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
                <span>{g.name}</span>
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
