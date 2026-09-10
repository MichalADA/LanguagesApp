import { Link, Navigate, useParams } from "react-router-dom";
import { findGame } from "@/games/registry";
import { useT } from "@/i18n";

export function PlayPage() {
  const t = useT();
  const { gameId } = useParams();
  const game = findGame(gameId);
  const backTo = game && game.category !== "main" ? `/gry/kategoria/${game.category}` : "/gry";
  if (game?.href) return <Navigate to={game.href} replace />;

  if (!game || !game.component) {
    return (
      <div className="page">
        <header className="page-head">
          <span className="eyebrow">{t("games.eyebrow")}</span>
          <h1>{game ? t(game.nameKey) : t("games.notFound")}</h1>
          <p className="lede">{t("games.notReady")}</p>
        </header>
        <div>
          <Link to={backTo} className="btn-ghost">
            {t("games.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  const Game = game.component;

  return (
    <div className="page">
      <header className="page-head">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">{t("games.eyebrow")}</span>
            <h1>{t(game.nameKey)}</h1>
          </div>
          <Link to={backTo} className="mono dim" style={{ fontSize: 13 }}>
            {t("games.backToList")}
          </Link>
        </div>
        <p className="lede">{t(game.taglineKey)}</p>
      </header>
      <Game key={game.id} />
    </div>
  );
}
