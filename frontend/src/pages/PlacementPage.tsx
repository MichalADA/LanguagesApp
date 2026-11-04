import { useCallback, useMemo, useRef, useState } from "react";
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
  chooseItem,
  estimate,
  initialPosterior,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  modulePool,
  placementLessons,
  placementModules,
  shouldStop,
  STOP_CONFIDENCE,
  update,
  type Estimate,
  type Item,
  type ModulePool,
  type PlacementQuestion,
} from "@/curriculum/placement";

type Phase = "intro" | "running" | "result";

interface Asked {
  item: Item;
  question: PlacementQuestion;
}

/** Wolne zadania: każdy moduł ma swoją pulę; moduł bez wczytanej puli zakładamy jako pełny. */
function candidates(modules: number, pools: Record<number, ModulePool>, used: Record<number, { choice: number; typed: number }>): Item[] {
  const items: Item[] = [];
  for (let m = 0; m < modules; m += 1) {
    const pool = pools[m];
    const taken = used[m] ?? { choice: 0, typed: 0 };
    const choice = pool ? pool.choice[taken.choice] : null;
    if (!pool || choice) items.push({ module: m, kind: "choice", options: choice?.options.length ?? 3 });
    if (!pool || pool.typed[taken.typed]) items.push({ module: m, kind: "typed" });
  }
  return items;
}

/** /test-poziomujacy — adaptacyjny test (algorytm w curriculum/placement.ts). */
export function PlacementPage() {
  const t = useT();
  const navigate = useNavigate();
  const { status, outline, markCompleted, completed } = useCurriculum();
  const modules = useMemo(() => (outline ? placementModules(outline) : []), [outline]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [posterior, setPosterior] = useState<number[]>([]);
  // Pula modułu tasowana raz na test — indeksy w `used` muszą wskazywać zawsze te same zadania.
  const pools = useRef<Record<number, ModulePool>>({});
  const [used, setUsed] = useState<Record<number, { choice: number; typed: number }>>({});
  const [asked, setAsked] = useState(0);
  const [current, setCurrent] = useState<Asked | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [result, setResult] = useState<Estimate | null>(null);

  const loadPool = useCallback(
    async (m: number): Promise<ModulePool> => {
      const cached = pools.current[m];
      if (cached) return cached;
      const contents = await Promise.all(modules[m].module.lessons.map((lesson) => fetchLessonContent(lesson.id)));
      const pool = modulePool(contents);
      pools.current[m] = pool;
      return pool;
    },
    [modules],
  );

  /** Następne zadanie: maksymalny przyrost informacji; gdy w module brak danego rodzaju — drugi rodzaj. */
  const next = useCallback(
    async (post: number[], usedNow: Record<number, { choice: number; typed: number }>) => {
      let pending = candidates(modules.length, pools.current, usedNow);
      for (let attempt = 0; attempt < 6 && pending.length; attempt += 1) {
        const item = chooseItem(post, pending);
        if (!item) break;
        const pool = await loadPool(item.module);
        const taken = usedNow[item.module] ?? { choice: 0, typed: 0 };
        const question = item.kind === "choice" ? pool.choice[taken.choice] : pool.typed[taken.typed];
        if (question) {
          const options = question.type === "choice" ? question.options.length : undefined;
          setCurrent({ item: { ...item, options }, question });
          return;
        }
        pending = pending.filter((candidate) => !(candidate.module === item.module && candidate.kind === item.kind));
      }
      setResult(estimate(post));
      setPhase("result");
    },
    [modules.length, loadPool],
  );

  function start() {
    const prior = initialPosterior(modules.length);
    setPosterior(prior);
    setUsed({});
    setAsked(0);
    setResult(null);
    setCurrent(null);
    setLoadFailed(false);
    pools.current = {};
    setPhase("running");
    next(prior, {}).catch(() => setLoadFailed(true));
  }

  function answer(outcome: boolean | StepScore) {
    if (!current) return;
    const ok = typeof outcome === "boolean" ? outcome : outcome.total > 0 && outcome.correct === outcome.total;
    const post = update(posterior, current.item, ok);
    const m = current.item.module;
    const taken = used[m] ?? { choice: 0, typed: 0 };
    const usedNext = { ...used, [m]: { ...taken, [current.item.kind]: taken[current.item.kind] + 1 } };
    const count = asked + 1;
    setPosterior(post);
    setUsed(usedNext);
    setAsked(count);
    setCurrent(null);
    if (shouldStop(post, count)) {
      setResult(estimate(post));
      setPhase("result");
      return;
    }
    next(post, usedNext).catch(() => setLoadFailed(true));
  }

  function stopNow() {
    setResult(estimate(posterior));
    setPhase("result");
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

  const header = { position: t("placement.title"), title: t("placement.title"), meta: t("placement.lede"), closeTo: "/" };
  const describe = (index: number) =>
    index >= modules.length ? t("placement.endOfCourse") : `${modules[index].levelId} · ${t("placement.module", { n: modules[index].module.order })}`;

  if (phase === "intro") {
    const levels = [...new Set(modules.map((item) => item.levelId))].join(" → ");
    return (
      <div className="lesson-shell">
        <LessonProgress {...header} percent={0} />
        <main className="lesson-stage lesson-message placement">
          <span className="eyebrow">{levels}</span>
          <h2 className="display lesson-message-title">{t("placement.heading")}</h2>
          <p className="step-lede">{t("placement.lede", { min: MIN_QUESTIONS, max: MAX_QUESTIONS })}</p>
          <ul className="placement-rules">
            <li>{t("placement.ruleAdaptive")}</li>
            <li>{t("placement.ruleStop", { pct: Math.round(STOP_CONFIDENCE * 100) })}</li>
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

  if (phase === "result" && result) {
    const passed = modules.slice(0, result.start);
    const startModule = modules[result.start] ?? null;
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
              <h2 className="display lesson-message-title">{describe(result.start)}</h2>
              <p className="step-lede">{startModule.module.title}</p>
            </>
          ) : (
            <h2 className="display lesson-message-title">{t("placement.resultAll")}</h2>
          )}
          <p className="muted">
            {passed.length ? t("placement.resultPassed", { modules: passed.length, lessons: skipped }) : t("placement.resultFromStart")}
          </p>
          <dl className="placement-stats">
            <div><dt>{t("placement.statQuestions")}</dt><dd>{asked}</dd></div>
            <div><dt>{t("placement.statConfidence")}</dt><dd>{Math.round(result.confidence * 100)}%</dd></div>
            <div><dt>{t("placement.statRange")}</dt><dd>{result.low === result.high ? describe(result.low) : `${describe(result.low)} – ${describe(result.high)}`}</dd></div>
          </dl>
          {result.confidence < STOP_CONFIDENCE && <p className="meta">{t("placement.lowConfidence")}</p>}
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

  const confidence = posterior.length ? estimate(posterior).confidence : 0;
  const question = current?.question;
  const key = `${asked}-${current?.item.module}-${current?.item.kind}`;
  return (
    <div className="lesson-shell">
      <LessonProgress
        {...header}
        percent={Math.min(100, (asked / MAX_QUESTIONS) * 100)}
        counter={t("placement.counter", { n: asked + 1, max: MAX_QUESTIONS })}
      />
      <main className="lesson-stage">
        <div className="placement-bar">
          <span className="meta">{t("placement.confidence", { pct: Math.round(confidence * 100) })}</span>
          {asked > 0 && (
            <button type="button" className="linklike" onClick={stopNow}>
              {t("placement.stopHere")}
            </button>
          )}
        </div>
        {loadFailed ? (
          <p role="alert">{t("placement.loadError")}</p>
        ) : !question ? (
          <span className="loading" role="status">{t("curriculum.loading")}</span>
        ) : question.type === "choice" ? (
          <ExerciseMultipleChoice key={key} step={question} onNext={answer} />
        ) : question.type === "gap" ? (
          <ExerciseFillGap key={key} step={question} onNext={answer} />
        ) : (
          <ExerciseTranslation key={key} step={question} onNext={answer} />
        )}
      </main>
    </div>
  );
}
