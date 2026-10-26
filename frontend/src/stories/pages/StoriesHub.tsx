import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useCourse } from "@/courses/CourseProvider";
import { useT } from "@/i18n";
import { STORIES } from "../data";
import { Art, MAPS } from "../art/registry";

/** /stories — wybór miasta. Każdy poziom CEFR to osobne miasto; dziś grywalny jest Split (A1). */
export function StoriesHub() {
  const t = useT();
  const { course } = useCourse();
  const stories = STORIES.filter((s) => s.courseId === course.id);

  return (
    <div className="page stories-hub">
      <header className="page-head">
        <span className="eyebrow">{t("stories.eyebrow")}</span>
        <h1>{t("stories.title")}</h1>
        <p className="lede">{t("stories.subtitle")}</p>
      </header>
      {stories.length === 0 ? (
        <div className="panel empty">{t("stories.noCourse")}</div>
      ) : (
        <div className="stories-cities">
          {stories.map((s) => {
            const playable = Boolean(s.load);
            const body = (
              <>
                <div className="stories-city-art">{playable ? <Art id="split-map" registry={MAPS} /> : <Art id="placeholder" />}</div>
                <div className="stories-city-body">
                  <span className="badge on">{s.level}</span>
                  <h2>{s.city.hr}</h2>
                  <p className="muted">{s.tagline}</p>
                  {playable ? (
                    <span className="mode-card-action">
                      {t("stories.enterCity", { city: s.city.hr })} <Icon name="arrowRight" size={14} />
                    </span>
                  ) : (
                    <span className="badge">{t("common.soon")}</span>
                  )}
                </div>
              </>
            );
            return playable ? (
              <Link key={s.id} to={`/stories/${s.id}`} className="panel stories-city">
                {body}
              </Link>
            ) : (
              <article key={s.id} className="panel stories-city locked" aria-disabled="true">
                {body}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
