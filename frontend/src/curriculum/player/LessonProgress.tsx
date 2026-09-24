import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useT } from "@/i18n";
import { LESSON_STAGES, type LessonStage } from "../types";

interface Props {
  position: string;
  title: string;
  meta: string;
  closeTo: string;
  /** 0–100 */
  percent: number;
  /** Bieżący etap; null, gdy lekcja nie ma treści. */
  stage: LessonStage | null;
}

/** Nagłówek playera: gdzie jestem w kursie, ile lekcji za mną, na jakim etapie. */
export function LessonProgress({ position, title, meta, closeTo, percent, stage }: Props) {
  const t = useT();
  const stageIndex = stage ? LESSON_STAGES.indexOf(stage) : -1;
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
      <div
        className="lesson-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={title}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      {stage && (
        <>
          <ol className="lesson-stages" aria-label={t("curriculum.player.stageOf", { n: stageIndex + 1, total: LESSON_STAGES.length })}>
            {LESSON_STAGES.map((item, index) => (
              <li
                key={item}
                className={index < stageIndex ? "done" : index === stageIndex ? "on" : ""}
                aria-current={index === stageIndex ? "step" : undefined}
              >
                <span className="lesson-stage-n">{index + 1}</span>
                {t(`curriculum.player.stages.${item}`)}
              </li>
            ))}
          </ol>
          <p className="lesson-stage-compact">
            {t("curriculum.player.stageOf", { n: stageIndex + 1, total: LESSON_STAGES.length })} ·{" "}
            <strong>{t(`curriculum.player.stages.${stage}`)}</strong>
          </p>
        </>
      )}
    </header>
  );
}
