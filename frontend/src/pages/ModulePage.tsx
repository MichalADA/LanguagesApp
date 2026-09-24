import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import { useCurriculum } from "@/curriculum/CurriculumProvider";
import { CourseStates } from "@/curriculum/components/CourseStates";
import { LessonList } from "@/curriculum/components/LessonList";
import { coursePaths, useFormatMinutes } from "@/curriculum/components/format";
import type { CefrLevelId } from "@/curriculum/types";

export function ModulePage() {
  const t = useT();
  const formatMinutes = useFormatMinutes();
  const { levelId = "", moduleOrder = "" } = useParams();
  const { status, levelView } = useCurriculum();
  const level = levelId.toUpperCase() as CefrLevelId;
  const view = status === "ready" ? levelView(level) : null;
  const order = Number(moduleOrder);
  const moduleView = view?.modules.find((item) => item.module.order === order);
  const prev = view?.modules.find((item) => item.module.order === order - 1);
  const next = view?.modules.find((item) => item.module.order === order + 1);

  const back = (
    <Link className="text-link back-link" to={coursePaths.overview}>
      <Icon name="arrowLeft" size={14} /> {t("curriculum.backToCourse")}
    </Link>
  );

  if (status !== "ready") {
    return (
      <div className="page">
        {back}
        <CourseStates />
      </div>
    );
  }

  if (!moduleView) {
    return (
      <div className="page">
        {back}
        <div className="course-state surface">
          <h2>{t("curriculum.moduleNotFound")}</h2>
        </div>
      </div>
    );
  }

  const { module } = moduleView;
  return (
    <div className="page page-wide module-page">
      <header className="page-head">
        {back}
        <span className="eyebrow">
          {level} · {t("curriculum.moduleNumber", { n: module.order })}
        </span>
        <h1>{module.title}</h1>
        <p className="lede">{module.description}</p>
      </header>

      <div className="course-layout">
        <section className="course-main">
          <div className="module-progress">
            <div className={moduleView.status === "completed" ? "bar gold" : "bar"} aria-hidden="true">
              <span style={{ width: `${moduleView.percent}%` }} />
            </div>
            <span className="meta">
              {t("curriculum.moduleDone", { done: moduleView.completedCount, total: module.lessons.length })} ·{" "}
              {t("curriculum.moduleMeta", { n: module.lessons.length, time: formatMinutes(moduleView.minutes) })}
            </span>
          </div>
          {moduleView.status === "locked" && <p className="meta">{t("curriculum.lockedHint")}</p>}
          <div className="surface module-lessons">
            <LessonList lessons={moduleView.lessons} />
          </div>
          <nav className="module-pager">
            {prev ? (
              <Link className="text-link" to={coursePaths.module(level, prev.module.order)}>
                <Icon name="arrowLeft" size={14} /> {prev.module.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link className="text-link" to={coursePaths.module(level, next.module.order)}>
                {next.module.title} <Icon name="arrowRight" size={14} />
              </Link>
            )}
          </nav>
        </section>

        <aside className="course-rail">
          <section className="rail-block can-do" aria-labelledby="can-do-title">
            <h2 id="can-do-title">{t("curriculum.canDo")}</h2>
            <ul>
              {module.canDo.map((item) => (
                <li key={item}>
                  <Icon name="check" size={15} />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
