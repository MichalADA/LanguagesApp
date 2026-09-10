/**
 * Jedno źródło prawdy dla poziomów nauki.
 *
 * Numery bloków są wyłącznie detalem technicznym datasetu. Komponenty i gry
 * operują na poziomach, a ten moduł tłumaczy poziom na kumulacyjną listę bloków.
 */
export const LEARNING_LEVELS = [
  {
    id: "A1",
    blocks: [1],
    nameKey: "learningLevels.A1.name",
    wordCount: 500,
  },
  {
    id: "A2",
    blocks: [1, 2],
    nameKey: "learningLevels.A2.name",
    wordCount: 1_000,
  },
  {
    id: "B1",
    blocks: [1, 2, 3, 4, 5, 6],
    nameKey: "learningLevels.B1.name",
    wordCount: 3_000,
  },
] as const;

export type LearningLevelId = (typeof LEARNING_LEVELS)[number]["id"];

interface BlockRef {
  id: string;
}

export function findLearningLevel(id: LearningLevelId) {
  return LEARNING_LEVELS.find((level) => level.id === id);
}

/** Zwraca identyfikatory technicznych bloków należących do poziomu. */
export function blockIdsForLevel(levelId: LearningLevelId, blocks: readonly BlockRef[]): string[] {
  const level = findLearningLevel(levelId);
  if (!level) return [];

  const blockNumbers: readonly number[] = level.blocks;
  return blocks
    .filter((_, index) => blockNumbers.includes(index + 1))
    .map((block) => block.id);
}

export function entriesForLevel<T extends { block: string }>(
  entries: readonly T[],
  levelId: LearningLevelId,
  blocks: readonly BlockRef[],
): T[] {
  const blockIds = new Set(blockIdsForLevel(levelId, blocks));
  return entries.filter((entry) => blockIds.has(entry.block));
}

/**
 * Stare zapisy postępu mogły przechowywać pojedynczy blok. Mapujemy go na
 * najmniejszy poziom, który go obejmuje, bez ujawniania bloku w interfejsie.
 */
export function levelForLegacyBlock(
  blockId: string,
  blocks: readonly BlockRef[],
): LearningLevelId {
  const blockNumber = blocks.findIndex((block) => block.id === blockId) + 1;
  if (blockNumber < 1) return LEARNING_LEVELS[0].id;

  return (
    LEARNING_LEVELS.find((level) => {
      const blockNumbers: readonly number[] = level.blocks;
      return blockNumbers.includes(blockNumber);
    })?.id ?? LEARNING_LEVELS[LEARNING_LEVELS.length - 1].id
  );
}
