import type { Verdict } from "@/services/validation";

export const BURA_ID = "bura";

export const HIT_POINTS = 10;
export const NEAR_POINTS = 5;
export const HINT_COST = 3;

/** Mnożnik rośnie co pięć trafień z rzędu. */
export function multiplierFor(streak: number): number {
  return 1 + Math.floor(streak / 5);
}

export function pointsFor(verdict: Verdict, streak: number): number {
  if (verdict === "hit") return HIT_POINTS * multiplierFor(streak);
  if (verdict === "near") return NEAR_POINTS;
  return 0;
}
