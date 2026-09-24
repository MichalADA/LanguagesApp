import { useEffect, useRef, useState } from "react";
import { AnswerInput } from "@/components/AnswerInput";
import { SpecialCharacters } from "@/components/SpecialCharacters";
import { useCourse } from "@/courses/CourseProvider";
import { useT } from "@/i18n";
import type { Verdict } from "@/services/validation";
import { checkLessonAnswer, reviewFreeResponse, type FreeResponseReview } from "../answers";
import type { ChoiceStep, DialogStep, FreeResponseStep, GapStep, TranslateStep } from "../types";
import { Feedback, StepFooter } from "./StepFooter";

/** Każde ćwiczenie zgłasza wynik raz, przy przejściu dalej. */
type Done = (correct: boolean) => void;

const LETTERS = ["a", "b", "c", "d", "e"];

export function ExerciseMultipleChoice({ step, onNext }: { step: ChoiceStep; onNext: Done }) {
  const t = useT();
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === step.correctIndex;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (!answered && index >= 0 && index < step.options.length) setPicked(index);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, step.options.length]);

  return (
    <>
      <div className="step">
        <span className="step-instruction">{step.instruction}</span>
        <p className="step-prompt target">{step.prompt}</p>
        <div className="choice-list" role="group" aria-label={step.instruction}>
          {step.options.map((option, index) => {
            const state = !answered ? "" : index === step.correctIndex ? "correct" : index === picked ? "wrong" : "muted";
            return (
              <button
                key={option}
                type="button"
                className={`choice ${state}`}
                onClick={() => !answered && setPicked(index)}
                aria-disabled={answered}
                aria-pressed={picked === index}
              >
                <span className="choice-key">{LETTERS[index]}</span>
                <span className="target">{option}</span>
              </button>
            );
          })}
        </div>
      </div>
      <StepFooter
        label={t("curriculum.player.next")}
        disabled={!answered}
        onAction={() => onNext(correct)}
        feedback={answered ? <Feedback verdict={correct ? "hit" : "miss"} answer={step.options[step.correctIndex]} explanation={step.explanation} /> : null}
      />
    </>
  );
}

/** Wspólna mechanika: wpisz → Sprawdź → informacja zwrotna → Dalej. */
function useChecked(accepted: readonly string[], pattern?: string) {
  const { course } = useCourse();
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const check = () => {
    if (!value.trim() || verdict) return;
    setVerdict(checkLessonAnswer(value, accepted, course.validation, pattern));
  };
  return { value, setValue, verdict, check, characters: course.specialCharacters };
}

export function ExerciseTranslation({ step, onNext }: { step: TranslateStep; onNext: Done }) {
  const t = useT();
  const { value, setValue, verdict, check, characters } = useChecked(step.accepted);
  const [hint, setHint] = useState(false);
  return (
    <>
      <div className="step">
        <span className="step-instruction">{step.instruction}</span>
        <p className="step-prompt">{step.prompt}</p>
        <AnswerInput
          value={value}
          onChange={(next) => !verdict && setValue(next)}
          onSubmit={check}
          placeholder={t("curriculum.player.yourAnswer")}
          characters={characters}
          disabled={Boolean(verdict)}
        />
        {step.hint && !verdict && (
          <div className="step-hint">
            {hint ? <span className="muted">{step.hint}</span> : (
              <button type="button" className="linklike" onClick={() => setHint(true)}>
                {t("curriculum.player.hint")}
              </button>
            )}
          </div>
        )}
      </div>
      <StepFooter
        label={t(verdict ? "curriculum.player.next" : "curriculum.player.check")}
        disabled={!verdict && !value.trim()}
        onAction={verdict ? () => onNext(verdict !== "miss") : check}
        feedback={verdict ? <Feedback verdict={verdict} answer={step.accepted[0]} /> : null}
      />
    </>
  );
}

export function ExerciseFillGap({ step, onNext }: { step: GapStep; onNext: Done }) {
  const t = useT();
  const { value, setValue, verdict, check, characters } = useChecked(step.accepted);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, []);

  const insert = (char: string) => {
    if (verdict) return;
    setValue(value + char);
    ref.current?.focus();
  };

  return (
    <>
      <div className="step">
        <span className="step-instruction">{step.instruction}</span>
        <p className="gap-sentence target">
          <span>{step.before}</span>
          <input
            ref={ref}
            className={`gap-input ${verdict ?? ""}`}
            value={value}
            size={Math.max(3, value.length + 1)}
            aria-label={t("curriculum.player.yourAnswer")}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            readOnly={Boolean(verdict)}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !verdict) {
                event.preventDefault();
                check();
              }
            }}
          />
          <span>{step.after}</span>
        </p>
        <p className="muted gap-translation">{step.translation}</p>
        <SpecialCharacters characters={characters} onInsert={insert} />
        {step.hint && !verdict && <p className="meta">{t("curriculum.player.hint")}: {step.hint}</p>}
      </div>
      <StepFooter
        label={t(verdict ? "curriculum.player.next" : "curriculum.player.check")}
        disabled={!verdict && !value.trim()}
        onAction={verdict ? () => onNext(verdict !== "miss") : check}
        feedback={verdict ? <Feedback verdict={verdict} answer={`${step.before} ${step.accepted[0]} ${step.after}`} /> : null}
      />
    </>
  );
}

type ReplyTurn = Extract<DialogStep["turns"][number], { kind: "reply" }>;

/** Rozmowa tura po turze: linie rozmówcy pojawiają się, gdy odpowiesz na poprzednią. */
export function ExerciseDialog({ step, onNext }: { step: DialogStep; onNext: Done }) {
  const t = useT();
  const { course } = useCourse();
  const [answers, setAnswers] = useState<{ text: string; verdict: Verdict }[]>([]);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<Verdict | null>(null);

  // Widoczne tury: wszystko do bieżącej odpowiedzi włącznie.
  const replyIndexes = step.turns.map((turn, index) => (turn.kind === "reply" ? index : -1)).filter((i) => i >= 0);
  const activeReply = replyIndexes[answers.length] ?? null;
  const visibleUntil = activeReply ?? step.turns.length - 1;
  const done = activeReply === null;
  const turn = activeReply !== null ? (step.turns[activeReply] as ReplyTurn) : null;

  const check = () => {
    if (!turn || !value.trim() || pending) return;
    setPending(checkLessonAnswer(value, turn.accepted, course.validation, turn.pattern));
  };
  const commit = () => {
    if (!pending) return;
    setAnswers((prev) => [...prev, { text: value.trim(), verdict: pending }]);
    setValue("");
    setPending(null);
  };

  let replyCounter = 0;
  return (
    <>
      <div className="step">
        <h2 className="step-title">{step.title}</h2>
        <ol className="dialog-lines" aria-live="polite">
          {step.turns.slice(0, visibleUntil + 1).map((item, index) => {
            if (item.kind === "line") {
              return (
                <li key={index} className="dialog-line">
                  <span className="dialog-speaker">{item.line.speaker}</span>
                  <span className="dialog-bubble">
                    <span className="target">{item.line.text}</span>
                    <span className="dialog-translation">{item.line.translation}</span>
                  </span>
                </li>
              );
            }
            const answer = answers[replyCounter++];
            if (!answer) return null;
            return (
              <li key={index} className={`dialog-line right ${answer.verdict}`}>
                <span className="dialog-speaker">{t("curriculum.player.you")}</span>
                <span className="dialog-bubble">
                  <span className="target">{answer.text}</span>
                  {answer.verdict === "miss" && <span className="dialog-translation">→ {item.suggestion}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        {turn && (
          <div className="dialog-reply">
            <span className="step-instruction">{turn.prompt}</span>
            <AnswerInput
              value={value}
              onChange={(next) => !pending && setValue(next)}
              onSubmit={check}
              placeholder={t("curriculum.player.yourAnswer")}
              characters={course.specialCharacters}
              focusKey={answers.length}
              disabled={Boolean(pending)}
            />
          </div>
        )}
      </div>
      <StepFooter
        label={t(done || pending ? "curriculum.player.next" : "curriculum.player.check")}
        disabled={!done && !pending && !value.trim()}
        onAction={done ? () => onNext(answers.every((answer) => answer.verdict !== "miss")) : pending ? commit : check}
        feedback={pending && turn ? <Feedback verdict={pending} answer={turn.suggestion} /> : null}
      />
    </>
  );
}

export function ExerciseFreeResponse({ step, onNext }: { step: FreeResponseStep; onNext: () => void }) {
  const t = useT();
  const { course } = useCourse();
  const [value, setValue] = useState("");
  const [review, setReview] = useState<FreeResponseReview | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const insert = (char: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    setValue(value.slice(0, start) + char + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + char.length, start + char.length);
    });
  };

  return (
    <>
      <div className="step">
        <span className="step-instruction">{step.instruction}</span>
        <ul className="free-points">
          {step.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <textarea
          ref={ref}
          className="free-input"
          rows={4}
          value={value}
          placeholder={t("curriculum.player.writeHere")}
          aria-label={step.instruction}
          spellCheck={false}
          onChange={(event) => {
            setValue(event.target.value);
            if (review) setReview(null);
          }}
        />
        <SpecialCharacters characters={course.specialCharacters} onInsert={insert} />
        {review && (
          <div className="free-review" aria-live="polite">
            <p className="meta">{t("curriculum.player.freeSentences", { n: review.sentences, min: step.minSentences })}</p>
            {review.found.length > 0 && (
              <p>
                <span className="free-ok">{t("curriculum.player.freeFound")}:</span> {review.found.join(", ")}
              </p>
            )}
            {review.missing.length > 0 && (
              <p>
                <span className="free-todo">{t("curriculum.player.freeMissing")}:</span> {review.missing.join(", ")}
              </p>
            )}
            <div className="free-sample">
              <span className="eyebrow">{t("curriculum.player.freeSample")}</span>
              <span className="target">{step.sample}</span>
            </div>
          </div>
        )}
        {!review && <p className="meta">{t("curriculum.player.freeNote")}</p>}
      </div>
      <StepFooter
        label={t(review ? "curriculum.player.next" : "curriculum.player.freeReview")}
        disabled={!review && !value.trim()}
        onAction={review ? onNext : () => setReview(reviewFreeResponse(value, step.keywords, course.validation))}
        secondary={
          !review ? (
            <button type="button" className="btn-ghost" onClick={onNext}>
              {t("curriculum.player.skip")}
            </button>
          ) : null
        }
      />
    </>
  );
}
