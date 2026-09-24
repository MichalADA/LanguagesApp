import { useEffect, useRef, useState } from "react";
import type { LessonContent, LessonStep } from "../types";
import { ExerciseDialog, ExerciseFillGap, ExerciseFreeResponse, ExerciseMultipleChoice, ExerciseTranslation } from "./Exercises";
import { LessonProgress } from "./LessonProgress";
import { IntroView, ListenView, StructureView, SummaryView, WordView } from "./LessonStep";

interface Props {
  content: LessonContent;
  header: { position: string; title: string; meta: string; closeTo: string };
  nextHref: string | null;
  moduleHref: string;
  /** Wywoływane raz, gdy użytkownik dojdzie do podsumowania. */
  onComplete: () => void;
}

const SCORED: LessonStep["type"][] = ["choice", "translate", "gap", "dialog"];

/**
 * Player prowadzi przez lekcję ekran po ekranie. Stan to tylko indeks kroku
 * i wyniki ćwiczeń — treść jest danymi, więc nowe lekcje nie wymagają kodu.
 */
export function LessonPlayer({ content, header, nextHref, moduleHref, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const completed = useRef(false);
  const step = content.steps[index];
  const last = content.steps.length - 1;

  useEffect(() => {
    if (step.type === "summary" && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [step.type, onComplete]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  const next = (correct?: boolean) => {
    if (correct !== undefined) setResults((prev) => ({ ...prev, [step.id]: correct }));
    setIndex((i) => Math.min(last, i + 1));
  };

  const scoredSteps = content.steps.filter((item) => SCORED.includes(item.type));
  const score = { correct: Object.values(results).filter(Boolean).length, total: scoredSteps.length };

  return (
    <div className="lesson-shell">
      <LessonProgress {...header} percent={last ? (index / last) * 100 : 100} stage={step.stage} />
      <main className="lesson-stage" key={step.id}>
        {renderStep(step, next, { content, score, nextHref, moduleHref })}
      </main>
    </div>
  );
}

function renderStep(
  step: LessonStep,
  next: (correct?: boolean) => void,
  summary: { content: LessonContent; score: { correct: number; total: number }; nextHref: string | null; moduleHref: string },
) {
  switch (step.type) {
    case "intro":
      return <IntroView step={step} onNext={() => next()} />;
    case "listen":
      return <ListenView step={step} onNext={() => next()} />;
    case "word":
      return <WordView step={step} onNext={() => next()} />;
    case "structure":
      return <StructureView step={step} onNext={() => next()} />;
    case "choice":
      return <ExerciseMultipleChoice step={step} onNext={next} />;
    case "translate":
      return <ExerciseTranslation step={step} onNext={next} />;
    case "gap":
      return <ExerciseFillGap step={step} onNext={next} />;
    case "dialog":
      return <ExerciseDialog step={step} onNext={next} />;
    case "free":
      return <ExerciseFreeResponse step={step} onNext={() => next()} />;
    case "summary":
      return <SummaryView step={step} {...summary} />;
  }
}
