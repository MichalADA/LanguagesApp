import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import type { ModuleView } from "../progress";
import { coursePaths, pad2, useFormatMinutes } from "./format";
import { LessonList } from "./LessonList";

/** Moduł jako sekcja akordeonu: nagłówek z postępem, po rozwinięciu lista lekcji. */
export function CourseModule({
  view,
  open,
  onToggle,
}: {
  view: ModuleView;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const formatMinutes = useFormatMinutes();
  const { module } = view;
  const panelId = `module-${module.id}`;

  return (
    <li className={`course-module ${view.status}${open ? " open" : ""}`}>
      <button type="button" className="course-module-head" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="course-module-number">{pad2(module.order)}</span>
        <span className="course-module-title">
          <strong>{module.title}</strong>
          <span className="meta">
            {t("curriculum.moduleMeta", { n: module.lessons.length, time: formatMinutes(view.minutes) })}
          </span>
        </span>
        <span className="course-module-progress">
          <span className={view.status === "completed" ? "bar gold" : "bar"} aria-hidden="true">
            <span style={{ width: `${view.percent}%` }} />
          </span>
          <span className="course-module-count">
            {t("curriculum.moduleDone", { done: view.completedCount, total: module.lessons.length })}
          </span>
        </span>
        <span className={`course-module-status ${view.status}`}>{t(`curriculum.moduleStatus.${view.status}`)}</span>
        <span className="course-module-chevron">
          <Icon name="chevronDown" size={18} />
        </span>
      </button>
      {open && (
        <div className="course-module-panel">
          <LessonList lessons={view.lessons} id={panelId} />
          <Link className="text-link course-module-link" to={coursePaths.module(module.levelId, module.order)}>
            {t("curriculum.openModule")} <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      )}
    </li>
  );
}
