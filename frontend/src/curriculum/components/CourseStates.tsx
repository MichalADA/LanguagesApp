import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { useCurriculum } from "../CurriculumProvider";

/** Wspólne stany strony kursu: ładowanie, błąd, brak kursu dla języka. Zwraca null, gdy dane są gotowe. */
export function CourseStates() {
  const t = useT();
  const { status, retry } = useCurriculum();
  if (status === "loading") {
    return (
      <div className="course-state" role="status">
        <span className="loading">{t("curriculum.loading")}</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="course-state">
        <div className="inline-alert" role="alert">
          <span>{t("curriculum.error")}</span>
          <button type="button" className="linklike" onClick={retry}>
            {t("curriculum.retry")}
          </button>
        </div>
      </div>
    );
  }
  if (status === "unavailable") {
    return (
      <div className="course-state surface">
        <h2>{t("curriculum.unavailable")}</h2>
        <p className="muted">{t("curriculum.unavailableText")}</p>
        <Link className="btn-ghost" to="/">
          {t("curriculum.goTraining")}
        </Link>
      </div>
    );
  }
  return null;
}
