import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import type { Verdict } from "@/services/validation";

/** Stała stopka kroku: informacja zwrotna po lewej, jedna akcja po prawej. Enter = akcja. */
export function StepFooter({
  label,
  onAction,
  disabled,
  feedback,
  secondary,
}: {
  label: string;
  onAction: () => void;
  disabled?: boolean;
  feedback?: ReactNode;
  secondary?: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.defaultPrevented || event.shiftKey) return;
      if ((event.target as HTMLElement | null)?.tagName === "TEXTAREA") return;
      // Enter na innym przycisku uruchamia ten przycisk — chyba że jest już nieaktywny (np. wybrana odpowiedź).
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "BUTTON" && target !== ref.current && target.getAttribute("aria-disabled") !== "true") return;
      if (ref.current && !ref.current.disabled) {
        event.preventDefault();
        ref.current.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={feedback ? "step-footer with-feedback" : "step-footer"}>
      <div className="step-footer-inner">
        <div className="step-feedback" aria-live="polite">
          {feedback}
        </div>
        <div className="step-actions">
          {secondary}
          <button ref={ref} type="button" className="btn btn-lg" onClick={onAction} disabled={disabled}>
            {label}
            <Icon name="arrowRight" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Feedback({ verdict, answer, explanation }: { verdict: Verdict; answer?: string; explanation?: string }) {
  const t = useT();
  return (
    <div className={`feedback ${verdict}`}>
      <span className="feedback-icon" aria-hidden="true">
        <Icon name={verdict === "miss" ? "close" : "check"} size={16} />
      </span>
      <div>
        <strong>{t(`curriculum.player.${verdict === "hit" ? "correct" : verdict === "near" ? "near" : "wrong"}`)}</strong>
        {verdict !== "hit" && answer && (
          <p>
            {t("curriculum.player.answer")} <span className="target">{answer}</span>
          </p>
        )}
        {explanation && <p className="feedback-explanation">{explanation}</p>}
      </div>
    </div>
  );
}
