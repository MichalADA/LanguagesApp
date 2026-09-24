import { useState } from "react";
import { useI18n } from "@/i18n";
import { useCourse } from "@/courses/CourseProvider";
import { useCurriculum } from "@/curriculum/CurriculumProvider";
import { ContinueCourse } from "@/curriculum/components/ContinueCourse";
import { CourseModule } from "@/curriculum/components/CourseModule";
import { CourseProgress } from "@/curriculum/components/CourseProgress";
import { CourseStates } from "@/curriculum/components/CourseStates";
import { LevelSelector } from "@/curriculum/components/LevelSelector";
import type { CefrLevelId } from "@/curriculum/types";

/** Strona kursu (CourseOverview): poziom, postęp i moduły jako akordeon. */
export function CoursePage() {
  const { t, locale } = useI18n();
  const { course } = useCourse();
  const { status, outline, levelView } = useCurriculum();
  const [levelId, setLevelId] = useState<CefrLevelId>("A1");
  // Ręcznie przełączone moduły; domyślnie otwarty jest tylko bieżący.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const view = status === "ready" ? levelView(levelId) : null;
  const currentModuleId = view?.current?.module.module.id;

  return (
    <div className="page page-wide course-page">
      <header className="page-head">
        <span className="eyebrow">{course.name[locale]}</span>
        <h1>{t("curriculum.title")}</h1>
        <p className="lede">{t("curriculum.subtitle")}</p>
      </header>

      <CourseStates />

      {outline && (
        <LevelSelector levels={outline.levels} selected={levelId} onSelect={setLevelId} />
      )}

      {view && (
        <div className="course-layout">
          <section className="course-main" aria-labelledby="modules-title">
            <h2 id="modules-title" className="sr-only">
              {t("curriculum.modules")}
            </h2>
            <ol className="course-modules">
              {view.modules.map((moduleView) => {
                const id = moduleView.module.id;
                const open = toggled[id] ?? id === currentModuleId;
                return (
                  <CourseModule
                    key={id}
                    view={moduleView}
                    open={open}
                    onToggle={() => setToggled((prev) => ({ ...prev, [id]: !open }))}
                  />
                );
              })}
            </ol>
          </section>

          <aside className="course-rail">
            <div className="surface course-rail-progress">
              <CourseProgress view={view} />
            </div>
            <ContinueCourse view={view} variant="rail" />
            <p className="meta course-rail-note">{t("curriculum.trainingNote")}</p>
          </aside>
        </div>
      )}
    </div>
  );
}
