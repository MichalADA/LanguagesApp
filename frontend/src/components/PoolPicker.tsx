import type { PoolSelection, PoolSource } from "@/progress/types";
import { useCourse } from "@/courses/CourseProvider";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useT } from "@/i18n";
import { LEARNING_LEVELS, levelForLegacyBlock } from "@/config/learningLevels";
import { VOCABULARY_SUPPLEMENT_TAG } from "@/vocabulary/types";
import type { LearningLevelId } from "@/config/learningLevels";

function sameSource(a: PoolSource, b: PoolSource): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "level" && b.kind === "level") return a.level === b.level;
  if (a.kind === "block" && b.kind === "block") return a.block === b.block;
  return true;
}

interface Props {
  value: PoolSelection;
  onChange: (next: PoolSelection) => void;
  poolSize: number;
  maxTopics?: number;
  sentenceCounts?: Record<LearningLevelId, number>;
}

/** Wybór puli słów. Wspólny dla wszystkich gier, sterowany danymi kursu. */
export function PoolPicker({ value, onChange, poolSize, maxTopics = 14, sentenceCounts }: Props) {
  const t = useT();
  const { course } = useCourse();
  const { topics, entries } = useVocabulary();

  const supplementSize = entries.filter((entry) => entry.tags.includes(VOCABULARY_SUPPLEMENT_TAG)).length;

  const selectedLevel =
    value.source.kind === "level"
      ? value.source.level
      : value.source.kind === "block"
        ? levelForLegacyBlock(value.source.block, course.blocks)
        : null;

  const special: { source: PoolSource; label: string; note: string }[] = [
    { source: { kind: "difficult" }, label: t("pool.difficult"), note: t("pool.difficultNote") },
    { source: { kind: "mistakes" }, label: t("pool.mistakes"), note: t("pool.mistakesNote") },
    { source: { kind: "learned" }, label: t("pool.learned"), note: t("pool.learnedNote") },
    { source: { kind: "all" }, label: t("pool.allWords"), note: t("pool.allNote", { n: entries.length }) },
  ];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">{t(sentenceCounts ? "sentences.chooseLevel" : "pool.step1")}</span>
        <div className="grid grid-3">
          {LEARNING_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              className={selectedLevel === level.id ? "tile on" : "tile"}
              style={{ minHeight: 94 }}
              onClick={() => onChange({ ...value, source: { kind: "level", level: level.id } })}
            >
              <span style={{ fontSize: 20, fontWeight: 700 }}>{level.id}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{t(level.nameKey)}</span>
              <span className="tile-note">{sentenceCounts ? t("sentences.count", { n: sentenceCounts[level.id] }) : t("learningLevels.wordCount", { n: level.wordCount })}</span>
            </button>
          ))}
        </div>

        {!sentenceCounts && supplementSize > 0 && (
          <button
            type="button"
            className={value.source.kind === "supplement" ? "tile on" : "tile"}
            onClick={() => onChange({ ...value, source: { kind: "supplement" } })}
          >
            <span style={{ fontSize: 17, fontWeight: 600 }}>{t("pool.supplement")}</span>
            <span className="tile-note">{t("pool.supplementNote", { n: supplementSize })}</span>
          </button>
        )}

        {!sentenceCounts && <><span className="eyebrow" style={{ marginTop: 8 }}>{t("pool.reviews")}</span>
        <div className="grid grid-2">
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
        </div></>}
      </div>

      {!sentenceCounts && <div className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">{t("pool.step2")}</span>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={value.topic === null ? "chip on" : "chip"}
            onClick={() => onChange({ ...value, topic: null })}
          >
            {t("pool.noFilter")}
          </button>
          {topics.filter((topic) => topic !== VOCABULARY_SUPPLEMENT_TAG).slice(0, maxTopics).map((topic) => (
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
      </div>}

      <span className="stat-note">
        {sentenceCounts ? t("sentences.exactLevel") : poolSize > 0 ? t("pool.size", { n: poolSize }) : t("pool.empty")}
      </span>
    </div>
  );
}
