import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";

export interface ProgressStage {
  id: string;
  label: string;
}

interface Props {
  position: string;
  title: string;
  meta: string;
  closeTo: string;
  /** 0–100 */
  percent: number;
  /** Etapy lekcji albo sekcje testu; puste, gdy lekcja nie ma treści. */
  stages?: ProgressStage[];
  /** Id bieżącego etapu (null — żaden, np. ekran wstępu testu). */
  current?: string | null;
}

/** Nagłówek playera: gdzie jestem w kursie, ile lekcji za mną, na jakim etapie. */
export function LessonProgress({ position, title, meta, closeTo, percent, stages = [], current = null }: Props) {
  const t = useT();
  const stageIndex = stages.findIndex((stage) => stage.id === current);
  return (
    <header className="lesson-top">
      <div className="lesson-top-row">
        <Link className="lesson-close" to={closeTo} aria-label={t("curriculum.player.close")} title={t("curriculum.player.closeNote")}>
          <Icon name="close" size={18} />
        </Link>
        <div className="lesson-heading">
          <span className="lesson-position">{position}</span>
          <h1 className="lesson-title">{title}</h1>
          <span className="lesson-meta">{meta}</span>
        </div>
      </div>
      <div className="lesson-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={title}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {stages.length > 0 && (
        <>
          <ol className="lesson-stages" aria-label={stageIndex >= 0 ? t("curriculum.player.stageOf", { n: stageIndex + 1, total: stages.length }) : title}>
            {stages.map((stage, index) => (
              <li
                key={stage.id}
                className={stageIndex >= 0 && index < stageIndex ? "done" : index === stageIndex ? "on" : ""}
                aria-current={index === stageIndex ? "step" : undefined}
              >
                <span className="lesson-stage-n">{index + 1}</span>
                {stage.label}
              </li>
            ))}
          </ol>
          {stageIndex >= 0 && (
            <p className="lesson-stage-compact">
              {t("curriculum.player.stageOf", { n: stageIndex + 1, total: stages.length })} · <strong>{stages[stageIndex].label}</strong>
            </p>
          )}
        </>
      )}
    </header>
  );
}
