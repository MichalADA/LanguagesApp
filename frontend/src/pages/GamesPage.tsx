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
  if (category === "listening") return <Navigate to="/listening" replace />;

  if (!category) {
    const mainGames = GAMES.filter((game) => game.category === "main");
    return (
      <div className="page">
        <header className="page-head">
          <span className="eyebrow">{t("games.eyebrow")}</span>
          <h1>{t("games.title")}</h1>
          <p className="lede">{t("games.chooseMode")}</p>
        </header>
        <div className="grid grid-3">
          {mainGames.map((game) => (
            <Link key={game.id} to={game.href ?? `/gry/${game.id}`} className="panel panel-pad game-card mode-card">
              <h2>{t(game.nameKey)}</h2>
              <p className="muted">{t(game.descriptionKey)}</p>
              <span className="mode-card-action">{t("games.openMode")} →</span>
            </Link>
          ))}
          {GAME_CATEGORIES.filter((id) => id !== "main").map((id) => {
            const href = id === "radio" ? "/radio" : id === "listening" ? "/listening" : `/gry/kategoria/${id}`;
            const active = id === "radio" || id === "listening" || GAMES.some((game) => game.category === id && game.status === "active");
            return (
              <Link key={id} to={href} className="panel panel-pad game-card mode-card">
                <h2>{t(`gameCategories.${id}.name`)}</h2>
                <p className="muted">{t(`gameCategories.${id}.description`)}</p>
                <span className="mode-card-action">{t("games.openMode")} →</span>
                {!active && <span className="badge">{t("common.soon")}</span>}
                {(id === "radio" || id === "listening") && <span className="badge on">{t("common.active")}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("games.eyebrow")}</span>
        <h1>{t(`gameCategories.${category}.name`)}</h1>
        <p className="lede">{t(`gameCategories.${category}.description`)}</p>
        <Link to="/gry" className="mono dim">{t("games.backToModes")}</Link>
      </header>

      <div className="grid grid-3">
        {GAMES.filter((game) => game.category === category).map((g) => {
          const rec = current.games[g.id];
          const active = g.status === "active";
          return (
            <article key={g.id} className={active ? "panel panel-pad game-card" : "panel panel-pad game-card soon"}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <h3 style={{ fontSize: 20 }}>{t(g.nameKey)}</h3>
                <span className={active ? "badge on" : "badge"}>
                  {active ? t("common.active") : t("common.soon")}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 15, lineHeight: 1.55 }}>
                {t(g.descriptionKey)}
              </p>
              {active ? (
                <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
                  <Link to={g.href ?? `/gry/${g.id}`} className="btn">
                    {t("games.play")}
                  </Link>
                  <span className="mono dim" style={{ fontSize: 12 }}>
                    {rec
                      ? t("games.record", { score: rec.bestScore, rounds: rec.rounds })
                      : t("games.noRound")}
                  </span>
                </div>
              ) : (
                <span className="mono dim" style={{ fontSize: 12, marginTop: 6 }}>
                  {t("common.soon")}
                </span>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
