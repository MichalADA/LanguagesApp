import { createEventId } from "@/utils/eventId";
import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/auth/useAuth";

import {
  finishLearningSession,
  recordLearningAnswer,
  startLearningSession,
} from "./learningApi";
import type { LearningAnswerInput } from "./learningApi";

type SessionPromise = Promise<string | null>;

/**
 * Mirrors one gameplay session to the backend for authenticated users.
 * Guest mode remains entirely local. Requests are serialised so a quick
 * answer cannot overtake session creation or completion.
 */
export function useLearningSession({
  gameType = "legacy-game",
}: { gameType?: string; trackVocabulary?: boolean } = {}) {
  const { status, apiRequest } = useAuth();

  const failures = useRef(new Map<string, number>());
  const activeSession = useRef<SessionPromise | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback(
    (session: SessionPromise, action: (sessionId: string) => Promise<void>) => {
      queue.current = queue.current
        .then(async () => {
          const sessionId = await session;
          if (sessionId) {
            await action(sessionId);
            window.dispatchEvent(new Event("review-updated"));
          }
        })
        .catch(reportSyncFailure);
      return queue.current;
    },
    [],
  );

  const finish = useCallback((): Promise<void> => {
    const session = activeSession.current;
    activeSession.current = null;
    if (!session) return Promise.resolve();
    return enqueue(session, (sessionId) =>
      finishLearningSession(apiRequest, sessionId),
    );
  }, [apiRequest, enqueue]);

  const start = useCallback(
    (courseId: string): void => {
      if (status !== "authenticated") {
        activeSession.current = null;
        return;
      }

      if (activeSession.current) void finish();
      failures.current.clear();
      activeSession.current = startLearningSession(apiRequest, courseId)
        .then((session) => session.id)
        .catch((error: unknown) => {
          reportSyncFailure(error);
          return null;
        });
    },
    [status, apiRequest, finish],
  );

  const record = useCallback(
    (answer: LearningAnswerInput): void => {
      const session = activeSession.current;
      if (!session) return;
      const eventId = answer.eventId ?? createEventId();
      const attemptsBeforeCorrect =
        answer.attemptsBeforeCorrect ??
        failures.current.get(answer.wordRef) ??
        0;
      if (!answer.correct)
        failures.current.set(
          answer.wordRef,
          Math.min(1000, attemptsBeforeCorrect + 1),
        );
      void enqueue(session, (sessionId) =>
        recordLearningAnswer(apiRequest, sessionId, {
          ...answer,
          eventId,
          attemptsBeforeCorrect,
          gameType,
          direction: answer.direction ?? "SOURCE_TO_TARGET",
        }),
      );
    },
    [apiRequest, enqueue, gameType],
  );

  useEffect(
    () => () => {
      void finish();
    },
    [finish],
  );

  return { start, record, finish };
}

function reportSyncFailure(error: unknown): void {
  // Gameplay remains usable offline; do not expose raw server responses in UI.
  console.warn("Nie udało się zsynchronizować sesji nauki.", error);
}
