import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import { useCurriculum } from "@/curriculum/CurriculumProvider";
import { CourseStates } from "@/curriculum/components/CourseStates";
import { coursePaths, pad2 } from "@/curriculum/components/format";
import { LessonPlayer } from "@/curriculum/player/LessonPlayer";
import { LessonProgress } from "@/curriculum/player/LessonProgress";
import { nextLessonId } from "@/curriculum/progress";
import { fetchLessonContent } from "@/curriculum/repository";
import type { LessonContent } from "@/curriculum/types";

/** /lekcja/:lessonId — pełnoekranowy tryb skupienia, bez sidebaru. */
export function LessonPage() {
  const t = useT();
  const { lessonId = "" } = useParams();
  const { status, outline, levelView, completeLesson } = useCurriculum();
  const [content, setContent] = useState<{ id: string; data: LessonContent | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fetchLessonContent(lessonId)
      .then((data) => alive && setContent({ id: lessonId, data }))
      .catch(() => alive && setContent({ id: lessonId, data: null }));
    return () => {
      alive = false;
    };
  }, [lessonId]);

  const level = outline?.levels.find((item) => item.modules.some((module) => module.lessons.some((lesson) => lesson.id === lessonId)));
  const view = level ? levelView(level.id) : null;
  const moduleView = view?.modules.find((item) => item.lessons.some((row) => row.lesson.id === lessonId));
  const row = moduleView?.lessons.find((item) => item.lesson.id === lessonId);
  const onComplete = useCallback(() => completeLesson(lessonId), [completeLesson, lessonId]);

  if (status !== "ready" || !content || content.id !== lessonId) {
    return (
      <div className="lesson-shell">
        <main className="lesson-stage">
          {status === "ready" ? (
            <span className="loading" role="status">{t("curriculum.loading")}</span>
          ) : (
            <CourseStates />
          )}
        </main>
      </div>
    );
  }

  if (!view || !moduleView || !row || !level) {
    return (
      <div className="lesson-shell">
        <main className="lesson-stage lesson-message">
          <h1 className="display">{t("curriculum.player.notFound")}</h1>
          <Link className="btn-ghost" to={coursePaths.overview}>
            {t("curriculum.player.backToCourse")}
          </Link>
        </main>
      </div>
    );
  }

  const moduleHref = coursePaths.module(level.id, moduleView.module.order);
  const next = nextLessonId(level, lessonId);
  const header = {
    position: t("curriculum.player.position", { level: level.id, n: pad2(row.number), total: view.total }),
    title: row.lesson.title,
    meta: t("curriculum.player.meta", { n: row.lesson.order, m: row.lesson.estimatedMinutes }),
    closeTo: moduleHref,
  };

  if (row.status === "locked") {
    return (
      <div className="lesson-shell">
        <LessonProgress {...header} percent={0} stage={null} />
        <main className="lesson-stage lesson-message">
          <span className="lesson-message-icon"><Icon name="lock" size={22} /></span>
          <h2>{t("curriculum.player.locked")}</h2>
          <p className="muted">{t("curriculum.lockedHint")}</p>
          <Link className="btn-ghost" to={moduleHref}>
            {t("curriculum.player.backToModule")}
          </Link>
        </main>
      </div>
    );
  }

  if (!content.data) {
    const done = row.status === "completed";
    return (
      <div className="lesson-shell">
        <LessonProgress {...header} percent={done ? 100 : 0} stage={null} />
        <main className="lesson-stage lesson-message">
          <span className="eyebrow">{t("curriculum.player.pendingTitle")}</span>
          <h2 className="display lesson-message-title">{row.lesson.title}</h2>
          <p className="step-lede">{row.lesson.shortDescription}</p>
          <p className="muted">{t("curriculum.player.pendingText")}</p>
          <div className="summary-actions">
            {!done && (
              <button type="button" className="btn btn-lg" onClick={onComplete}>
                {t("curriculum.player.markDone")}
              </button>
            )}
            {done && next && (
              <Link className="btn btn-lg" to={coursePaths.lesson(next)}>
                {t("curriculum.nextLesson")} <Icon name="arrowRight" size={18} />
              </Link>
            )}
            <Link className="btn-ghost" to={coursePaths.lesson("a1-01-02")}>
              {t("curriculum.player.openDemo")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <LessonPlayer
      key={lessonId}
      content={content.data}
      header={header}
      nextHref={next ? coursePaths.lesson(next) : null}
      moduleHref={moduleHref}
      onComplete={onComplete}
    />
  );
}
