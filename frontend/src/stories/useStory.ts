import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { findStoryEntry } from "./data";
import { emptyProgress, type StoryProgress } from "./progress";
import { loadStoryProgress, saveMissionCompletion, type SavedCompletion } from "./repository";
import type { Mission, Story } from "./types";

export type StoryStatus = "loading" | "ready" | "missing" | "error";

/**
 * Historia (dane, ładowane leniwie) + postęp gracza. Zalogowany → backend, gość → localStorage
 * (owner „guest”, jak reszta trybu gościa). Zmiana konta przeładowuje postęp.
 */
export function useStory(storyId: string | undefined) {
  const { user, status: authStatus, apiRequest } = useAuth();
  const authenticated = authStatus === "authenticated";
  const owner = user?.id ?? "guest";
  const entry = findStoryEntry(storyId);
  const [story, setStory] = useState<Story | null>(null);
  const [progress, setProgress] = useState<StoryProgress | null>(null);
  const [pending, setPending] = useState(0);
  const [status, setStatus] = useState<StoryStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!entry?.load) {
      setStatus("missing");
      return;
    }
    if (authStatus === "loading") return;
    let alive = true;
    setStatus("loading");
    entry
      .load()
      .then(async (data) => {
        const loaded = await loadStoryProgress({ owner, courseId: data.courseId, story: data, request: authenticated ? apiRequest : undefined });
        if (!alive) return;
        setStory(data);
        setProgress(loaded.progress);
        setPending(loaded.pending);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [entry, owner, authenticated, authStatus, apiRequest, attempt]);

  const complete = useCallback(
    async (mission: Mission, score: number, flags: readonly string[]): Promise<SavedCompletion | null> => {
      if (!story || !progress) return null;
      const saved = await saveMissionCompletion({ owner, courseId: story.courseId, story, request: authenticated ? apiRequest : undefined }, progress, mission, score, flags);
      setProgress(saved.progress);
      setPending(saved.pending);
      return saved;
    },
    [story, progress, owner, authenticated, apiRequest],
  );

  return useMemo(
    () => ({
      entry,
      story,
      progress: progress ?? (story ? emptyProgress(story.id) : null),
      pending,
      status,
      authenticated,
      owner,
      playerName: authenticated && user?.displayName ? user.displayName.split(/\s+/)[0] : "Alex",
      reload: () => setAttempt((n) => n + 1),
      complete,
    }),
    [entry, story, progress, pending, status, authenticated, owner, user?.displayName, complete],
  );
}
