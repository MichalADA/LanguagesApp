import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { isDifficult, needsReview, statFor } from "@/progress/service";
import { formatRelative } from "@/utils/date";
import { useT } from "@/i18n";

type Filter = "review" | "difficult" | "flagged";

export function ReviewPage() {
  const t = useT();
  const { entries } = useVocabulary();
  const { state, courseId, toggleFlag } = useProgress();
  const [filter, setFilter] = useState<Filter>("review");

  const filters: { id: Filter; label: string }[] = [
    { id: "review", label: t("review.filterReview") },
    { id: "difficult", label: t("review.filterDifficult") },
    { id: "flagged", label: t("review.filterFlagged") },
  ];

  const rows = useMemo(
    () =>
      entries
        .map((entry) => ({ entry, stat: statFor(state, courseId, entry) }))
        .filter(({ stat }) => {
          if (filter === "review") return needsReview(stat);
          if (filter === "difficult") return isDifficult(stat);
          return stat.markedDifficult;
        })
        .sort((a, b) => b.stat.difficulty - a.stat.difficulty || b.stat.lastSeen - a.stat.lastSeen),
    [entries, state, courseId, filter],
  );

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("review.eyebrow")}</span>
        <h1>{t("review.title")}</h1>
        <p className="lede">{t("review.subtitle")}</p>
      </header>

      <div className="row" style={{ gap: 8 }}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? "chip on" : "chip"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
        <Link to="/gry/bura" className="mono" style={{ fontSize: 13, marginLeft: "auto" }}>
          {t("review.practice")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="panel empty">
          {filter === "review" ? t("review.emptyReview") : t("review.emptyOther")}
        </div>
      ) : (
        <div className="list">
          {rows.map(({ entry, stat }) => (
            <div key={entry.id} className="list-row" style={{ alignItems: "center" }}>
              <div className="stack" style={{ gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 16 }}>
                  <span className="muted">{entry.sourceText}</span>
                  <span className="dim" style={{ margin: "0 8px" }}>
                    →
                  </span>
                  <span style={{ color: "var(--accent-text)", fontWeight: 600 }}>{entry.targetText}</span>
                </span>
                <span className="dim" style={{ fontSize: 13 }}>
                  {entry.exampleTarget}
                </span>
              </div>
              <div className="row" style={{ gap: 12, flexShrink: 0 }}>
                <span className="mono dim" style={{ fontSize: 12 }}>
                  {stat.correctAnswers}/{stat.attempts} · {formatRelative(stat.lastSeen)}
                </span>
                <button
                  type="button"
                  className="chip"
                  onClick={() => toggleFlag(entry)}
                  title={t("review.markDifficult")}
                >
                  {stat.markedDifficult ? "★" : "☆"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
