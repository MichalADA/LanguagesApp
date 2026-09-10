import { useMemo } from "react";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { isLearned, needsReview, statFor, summarize } from "@/progress/service";
import { ProgressBar } from "@/components/StatCard";
import { currentStreak, todayKey } from "@/utils/date";
import { useT } from "@/i18n";
import { entriesForLevel, LEARNING_LEVELS } from "@/config/learningLevels";

function ActivityGrid({ days }: { days: readonly string[] }) {
  const set = new Set(days);
  const cells: { key: string; on: boolean }[] = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = todayKey(d);
    cells.push({ key, on: set.has(key) });
  }
  return (
    <div className="activity-grid">
      {cells.map((c) => (
        <div key={c.key} title={c.key} className={c.on ? "activity-cell on" : "activity-cell"} />
      ))}
    </div>
  );
}

export function ProgressPage() {
  const t = useT();
  const { course } = useCourse();
  const { entries } = useVocabulary();
  const { state, current, courseId } = useProgress();
  const summary = summarize(state, courseId);

  const perLevel = useMemo(
    () =>
      LEARNING_LEVELS.map((level) => {
        const inLevel = entriesForLevel(entries, level.id, course.blocks);
        const stats = inLevel.map((entry) => statFor(state, courseId, entry));
        return {
          ...level,
          total: inLevel.length,
          learned: stats.filter(isLearned).length,
          review: stats.filter(needsReview).length,
          untouched: stats.filter((s) => s.attempts === 0).length,
        };
      }),
    [course.blocks, entries, state, courseId],
  );

  const overall = entries.length ? Math.round((summary.learned / entries.length) * 100) : 0;

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("progress.eyebrow")}</span>
        <h1>{t("progress.title")}</h1>
      </header>

      <section className="panel panel-pad stack" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{t("progress.whole")}</h2>
          <span className="mono muted">
            {summary.learned} / {entries.length || "…"} · {overall}%
          </span>
        </div>
        <ProgressBar percent={overall} />
        <span className="stat-note">{t("progress.wholeNote")}</span>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <span className="eyebrow">{t("progress.levels")}</span>
        <div className="grid grid-2">
          {perLevel.map((level) => (
            <div key={level.id} className="panel panel-pad stack" style={{ gap: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3>{level.id} · {t(level.nameKey)}</h3>
                <span className="mono dim" style={{ fontSize: 13 }}>
                  {level.total ? Math.round((level.learned / level.total) * 100) : 0}%
                </span>
              </div>
              <ProgressBar percent={level.total ? (level.learned / level.total) * 100 : 0} />
              <span className="stat-note">
                {t("progress.levelNote", {
                  learned: level.learned,
                  review: level.review,
                  untouched: level.untouched,
                })}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel panel-pad stack" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{t("progress.activity")}</h2>
          <span className="mono muted">
            {t("progress.streakDays", { n: currentStreak(current.activeDays) })}
          </span>
        </div>
        <ActivityGrid days={current.activeDays} />
        <span className="stat-note">{t("progress.activityNote")}</span>
      </section>
    </div>
  );
}
