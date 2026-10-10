import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n";
import { SpokenText } from "@/components/AudioButton";
import { LESSON_STAGES, TEST_SECTIONS, type LessonContent, type LessonStep } from "../types";
import { coursePaths } from "../components/format";
import { applyRetry, evaluateLesson, type StepResult } from "../grading";
import { clearLessonSession, restoreLessonSession, saveLessonSession } from "../session";
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
  /** Klucz zapisu postępu w trakcie lekcji (profil + kurs + lekcja), zob. curriculum/session.ts. */
  storageKey: string;
  /** Lekcja była już zaliczona — zapis z jej podsumowania nie jest wznawiany. */
  alreadyCompleted?: boolean;
  /** Wywoływane raz, gdy lekcja zostanie zaliczona (kryteria: curriculum/grading.ts). */
  onComplete: () => void;
  /** Stan zapisu słów w powtórkach FSRS — pokazywany w podsumowaniu. */
  reviewStatus?: ReactNode;
}

type Next = (result?: boolean | StepScore) => void;

interface Resumed {
  index: number;
  changed: boolean;
}

function initialState(storageKey: string, content: LessonContent, alreadyCompleted: boolean) {
  const restored = restoreLessonSession(storageKey, content.steps);
  // Ponowne otwarcie zaliczonej lekcji zaczyna się od nowa (stary zapis podsumowania nie wraca).
  if (!restored || (alreadyCompleted && restored.finished)) {
    if (restored) clearLessonSession(storageKey);
    return { index: 0, results: {} as Record<string, StepResult>, resumed: null as Resumed | null };
  }
  return { index: restored.index, results: restored.results, resumed: restored.index > 0 || restored.changed ? { index: restored.index, changed: restored.changed } : null };
}

/**
 * Player prowadzi przez lekcję ekran po ekranie. Stan to indeks kroku i wyniki ćwiczeń —
 * zapisywane na bieżąco, więc odświeżenie strony wznawia lekcję (curriculum/session.ts).
 * Na końcu lekcja jest oceniana (curriculum/grading.ts): zaliczenie dopiero po spełnieniu
 * kryteriów; błędne odpowiedzi można przećwiczyć w osobnej rundzie.
 * Tryb testu (content.mode === "test") liczy wynik osobno dla każdej sekcji.
 */
export function LessonPlayer({ content, header, nextHref, moduleHref, storageKey, alreadyCompleted = false, onComplete, reviewStatus }: Props) {
  const t = useT();
  const [initial] = useState(() => initialState(storageKey, content, alreadyCompleted));
  const [index, setIndex] = useState(initial.index);
  const [results, setResults] = useState<Record<string, StepResult>>(initial.results);
  const [resumed, setResumed] = useState<Resumed | null>(initial.resumed);
  /** Runda „Przećwicz błędy”: kolejka id kroków i pozycja. */
  const [retry, setRetry] = useState<{ queue: string[]; pos: number; round: number } | null>(null);
  const completed = useRef(false);
  const last = content.steps.length - 1;
  const isTest = content.mode === "test";
  const evaluation = useMemo(() => evaluateLesson(content.steps, results, isTest ? "test" : "lesson"), [content.steps, results, isTest]);

  const retryStep = retry ? content.steps.find((item) => item.id === retry.queue[retry.pos]) : undefined;
  const step = retryStep ?? content.steps[index];
  const atSummary = !retry && step.type === "summary";

  // Zaliczenie: raz, dopiero w podsumowaniu i po spełnieniu kryteriów.
  useEffect(() => {
    if (atSummary && evaluation.passed && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [atSummary, evaluation.passed, onComplete]);

  // Zapis postępu po każdym kroku. Zaliczona lekcja nie zostawia zapisu — kolejne otwarcie zaczyna od nowa.
  useEffect(() => {
    if (atSummary && evaluation.passed) clearLessonSession(storageKey);
    else saveLessonSession(storageKey, content.steps, index, results);
  }, [storageKey, content.steps, index, results, atSummary, evaluation.passed]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index, retry?.pos, retry?.round]);

  const toScore = (result: boolean | StepScore) => (typeof result === "boolean" ? { correct: result ? 1 : 0, total: 1 } : result);

  const next: Next = (result) => {
    setResumed(null);
    if (retry) {
      const id = retry.queue[retry.pos];
      if (result !== undefined && results[id]) {
        const score = toScore(result);
        setResults((prev) => (prev[id] ? { ...prev, [id]: applyRetry(prev[id], score) } : prev));
      }
      setRetry((prev) => (prev && prev.pos + 1 < prev.queue.length ? { ...prev, pos: prev.pos + 1 } : null));
      return;
    }
    if (result !== undefined) {
      const score = toScore(result);
      setResults((prev) => ({ ...prev, [step.id]: score }));
    }
    setIndex((i) => Math.min(last, i + 1));
  };

  const startRetry = () => {
    if (!evaluation.mistakes.length) return;
    setRetry((prev) => ({ queue: evaluation.mistakes, pos: 0, round: (prev?.round ?? 0) + 1 }));
  };

  const restart = () => {
    clearLessonSession(storageKey);
    setRetry(null);
    setResumed(null);
    setResults({});
    setIndex(0);
  };

  const stages = useMemo(
    () =>
      isTest
        ? TEST_SECTIONS.map((id) => ({ id, label: t(`curriculum.player.sections.${id}`) }))
        : LESSON_STAGES.map((id) => ({ id, label: t(`curriculum.player.stages.${id}`) })),
    [isTest, t],
  );
  const current = isTest ? step.section ?? null : step.stage;

  let body;
  if (step.type === "summary" && !retry) {
    body = isTest ? (
      <TestResult step={step} evaluation={evaluation} onRetry={startRetry} onRestart={restart} moduleHref={moduleHref} courseHref={coursePaths.overview} />
    ) : (
      <SummaryView
        step={step}
        content={content}
        evaluation={evaluation}
        nextHref={nextHref}
        moduleHref={moduleHref}
        onRetry={startRetry}
        onRestart={restart}
        reviewStatus={reviewStatus}
      />
    );
  } else {
    body = renderStep(step as Exclude<LessonStep, { type: "summary" }>, next);
  }

  const percent = retry ? (retry.pos / retry.queue.length) * 100 : last ? (index / last) * 100 : 100;
  const counter = retry
    ? t("curriculum.player.retryProgress", { n: retry.pos + 1, total: retry.queue.length })
    : t("curriculum.player.stepOf", { n: index + 1, total: content.steps.length });

  return (
    <div className={isTest ? "lesson-shell test-mode" : "lesson-shell"}>
      <LessonProgress {...header} percent={percent} stages={stages} current={retry ? null : current} counter={counter} />
      <main className="lesson-stage" key={retry ? `${step.id}-retry-${retry.round}-${retry.pos}` : step.id}>
        {resumed && (
          <div className="lesson-resume" role="status">
            <span>
              {resumed.changed ? t("curriculum.player.resumedChanged") : t("curriculum.player.resumed", { n: resumed.index + 1, total: content.steps.length })}
            </span>
            <button type="button" className="linklike" onClick={restart}>
              {t("curriculum.player.restart")}
            </button>
          </div>
        )}
        {retry && <p className="lesson-retry-note">{t("curriculum.player.retryNote")}</p>}
        {step.optional && !retry && <p className="lesson-optional-note">{t("curriculum.player.optionalTask")}</p>}
        {step.instructionTarget && (
          <p className="instruction-target">
            <SpokenText text={step.instructionTarget.target} src={step.instructionTarget.audioSrc} />
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
