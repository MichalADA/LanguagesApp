import { Link, useParams } from "react-router-dom";
import { findGame } from "@/games/registry";
import { useT } from "@/i18n";

export function PlayPage() {
  const t = useT();
  const { gameId } = useParams();
  const game = findGame(gameId);

  if (!game || !game.component) {
    return (
      <div className="page">
        <header className="page-head">
          <span className="eyebrow">{t("games.eyebrow")}</span>
          <h1>{game ? game.name : t("games.notFound")}</h1>
          <p className="lede">{t("games.notReady")}</p>
        </header>
        <div>
          <Link to="/gry" className="btn-ghost">
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
            <h1>{game.name}</h1>
          </div>
          <Link to="/gry" className="mono dim" style={{ fontSize: 13 }}>
            {t("games.backToList")}
          </Link>
        </div>
        <p className="lede">{t(game.taglineKey)}</p>
      </header>
      <Game />
    </div>
  );
}
