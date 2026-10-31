import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import { grammarHref, grammarSheetFor, listeningSuggestion } from "./suggestions";

interface Props {
  level: string;
  module?: number;
  lessonNumber?: number;
  /** Nagłówek sekcji — po lekcji „Utrwal lekcję”, na stronie głównej „Poćwicz też”. */
  title: string;
  className?: string;
}

/** Dwie karty: słuchanie i gramatyka dopasowane do miejsca w kursie. */
export function PracticeSuggestions({ level, module, lessonNumber = 0, title, className }: Props) {
  const t = useT();
  const listening = listeningSuggestion(level, lessonNumber);
  const sheet = grammarSheetFor(level, module, lessonNumber);
  return (
    <section className={["practice-suggest", className].filter(Boolean).join(" ")} aria-label={title}>
      <h3 className="step-label">{title}</h3>
      <div className="practice-suggest-grid">
        <Link className="practice-card" to={listening.href}>
          <span className="practice-card-kicker">{t("practice.listening")} · {listening.level}</span>
          <strong>{t(`practice.listeningKind.${listening.kind}`)}</strong>
          <span className="muted">{t(`practice.listeningHint.${listening.kind}`)}</span>
          <span className="practice-card-go">{t("practice.go")} <Icon name="arrowRight" size={15} /></span>
        </Link>
        <Link className="practice-card" to={grammarHref(sheet)}>
          <span className="practice-card-kicker">{t("practice.grammar")}{sheet ? ` · ${sheet.level}` : ""}</span>
          <strong>{sheet?.title ?? t("practice.grammarAll")}</strong>
          <span className="muted">{t("practice.grammarHint")}</span>
          <span className="practice-card-go">{t("practice.go")} <Icon name="arrowRight" size={15} /></span>
        </Link>
      </div>
    </section>
  );
}
