import { useCallback, useEffect, useRef } from "react";

import { useAuth } from "@/auth/useAuth";
import { useCourse } from "@/courses/CourseProvider";
import { markSeen as markFlashcardSeen } from "@/flashcards/flashcardsApi";
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
export function useLearningSession() {
  const { status, apiRequest } = useAuth();
  const { course } = useCourse();
  const activeSession = useRef<SessionPromise | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Words we've already reported to the flashcards "seen" endpoint this
  // session. Prevents a burst of duplicate POSTs on repeat encounters.
  const seenRefs = useRef<Set<string>>(new Set());

  const enqueue = useCallback(
    (session: SessionPromise, action: (sessionId: string) => Promise<void>) => {
      queue.current = queue.current
        .then(async () => {
          const sessionId = await session;
          if (sessionId) await action(sessionId);
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
    return enqueue(session, (sessionId) => finishLearningSession(apiRequest, sessionId));
  }, [apiRequest, enqueue]);

  const start = useCallback((courseId: string): void => {
    if (status !== "authenticated") {
      activeSession.current = null;
      return;
    }

    if (activeSession.current) void finish();
    activeSession.current = startLearningSession(apiRequest, courseId)
      .then((session) => session.id)
      .catch((error: unknown) => {
        reportSyncFailure(error);
        return null;
      });
  }, [status, apiRequest, finish]);

  const record = useCallback((answer: LearningAnswerInput): void => {
    const session = activeSession.current;
    if (!session) return;
    void enqueue(session, (sessionId) => recordLearningAnswer(apiRequest, sessionId, answer));

    // Seed the flashcards' firstSeenAt so a word encountered in a game
    // shows up as "already met" the next time the user opens Fiszki.
    // Fire-and-forget: the game's outcome does not depend on this call.
    if (status === "authenticated" && answer.wordRef && !seenRefs.current.has(answer.wordRef)) {
      seenRefs.current.add(answer.wordRef);
      void markFlashcardSeen(apiRequest, { course: course.id, wordRef: answer.wordRef }).catch(
        () => {
          seenRefs.current.delete(answer.wordRef);
        },
      );
    }
  }, [apiRequest, enqueue, status, course.id]);

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
