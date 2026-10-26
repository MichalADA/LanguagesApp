import { evaluate } from "./engine";
import type { Mission, Story, StoryLocation } from "./types";

/**
 * Postęp historii (np. Split A1): flagi świata, XP i ukończone misje.
 * Ten sam kształt zwraca backend (GET /stories/:id/progress) i zapis gościa.
 */
export interface MissionRecord {
  missionId: string;
  firstCompletedAt: string;
  lastCompletedAt: string;
  plays: number;
  bestScore: number;
  xp: number;
}

export interface StoryProgress {
  storyId: string;
  flags: string[];
  xp: number;
  missions: MissionRecord[];
}

export const emptyProgress = (storyId: string): StoryProgress => ({ storyId, flags: [], xp: 0, missions: [] });

export const completedIds = (progress: StoryProgress) => progress.missions.map((m) => m.missionId);

export type MissionStatus = "locked" | "available" | "completed";

export function missionStatus(story: Story, progress: StoryProgress, mission: Mission): MissionStatus {
  const done = completedIds(progress);
  if (done.includes(mission.id)) return "completed";
  const location = story.locations.find((l) => l.id === mission.locationId);
  if (!location || !isLocationUnlocked(location, progress)) return "locked";
  return mission.requires.every((id) => done.includes(id)) ? "available" : "locked";
}

export function isLocationUnlocked(location: StoryLocation, progress: StoryProgress): boolean {
  if (location.comingSoon) return false;
  return !location.unlock || evaluate(location.unlock, progress.flags, completedIds(progress));
}

/** Pierwsza dostępna, nieukończona misja w kolejności historii (albo null — wszystko zrobione). */
export function nextMission(story: Story, progress: StoryProgress): Mission | null {
  return [...story.missions].sort((a, b) => a.order - b.order).find((m) => missionStatus(story, progress, m) === "available") ?? null;
}

export interface CompletionResult {
  progress: StoryProgress;
  firstCompletion: boolean;
  xpAwarded: number;
}

/**
 * Zapis ukończenia misji — ta sama reguła co w backendzie (StoriesService.complete):
 * nagroda tylko za pierwsze ukończenie, powtórka liczy podejścia i najlepszy wynik.
 */
export function completeMission(progress: StoryProgress, mission: Mission, score: number, flags: readonly string[], now = new Date()): CompletionResult {
  const at = now.toISOString();
  const existing = progress.missions.find((m) => m.missionId === mission.id);
  const merged = [...new Set([...progress.flags, ...flags])].sort();
  if (existing) {
    const missions = progress.missions.map((m) =>
      m.missionId === mission.id ? { ...m, plays: m.plays + 1, bestScore: Math.max(m.bestScore, score), lastCompletedAt: at } : m,
    );
    return { progress: { ...progress, flags: merged, missions }, firstCompletion: false, xpAwarded: 0 };
  }
  const record: MissionRecord = { missionId: mission.id, firstCompletedAt: at, lastCompletedAt: at, plays: 1, bestScore: score, xp: mission.xp };
  return {
    progress: { ...progress, flags: merged, xp: progress.xp + mission.xp, missions: [...progress.missions, record] },
    firstCompletion: true,
    xpAwarded: mission.xp,
  };
}

/** Odczyt z niepewnego źródła (localStorage): tylko poprawne pola, reszta odrzucona. */
export function sanitizeProgress(storyId: string, value: unknown): StoryProgress {
  if (!value || typeof value !== "object") return emptyProgress(storyId);
  const v = value as Partial<StoryProgress>;
  const flags = Array.isArray(v.flags) ? v.flags.filter((f): f is string => typeof f === "string") : [];
  const missions = Array.isArray(v.missions)
    ? v.missions.filter(
        (m): m is MissionRecord =>
          Boolean(m) && typeof m.missionId === "string" && Number.isInteger(m.plays) && Number.isInteger(m.bestScore) && Number.isInteger(m.xp),
      )
    : [];
  const unique = [...new Map(missions.map((m) => [m.missionId, m])).values()];
  return { storyId, flags: [...new Set(flags)].sort(), xp: unique.reduce((sum, m) => sum + Math.max(0, m.xp), 0), missions: unique };
}
