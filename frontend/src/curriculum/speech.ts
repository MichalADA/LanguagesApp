import { useCallback, useEffect, useRef, useState } from "react";
import { playAudio, stopAudio, subscribeAudio } from "@/audio/player";

/**
 * Odtwarza po kolei nagrania linii dialogu przez wspólny kanał audio
 * (src/audio/player.ts) — kliknięcie innego przycisku odsłuchu przerywa sekwencję.
 * Gdy któregoś pliku brakuje, zgłasza błąd, a widok pokazuje transkrypcję.
 */
export function useAudioSequence(sources: readonly string[]) {
  const [playing, setPlaying] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const cancel = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    cancel.current?.();
    cancel.current = null;
    setPlaying(null);
  }, []);

  useEffect(() => () => {
    cancel.current?.();
  }, []);

  // Inny przycisk odsłuchu przejął kanał — sekwencja się kończy.
  useEffect(
    () =>
      subscribeAudio((current) => {
        if (current === null || !sources.includes(current)) setPlaying(null);
      }),
    [sources],
  );

  const play = useCallback(() => {
    if (!sources.length) return;
    stopAudio();
    setFailed(false);
    let stopped = false;
    const next = (index: number) => {
      if (stopped || index >= sources.length) {
        setPlaying(null);
        return;
      }
      setPlaying(index);
      const stopClip = playAudio(sources[index], {
        onEnd: () => next(index + 1),
        onError: () => {
          setFailed(true);
          setPlaying(null);
        },
      });
      cancel.current = () => {
        stopped = true;
        stopClip();
      };
    };
    next(0);
  }, [sources]);

  return { play, stop, playing, failed, available: sources.length > 0 };
}
