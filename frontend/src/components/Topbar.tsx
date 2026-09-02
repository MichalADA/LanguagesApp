import { Link } from "react-router-dom";
import { useCourse } from "@/courses/CourseProvider";
import { useI18n } from "@/i18n";
import { UserMenu } from "./UserMenu";

export function Topbar() {
  const { course } = useCourse();
  const { locale, t } = useI18n();

  return (
    <header className="topbar">
      <Link to="/jezyki" className="course-pill" title={t("course.switch")}>
        <span className="course-flag" aria-hidden="true">
          {course.flag}
        </span>
        <span className="course-pill-text">
          <span className="course-pill-name">{course.name[locale]}</span>
          <span className="course-pill-pair">
            {course.sourceLanguage.toUpperCase()} → {course.targetLanguage.toUpperCase()}
          </span>
        </span>
      </Link>

      <UserMenu />
    </header>
  );
}
