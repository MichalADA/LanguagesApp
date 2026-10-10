/**
 * Tła lokacji i mapa Splitu — własne ilustracje SVG inspirowane dalmatyńską architekturą
 * (kamień, okiennice, palmy Rivy, morze). Placeholdery produkcyjne: docelowe grafiki
 * podmienia się w art/registry.tsx (np. na pliki z public/stories/…), sceny tego nie zauważą.
 */

const SKY = (
  <defs>
    <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#8fc3e3" />
      <stop offset="1" stopColor="#e9f2f2" />
    </linearGradient>
    <linearGradient id="st-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#2f8fb1" />
      <stop offset="1" stopColor="#1d5f7f" />
    </linearGradient>
    <linearGradient id="st-stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#efe2c8" />
      <stop offset="1" stopColor="#d9c6a3" />
    </linearGradient>
    <linearGradient id="st-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#b98a5e" />
      <stop offset="1" stopColor="#8f6440" />
    </linearGradient>
    <radialGradient id="st-sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#fff6d6" />
      <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
    </radialGradient>
  </defs>
);

const svgProps = { viewBox: "0 0 1600 900", preserveAspectRatio: "xMidYMid slice", "aria-hidden": true, className: "scene-art" } as const;

function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 q-10 -160 14 -300" stroke="#8a6a46" strokeWidth="16" fill="none" strokeLinecap="round" />
      {[-70, -30, 10, 50, 90].map((a) => (
        <path key={a} d="M14 -300 q60 -30 120 10 q-60 -6 -120 -10z" fill="#4f8a4a" transform={`rotate(${a} 14 -300)`} />
      ))}
    </g>
  );
}

function Shutter({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill="#4f7d63" />
      {Array.from({ length: Math.floor(h / 18) }, (_, i) => (
        <rect key={i} x={x + 6} y={y + 8 + i * 18} width={w - 12} height="6" rx="2" fill="#3f6a52" />
      ))}
    </g>
  );
}

/** Apartament: kamienne wnętrze, okno z okiennicami na morze, wieszak z kluczem. */
export function ApartmentScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-stone)" />
      {Array.from({ length: 10 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => (
          <rect key={`${r}-${c}`} x={c * 190 + (r % 2 ? 95 : 0) - 40} y={r * 70} width="180" height="62" rx="6" fill="#e6d4b2" opacity="0.55" />
        )),
      )}
      {/* Okno */}
      <rect x="560" y="140" width="480" height="420" rx="12" fill="#a77c52" />
      <rect x="584" y="164" width="432" height="372" fill="url(#st-sky)" />
      <rect x="584" y="400" width="432" height="136" fill="url(#st-sea)" />
      <path d="M584 400 q90 -60 170 -10 q70 -40 150 6 q60 -26 112 4 v0z" fill="#7c8f6a" />
      <circle cx="900" cy="250" r="90" fill="url(#st-sun)" />
      <circle cx="900" cy="250" r="30" fill="#fff3c4" />
      <path d="M690 470 l40 -10 l8 18z" fill="#fff" />
      <rect x="796" y="164" width="8" height="372" fill="#a77c52" />
      <Shutter x={470} y={150} w={90} h={400} />
      <Shutter x={1040} y={150} w={90} h={400} />
      <rect x="540" y="556" width="520" height="26" rx="6" fill="#c9b08a" />
      <path d="M600 556 q10 -60 40 -70 q28 10 36 70z" fill="#b5563b" />
      <path d="M612 500 q-20 -40 10 -70 M632 496 q20 -50 -6 -84 M622 500 q0 -60 30 -80" stroke="#4f8a4a" strokeWidth="10" fill="none" strokeLinecap="round" />
      {/* Drzwi i wieszak z kluczem */}
      <rect x="1230" y="210" width="230" height="560" rx="10" fill="#7a4a2e" />
      <rect x="1252" y="236" width="186" height="230" rx="6" fill="#6a3f27" />
      <rect x="1252" y="490" width="186" height="250" rx="6" fill="#6a3f27" />
      <circle cx="1270" cy="500" r="10" fill="#d8b23a" />
      <rect x="1110" y="300" width="80" height="16" rx="6" fill="#8a5a36" />
      <path d="M1130 316 v26 M1170 316 v26" stroke="#c9a227" strokeWidth="5" />
      <circle cx="1150" cy="362" r="10" fill="none" stroke="#c9a227" strokeWidth="5" />
      <rect x="1146" y="370" width="8" height="34" rx="3" fill="#d8b23a" />
      {/* Podłoga i stolik */}
      <rect y="760" width="1600" height="140" fill="url(#st-floor)" />
      <rect x="180" y="560" width="300" height="24" rx="8" fill="#8a5a36" />
      <rect x="200" y="584" width="20" height="176" fill="#7a4a2e" />
      <rect x="440" y="584" width="20" height="176" fill="#7a4a2e" />
      <rect x="250" y="520" width="60" height="40" rx="6" fill="#f3ead8" />
      <path d="M330 560 q20 -40 50 -40 q30 0 50 40z" fill="#8f2440" />
    </svg>
  );
}

/** Kawiarnia na Rivie: markiza, lada z ekspresem, tablica z cenami, palmy i port. */
export function CafeScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <circle cx="1320" cy="160" r="120" fill="url(#st-sun)" />
      <rect y="420" width="1600" height="200" fill="url(#st-sea)" />
      <path d="M0 430 q200 -70 420 -20 q160 -50 330 6 v-16 h-750z" fill="#8ea37c" opacity="0.8" />
      <path d="M1100 480 l120 0 l-20 30 h-90z" fill="#fff" />
      <rect x="1150" y="430" width="6" height="52" fill="#fff" />
      <path d="M1156 434 l40 30 h-40z" fill="#f3ead8" />
      <Palm x={140} y={640} s={1.1} />
      <Palm x={1490} y={640} s={1} />
      {/* Kamienny budynek kawiarni */}
      <rect x="300" y="160" width="1000" height="560" fill="url(#st-stone)" />
      <path d="M270 170 h1060 l-40 110 h-980z" fill="#8f2440" />
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d={`M${310 + i * 98} 280 q49 34 98 0`} fill="#f3ead8" />
      ))}
      <rect x="380" y="320" width="260" height="190" rx="8" fill="#2c2321" />
      <text x="510" y="356" textAnchor="middle" fill="#f2c14e" fontSize="26" fontFamily="Georgia, serif">KAVA</text>
      {["espresso 1,80 €", "kava s mlijekom 2,50 €", "čaj 2,00 €", "voda 1,50 €"].map((t, i) => (
        <text key={t} x="404" y={396 + i * 30} fill="#efe2c8" fontSize="20" fontFamily="Georgia, serif">{t}</text>
      ))}
      <rect x="980" y="320" width="230" height="190" rx="8" fill="#a6d0e4" stroke="#7a4a2e" strokeWidth="10" />
      {/* Lada */}
      <rect x="330" y="560" width="940" height="160" rx="10" fill="#7a4a2e" />
      <rect x="330" y="548" width="940" height="26" rx="8" fill="#a77c52" />
      <rect x="720" y="440" width="170" height="110" rx="10" fill="#c9c4bd" />
      <rect x="740" y="456" width="130" height="30" rx="6" fill="#8d8780" />
      <rect x="760" y="500" width="20" height="40" fill="#5c5650" />
      <rect x="830" y="500" width="20" height="40" fill="#5c5650" />
      <path d="M1040 548 h40 l-6 -40 h-28z" fill="#fff" />
      <path d="M1100 548 h40 l-6 -40 h-28z" fill="#fff" />
      {/* Stoliki na zewnątrz */}
      <rect y="720" width="1600" height="180" fill="#d8c3a0" />
      {[160, 1360].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="760" rx="90" ry="18" fill="#f3ead8" />
          <rect x={x - 8} y="770" width="16" height="100" fill="#5c5650" />
        </g>
      ))}
    </svg>
  );
}

/** Sklep: półki z chlebem, mlekiem i wodą, kasa, skrzynki z owocami. */
export function ShopScene() {
  const shelf = (y: number, items: { x: number; w: number; h: number; fill: string; round?: boolean }[]) => (
    <g key={y}>
      <rect x="160" y={y} width="900" height="18" rx="4" fill="#a77c52" />
      {items.map((it, i) => (
        <rect key={i} x={it.x} y={y - it.h} width={it.w} height={it.h} rx={it.round ? it.w / 2 : 6} fill={it.fill} />
      ))}
    </g>
  );
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#f1e6cf" />
      <rect y="0" width="1600" height="90" fill="#2f6f74" />
      <text x="800" y="62" textAnchor="middle" fill="#f3ead8" fontSize="44" fontFamily="Georgia, serif" letterSpacing="6">TRGOVINA</text>
      <rect x="130" y="130" width="960" height="600" rx="10" fill="#e3d2b0" />
      {shelf(270, [
        { x: 190, w: 120, h: 50, fill: "#c98b4b", round: true },
        { x: 330, w: 120, h: 50, fill: "#b9773a", round: true },
        { x: 470, w: 160, h: 46, fill: "#d39b5c", round: true },
        { x: 660, w: 120, h: 50, fill: "#c98b4b", round: true },
        { x: 820, w: 200, h: 40, fill: "#e0b072", round: true },
      ])}
      {shelf(440, [
        ...[190, 260, 330, 400].map((x) => ({ x, w: 54, h: 110, fill: "#f7f7f2" })),
        ...[520, 590, 660, 730, 800, 870, 940].map((x) => ({ x, w: 46, h: 130, fill: "#9fd0e6" })),
      ])}
      {shelf(610, [
        ...[190, 290, 390].map((x) => ({ x, w: 80, h: 70, fill: "#e8c547" })),
        ...[520, 620].map((x) => ({ x, w: 80, h: 90, fill: "#d9534f" })),
        ...[760, 860, 960].map((x) => ({ x, w: 70, h: 80, fill: "#f3ead8" })),
      ])}
      {/* Kasa */}
      <rect x="1150" y="520" width="380" height="220" rx="10" fill="#7a4a2e" />
      <rect x="1150" y="506" width="380" height="24" rx="8" fill="#a77c52" />
      <rect x="1360" y="430" width="130" height="80" rx="8" fill="#3b3b3b" />
      <rect x="1376" y="446" width="98" height="30" rx="4" fill="#8fd18f" />
      <text x="1425" y="468" textAnchor="middle" fill="#1d3d1d" fontSize="20" fontFamily="monospace">5,00 €</text>
      {/* Skrzynki z owocami */}
      <rect y="740" width="1600" height="160" fill="#cdb38b" />
      {[200, 420, 640].map((x, i) => (
        <g key={x}>
          <rect x={x} y="760" width="180" height="90" rx="6" fill="#a77c52" />
          {Array.from({ length: 6 }, (_, j) => (
            <circle key={j} cx={x + 30 + (j % 3) * 60} cy={772 + Math.floor(j / 3) * 26} r="20" fill={["#d9534f", "#e8c547", "#7fb069"][i]} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Zapowiedziana lokacja / brak grafiki: spokojne tło w kolorach Lexodromii. */
export function PlaceholderScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <rect y="560" width="1600" height="340" fill="url(#st-sea)" />
      <Palm x={260} y={760} />
      <Palm x={1340} y={760} s={0.9} />
    </svg>
  );
}

/** Pozycje lokacji podaje story.locations[].map (procenty) — mapa to tylko tło. */
export function SplitMap() {
  return (
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden className="map-art">
      {SKY}
      <rect width="1000" height="700" fill="url(#st-sea)" />
      {/* Ląd: półwysep Splitu */}
      <path d="M0 0 h1000 v360 q-60 40 -140 30 q-60 120 -170 110 q-90 -10 -150 70 q-80 70 -200 40 q-120 -30 -160 40 q-60 60 -180 40z" fill="#e7d7b4" />
      <path d="M0 0 h1000 v120 q-200 40 -420 10 q-260 -30 -580 30z" fill="#9fb37f" opacity="0.7" />
      {/* Ulice starego miasta */}
      <g stroke="#cdb48a" strokeWidth="10" strokeLinecap="round" fill="none">
        <path d="M120 300 q200 40 420 10 q160 -20 300 40" />
        <path d="M340 140 q20 200 -20 420" />
        <path d="M560 160 q40 150 20 340" />
        <path d="M200 520 q160 -40 340 -20" />
      </g>
      {/* Pałac (stylizowany kwadrat murów) */}
      <rect x="380" y="240" width="200" height="160" fill="none" stroke="#b59a6c" strokeWidth="8" strokeDasharray="18 10" />
      {/* Riva z palmami */}
      <path d="M380 470 q140 30 300 -10" stroke="#f3ead8" strokeWidth="18" fill="none" strokeLinecap="round" />
      {[420, 470, 520, 570, 620].map((x) => (
        <circle key={x} cx={x} cy={478 - (x - 380) * 0.02} r="9" fill="#4f8a4a" />
      ))}
      {/* Statki w porcie */}
      <path d="M790 540 h60 l-10 14 h-40z M860 600 h46 l-8 12 h-30z" fill="#fff" />
      <path d="M0 640 q120 -30 260 0" stroke="#bfe3f0" strokeWidth="3" fill="none" opacity="0.6" />
      <path d="M600 660 q120 -30 260 0" stroke="#bfe3f0" strokeWidth="3" fill="none" opacity="0.6" />
    </svg>
  );
}
