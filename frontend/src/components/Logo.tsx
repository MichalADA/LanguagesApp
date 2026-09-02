interface LogoProps {
  size?: number;
  /** Sam znak, bez napisu — do faviconu i wąskich miejsc. */
  markOnly?: boolean;
}

/**
 * Monogram Lexodromia: litera L zbudowana z trasy — dwa punkty połączone
 * załamaną linią. Czysta geometria, żadnych ilustracji.
 */
export function Logo({ size = 26, markOnly = false }: LogoProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" rx="8" fill="var(--accent-soft)" />
        {/* Włosowa rama — jedyny ornament w znaku. */}
        <rect
          x="3.25"
          y="3.25"
          width="25.5"
          height="25.5"
          rx="5.75"
          fill="none"
          stroke="var(--gold-line)"
          strokeWidth="1"
        />
        <path
          d="M11 8 V21 H23"
          stroke="var(--accent-text)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="11" cy="8" r="2.6" fill="var(--accent-text)" />
        {/* Koniec trasy na złoto — ten sam język co „opanowane". */}
        <circle cx="23" cy="21" r="2.6" fill="var(--gold)" />
      </svg>
      {!markOnly && (
        <span
          style={{
            fontSize: size * 0.72,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1,
          }}
        >
          Lexodromia
        </span>
      )}
    </span>
  );
}
