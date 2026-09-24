import type { CourseRoute, RouteStop } from "@/courses/types";

interface Props {
  route: CourseRoute;
  /** Indeks przystanku, w którym stoi gracz. */
  stopIndex: number;
  /** Postęp odcinka 0–1, rysowany jako częściowo pokonana trasa. */
  legProgress: number;
  labels: { here: string; visited: string; ahead: string };
}

/**
 * Stylizowana mapa trasy: SVG, zero zależności, zero kluczy API.
 *
 * ⬇ GOOGLE MAPS PODŁĄCZASZ TUTAJ: zastąp ten komponent implementacją o tym
 * samym interfejsie (route, stopIndex, legProgress) i podmień import w grze.
 * Mechanika Trasy nie wie, jak mapa jest narysowana.
 */
export function RouteMap({ route, stopIndex, legProgress, labels }: Props) {
  const stops = route.stops;
  const line = polyline(stops);
  const travelled = travelledPath(stops, stopIndex, legProgress);
  const current = positionAt(stops, stopIndex, legProgress);

  return (
    <div className="routemap">
      <svg viewBox="0 0 320 200" className="routemap-svg" role="img" aria-label={route.name.pl}>
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(158,37,66,0.12)" />
            <stop offset="100%" stopColor="rgba(158,37,66,0.02)" />
          </linearGradient>
        </defs>

        {/* Delikatna sugestia wybrzeża — równoległa krzywa, nie mapa polityczna. */}
        <path d={coastPath(stops)} fill="url(#sea)" stroke="none" />

        <polyline
          points={line}
          fill="none"
          stroke="var(--line-2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 6"
        />
        <polyline
          points={travelled}
          fill="none"
          stroke="var(--accent-hover)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {stops.map((s, i) => {
          const done = i < stopIndex;
          const here = i === stopIndex;
          return (
            <g key={s.id}>
              <circle
                cx={s.x}
                cy={s.y}
                r={here ? 5.5 : 4}
                fill={here ? "var(--accent-hover)" : done ? "var(--gold)" : "var(--bg)"}
                stroke={here ? "var(--accent-hover)" : done ? "var(--gold)" : "var(--line-2)"}
                strokeWidth="2"
              />
              {here && <circle cx={s.x} cy={s.y} r="10" className="routemap-ping" />}
              <text
                x={s.x}
                y={s.y - 11}
                textAnchor="middle"
                className={here ? "routemap-label here" : done ? "routemap-label done" : "routemap-label"}
              >
                {s.name}
              </text>
            </g>
          );
        })}

        {legProgress > 0 && stopIndex < stops.length - 1 && (
          <circle cx={current.x} cy={current.y} r="3.5" fill="var(--text)" />
        )}
      </svg>

      <div className="routemap-legend">
        <span>
          <i className="dot done" /> {labels.visited}
        </span>
        <span>
          <i className="dot here" /> {labels.here}
        </span>
        <span>
          <i className="dot" /> {labels.ahead}
        </span>
      </div>
    </div>
  );
}

function polyline(stops: readonly RouteStop[]): string {
  return stops.map((s) => `${s.x},${s.y}`).join(" ");
}

function positionAt(stops: readonly RouteStop[], index: number, progress: number) {
  const from = stops[Math.min(index, stops.length - 1)];
  const to = stops[Math.min(index + 1, stops.length - 1)];
  return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
}

function travelledPath(stops: readonly RouteStop[], index: number, progress: number): string {
  const done = stops.slice(0, Math.min(index + 1, stops.length)).map((s) => `${s.x},${s.y}`);
  if (index < stops.length - 1 && progress > 0) {
    const p = positionAt(stops, index, progress);
    done.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return done.join(" ");
}

/** Wypełnienie po morskiej stronie trasy — czysto dekoracyjne. */
function coastPath(stops: readonly RouteStop[]): string {
  const top = stops.map((s) => `${s.x},${s.y}`).join(" L ");
  const back = stops
    .slice()
    .reverse()
    .map((s) => `${s.x - 26},${s.y + 20}`)
    .join(" L ");
  return `M ${top} L ${back} Z`;
}
