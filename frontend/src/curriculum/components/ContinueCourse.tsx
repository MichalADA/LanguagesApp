import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/i18n";
import type { LevelView } from "../progress";
import { coursePaths } from "./format";

/**
 * „Kontynuuj kurs” — jedna linia ścieżki: gdzie jestem, co dalej, ile to potrwa.
 * `variant="band"` na pulpicie (nie konkuruje z planem dnia), `"rail"` w bocznej kolumnie kursu.
 */
export function ContinueCourse({ view, variant = "band", primary = true }: { view: LevelView; variant?: "band" | "rail"; primary?: boolean }) {
  const { t } = useI18n();
  const current = view.current;

  if (!current) {
    return (
      <section className={`continue-course ${variant} done`}>
        <div className="continue-course-body">
          <span className="eyebrow">{t("curriculum.continueCourse")}</span>
          <h2 className="continue-course-title">{t("curriculum.levelDone")}</h2>
          <p className="continue-course-desc">{t("curriculum.levelDoneText")}</p>
        </div>
      </section>
    );
  }

  const { lesson } = current.lesson;
  return (
    <section className={`continue-course ${variant}`} aria-labelledby={`continue-${variant}`}>
      <div className="continue-course-body">
        <span className="eyebrow">
          {t("curriculum.continueCourse")} ·{" "}
          {t("curriculum.location", { level: view.level.id, module: current.module.module.order, lesson: lesson.order })}
        </span>
        <h2 id={`continue-${variant}`} className="continue-course-title">
          {lesson.title}
        </h2>
        <p className="continue-course-desc">{lesson.shortDescription}</p>
        <span className="continue-course-meta">
          <Icon name="clock" size={14} />
          {t("curriculum.minutes", { n: lesson.estimatedMinutes })}
          <span aria-hidden="true">·</span>
          {t("curriculum.lessonsCount", { done: view.completedCount, total: view.total })}
        </span>
      </div>
      {/* Na pulpicie główną akcją jest plan dnia — tu przycisk drugorzędny, żeby nie było dwóch głównych. */}
      <Link className={primary ? "btn" : "btn-ghost"} to={coursePaths.lesson(lesson.id)}>
        {t("curriculum.continue")}
        <Icon name="arrowRight" size={16} />
      </Link>
      {variant === "band" && (
        <span className="continue-course-track" aria-hidden="true">
          <span style={{ width: `${view.percent}%` }} />
        </span>
      )}
    </section>
  );
}
