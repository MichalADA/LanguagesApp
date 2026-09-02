import { Link } from "react-router-dom";
import { useVocabulary } from "@/vocabulary/VocabularyProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { useCourse } from "@/courses/CourseProvider";
import { masteryOf, summarize } from "@/progress/service";
import { StatCard, ProgressBar } from "@/components/StatCard";
import { GAMES, findGame } from "@/games/registry";
import { describePool } from "@/utils/pool";
import { currentStreak, formatRelative } from "@/utils/date";
import { useI18n } from "@/i18n";

export function Dashboard() {
  const { t, locale } = useI18n();
  const { course } = useCourse();
  const { entries, loading } = useVocabulary();
  const { state, current, courseId } = useProgress();

  const summary = summarize(state, courseId);
  const streak = currentStreak(current.activeDays);
  const bura = current.games.bura;

  const lastBlockId =
    current.lastActivity?.pool.source.kind === "block"
      ? current.lastActivity.pool.source.block
      : course.blocks[0]?.id;
  const blockEntries = entries.filter((e) => e.block === lastBlockId);
  const blockMastery = masteryOf(state, courseId, blockEntries);
  const block = course.blocks.find((b) => b.id === lastBlockId);
  const blockIndex = course.blocks.findIndex((b) => b.id === lastBlockId);

  const lastGame = findGame(current.lastActivity?.gameId);
  const lastSeen = current.lastActivity?.at ?? 0;

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{t("dashboard.eyebrow")}</span>
        <h1>{t("dashboard.title")}</h1>
        <p className="lede">
          {loading
            ? t("dashboard.subtitleLoading")
            : t("dashboard.subtitle", {
                total: entries.length,
                seen: summary.seen,
                learned: summary.learned,
              })}
        </p>
      </header>

      <section className="panel panel-pad continue-card">
        <div className="stack" style={{ gap: 6, minWidth: 0 }}>
          <span className="eyebrow">{t("dashboard.continueTitle")}</span>
          <h2>
            {lastGame && current.lastActivity
              ? t("dashboard.continueWith", {
                  game: lastGame.name,
                  pool: describePool(current.lastActivity.pool, course, t),
                })
              : t("dashboard.continueNone")}
          </h2>
          <span className="stat-note">
            {course.flag} {course.name[locale]} · {t("dashboard.lastSeen")}: {formatRelative(lastSeen)}
          </span>
        </div>
        <Link to={lastGame ? `/gry/${lastGame.id}` : "/gry/bura"} className="btn">
          {lastGame ? t("common.continue") : t("common.start")}
        </Link>
      </section>

      <section className="grid grid-3">
        <StatCard
          value={summary.learned}
          label={t("dashboard.learned")}
          note={t("dashboard.learnedNote", { total: entries.length || "…" })}
        />
        <StatCard value={summary.review} label={t("dashboard.review")} note={t("dashboard.reviewNote")} />
        <StatCard
          tone="gold"
          value={bura?.bestScore ?? 0}
          label={t("dashboard.bestScore")}
          note={t("dashboard.rounds", { n: bura?.rounds ?? 0 })}
        />
        <StatCard
          tone="gold"
          value={streak}
          label={t("dashboard.streak")}
          note={streak ? t("dashboard.streakOn") : t("dashboard.streakOff")}
        />
        <StatCard
          value={`${summary.accuracy}%`}
          label={t("dashboard.accuracy")}
          note={t("dashboard.accuracyNote", { n: current.totalAttempts })}
        />
        <StatCard
          value={summary.difficult}
          label={t("dashboard.difficult")}
          note={t("dashboard.difficultNote")}
        />
      </section>

      <section className="panel panel-pad stack" style={{ gap: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">{t("dashboard.lastBlock")}</span>
            <h2>{t("pool.block", { n: blockIndex + 1, range: block?.range ?? "" })}</h2>
          </div>
          <span className="mono muted">{t("dashboard.mastery", { n: blockMastery })}</span>
        </div>
        <ProgressBar percent={blockMastery} />
        <span className="stat-note">
          {current.lastActivity
            ? t("dashboard.lastPool", { pool: describePool(current.lastActivity.pool, course, t) })
            : t("dashboard.noPool")}
        </span>
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="eyebrow">{t("nav.games")}</span>
          <Link to="/gry" className="mono" style={{ fontSize: 13 }}>
            {t("common.all").toLocaleLowerCase()} →
          </Link>
        </div>
        <div className="grid grid-3">
          {GAMES.slice(0, 3).map((g) => (
            <div key={g.id} className="panel panel-pad stack game-mini">
              <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <h3>{g.name}</h3>
                <span className={g.status === "active" ? "badge on" : "badge"}>
                  {g.status === "active" ? t("common.active") : t("common.soon")}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                {t(g.taglineKey)}
              </p>
              {g.status === "active" && (
                <Link to={`/gry/${g.id}`} className="mono" style={{ fontSize: 13, marginTop: 4 }}>
                  {t("games.play").toLocaleLowerCase()} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
