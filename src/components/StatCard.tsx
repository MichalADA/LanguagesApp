interface StatCardProps {
  value: string | number;
  label: string;
  note?: string;
  /** „gold" rezerwujemy dla osiągnięć: serie, rekordy, opanowanie. */
  tone?: "default" | "gold";
}

export function StatCard({ value, label, note, tone = "default" }: StatCardProps) {
  return (
    <div className="panel stat">
      <span className={tone === "gold" ? "stat-value gold" : "stat-value"}>{value}</span>
      <span className="stat-label">{label}</span>
      {note ? <span className="stat-note">{note}</span> : null}
    </div>
  );
}

/**
 * Pasek postępu. Domyślnie „mastery" — opanowanie liczymy złotem, bieżącą
 * rozgrywkę czerwienią (`tone="learning"`).
 */
export function ProgressBar({
  percent,
  tone = "mastery",
}: {
  percent: number;
  tone?: "mastery" | "learning";
}) {
  return (
    <div className={tone === "mastery" ? "bar gold" : "bar"}>
      <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}
