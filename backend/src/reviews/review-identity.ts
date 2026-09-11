import { ReviewItemType } from "@prisma/client";
/** Course namespace prevents collisions. Mode/direction never participates in identity. */
export function reviewIdentity(
  course: string,
  ref: string,
): { itemType: ReviewItemType; itemId: string } {
  if (ref.startsWith("sentence:"))
    return {
      itemType: "SENTENCE",
      itemId: `${course}:sentence:${ref.split(":").slice(2).join(":")}`,
    };
  if (ref.includes(":verb:"))
    return {
      itemType: "VERB",
      itemId: ref.startsWith(`${course}:`) ? ref : `${course}:${ref}`,
    };
  return {
    itemType: "WORD",
    itemId: ref.startsWith(`${course}:`) ? ref : `${course}:${ref}`,
  };
}
