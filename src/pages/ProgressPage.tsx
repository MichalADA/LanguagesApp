import { useMemo } from "react";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { isLearned, needsReview, statFor, summarize } from "@/progress/service";
import { ProgressBar } from "@/components/StatCard";
import { currentStreak, todayKey } from "@/utils/date";
import { useT } from "@/i18n";

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

  const perBlock = useMemo(
    () =>
      course.blocks.map((b, i) => {
        const inBlock = entries.filter((e) => e.block === b.id);
        const stats = inBlock.map((e) => statFor(state, courseId, e));
        return {
          ...b,
          index: i,
          total: inBlock.length,
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
        <span className="eyebrow">{t("progress.blocks")}</span>
        <div className="grid grid-2">
          {perBlock.map((b) => (
            <div key={b.id} className="panel panel-pad stack" style={{ gap: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3>{t("pool.block", { n: b.index + 1, range: b.range })}</h3>
                <span className="mono dim" style={{ fontSize: 13 }}>
                  {b.total ? Math.round((b.learned / b.total) * 100) : 0}%
                </span>
              </div>
              <ProgressBar percent={b.total ? (b.learned / b.total) * 100 : 0} />
              <span className="stat-note">
                {t("progress.blockNote", {
                  learned: b.learned,
                  review: b.review,
                  untouched: b.untouched,
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
