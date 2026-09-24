import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook TTS dla kursu. Korzysta z Web Speech API tylko wtedy, gdy przeglądarka
 * ma głos chorwacki — obcy głos czytający chorwacki tekst uczyłby złej wymowy.
 * Bez głosu przycisk audio pozostaje nieaktywnym placeholderem.
 * TODO(curriculum-audio): nagrania z backendu (pole audio w danych) mają pierwszeństwo przed TTS.
 */
export function useSpeech(lang = "hr") {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => setVoice(window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null);
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pick);
      window.speechSynthesis.cancel();
    };
  }, [lang]);

  const speak = useCallback(
    (text: string) => {
      if (!voice) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    },
    [voice],
  );

  return { available: Boolean(voice), speak };
}

/**
 * Odtwarza po kolei nagrania linii dialogu. Gdy któregoś pliku brakuje,
 * zgłasza błąd — widok pokazuje wtedy transkrypcję zamiast ciszy.
 */
export function useAudioSequence(sources: readonly string[]) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const stop = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(() => {
    if (!sources.length) return;
    stop();
    setFailed(false);
    const next = (index: number) => {
      if (index >= sources.length) {
        setPlaying(null);
        return;
      }
      const element = new Audio(sources[index]);
      audio.current = element;
      setPlaying(index);
      element.onended = () => next(index + 1);
      element.onerror = () => {
        setFailed(true);
        setPlaying(null);
      };
      element.play().catch(() => {
        setFailed(true);
        setPlaying(null);
      });
    };
    next(0);
  }, [sources, stop]);

  return { play, stop, playing, failed, available: sources.length > 0 };
}
