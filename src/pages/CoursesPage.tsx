import { useCourse } from "@/courses/CourseProvider";
import { PLANNED_COURSES } from "@/courses/registry";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { summarize } from "@/progress/service";
import { ProgressBar } from "@/components/StatCard";
import { useI18n } from "@/i18n";

export function CoursesPage() {
  const { t, locale } = useI18n();
  const { course, courses, setCourse } = useCourse();
  const { entries } = useVocabulary();
  const { state, courseId } = useProgress();
  const summary = summarize(state, courseId);
  const mastery = entries.length ? Math.round((summary.learned / entries.length) * 100) : 0;

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("course.title")}</span>
        <h1>{t("nav.courses")}</h1>
        <p className="lede">{t("course.subtitle")}</p>
      </header>

      <section className="stack" style={{ gap: 12 }}>
        <span className="eyebrow">{t("course.available")}</span>
        <div className="grid grid-2">
          {courses.map((c) => {
            const active = c.id === course.id;
            return (
              <article key={c.id} className={active ? "panel panel-pad course-card on" : "panel panel-pad course-card"}>
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  <span className="course-flag big" aria-hidden="true">
                    {c.flag}
                  </span>
                  <div className="stack" style={{ gap: 2 }}>
                    <h2 style={{ fontSize: 20 }}>{c.name[locale]}</h2>
                    <span className="mono dim" style={{ fontSize: 12 }}>
                      {c.nativeName} · {c.sourceLanguage.toUpperCase()} → {c.targetLanguage.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="muted" style={{ fontSize: 14 }}>
                  {t("course.learningFrom", {
                    source: c.sourceName[locale],
                    target: c.name[locale].toLocaleLowerCase(),
                  })}
                </p>

                {active && (
                  <div className="stack" style={{ gap: 8 }}>
                    <ProgressBar percent={mastery} />
                    <span className="stat-note">
                      {summary.learned} / {entries.length || "…"} · {mastery}%
                    </span>
                  </div>
                )}

                <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
                  <span className="mono dim" style={{ fontSize: 12 }}>
                    {c.specialCharacters.join(" ")}
                  </span>
                  {active ? (
                    <span className="badge on">{t("course.selected")}</span>
                  ) : (
                    <button type="button" className="btn" onClick={() => setCourse(c.id)}>
                      {t("course.select")}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <span className="eyebrow">{t("course.planned")}</span>
        <div className="list">
          {PLANNED_COURSES.map((c) => (
            <div key={c.id} className="list-row">
              <span className="row" style={{ gap: 10 }}>
                <span aria-hidden="true">{c.flag}</span>
                <span className="muted">{c.name[locale]}</span>
                <span className="mono dim" style={{ fontSize: 12 }}>
                  {c.nativeName}
                </span>
              </span>
              <span className="badge">{t("common.soon")}</span>
            </div>
          ))}
        </div>
        <span className="stat-note">{t("course.plannedNote")}</span>
      </section>
    </div>
  );
}
