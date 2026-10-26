import { Link, Navigate, useParams } from "react-router-dom";
import { GAMES, GAME_CATEGORIES } from "@/games/registry";
import { useProgress } from "@/progress/ProgressProvider";
import { useT } from "@/i18n";

export function GamesPage() {
  const t = useT();
  const { current } = useProgress();
  const { categoryId } = useParams();
  const category = GAME_CATEGORIES.find((id) => id === categoryId && id !== "main");

  if (categoryId && !category) return <Navigate to="/gry" replace />;
  if (category === "radio") return <Navigate to="/radio" replace />;

  if (!category) {
    const mainGames = GAMES.filter((game) => game.category === "main");
    return (
      <div className="page games-page">
        <header className="page-head">
          <h1>{t("games.title")}</h1>
          <p className="lede">{t("games.subtitle")}</p>
        </header>
        <ul className="games-main">
          {mainGames.map((game) => (
            <li key={game.id}>
              <Link to={game.href ?? `/gry/${game.id}`} className="games-entry">
                <h2>{t(game.nameKey)}</h2>
                {game.id === "stories" && <p className="games-sample" lang="hr">{t("games.storiesSample")}</p>}
                <p className="muted">{t(game.descriptionKey)}</p>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="games-list" aria-label={t("games.categories")}>
          {GAME_CATEGORIES.filter((id) => id !== "main").map((id) => {
            const soon = !GAMES.some((game) => game.category === id && game.status === "active");
            return (
              <li key={id}>
                <Link to={id === "radio" ? "/radio" : `/gry/kategoria/${id}`} className={soon ? "games-row soon" : "games-row"}>
                  <span className="games-row-name">{t(`gameCategories.${id}.name`)}</span>
                  <span className="games-row-desc">{t(`gameCategories.${id}.description`)}</span>
                  {soon && <span className="games-row-meta">{t("common.soon")}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="page games-page">
      <header className="page-head">
        <Link to="/gry" className="text-link back-link">{t("games.backToModes")}</Link>
        <h1>{t(`gameCategories.${category}.name`)}</h1>
        <p className="lede">{t(`gameCategories.${category}.description`)}</p>
      </header>

      <ul className="games-list">
        {GAMES.filter((game) => game.category === category).map((g) => {
          const rec = current.games[g.id];
          const active = g.status === "active";
          // Rekord tylko wtedy, gdy jest — „nie grane” przy każdej pozycji to szum.
          const meta = !active ? t("common.soon") : rec ? t("games.record", { score: rec.bestScore, rounds: rec.rounds }) : null;
          const body = (
            <>
              <span className="games-row-name">{t(g.nameKey)}</span>
              <span className="games-row-desc">{t(g.descriptionKey)}</span>
              {meta && <span className="games-row-meta">{meta}</span>}
            </>
          );
          return (
            <li key={g.id}>
              {active ? (
                <Link to={g.href ?? `/gry/${g.id}`} className="games-row">{body}</Link>
              ) : (
                <div className="games-row soon" aria-disabled="true">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
