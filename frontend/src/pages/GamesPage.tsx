import { Link } from "react-router-dom";
import { GAMES, GAME_CATEGORIES } from "@/games/registry";
import { useProgress } from "@/progress/ProgressProvider";
import { useT } from "@/i18n";

export function GamesPage() {
  const t = useT();
  const { current } = useProgress();

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("games.eyebrow")}</span>
        <h1>{t("games.title")}</h1>
        <p className="lede">{t("games.subtitle")}</p>
      </header>

      {GAME_CATEGORIES.map((category) => <section key={category} className="stack" aria-labelledby={`category-${category}`}>
        <h2 id={`category-${category}`}>{t(`gameCategories.${category}.name`)}</h2>
        <p className="stat-note">{t(`gameCategories.${category}.description`)}</p>
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
      </section>)}
    </div>
  );
}
