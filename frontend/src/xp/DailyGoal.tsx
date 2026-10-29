import { useState } from "react";
import { useI18n } from "@/i18n";
import { DAILY_GOALS, type DailyGoal } from "./goals";
import { useXp } from "./XpProvider";

/** Wybór poziomu dziennej nauki: lekko / regularnie / intensywnie / bardzo intensywnie. */
export function GoalPicker({ onPicked }: { onPicked?: () => void }) {
  const { t } = useI18n();
  const { summary, setGoal } = useXp();
  const [saving, setSaving] = useState<DailyGoal | null>(null);
  const [failed, setFailed] = useState(false);
  const pick = async (goal: DailyGoal) => {
    setSaving(goal);
    setFailed(false);
    try {
      await setGoal(goal);
      onPicked?.();
    } catch {
      setFailed(true);
    } finally {
      setSaving(null);
    }
  };
  return (
    <div className="goal-picker" role="radiogroup" aria-label={t("xp.chooseGoal")}>
      {DAILY_GOALS.map((g) => {
        const on = summary?.goal === g.xp;
        return (
          <button key={g.id} type="button" role="radio" aria-checked={on} className={on ? "goal-option on" : "goal-option"} disabled={saving !== null} onClick={() => void pick(g.xp)}>
            <strong>{t(`xp.levels.${g.id}`)}</strong>
            <span>{t("xp.goalXp", { xp: g.xp })}</span>
            <span className="muted">{t("xp.goalMinutes", { m: g.minutes })}</span>
          </button>
        );
      })}
      {failed && (
        <p className="inline-alert" role="alert">
          {t("xp.saveError")}
        </p>
      )}
    </div>
  );
}

/** Cel dzienny na pulpicie: dzisiejszy XP względem celu, ostatni tydzień i łączny XP — bez karty, na tle. */
export function DailyGoalCard() {
  const { t, locale } = useI18n();
  const { status, summary, pending, reload } = useXp();
  const [editing, setEditing] = useState(false);
  if (status === "error")
    return (
      <section className="daily-goal" role="alert">
        <span>{t("xp.loadError")}</span>
        <button type="button" className="linklike" onClick={reload}>
          {t("home.retry")}
        </button>
      </section>
    );
  if (!summary) return <section className="daily-goal loading" role="status">{t("home.loading")}</section>;
  const ratio = Math.min(1, summary.today / summary.goal);
  const level = DAILY_GOALS.find((g) => g.xp === summary.goal);
  const max = Math.max(summary.goal, ...summary.last7.map((d) => d.xp));
  const dayLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(locale === "pl" ? "pl-PL" : "en-GB", { weekday: "narrow" });
  return (
    <section className={summary.goalMet ? "daily-goal met" : "daily-goal"} aria-labelledby="daily-goal-title">
      <h2 id="daily-goal-title" className="daily-goal-label">{t("xp.eyebrow")}</h2>
      <p className="daily-goal-value" aria-label={t("xp.todayOf", { today: summary.today, goal: summary.goal })}>
        <strong>{summary.today}</strong>
        <span>/ {summary.goal} XP</span>
      </p>
      <span className="daily-goal-bar" aria-hidden="true">
        <span style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="meta">
        {summary.goalMet ? t("xp.goalMet") : t("xp.goalLeft", { n: summary.goal - summary.today })}
        {level ? ` · ${t(`xp.levels.${level.id}`)}` : ""}
      </span>
      <div className="daily-goal-week" role="img" aria-label={t("xp.week")}>
        {summary.last7.map((d, i) => (
          <span key={d.day} className={d.xp >= summary.goal ? "met" : ""} title={`${d.day}: ${d.xp} XP`}>
            <i style={{ height: `${Math.max(4, (d.xp / max) * 100)}%` }} />
            <small className={i === 6 ? "is-today" : ""}>{dayLabel(d.day)}</small>
          </span>
        ))}
      </div>
      <div className="daily-goal-foot">
        <span>{t("xp.total", { n: summary.total })} · {t("xp.streak", { n: summary.goalStreak })}</span>
        <button type="button" className="linklike" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          {t("xp.changeGoal")}
        </button>
      </div>
      {pending > 0 && <p className="meta">{t("xp.pending", { n: pending })}</p>}
      {editing && (
        <>
          <GoalPicker onPicked={() => setEditing(false)} />
          <p className="meta">{t("xp.howTo")}</p>
        </>
      )}
    </section>
  );
}
