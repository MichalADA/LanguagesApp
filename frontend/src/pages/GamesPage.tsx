import { Link } from "react-router-dom";
import { GAMES } from "@/games/registry";
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

      <div className="grid grid-2">
        {GAMES.map((g) => {
          const rec = current.games[g.id];
          const active = g.status === "active";
          return (
            <article key={g.id} className={active ? "panel panel-pad game-card" : "panel panel-pad game-card soon"}>
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <h2 style={{ fontSize: 20 }}>{g.name}</h2>
                <span className={active ? "badge on" : "badge"}>
                  {active ? t("common.active") : t("common.soon")}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 15, lineHeight: 1.55 }}>
                {t(g.descriptionKey)}
              </p>
              {active ? (
                <div className="row" style={{ justifyContent: "space-between", marginTop: 6 }}>
                  <Link to={`/gry/${g.id}`} className="btn">
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
                  {t("games.prepared")}
                </span>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
