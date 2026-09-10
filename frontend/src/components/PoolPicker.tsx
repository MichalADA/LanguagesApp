import type { PoolSelection, PoolSource } from "@/progress/types";
import { useCourse } from "@/courses/CourseProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useT } from "@/i18n";

function sameSource(a: PoolSource, b: PoolSource): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "block" && b.kind === "block") return a.block === b.block;
  return true;
}

interface Props {
  value: PoolSelection;
  onChange: (next: PoolSelection) => void;
  poolSize: number;
  maxTopics?: number;
}

/** Wybór puli słów. Wspólny dla wszystkich gier, sterowany danymi kursu. */
export function PoolPicker({ value, onChange, poolSize, maxTopics = 14 }: Props) {
  const t = useT();
  const { course } = useCourse();
  const { topics, entries } = useVocabulary();

  const special: { source: PoolSource; label: string; note: string }[] = [
    { source: { kind: "all" }, label: t("pool.all", { n: entries.length }), note: t("pool.allNote") },
    { source: { kind: "difficult" }, label: t("pool.difficult"), note: t("pool.difficultNote") },
    { source: { kind: "mistakes" }, label: t("pool.mistakes"), note: t("pool.mistakesNote") },
    { source: { kind: "learned" }, label: t("pool.learned"), note: t("pool.learnedNote") },
  ];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">{t("pool.step1")}</span>
        <div className="grid grid-2">
          {course.blocks.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={
                value.source.kind === "block" && value.source.block === b.id ? "tile on" : "tile"
              }
              style={{ minHeight: 94 }}
              onClick={() => onChange({ ...value, source: { kind: "block", block: b.id } })}
            >
              <span style={{ fontSize: 17, fontWeight: 600 }}>Blok {i + 1}</span>
              <span className="tile-note">Słowa {b.range}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-2" style={{ marginTop: 8 }}>
          {special.map((s) => (
            <button
              key={s.label}
              type="button"
              className={sameSource(value.source, s.source) ? "tile on" : "tile"}
              style={{ minHeight: 94 }}
              onClick={() => onChange({ ...value, source: s.source })}
            >
              <span style={{ fontSize: 17, fontWeight: 600 }}>{s.label}</span>
              <span className="tile-note">{s.note}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">{t("pool.step2")}</span>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={value.topic === null ? "chip on" : "chip"}
            onClick={() => onChange({ ...value, topic: null })}
          >
            {t("pool.noFilter")}
          </button>
          {topics.slice(0, maxTopics).map((topic) => (
            <button
              key={topic}
              type="button"
              className={value.topic === topic ? "chip on" : "chip"}
              onClick={() => onChange({ ...value, topic })}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <span className="stat-note">
        {poolSize > 0 ? t("pool.size", { n: poolSize }) : t("pool.empty")}
      </span>
    </div>
  );
}
