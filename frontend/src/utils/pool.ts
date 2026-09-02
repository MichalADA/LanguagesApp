import type { Course } from "@/courses/types";
import type { PoolSelection } from "@/progress/types";
import type { Translator } from "@/i18n/types";

/** Czytelna etykieta puli — używana na pulpicie i w „Kontynuuj naukę". */
export function describePool(pool: PoolSelection, course: Course, t: Translator): string {
  const { source, topic } = pool;
  let base: string;
  switch (source.kind) {
    case "block": {
      const block = course.blocks.find((b) => b.id === source.block);
      base = block ? block.range : source.block;
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
