import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { SpokenText } from "@/components/AudioButton";
import { useT } from "@/i18n";
import { TEST_SECTIONS, type SummaryStep, type TestSection } from "../types";
import type { StepScore } from "./Exercises";

/** Próg „dobrze opanowane” — bez zaliczania i oblewania, tylko wskazówka, co powtórzyć. */
const STRONG = 0.75;

export function TestResult({
  step,
  sections,
  moduleHref,
  courseHref,
}: {
  step: SummaryStep;
  sections: Partial<Record<TestSection, StepScore>>;
  moduleHref: string;
  courseHref: string;
}) {
  const t = useT();
  const scored = TEST_SECTIONS.filter((section) => sections[section] && sections[section]!.total > 0);
  const correct = scored.reduce((sum, s) => sum + sections[s]!.correct, 0);
  const total = scored.reduce((sum, s) => sum + sections[s]!.total, 0);
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const strong = scored.filter((s) => sections[s]!.correct / sections[s]!.total >= STRONG);
  const weak = scored.filter((s) => !strong.includes(s));

  return (
    <div className="step step-summary test-result">
      <span className="summary-mark" aria-hidden="true">
        <Icon name="check" size={26} />
      </span>
      {step.closing && (
        <p className="test-closing">
          <SpokenText text={step.closing.target} src={step.closing.audioSrc} /> <span className="muted">— {step.closing.source}</span>
        </p>
      )}
      <h2 className="summary-title">{step.title}</h2>
      <div className="test-score">
        <strong>{percent}%</strong>
        <span className="muted">{t("curriculum.player.testCorrect", { correct, total })}</span>
      </div>

      <ul className="test-sections">
        {scored.map((section) => {
          const score = sections[section]!;
          const good = strong.includes(section);
          return (
            <li key={section} className={good ? "strong" : "weak"}>
              <span className="test-section-name">{t(`curriculum.player.sections.${section}`)}</span>
              <span className="bar" aria-hidden="true">
                <span style={{ width: `${(score.correct / score.total) * 100}%` }} />
              </span>
              <span className="test-section-score">
                {score.correct} / {score.total}
              </span>
              <span className="test-section-label">{t(good ? "curriculum.player.strong" : "curriculum.player.review")}</span>
            </li>
          );
        })}
      </ul>
      <p className="meta">{t("curriculum.player.productionNote")}</p>
      {weak.length > 0 && <p className="muted">{t("curriculum.player.testAdvice")}</p>}

      <div className="summary-actions">
        <Link className="btn btn-lg" to={courseHref}>
          {t("curriculum.player.backToCourse")}
          <Icon name="arrowRight" size={18} />
        </Link>
        <Link className="btn-ghost" to={moduleHref}>
          {t("curriculum.player.backToModule")}
        </Link>
      </div>
    </div>
  );
}
