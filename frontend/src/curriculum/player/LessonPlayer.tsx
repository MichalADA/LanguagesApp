import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/i18n";
import { LESSON_STAGES, TEST_SECTIONS, type LessonContent, type LessonStep, type TestSection } from "../types";
import { coursePaths } from "../components/format";
import {
  ExerciseDialog,
  ExerciseFillGap,
  ExerciseFreeResponse,
  ExerciseListening,
  ExerciseMultipleChoice,
  ExerciseReading,
  ExerciseTranslation,
  ExerciseWordOrder,
  type StepScore,
} from "./Exercises";
import { LessonProgress } from "./LessonProgress";
import { IntroView, ListenView, StructureView, SummaryView, VocabListView, WordView } from "./LessonStep";
import { TestResult } from "./TestResult";

interface Props {
  content: LessonContent;
  header: { position: string; title: string; meta: string; closeTo: string };
  nextHref: string | null;
  moduleHref: string;
  /** Wywoływane raz, gdy użytkownik dojdzie do podsumowania. */
  onComplete: () => void;
}

type Next = (result?: boolean | StepScore) => void;

/**
 * Player prowadzi przez lekcję ekran po ekranie. Stan to tylko indeks kroku
 * i wyniki ćwiczeń — treść jest danymi, więc nowe lekcje nie wymagają kodu.
 * Tryb testu (content.mode === "test") liczy wynik osobno dla każdej sekcji.
 */
export function LessonPlayer({ content, header, nextHref, moduleHref, onComplete }: Props) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, StepScore>>({});
  const completed = useRef(false);
  const step = content.steps[index];
  const last = content.steps.length - 1;
  const isTest = content.mode === "test";

  useEffect(() => {
    if (step.type === "summary" && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [step.type, onComplete]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  const next: Next = (result) => {
    if (result !== undefined) {
      const score = typeof result === "boolean" ? { correct: result ? 1 : 0, total: 1 } : result;
      setResults((prev) => ({ ...prev, [step.id]: score }));
    }
    setIndex((i) => Math.min(last, i + 1));
  };

  const stages = useMemo(
    () =>
      isTest
        ? TEST_SECTIONS.map((id) => ({ id, label: t(`curriculum.player.sections.${id}`) }))
        : LESSON_STAGES.map((id) => ({ id, label: t(`curriculum.player.stages.${id}`) })),
    [isTest, t],
  );
  const current = isTest ? step.section ?? null : step.stage;

  const score = Object.values(results).reduce((sum, r) => ({ correct: sum.correct + r.correct, total: sum.total + r.total }), { correct: 0, total: 0 });
  const sections = useMemo(() => {
    const out: Partial<Record<TestSection, StepScore>> = {};
    for (const item of content.steps) {
      const r = results[item.id];
      if (!item.section || !r) continue;
      const prev = out[item.section] ?? { correct: 0, total: 0 };
      out[item.section] = { correct: prev.correct + r.correct, total: prev.total + r.total };
    }
    return out;
  }, [content.steps, results]);

  let body;
  if (step.type === "summary") {
    body = isTest ? (
      <TestResult step={step} sections={sections} moduleHref={moduleHref} courseHref={coursePaths.overview} />
    ) : (
      <SummaryView step={step} content={content} score={score} nextHref={nextHref} moduleHref={moduleHref} />
    );
  } else {
    body = renderStep(step, next);
  }

  return (
    <div className={isTest ? "lesson-shell test-mode" : "lesson-shell"}>
      <LessonProgress {...header} percent={last ? (index / last) * 100 : 100} stages={stages} current={current} />
      <main className="lesson-stage" key={step.id}>
        {step.instructionTarget && (
          <p className="instruction-target">
            <span className="target">{step.instructionTarget.target}</span>
            <span className="muted">{step.instructionTarget.source}</span>
          </p>
        )}
        {body}
      </main>
    </div>
  );
}

function renderStep(step: Exclude<LessonStep, { type: "summary" }>, next: Next) {
  switch (step.type) {
    case "intro":
      return <IntroView step={step} onNext={() => next()} />;
    case "listen":
      return <ListenView step={step} onNext={() => next()} />;
    case "word":
      return <WordView step={step} onNext={() => next()} />;
    case "structure":
      return <StructureView step={step} onNext={() => next()} />;
    case "vocabList":
      return <VocabListView step={step} onNext={() => next()} />;
    case "choice":
      return <ExerciseMultipleChoice step={step} onNext={next} />;
    case "translate":
      return <ExerciseTranslation step={step} onNext={next} />;
    case "gap":
      return <ExerciseFillGap step={step} onNext={next} />;
    case "order":
      return <ExerciseWordOrder step={step} onNext={next} />;
    case "reading":
      return <ExerciseReading step={step} onNext={next} />;
    case "listening":
      return <ExerciseListening step={step} onNext={next} />;
    case "dialog":
      return <ExerciseDialog step={step} onNext={next} />;
    case "free":
      return <ExerciseFreeResponse step={step} onNext={() => next()} />;
  }
}
