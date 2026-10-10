import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import type { StoryStatus } from "../useStory";

/** Ładowanie / brak historii / błąd zapisu — wspólne dla mapy i sceny. */
export function StoryStateView({ status, onRetry }: { status: StoryStatus; onRetry: () => void }) {
  const t = useT();
  if (status === "loading" || status === "ready") return <p className="loading page" role="status">{t("stories.loading")}</p>;
  return (
    <div className="page">
      <div className="panel panel-pad stack" role="alert">
        <h2>{t(status === "missing" ? "stories.missing" : "stories.loadError")}</h2>
        {status === "error" && (
          <button type="button" className="btn" onClick={onRetry}>
            {t("stories.retry")}
          </button>
        )}
        <Link to="/stories" className="btn-ghost">
          {t("stories.allCities")}
        </Link>
      </div>
    </div>
  );
}
