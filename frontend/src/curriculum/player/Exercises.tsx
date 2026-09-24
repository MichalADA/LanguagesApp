import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { AnswerInput } from "@/components/AnswerInput";
import { SpecialCharacters } from "@/components/SpecialCharacters";
import { useCourse } from "@/courses/CourseProvider";
import { useT } from "@/i18n";
import type { Verdict } from "@/services/validation";
import { checkLessonAnswerDetailed, reviewFreeResponse, type FreeResponseReview, type LessonAnswerCheck } from "../answers";
import { useAudioSequence } from "../speech";
import type { ChoiceStep, ComprehensionQuestion, DialogStep, FreeResponseStep, GapStep, ListeningStep, OrderStep, ReadingStep, TranslateStep } from "../types";
import { Feedback, StepFooter } from "./StepFooter";

/** Wynik kroku: jedno pytanie (true/false) albo kilka pytań w jednym kroku. */
export type StepScore = { correct: number; total: number };

/** Każde ćwiczenie zgłasza wynik raz, przy przejściu dalej. */
type Done = (result: boolean | StepScore) => void;

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
  const [result, setResult] = useState<LessonAnswerCheck | null>(null);
  const check = () => {
    if (!value.trim() || result) return;
    setResult(checkLessonAnswerDetailed(value, accepted, course.validation, pattern));
  };
  return { value, setValue, verdict: result?.verdict ?? null, expected: result?.expected ?? null, check, characters: course.specialCharacters };
}

export function ExerciseTranslation({ step, onNext }: { step: TranslateStep; onNext: Done }) {
  const t = useT();
  const { value, setValue, verdict, expected, check, characters } = useChecked(step.accepted);
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
        feedback={verdict ? <Feedback verdict={verdict} answer={verdict === "miss" ? step.accepted[0] : expected} /> : null}
      />
    </>
  );
}

export function ExerciseFillGap({ step, onNext }: { step: GapStep; onNext: Done }) {
  const t = useT();
  const { value, setValue, verdict, expected, check, characters } = useChecked(step.accepted);
  // Interpunkcja zaraz po luce („Dobro ___, hvala.”) przykleja się do pola, bez odstępu.
  const [, punct = "", rest = ""] = step.after.match(/^([.,!?;:]*)\s*(.*)$/) ?? [];
  const sentence = (word: string) => [step.before, `${word}${punct}`, rest].filter(Boolean).join(" ");
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
          {step.before && <span>{step.before}</span>}
          <span className="gap-slot">
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
            {punct}
          </span>
          {rest && <span>{rest}</span>}
        </p>
        <p className="muted gap-translation">{step.translation}</p>
        <SpecialCharacters characters={characters} onInsert={insert} />
        {step.hint && !verdict && <p className="meta">{t("curriculum.player.hint")}: {step.hint}</p>}
      </div>
      <StepFooter
        label={t(verdict ? "curriculum.player.next" : "curriculum.player.check")}
        disabled={!verdict && !value.trim()}
        onAction={verdict ? () => onNext(verdict !== "miss") : check}
        feedback={verdict ? <Feedback verdict={verdict} answer={sentence(verdict === "near" && expected ? expected : step.accepted[0])} /> : null}
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
  const [pendingCheck, setPendingCheck] = useState<LessonAnswerCheck | null>(null);
  const pending = pendingCheck?.verdict ?? null;

  // Widoczne tury: wszystko do bieżącej odpowiedzi włącznie.
  const replyIndexes = step.turns.map((turn, index) => (turn.kind === "reply" ? index : -1)).filter((i) => i >= 0);
  const activeReply = replyIndexes[answers.length] ?? null;
  const visibleUntil = activeReply ?? step.turns.length - 1;
  const done = activeReply === null;
  const turn = activeReply !== null ? (step.turns[activeReply] as ReplyTurn) : null;

  const check = () => {
    if (!turn || !value.trim() || pending) return;
    setPendingCheck(checkLessonAnswerDetailed(value, turn.accepted, course.validation, turn.pattern));
  };
  const commit = () => {
    if (!pending) return;
    setAnswers((prev) => [...prev, { text: value.trim(), verdict: pending }]);
    setValue("");
    setPendingCheck(null);
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
        onAction={done ? () => onNext({ correct: answers.filter((answer) => answer.verdict !== "miss").length, total: answers.length }) : pending ? commit : check}
        feedback={pending && turn ? <Feedback verdict={pending} answer={pending === "miss" ? turn.suggestion : pendingCheck?.expected} /> : null}
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

/** Ułóż zdanie z rozsypanych słów — klik dodaje słowo, klik w ułożone je cofa. */
export function ExerciseWordOrder({ step, onNext }: { step: OrderStep; onNext: Done }) {
  const t = useT();
  const { course } = useCourse();
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<LessonAnswerCheck | null>(null);
  const built = picked.map((index) => step.tokens[index]).join(" ");
  const complete = picked.length === step.tokens.length;

  const check = () => {
    if (!complete || result) return;
    setResult(checkLessonAnswerDetailed(built, step.accepted, course.validation));
  };

  return (
    <>
      <div className="step">
        <span className="step-instruction">{step.instruction}</span>
        <p className="step-prompt">{step.translation}</p>
        <div className={`order-built ${result?.verdict ?? ""}`} aria-live="polite">
          {picked.length === 0 && <span className="order-placeholder">{t("curriculum.player.orderHint")}</span>}
          {picked.map((index, position) => (
            <button
              key={`${index}-${position}`}
              type="button"
              className="order-token placed"
              disabled={Boolean(result)}
              onClick={() => setPicked((prev) => prev.filter((_, i) => i !== position))}
            >
              {step.tokens[index]}
            </button>
          ))}
        </div>
        <div className="order-bank" role="group" aria-label={step.instruction}>
          {step.tokens.map((token, index) => (
            <button
              key={`${token}-${index}`}
              type="button"
              className="order-token"
              disabled={picked.includes(index) || Boolean(result)}
              onClick={() => setPicked((prev) => [...prev, index])}
            >
              {token}
            </button>
          ))}
        </div>
        {!result && picked.length > 0 && (
          <button type="button" className="linklike order-clear" onClick={() => setPicked([])}>
            {t("curriculum.player.clear")}
          </button>
        )}
      </div>
      <StepFooter
        label={t(result ? "curriculum.player.next" : "curriculum.player.check")}
        disabled={!result && !complete}
        onAction={result ? () => onNext(result.verdict !== "miss") : check}
        feedback={result ? <Feedback verdict={result.verdict} answer={result.verdict === "miss" ? step.accepted[0] : result.expected} /> : null}
      />
    </>
  );
}

/** Pytania na rozumienie zadawane po kolei pod tekstem lub nagraniem. */
function QuestionSequence({
  questions,
  onDone,
  children,
}: {
  questions: ComprehensionQuestion[];
  onDone: (score: StepScore) => void;
  children: ReactNode;
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const question = questions[index];
  const answered = picked !== null;
  const last = index === questions.length - 1;

  const pick = (option: number) => {
    if (answered) return;
    setPicked(option);
    if (option === question.correctIndex) setCorrect((n) => n + 1);
  };
  const next = () => {
    if (last) {
      onDone({ correct, total: questions.length });
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  return (
    <>
      <div className="step">
        {children}
        <div className="question-block">
          <span className="step-instruction">{t("curriculum.player.question", { n: index + 1, total: questions.length })}</span>
          <p className="question-prompt">{question.prompt}</p>
          <div className="choice-list" role="group" aria-label={question.prompt}>
            {question.options.map((option, i) => {
              const state = !answered ? "" : i === question.correctIndex ? "correct" : i === picked ? "wrong" : "muted";
              return (
                <button key={option} type="button" className={`choice ${state}`} onClick={() => pick(i)} aria-disabled={answered} aria-pressed={picked === i}>
                  <span className="choice-key">{LETTERS[i]}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <StepFooter
        label={t("curriculum.player.next")}
        disabled={!answered}
        onAction={next}
        feedback={answered ? <Feedback verdict={picked === question.correctIndex ? "hit" : "miss"} answer={question.options[question.correctIndex]} /> : null}
      />
    </>
  );
}

export function ExerciseReading({ step, onNext }: { step: ReadingStep; onNext: Done }) {
  const t = useT();
  const [translate, setTranslate] = useState(false);
  const hasTranslation = step.text.some((line) => line.source);
  return (
    <QuestionSequence questions={step.questions} onDone={onNext}>
      <span className="step-instruction">{step.instruction}</span>
      <article className="reading-text">
        <div className="step-head">
          <h2 className="reading-title">{step.title}</h2>
          {hasTranslation && (
            <button type="button" className="linklike" onClick={() => setTranslate((v) => !v)} aria-pressed={translate}>
              {t(translate ? "curriculum.player.hideTranslation" : "curriculum.player.showTranslation")}
            </button>
          )}
        </div>
        <p>
          {step.text.map((line, i) => (
            <span key={i} className="reading-line">
              <span className="target">{line.target}</span>
              {translate && line.source && <span className="dialog-translation"> {line.source}</span>}{" "}
            </span>
          ))}
        </p>
      </article>
    </QuestionSequence>
  );
}

/** Słuchanie: nagrania z pilota słuchania; gdy audio zawiedzie, pokazujemy transkrypcję. */
export function ExerciseListening({ step, onNext }: { step: ListeningStep; onNext: Done }) {
  const t = useT();
  const sources = step.lines.map((line) => line.audio).filter((src): src is string => Boolean(src));
  const { play, stop, playing, failed, available } = useAudioSequence(sources.length === step.lines.length ? sources : []);
  const [transcript, setTranscript] = useState(!available);
  const showTranscript = transcript || failed;
  return (
    <QuestionSequence questions={step.questions} onDone={onNext}>
      <span className="step-instruction">{step.instruction}</span>
      <div className="listening-box">
        <div className="listening-head">
          <h2 className="reading-title">{step.title}</h2>
          {available && (
            <button type="button" className="btn-ghost listening-play" onClick={playing === null ? play : stop}>
              <Icon name="volume" size={16} />
              {t(playing === null ? "curriculum.player.play" : "curriculum.player.stop")}
            </button>
          )}
        </div>
        {(failed || !available) && <p className="meta">{t("curriculum.player.audioUnavailable")}</p>}
        {!failed && available && (
          <button type="button" className="linklike" onClick={() => setTranscript((v) => !v)} aria-pressed={transcript}>
            {t(transcript ? "curriculum.player.hideTranscript" : "curriculum.player.showTranscript")}
          </button>
        )}
        {showTranscript && (
          <ol className="dialog-lines compact">
            {step.lines.map((line, i) => (
              <li key={i} className={`dialog-line${i % 2 ? " right" : ""}${playing === i ? " speaking" : ""}`}>
                <span className="dialog-speaker">{line.speaker}</span>
                <span className="dialog-bubble">
                  <span className="target">{line.text}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </QuestionSequence>
  );
}
