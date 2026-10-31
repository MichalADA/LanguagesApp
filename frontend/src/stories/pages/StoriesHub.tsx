import { Link } from "react-router-dom";
import { useCourse } from "@/courses/CourseProvider";
import { useT } from "@/i18n";
import { STORIES } from "../data";
import { Art, MAPS } from "../art/registry";

/**
 * /stories — wybór miasta. Każdy poziom CEFR to osobne miasto; grywalne są Split (A1), Zagrzeb (A2) i Dubrownik (B1).
 * Grywalne miasto to karta z mapą (obiekt, który się „bierze do ręki”), zapowiedzi to cicha lista.
 */
export function StoriesHub() {
  const t = useT();
  const { course } = useCourse();
  const stories = STORIES.filter((s) => s.courseId === course.id);
  const open = stories.filter((s) => Boolean(s.load));
  const upcoming = stories.filter((s) => !s.load);

  return (
    <div className="page stories-hub">
      <header className="page-head">
        <h1>{t("stories.title")}</h1>
        <p className="lede">{t("stories.subtitle")}</p>
      </header>
      {stories.length === 0 ? (
        <p className="empty">{t("stories.noCourse")}</p>
      ) : (
        <>
          {open.map((s) => (
            <Link key={s.id} to={`/stories/${s.id}`} className="stories-city">
              <div className="stories-city-art"><Art id={s.map ?? "split-map"} registry={MAPS} /></div>
              <div className="stories-city-body">
                <span className="stories-city-level">{s.level}</span>
                <h2 lang="hr">{s.city.hr}</h2>
                <p className="muted">{s.tagline}</p>
                <span className="stories-city-cta">{t("stories.enterCity", { city: s.city.hr })}</span>
              </div>
            </Link>
          ))}
          {upcoming.length > 0 && (
            <section className="stories-upcoming" aria-labelledby="stories-upcoming-title">
              <h2 id="stories-upcoming-title" className="step-label">{t("stories.upcoming")}</h2>
              <ul>
                {upcoming.map((s) => (
                  <li key={s.id} aria-disabled="true">
                    <span className="stories-upcoming-city" lang="hr">{s.city.hr}</span>
                    <span className="stories-upcoming-level">{s.level}</span>
                    <span className="muted">{s.tagline}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
