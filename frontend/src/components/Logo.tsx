interface LogoProps {
  size?: number;
  /** Sam znak, bez napisu — do faviconu i wąskich miejsc. */
  markOnly?: boolean;
}

/**
 * Monogram Lexodromia: litera L zbudowana z trasy — dwa punkty połączone
 * załamaną linią. Pełne burgundowe pole daje znakowi wagę; złoty punkt
 * końcowy to ten sam język, co „opanowane" w całej aplikacji.
 */
export function Logo({ size = 26, markOnly = false }: LogoProps) {
  return (
    <span className="logo" style={{ gap: Math.round(size * 0.38) }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" rx="8.5" fill="var(--burgundy-primary)" />
        <path
          d="M11 8.5 V21 H22.5"
          stroke="var(--text-primary)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="11" cy="8.5" r="2.7" fill="var(--text-primary)" />
        <circle cx="22.5" cy="21" r="2.7" fill="var(--gold-accent)" />
      </svg>
      {!markOnly && (
        <span className="logo-word" style={{ fontSize: Math.round(size * 0.66) }}>
          Lexodromia
        </span>
      )}
    </span>
  );
}
