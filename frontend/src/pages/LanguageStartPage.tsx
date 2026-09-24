import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ProgressBar } from "@/components/StatCard";
import { useCourse } from "@/courses/CourseProvider";
import { PLANNED_COURSES } from "@/courses/registry";
import { useI18n, UI_LOCALES } from "@/i18n";
import type { UiLocale } from "@/i18n/types";
import { useProgress } from "@/progress/ProgressProvider";
import { summarize } from "@/progress/service";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";

export function LanguageStartPage() {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const { course, courses, setCourse } = useCourse();
  const { entries } = useVocabulary();
  const { state, courseId } = useProgress();
  const summary = summarize(state, courseId);
  const mastery = entries.length ? Math.round((summary.learned / entries.length) * 100) : 0;
  const planned = PLANNED_COURSES.filter((item) => locale !== "pl" || item.id !== "en-pl");

  const openCourse = (id: string) => {
    setCourse(id);
    navigate("/", { replace: true });
  };

  return (
    <main className="language-start">
      <section className="language-start-card" aria-labelledby="language-start-title">
        <header className="language-start-topbar">
          <Logo size={38} />
          <div className="language-start-actions">
            <div className="locale-switch" aria-label={t("settings.uiLanguage")}>
              {UI_LOCALES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={locale === item.id ? "locale-option active" : "locale-option"}
                  onClick={() => setLocale(item.id as UiLocale)}
                >
                  {item.id.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="beta-badge">Beta</span>
          </div>
        </header>

        <div className="language-start-heading">
          <span className="eyebrow">{t("course.startEyebrow")}</span>
          <h1 id="language-start-title">{t("course.welcome")}</h1>
          <p>{t("course.chooseIntro")}</p>
        </div>

        <section className="featured-course" aria-label={t("course.available")}>
          {courses.map((item) => (
            <article key={item.id} className="featured-course-card">
              <div className="featured-course-main">
                <div className="language-code" aria-hidden="true">{item.targetLanguage.toUpperCase()}</div>
                <div className="featured-course-copy">
                  <span className="featured-course-kicker">{t("course.ready")}</span>
                  <h2>{item.name[locale]}</h2>
                  <p>{item.nativeName} · A1–B1</p>
                </div>
                <span className="course-arrow" aria-hidden="true">→</span>
              </div>
              {item.id === course.id && (
                <div className="course-progress">
                  <div className="course-progress-meta">
                    <span>{t("course.progress")}</span>
                    <span>{summary.learned} / {entries.length || "…"} · {mastery}%</span>
                  </div>
                  <ProgressBar percent={mastery} />
                </div>
              )}
              <button type="button" className="btn course-continue" onClick={() => openCourse(item.id)}>
                {t("course.continueLearning")}
                <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </section>

        <section className="planned-languages">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">{t("course.nextCourses")}</span>
              <h2>{t("course.planned")}</h2>
            </div>
            <span className="stat-note">{t("course.plannedNote")}</span>
          </div>
          <div className="planned-language-grid">
            {planned.map((item) => (
              <article key={item.id} className="planned-language-card">
                <span className="planned-language-flag" aria-hidden="true">{item.flag}</span>
                <div>
                  <h3>{item.name[locale]}</h3>
                  <span>{item.nativeName}</span>
                </div>
                <span className="badge">{t("common.soon")}</span>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
