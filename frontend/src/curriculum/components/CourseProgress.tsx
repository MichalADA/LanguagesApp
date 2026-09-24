import { useT } from "@/i18n";
import type { LevelView } from "../progress";
import { useFormatMinutes } from "./format";

/** Podsumowanie poziomu: jedna liczba na pierwszym planie, reszta jako metadane. */
export function CourseProgress({ view }: { view: LevelView }) {
  const t = useT();
  const formatMinutes = useFormatMinutes();
  return (
    <div className="course-progress-block">
      <div className="course-progress-head">
        <span className="course-level-name">
          {view.level.id} · {view.level.title}
        </span>
        <span className="course-percent">{view.percent}%</span>
      </div>
      <div className="course-count">
        <strong>{view.completedCount}</strong>
        <span>
          / {view.total} {t("curriculum.lessonsOf")}
        </span>
      </div>
      <div className="bar course-bar" role="progressbar" aria-valuemin={0} aria-valuemax={view.total} aria-valuenow={view.completedCount} aria-label={t("curriculum.lessonsCount", { done: view.completedCount, total: view.total })}>
        <span style={{ width: `${view.percent}%` }} />
      </div>
      <ul className="course-facts">
        <li>{t("curriculum.modulesDone", { done: view.completedModules, total: view.modules.length })}</li>
        {view.minutesLeft > 0 && <li>{t("curriculum.timeLeft", { time: formatMinutes(view.minutesLeft) })}</li>}
      </ul>
    </div>
  );
}
