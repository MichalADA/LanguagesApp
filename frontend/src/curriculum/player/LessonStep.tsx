import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { AudioButton, BilingualLine, SpokenText } from "@/components/AudioButton";
import { useT } from "@/i18n";
import type { IntroStep, ListenStep, LessonContent, StructureStep, SummaryStep, VocabListStep, WordStep } from "../types";
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
                      <td className="target">{row.form}</td>
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
  score,
  nextHref,
  moduleHref,
}: {
  step: SummaryStep;
  content: LessonContent;
  score: { correct: number; total: number };
  nextHref: string | null;
  moduleHref: string;
}) {
  const t = useT();
  return (
    <div className="step step-summary">
      <span className="summary-mark" aria-hidden="true">
        <Icon name="check" size={26} />
      </span>
      <h2 className="summary-title">{step.title}</h2>
      <p className="muted">{t("curriculum.player.summaryScore", score)}</p>

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
        <section>
          <span className="eyebrow">{t("curriculum.player.summaryWords")}</span>
          <ul className="summary-words">
            {content.vocabulary.map((word, index) => (
              <li key={`${word.target}-${index}`}>
                <SpokenText text={word.target} src={word.audioSrc} />
                <span className="muted">{word.source}</span>
              </li>
            ))}
          </ul>
          <p className="meta">{t("curriculum.player.summaryWordsNote")}</p>
        </section>
      </div>

      <div className="summary-actions">
        {nextHref && (
          <Link className="btn btn-lg" to={nextHref}>
            {t("curriculum.nextLesson")}
            <Icon name="arrowRight" size={18} />
          </Link>
        )}
        <Link className="btn-ghost" to={moduleHref}>
          {t("curriculum.player.backToModule")}
        </Link>
      </div>
    </div>
  );
}
