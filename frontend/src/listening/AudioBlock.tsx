import { useRef, useState } from "react";
import { useT } from "@/i18n";

export function AudioBlock({
  src,
  title,
  fallbackUrl,
}: {
  src: string;
  title?: string | null;
  fallbackUrl?: string | null;
}) {
  const t = useT();
  const [errored, setErrored] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  if (errored) {
    return (
      <div className="panel panel-pad stack" role="alert">
        <p>{t("listening.audio.error")}</p>
        <a href={fallbackUrl ?? src} target="_blank" rel="noopener noreferrer">
          {t("listening.audio.openSource")} →
        </a>
      </div>
    );
  }

  return (
    <div className="stack">
      {title && <span className="eyebrow">{title}</span>}
      <audio
        ref={audio}
        controls
        preload="metadata"
        style={{ width: "100%" }}
        onError={() => setErrored(true)}
      >
        <source src={src} />
        {t("listening.audio.unsupported")}
      </audio>
    </div>
  );
}
