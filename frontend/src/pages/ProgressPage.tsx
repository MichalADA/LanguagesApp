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

  const streak = currentStreak(current.activeDays);

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("progress.eyebrow")}</span>
        <h1>{t("progress.title")}</h1>
      </header>

      <section className="progress-overview">
        <div className="surface progress-whole">
          <span className="eyebrow">{t("progress.whole")}</span>
          <div className="level-known">
            <strong>{summary.learned}</strong>
            <span>/ {entries.length || "…"}</span>
            <span className="progress-percent">{overall}%</span>
          </div>
          <ProgressBar percent={overall} />
          <span className="meta">{t("progress.wholeNote")}</span>
        </div>

        <div className="surface progress-activity">
          <div className="section-head">
            <h2>{t("progress.activity")}</h2>
            <span className="streak-pill">{t("progress.streakDays", { n: streak })}</span>
          </div>
          <ActivityGrid days={current.activeDays} />
          <span className="meta">{t("progress.activityNote")}</span>
        </div>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <h2 className="cap">{t("progress.levels")}</h2>
        <ol className="level-list">
          {perLevel.map((level) => {
            const pct = level.total ? Math.round((level.learned / level.total) * 100) : 0;
            return (
              <li key={level.id} className="level-row">
                <span className="level-badge">{level.id}</span>
                <div className="level-row-body">
                  <div className="level-row-head">
                    <h3>{t(level.nameKey)}</h3>
                    <span className="mono">
                      <strong>{level.learned}</strong> / {level.total} · {pct}%
                    </span>
                  </div>
                  <ProgressBar percent={pct} />
                  <span className="meta">
                    {t("progress.levelNote", {
                      learned: level.learned,
                      review: level.review,
                      untouched: level.untouched,
                    })}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
