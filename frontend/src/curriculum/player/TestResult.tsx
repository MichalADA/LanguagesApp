import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { SpokenText } from "@/components/AudioButton";
import { useT } from "@/i18n";
import { TEST_SECTIONS, type SummaryStep } from "../types";
import { TEST_SECTION_THRESHOLD, type LessonEvaluation } from "../grading";
import { ScoreLine } from "./LessonStep";

/** Sekcja „dobrze opanowana” — wskazówka, co powtórzyć (niezależna od progu zaliczenia). */
const STRONG = 0.75;

export function TestResult({
  step,
  evaluation,
  onRetry,
  onRestart,
  moduleHref,
  courseHref,
}: {
  step: SummaryStep;
  evaluation: LessonEvaluation;
  onRetry: () => void;
  onRestart: () => void;
  moduleHref: string;
  courseHref: string;
}) {
  const t = useT();
  const { sections, passed, mistakes } = evaluation;
  const scored = TEST_SECTIONS.filter((section) => sections[section] && sections[section]!.total > 0);
  const percent = Math.round(evaluation.firstTry * 100);
  const strong = scored.filter((s) => sections[s]!.correct / sections[s]!.total >= STRONG);
  const weak = scored.filter((s) => !strong.includes(s));

  return (
    <div className="step step-summary test-result">
      <span className={passed ? "summary-mark" : "summary-mark pending"} aria-hidden="true">
        <Icon name={passed ? "check" : "repeat"} size={26} />
      </span>
      {passed && step.closing && (
        <p className="test-closing">
          <SpokenText text={step.closing.target} src={step.closing.audioSrc} /> <span className="muted">— {step.closing.source}</span>
        </p>
      )}
      <h2 className="summary-title">{passed ? step.title : t("curriculum.player.testFailed")}</h2>
      <div className="test-score">
        <strong>{percent}%</strong>
        <span className={passed ? "test-verdict pass" : "test-verdict fail"}>{t(passed ? "curriculum.player.testPassed" : "curriculum.player.testFailed")}</span>
      </div>
      <ScoreLine evaluation={evaluation} />

      <ul className="test-sections">
        {scored.map((section) => {
          const score = sections[section]!;
          const good = strong.includes(section);
          const below = score.correct / score.total < TEST_SECTION_THRESHOLD;
          return (
            <li key={section} className={good ? "strong" : "weak"}>
              <span className="test-section-name">{t(`curriculum.player.sections.${section}`)}</span>
              <span className="bar" aria-hidden="true">
                <span style={{ width: `${(score.correct / score.total) * 100}%` }} />
              </span>
              <span className="test-section-score">
                {score.correct} / {score.total}
              </span>
              <span className="test-section-label">{t(below ? "curriculum.player.belowThreshold" : good ? "curriculum.player.strong" : "curriculum.player.review")}</span>
            </li>
          );
        })}
      </ul>
      <p className="meta">{t("curriculum.player.productionNote")}</p>
      {weak.length > 0 && <p className="muted">{t("curriculum.player.testAdvice")}</p>}

      <div className="summary-actions">
        {passed ? (
          <Link className="btn btn-lg" to={courseHref}>
            {t("curriculum.player.backToCourse")}
            <Icon name="arrowRight" size={18} />
          </Link>
        ) : (
          <button type="button" className="btn btn-lg" onClick={onRestart}>
            {t("curriculum.player.testRetake")}
          </button>
        )}
        {mistakes.length > 0 && (
          <button type="button" className="btn-ghost" onClick={onRetry}>
            {t("curriculum.player.retryMistakes", { n: mistakes.length })}
          </button>
        )}
        <Link className="btn-ghost" to={moduleHref}>
          {t("curriculum.player.backToModule")}
        </Link>
      </div>
    </div>
  );
}
