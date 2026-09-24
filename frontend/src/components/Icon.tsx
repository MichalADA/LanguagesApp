/**
 * Jeden zestaw ikon liniowych: siatka 24 px, kreska 1.75, zaokrąglone końce.
 * Zastępuje mieszankę glifów Unicode, które na różnych systemach renderowały
 * się w różnych fontach i rozmiarach.
 */
const PATHS = {
  home: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z",
  play: "M7 5.5v13a.8.8 0 0 0 1.2.7l10.4-6.5a.8.8 0 0 0 0-1.4L8.2 4.8A.8.8 0 0 0 7 5.5z",
  repeat: "M4.5 12a7.5 7.5 0 0 1 12.9-5.2L20 9.5M20 4.5v5h-5M19.5 12a7.5 7.5 0 0 1-12.9 5.2L4 14.5M4 19.5v-5h5",
  cards: "M8 4.5h10a1.5 1.5 0 0 1 1.5 1.5v10M5.5 8h10A1.5 1.5 0 0 1 17 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-9A1.5 1.5 0 0 1 5.5 8z",
  chart: "M4.5 19.5h15M7.5 16v-5M12 16V6.5M16.5 16v-8",
  trend: "M4 16.5 9.5 11l3.5 3.5L20 7.5M15 7.5h5v5",
  globe: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.1-1.2L14 3.5h-4l-.5 2.1a7 7 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.1 1.2l.5 2.1h4l.5-2.1a7 7 0 0 0 2.1-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  plus: "M12 5v14M5 12h14",
  text: "M5 7V5.5h9V7M9.5 5.5V18.5M8 18.5h3M14 12.5v-1h6v1M17 11.5v7M16 18.5h2",
  swap: "M5 8.5h13l-3.5-3.5M19 15.5H6l3.5 3.5",
  bolt: "M13 3.5 5.5 13.5H12l-1 7 7.5-10H12z",
  radio: "M4.5 9.5h15a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1zM7 9.5 16.5 4M8.5 16.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14 14h3.5M14 17h3.5",
  flame: "M12 20.5c3.3 0 6-2.4 6-5.8 0-3.3-2.4-5.2-3.4-8.2-.2-.6-1-.8-1.4-.3-1 1.3-1.2 2.9-1.2 3.8-1-1-1.7-2.2-2-3.2-.2-.5-.8-.7-1.2-.3C7.3 8 6 10.8 6 14.7c0 3.4 2.7 5.8 6 5.8z",
  arrowRight: "M5 12h14M13.5 6.5 19 12l-5.5 5.5",
  check: "M5 12.5 10 17.5 19 7",
  clock: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
