import type { CurriculumReviewItem } from "./types";

/**
 * Treść kart PHRASE (zwroty z lekcji spoza słownika kursu) dla sesji powtórek.
 * Pliki generuje scripts/generate-curriculum.mjs; ładowane leniwie, tylko w powtórkach.
 */
export async function loadCurriculumReviewItems(courseId: string): Promise<Record<string, CurriculumReviewItem>> {
  if (courseId !== "pl-hr") return {};
  const [a1, a2] = await Promise.all([import("./data/hr-a1/review-items"), import("./data/hr-a2/review-items")]);
  return { ...a2.HR_A2_REVIEW_ITEMS, ...a1.HR_A1_REVIEW_ITEMS };
}
