/**
 * Jeden kanał audio dla całej aplikacji: rozpoczęcie nowego nagrania zatrzymuje
 * poprzednie (przycisk przy słowie, dialog w ćwiczeniu słuchania itd.).
 * Komponenty nie tworzą własnych elementów <audio> — korzystają z tego modułu.
 */

type Listener = (src: string | null) => void;

let active: { audio: HTMLAudioElement; src: string; stop: () => void } | null = null;
const listeners = new Set<Listener>();

function emit() {
  const src = active?.src ?? null;
  listeners.forEach((listener) => listener(src));
}

export interface PlayOptions {
  onEnd?: () => void;
  onError?: () => void;
}

/** Zatrzymuje bieżące nagranie (jeśli jakieś gra). */
export function stopAudio(): void {
  if (!active) return;
  const current = active;
  active = null;
  current.stop();
  emit();
}

/** Odtwarza plik od początku; poprzednie nagranie jest zatrzymywane. */
export function playAudio(src: string, options: PlayOptions = {}): () => void {
  stopAudio();
  const audio = new Audio(src);
  let finished = false;
  const finish = (callback?: () => void) => {
    if (finished) return;
    finished = true;
    if (active?.audio === audio) {
      active = null;
      emit();
    }
    callback?.();
  };
  const entry = {
    audio,
    src,
    stop: () => {
      finished = true;
      audio.pause();
      audio.removeAttribute("src");
    },
  };
  active = entry;
  audio.onended = () => finish(options.onEnd);
  audio.onerror = () => finish(options.onError);
  audio.play().catch(() => finish(options.onError));
  emit();
  return () => {
    if (active === entry) stopAudio();
  };
}

/** Subskrypcja: który plik gra teraz (null — cisza). */
export function subscribeAudio(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
