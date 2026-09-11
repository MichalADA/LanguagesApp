import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { fetchSources } from "./api";
import type { ListeningSource } from "./types";

interface Placeholder {
  key: "custom" | "podcasts" | "import";
  titleKey: string;
  descriptionKey: string;
}

const PLACEHOLDERS: Placeholder[] = [
  { key: "custom", titleKey: "listening.placeholders.custom.title", descriptionKey: "listening.placeholders.custom.description" },
  { key: "podcasts", titleKey: "listening.placeholders.podcasts.title", descriptionKey: "listening.placeholders.podcasts.description" },
  { key: "import", titleKey: "listening.placeholders.import.title", descriptionKey: "listening.placeholders.import.description" },
];

export function ListeningHubPage() {
  const t = useT();
  const [sources, setSources] = useState<ListeningSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchSources(controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setSources(list);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("listening.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [t]);

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("listening.eyebrow")}</span>
        <h1>{t("listening.hubTitle")}</h1>
        <p className="lede">{t("listening.hubDescription")}</p>
        <Link className="mono dim" to="/gry">{t("games.backToModes")}</Link>
      </header>

      {loading ? (
        <p role="status">{t("common.loading")}</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <div className="grid grid-3">
          {sources.map((source) => (
            <Link
              key={source.id}
              to={`/listening/${source.slug}`}
              className="panel panel-pad game-card mode-card"
            >
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <h2>{source.name}</h2>
                <span className="badge on">{t("common.active")}</span>
              </div>
              {source.description && <p className="muted">{source.description}</p>}
              <span className="mode-card-action">{t("listening.openSource")} →</span>
            </Link>
          ))}
          {PLACEHOLDERS.map((placeholder) => (
            <article key={placeholder.key} className="panel panel-pad game-card soon">
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <h2>{t(placeholder.titleKey)}</h2>
                <span className="badge">{t("common.soon")}</span>
              </div>
              <p className="muted">{t(placeholder.descriptionKey)}</p>
              <span className="mono dim" style={{ fontSize: 12, marginTop: 6 }}>{t("common.soon")}</span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
