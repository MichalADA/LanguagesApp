import type { ReactNode } from "react";

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

/**
 * Pierścień postępu poziomu: złoty łuk to opanowane, burgundowy — w nauce.
 * Wartości to ułamki 0–1.
 */
export function ProgressRing({
  mastered,
  learning,
  label,
  size = 132,
  children,
}: {
  mastered: number;
  learning: number;
  label: string;
  size?: number;
  children?: ReactNode;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const m = clamp(mastered);
  const l = clamp(Math.min(learning, 1 - m));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`} fill="none" strokeWidth={stroke}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--track)" />
          {l > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="var(--burgundy-primary)"
              strokeDasharray={`${l * c} ${c}`}
              strokeDashoffset={-m * c}
            />
          )}
          {m > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="var(--gold-accent)"
              strokeLinecap={m < 1 ? "round" : "butt"}
              strokeDasharray={`${m * c} ${c}`}
            />
          )}
        </g>
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
