import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import type { LessonView } from "../progress";
import { coursePaths } from "./format";

export function LessonStatusMark({ status }: { status: LessonView["status"] }) {
  return (
    <span className={`lesson-mark ${status}`} aria-hidden="true">
      {status === "completed" && <Icon name="check" size={14} />}
      {status === "locked" && <Icon name="lock" size={13} />}
    </span>
  );
}

export function LessonRow({ row }: { row: LessonView }) {
  const t = useT();
  const { lesson, status } = row;
  const body = (
    <>
      <LessonStatusMark status={status} />
      <span className="lesson-row-body">
        <span className="lesson-row-title">
          <span className="lesson-row-index">{lesson.order}.</span>
          {lesson.title}
        </span>
        <span className="lesson-row-desc">{lesson.shortDescription}</span>
      </span>
      <span className="lesson-row-meta">{t("curriculum.minutes", { n: lesson.estimatedMinutes })}</span>
      <span className="lesson-row-action">
        {status === "current" ? (
          <span className="btn btn-sm">
            {t("curriculum.continue")}
            <Icon name="arrowRight" size={15} />
          </span>
        ) : status === "locked" ? (
          <span className="sr-only">{t("curriculum.lessonStatus.locked")}</span>
        ) : (
          <span className="lesson-row-link">
            {t(status === "completed" ? "curriculum.repeat" : "curriculum.start")}
            <Icon name="arrowRight" size={14} />
          </span>
        )}
      </span>
    </>
  );

  if (status === "locked") {
    return (
      <li className="lesson-row locked" title={t("curriculum.lockedHint")}>
        {body}
      </li>
    );
  }
  return (
    <li>
      <Link className={`lesson-row ${status}`} to={coursePaths.lesson(lesson.id)} aria-current={status === "current" ? "step" : undefined}>
        {body}
      </Link>
    </li>
  );
}

export function LessonList({ lessons, id }: { lessons: LessonView[]; id?: string }) {
  return (
    <ol className="lesson-list" id={id}>
      {lessons.map((row) => (
        <LessonRow key={row.lesson.id} row={row} />
      ))}
    </ol>
  );
}
