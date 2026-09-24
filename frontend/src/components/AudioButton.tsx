import { useEffect, useState } from "react";
import { playAudio, stopAudio, subscribeAudio } from "@/audio/player";
import { useT } from "@/i18n";
import { Icon } from "./Icon";

interface Props {
  /** Ścieżka do statycznego pliku (np. /audio/hr/a1/module-01/kako-si.mp3). Bez niej przycisk się nie renderuje. */
  src?: string;
  /** Odsłuchiwany tekst — trafia do aria-label („Odsłuchaj: Kako si?”). */
  text?: string;
  size?: "sm" | "md";
}

/**
 * Wspólny przycisk odsłuchu. Ponowne kliknięcie odtwarza nagranie od początku;
 * kliknięcie w trakcie odtwarzania zatrzymuje je. Inne nagrania są zatrzymywane automatycznie.
 */
export function AudioButton({ src, text, size = "md" }: Props) {
  const t = useT();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => subscribeAudio((current) => setPlaying(Boolean(src) && current === src)), [src]);

  if (!src) return null;

  const label = text ? t("audio.listenTo", { text }) : t("audio.listen");
  return (
    <button
      type="button"
      className={["audio-btn", size === "sm" && "small", playing && "playing", failed && "failed"].filter(Boolean).join(" ")}
      onClick={(event) => {
        event.stopPropagation();
        if (playing) {
          stopAudio();
          return;
        }
        setFailed(false);
        playAudio(src, { onError: () => setFailed(true) });
      }}
      aria-label={failed ? t("audio.unavailable") : label}
      aria-pressed={playing}
      title={failed ? t("audio.unavailable") : label}
    >
      <Icon name="volume" size={size === "sm" ? 15 : 18} />
    </button>
  );
}

/** Chorwacki tekst z przyciskiem odsłuchu w jednej linii (przycisk tylko, gdy jest nagranie). */
export function SpokenText({ text, src, className = "target" }: { text: string; src?: string; className?: string }) {
  return (
    <span className="spoken">
      <span className={className}>{text}</span>
      <AudioButton src={src} text={text} size="sm" />
    </span>
  );
}

/** Pozycja listy „chorwacki — polski” (cel lekcji, podsumowanie); zwykły tekst zostaje bez zmian. */
export function BilingualLine({ item }: { item: string | { target: string; source: string; audioSrc?: string } }) {
  if (typeof item === "string") return <>{item}</>;
  return (
    <>
      <SpokenText text={item.target} src={item.audioSrc} />
      <span className="muted"> — {item.source}</span>
    </>
  );
}
