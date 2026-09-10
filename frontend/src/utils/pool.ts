import type { Course } from "@/courses/types";
import type { PoolSelection } from "@/progress/types";
import type { Translator } from "@/i18n/types";
import { levelForLegacyBlock } from "@/config/learningLevels";

/** Czytelna etykieta puli — używana na pulpicie i w „Kontynuuj naukę". */
export function describePool(pool: PoolSelection, course: Course, t: Translator): string {
  const { source, topic } = pool;
  let base: string;
  switch (source.kind) {
    case "level":
      base = source.level;
      break;
    case "block": {
      base = levelForLegacyBlock(source.block, course.blocks);
      break;
    }
    case "learned":
      base = t("pool.learned");
      break;
    case "difficult":
      base = t("pool.difficult");
      break;
    case "mistakes":
      base = t("pool.mistakes");
      break;
    default:
      base = t("common.all").toLocaleLowerCase();
  }
  return topic ? `${base} · ${topic}` : base;
}
