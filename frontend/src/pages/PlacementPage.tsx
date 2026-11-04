import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import { useCurriculum } from "@/curriculum/CurriculumProvider";
import { CourseStates } from "@/curriculum/components/CourseStates";
import { coursePaths } from "@/curriculum/components/format";
import { LessonProgress } from "@/curriculum/player/LessonProgress";
import { ExerciseFillGap, ExerciseMultipleChoice, ExerciseTranslation, type StepScore } from "@/curriculum/player/Exercises";
import { fetchLessonContent } from "@/curriculum/repository";
import {
  moduleVerdict,
  pickModuleQuestions,
  placementLessons,
  placementModules,
  QUESTIONS_PER_MODULE,
  type PlacementModule,
  type PlacementQuestion,
} from "@/curriculum/placement";

type Phase = "intro" | "running" | "result";

/** /test-poziomujacy — pełnoekranowy test: od którego modułu zacząć kurs. */
export function PlacementPage() {
  const t = useT();
  const navigate = useNavigate();
  const { status, outline, markCompleted, completed } = useCurriculum();
  const modules = useMemo(() => (outline ? placementModules(outline) : []), [outline]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [questions, setQuestions] = useState<{ index: number; items: PlacementQuestion[] } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [passed, setPassed] = useState<PlacementModule[]>([]);
  const [stoppedAt, setStoppedAt] = useState<PlacementModule | null>(null);

  // Zadania modułu ładujemy dopiero, gdy do niego dochodzimy (każda lekcja to osobny plik).
  useEffect(() => {
    if (phase !== "running" || !modules[index]) return;
    let alive = true;
    setLoadFailed(false);
    Promise.all(modules[index].module.lessons.map((lesson) => fetchLessonContent(lesson.id)))
      .then((contents) => alive && setQuestions({ index, items: pickModuleQuestions(contents) }))
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, [phase, index, modules]);

  const current = modules[index];
  const items = questions?.index === index ? questions.items : null;

  // Moduł bez zadań (nie powinno się zdarzyć) nie blokuje testu.
  useEffect(() => {
    if (phase === "running" && items && !items.length) advance(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, phase]);

  function finish(at: PlacementModule | null) {
    setStoppedAt(at);
    setPhase("result");
  }

  function advance(modulePassed: boolean) {
    if (!current) return;
    if (!modulePassed) return finish(current);
    setPassed((prev) => [...prev, current]);
    setQIndex(0);
    setCorrect(0);
    if (index + 1 >= modules.length) return finish(null);
    setIndex(index + 1);
  }

  function answer(result: boolean | StepScore) {
    if (!items) return;
    const ok = typeof result === "boolean" ? result : result.total > 0 && result.correct === result.total;
    const nextCorrect = correct + (ok ? 1 : 0);
    const verdict = moduleVerdict(nextCorrect, qIndex + 1, items.length);
    if (verdict) return advance(verdict === "pass");
    setCorrect(nextCorrect);
    setQIndex(qIndex + 1);
  }

  function start() {
    setIndex(0);
    setQIndex(0);
    setCorrect(0);
    setPassed([]);
    setStoppedAt(null);
    setQuestions(null);
    setPhase("running");
  }

  if (status !== "ready" || !outline) {
    return (
      <div className="lesson-shell">
        <main className="lesson-stage">
          {status === "ready" ? <p className="muted">{t("placement.unavailable")}</p> : <CourseStates />}
        </main>
      </div>
    );
  }

  const header = {
    position: t("placement.title"),
    title: current ? `${current.levelId} · ${current.module.title}` : t("placement.title"),
    meta: t("placement.lede"),
    closeTo: "/",
  };

  if (phase === "intro") {
    const levels = [...new Set(modules.map((item) => item.levelId))].join(" → ");
    return (
      <div className="lesson-shell">
        <LessonProgress {...header} title={t("placement.title")} percent={0} />
        <main className="lesson-stage lesson-message placement">
          <span className="eyebrow">{levels}</span>
          <h2 className="display lesson-message-title">{t("placement.heading")}</h2>
          <p className="step-lede">{t("placement.lede")}</p>
          <ul className="placement-rules">
            <li>{t("placement.ruleModules", { n: QUESTIONS_PER_MODULE })}</li>
            <li>{t("placement.ruleStop")}</li>
            <li>{t("placement.ruleHonest")}</li>
          </ul>
          {completed.size > 0 && <p className="meta">{t("placement.keepsProgress")}</p>}
          <div className="summary-actions">
            <button type="button" className="btn btn-lg" onClick={start}>
              {t("placement.start")} <Icon name="arrowRight" size={18} />
            </button>
            <Link className="btn-ghost" to={coursePaths.overview}>
              {t("placement.skip")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "result") {
    const startModule = stoppedAt;
    const firstLesson = startModule?.module.lessons[0];
    const skipped = placementLessons(passed).length;
    const apply = () => {
      markCompleted(placementLessons(passed));
      navigate(firstLesson ? coursePaths.lesson(firstLesson.id) : coursePaths.overview);
    };
    return (
      <div className="lesson-shell">
        <LessonProgress {...header} title={t("placement.resultTitle")} percent={100} />
        <main className="lesson-stage lesson-message placement">
          <span className="summary-mark" aria-hidden="true"><Icon name="check" size={26} /></span>
          <span className="eyebrow">{t("placement.resultEyebrow")}</span>
          {startModule ? (
            <>
              <h2 className="display lesson-message-title">
                {startModule.levelId} · {t("placement.module", { n: startModule.module.order })}
              </h2>
              <p className="step-lede">{startModule.module.title}</p>
              <p className="muted">
                {passed.length
                  ? t("placement.resultPassed", { modules: passed.length, lessons: skipped })
                  : t("placement.resultFromStart")}
              </p>
            </>
          ) : (
            <>
              <h2 className="display lesson-message-title">{t("placement.resultAll")}</h2>
              <p className="muted">{t("placement.resultPassed", { modules: passed.length, lessons: skipped })}</p>
            </>
          )}
          {passed.length > 0 && <p className="meta">{t("placement.resultNote")}</p>}
          <div className="summary-actions">
            <button type="button" className="btn btn-lg" onClick={apply}>
              {t(startModule ? "placement.apply" : "placement.applyAll")} <Icon name="arrowRight" size={18} />
            </button>
            <button type="button" className="btn-ghost" onClick={start}>
              {t("placement.again")}
            </button>
            <Link className="btn-ghost" to="/">
              {t("placement.discard")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const question = items?.[qIndex];
  const percent = modules.length ? ((index + (items?.length ? qIndex / items.length : 0)) / modules.length) * 100 : 0;
  return (
    <div className="lesson-shell">
      <LessonProgress
        {...header}
        percent={percent}
        counter={t("placement.counter", { n: index + 1, total: modules.length })}
      />
      <main className="lesson-stage">
        <div className="placement-bar">
          <span className="meta">{t("placement.question", { n: qIndex + 1, total: items?.length ?? QUESTIONS_PER_MODULE })}</span>
          <button type="button" className="linklike" onClick={() => finish(current ?? null)}>
            {t("placement.stopHere")}
          </button>
        </div>
        {loadFailed ? (
          <p role="alert">{t("placement.loadError")}</p>
        ) : !question ? (
          <span className="loading" role="status">{t("curriculum.loading")}</span>
        ) : question.type === "choice" ? (
          <ExerciseMultipleChoice key={`${index}-${qIndex}`} step={question} onNext={answer} />
        ) : question.type === "gap" ? (
          <ExerciseFillGap key={`${index}-${qIndex}`} step={question} onNext={answer} />
        ) : (
          <ExerciseTranslation key={`${index}-${qIndex}`} step={question} onNext={answer} />
        )}
      </main>
    </div>
  );
}
