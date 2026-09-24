import { useT } from "@/i18n";
import type { CefrLevelId, CourseLevel } from "../types";

/** A1 · A2 · B1 · B2 — niedostępne poziomy są wyciszone, bez agresywnych kłódek. */
export function LevelSelector({
  levels,
  selected,
  onSelect,
}: {
  levels: CourseLevel[];
  selected: CefrLevelId;
  onSelect: (id: CefrLevelId) => void;
}) {
  const t = useT();
  return (
    <div className="segmented level-selector" role="group" aria-label={t("curriculum.chooseLevel")}>
      {levels.map((level) => (
        <button
          key={level.id}
          type="button"
          className={level.id === selected ? "on" : ""}
          aria-pressed={level.id === selected}
          disabled={!level.available}
          title={level.available ? undefined : t("curriculum.soonTitle", { level: level.id })}
          onClick={() => onSelect(level.id)}
        >
          {level.id}
          {!level.available && <span className="level-soon">{t("curriculum.soon")}</span>}
        </button>
      ))}
    </div>
  );
}
