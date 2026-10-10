import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { AudioButton, BilingualLine, SpokenText } from "@/components/AudioButton";
import { useT } from "@/i18n";
import type { Conjugation, IntroStep, ListenStep, LessonContent, StructureStep, SummaryStep, VocabListStep, WordStep } from "../types";
import { PASS_THRESHOLD, TEST_SECTION_THRESHOLD, type LessonEvaluation } from "../grading";
import { StepFooter } from "./StepFooter";

/* Kroki „treściowe” — wprowadzają nową rzecz. Ćwiczenia są w Exercises.tsx. */

export function IntroView({ step, onNext }: { step: IntroStep; onNext: () => void }) {
  const t = useT();
  return (
    <>
      <div className="step step-intro">
        <p className="step-lede">{step.body}</p>
        <div className="step-goals">
          <span className="eyebrow">{step.goalsTitle ?? t("curriculum.player.goals")}</span>
          <ul>
            {step.goals.map((goal, index) => (
              <li key={index}>
                <BilingualLine item={goal} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <StepFooter label={t("curriculum.player.begin")} onAction={onNext} />
    </>
  );
}

export function ListenView({ step, onNext }: { step: ListenStep; onNext: () => void }) {
  const t = useT();
  const [translate, setTranslate] = useState(false);
  return (
    <>
      <div className="step">
        <div className="step-head">
          <h2 className="step-title">{step.title}</h2>
          <button type="button" className="linklike" onClick={() => setTranslate((v) => !v)} aria-pressed={translate}>
            {t(translate ? "curriculum.player.hideTranslation" : "curriculum.player.showTranslation")}
          </button>
        </div>
        <ol className="dialog-lines">
          {step.lines.map((line, index) => (
            <li key={index} className={index % 2 ? "dialog-line right" : "dialog-line"}>
              <span className="dialog-speaker">{line.speaker}</span>
              <span className="dialog-bubble">
                <SpokenText text={line.text} src={line.audioSrc} />
                {translate && <span className="dialog-translation">{line.translation}</span>}
              </span>
            </li>
          ))}
        </ol>
        {step.note && <p className="meta">{step.note}</p>}
      </div>
      <StepFooter label={t("curriculum.player.next")} onAction={onNext} />
    </>
  );
}

const PERSONS = ["ja", "ti", "on / ona", "mi", "vi", "oni / one"];

/** Odmiana nowego czasownika: teraźniejszy w dwóch kolumnach (lp. | lm.), pod spodem przeszły i przyszły. */
function ConjugationTable({ conjugation }: { conjugation: Conjugation }) {
  const t = useT();
  const { present, past, future } = conjugation;
  return (
    <div className="conjugation">
      <div className="conjugation-head">
        <span className="eyebrow">{t("curriculum.player.conjugation")}</span>
        <AudioButton src={conjugation.audioSrc} text={present.join(", ")} size="sm" />
      </div>
      <table className="conjugation-table">
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i}>
              <td className="muted">{PERSONS[i]}</td>
              <td className="target">{present[i]}</td>
              <td className="muted">{PERSONS[i + 3]}</td>
              <td className="target">{present[i + 3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="conjugation-line">
        <span className="muted">{t("curriculum.player.conjugationPast")}</span> <span className="target">{past.join(" · ")}</span>
      </p>
      <p className="conjugation-line">
        <span className="muted">{t("curriculum.player.conjugationFuture")}</span> <span className="target">{future}</span>
      </p>
    </div>
  );
}

export function WordView({ step, onNext }: { step: WordStep; onNext: () => void }) {
  const t = useT();
  return (
    <>
      <div className="step step-word">
        <div className="word-card">
          <div className="word-main">
            <span className="word-target">{step.target}</span>
            <AudioButton src={step.audioSrc} text={step.target} />
          </div>
          <span className="word-source">{step.source}</span>
          {step.partOfSpeech && <span className="meta">{step.partOfSpeech}</span>}
          {step.example && (
            <div className="word-example">
              <span className="eyebrow">{t("curriculum.player.example")}</span>
              <SpokenText text={step.example.target} src={step.example.audioSrc} />
              <span className="muted">{step.example.source}</span>
            </div>
          )}
        </div>
        {step.conjugation && <ConjugationTable conjugation={step.conjugation} />}
        {step.related && (
          <div className="word-related">
            <span className="eyebrow">{t("curriculum.player.related")}</span>
            <ul>
              {step.related.map((item) => (
                <li key={item.target}>
                  <SpokenText text={item.target} src={item.audioSrc} />
                  <span className="muted">{item.source}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {step.note && <p className="step-note">{step.note}</p>}
      </div>
      <StepFooter label={t("curriculum.player.next")} onAction={onNext} />
    </>
  );
}

export function StructureView({ step, onNext }: { step: StructureStep; onNext: () => void }) {
  const t = useT();
  return (
    <>
      <div className="step">
        <h2 className="step-title">{step.title}</h2>
        <p className="step-lede">{step.explanation}</p>
        {step.examples && step.examples.length > 0 && (
          <ul className="structure-examples">
            {step.examples.map((example) => (
              <li key={example.target}>
                <SpokenText text={example.target} src={example.audioSrc} />
                <span className="muted">{example.source}</span>
              </li>
            ))}
          </ul>
        )}
        {step.table && <div className="structure-tables">
          {step.table.map((group) => (
            <div key={group.label} className="structure-group">
              <span className="structure-label">{group.label}</span>
              <table className="structure-table">
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.form}>
                      <td className="muted">{row.base}</td>
                      <td aria-hidden="true" className="dim">→</td>
                      <td><SpokenText text={row.form} src={row.audioSrc} /></td>
                      <td className="muted">{row.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>}
        {step.note && <p className="step-note">{step.note}</p>}
      </div>
      <StepFooter label={t("curriculum.player.next")} onAction={onNext} />
    </>
  );
}

/** Zwarta lista słów — słownictwo pomocnicze, bez osobnego ekranu na każde słowo. */
export function VocabListView({ step, onNext }: { step: VocabListStep; onNext: () => void }) {
  const t = useT();
  return (
    <>
      <div className="step">
        <h2 className="step-title">{step.title}</h2>
        {step.note && <p className="muted">{step.note}</p>}
        <ul className="vocab-list">
          {step.items.map((item, index) => (
            <li key={`${item.target}-${index}`}>
              <SpokenText text={item.target} src={item.audioSrc} />
              <span className="muted">{item.source}</span>
              {item.partOfSpeech && <span className="meta">{item.partOfSpeech}</span>}
            </li>
          ))}
        </ul>
      </div>
      <StepFooter label={t("curriculum.player.next")} onAction={onNext} />
    </>
  );
}

export function SummaryView({
  step,
  content,
  evaluation,
  nextHref,
  moduleHref,
  onRetry,
  onRestart,
  reviewStatus,
}: {
  step: SummaryStep;
  content: LessonContent;
  evaluation: LessonEvaluation;
  nextHref: string | null;
  moduleHref: string;
  onRetry: () => void;
  onRestart: () => void;
  reviewStatus?: ReactNode;
}) {
  const t = useT();
  const { passed, mistakes } = evaluation;
  const core = content.vocabulary.filter((word) => !word.optional);
  const extra = content.vocabulary.filter((word) => word.optional);
  const retryLabel = t("curriculum.player.retryMistakes", { n: mistakes.length });
  return (
    <div className="step step-summary">
      <span className={passed ? "summary-mark" : "summary-mark pending"} aria-hidden="true">
        <Icon name={passed ? "check" : "repeat"} size={26} />
      </span>
      <h2 className="summary-title">{passed ? step.title : t("curriculum.player.failTitle")}</h2>
      <ScoreLine evaluation={evaluation} />
      {!passed && (
        <p className="summary-verdict" role="status">
          {t(mistakes.length ? "curriculum.player.failHint" : "curriculum.player.failRestart")}
        </p>
      )}

      <div className="summary-actions">
        {passed ? (
          <>
            {nextHref && (
              <Link className="btn btn-lg" to={nextHref}>
                {t("curriculum.nextLesson")}
                <Icon name="arrowRight" size={18} />
              </Link>
            )}
            {mistakes.length > 0 && (
              <button type="button" className="btn-ghost" onClick={onRetry}>
                {retryLabel}
              </button>
            )}
          </>
        ) : mistakes.length > 0 ? (
          <button type="button" className="btn btn-lg" onClick={onRetry}>
            {retryLabel}
            <Icon name="arrowRight" size={18} />
          </button>
        ) : (
          <button type="button" className="btn btn-lg" onClick={onRestart}>
            {t("curriculum.player.restart")}
          </button>
        )}
        {!passed && mistakes.length > 0 && (
          <button type="button" className="btn-ghost" onClick={onRestart}>
            {t("curriculum.player.restart")}
          </button>
        )}
        <Link className="btn-ghost" to={moduleHref}>
          {t("curriculum.player.backToModule")}
        </Link>
      </div>

      {step.canDo && step.canDo.length > 0 && (
        <section className="summary-can-do">
          <span className="eyebrow">{t("curriculum.canDo")}</span>
          <ul>
            {step.canDo.map((item) => (
              <li key={item}>
                <Icon name="check" size={15} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="summary-grid">
        <section>
          <span className="eyebrow">{t("curriculum.player.recap")}</span>
          <ul className="summary-recap">
            {step.recap.map((item, index) => (
              <li key={index}>
                <BilingualLine item={item} />
              </li>
            ))}
          </ul>
        </section>
        {core.length > 0 && (
          <section>
            <span className="eyebrow">{t("curriculum.player.summaryWords")}</span>
            <ul className="summary-words">
              {core.map((word, index) => (
                <li key={`${word.target}-${index}`}>
                  <SpokenText text={word.target} src={word.audioSrc} />
                  <span className="muted">{word.source}</span>
                </li>
              ))}
            </ul>
            <div className="meta summary-review">{passed ? reviewStatus : t("curriculum.player.reviewAfterPass")}</div>
          </section>
        )}
      </div>
      {extra.length > 0 && (
        <details className="summary-extra">
          <summary>{t("curriculum.player.summaryExtra", { n: extra.length })}</summary>
          <ul className="summary-words">
            {extra.map((word, index) => (
              <li key={`${word.target}-${index}`}>
                <SpokenText text={word.target} src={word.audioSrc} />
                <span className="muted">{word.source}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Wynik z wagami i próg zaliczenia — jedna linijka, bez udawanej precyzji. */
export function ScoreLine({ evaluation }: { evaluation: LessonEvaluation }) {
  const t = useT();
  if (!evaluation.total) return null;
  const score = Math.round((evaluation.mode === "test" ? evaluation.firstTry : evaluation.score) * 100);
  return (
    <>
      <p className="muted">
        {t("curriculum.player.summaryScore", { correct: evaluation.correct, total: evaluation.total })} ·{" "}
        {t("curriculum.player.scoreLine", { score, threshold: Math.round(PASS_THRESHOLD * 100) })}
      </p>
      <p className="meta">{t(evaluation.mode === "test" ? "curriculum.player.testRule" : "curriculum.player.passRule", { section: Math.round(TEST_SECTION_THRESHOLD * 100) })}</p>
    </>
  );
}
