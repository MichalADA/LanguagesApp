/**
 * Tła lokacji i mapa Splitu — własne ilustracje SVG inspirowane dalmatyńską architekturą
 * (kamień, okiennice, palmy Rivy, morze). Placeholdery produkcyjne: docelowe grafiki
 * podmienia się w art/registry.tsx (np. na pliki z public/stories/…), sceny tego nie zauważą.
 */

export const SKY = (
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

export const svgProps = { viewBox: "0 0 1600 900", preserveAspectRatio: "xMidYMid slice", "aria-hidden": true, className: "scene-art" } as const;

export function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 q-10 -160 14 -300" stroke="#8a6a46" strokeWidth="16" fill="none" strokeLinecap="round" />
      {[-70, -30, 10, 50, 90].map((a) => (
        <path key={a} d="M14 -300 q60 -30 120 10 q-60 -6 -120 -10z" fill="#4f8a4a" transform={`rotate(${a} 14 -300)`} />
      ))}
    </g>
  );
}

export function Shutter({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
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

/** Piekarnia: kamienny piec, kosze z chlebem, lada z burkiem i ciastami. */
export function BakeryScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-stone)" />
      {Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 9 }, (_, col) => (
          <rect key={`${row}-${col}`} x={col * 180 + (row % 2) * 90 - 40} y={row * 80} width="170" height="72" rx="6" fill="#e6d4b2" opacity="0.55" />
        )),
      )}
      <rect y="0" width="1600" height="80" fill="#7a4a2e" />
      <text x="800" y="56" textAnchor="middle" fill="#f3ead8" fontSize="40" fontFamily="Georgia, serif" letterSpacing="8">PEKARA</text>
      {/* Piec */}
      <path d="M1060 520 v-200 q0 -150 180 -150 q180 0 180 150 v200z" fill="#b5654a" />
      <path d="M1140 520 v-110 q0 -90 100 -90 q100 0 100 90 v110z" fill="#2c1d17" />
      <path d="M1160 520 v-70 q0 -60 80 -60 q80 0 80 60 v70z" fill="#e8823a" opacity="0.85" />
      <path d="M1180 520 q20 -60 40 -10 q20 -70 40 -6 q20 -50 40 16z" fill="#f2c14e" />
      {/* Półki z chlebem */}
      {[220, 360].map((y) => (
        <g key={y}>
          <rect x="120" y={y} width="760" height="16" rx="4" fill="#8f6440" />
          {[160, 300, 440, 580, 720].map((x, i) => (
            <ellipse key={x} cx={x + 50} cy={y - 26} rx={i % 2 ? 56 : 64} ry="28" fill={i % 2 ? "#b9773a" : "#d39b5c"} />
          ))}
        </g>
      ))}
      {/* Lada z gablotą */}
      <rect x="80" y="520" width="1440" height="380" fill="#7a4a2e" />
      <rect x="80" y="506" width="1440" height="28" rx="8" fill="#a77c52" />
      <rect x="160" y="440" width="820" height="80" rx="10" fill="#d8eef5" opacity="0.6" stroke="#a77c52" strokeWidth="6" />
      {/* Burek (spirala) i ciasta */}
      {[260, 420].map((x) => (
        <g key={x}>
          <circle cx={x} cy="486" r="36" fill="#e0b072" />
          <path d={`M${x} 486 m-24 0 a24 24 0 1 1 48 0 a16 16 0 1 1 -32 0 a8 8 0 1 1 16 0`} fill="none" stroke="#b9773a" strokeWidth="4" />
        </g>
      ))}
      {[600, 740, 880].map((x) => (
        <g key={x}>
          <rect x={x - 40} y="464" width="80" height="40" rx="6" fill="#f3ead8" />
          <rect x={x - 40} y="464" width="80" height="14" rx="6" fill="#8f2440" />
        </g>
      ))}
      <rect x="1430" y="436" width="150" height="70" rx="8" fill="#3b3b3b" />
      <rect x="1446" y="450" width="118" height="28" rx="4" fill="#8fd18f" />
      <text x="1505" y="471" textAnchor="middle" fill="#1d3d1d" fontSize="20" fontFamily="monospace">6,00 €</text>
    </svg>
  );
}

/** Targ: płócienne markizy nad straganami, skrzynki owoców i warzyw, mury pałacu w tle. */
export function MarketScene() {
  const awning = (x: number, color: string) => (
    <g key={x}>
      <path d={`M${x} 330 l40 -90 h360 l40 90z`} fill={color} />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${x + i * 73} 330 q37 30 73 0`} fill={color} />
      ))}
      <rect x={x + 30} y="330" width="10" height="320" fill="#6b5236" />
      <rect x={x + 400} y="330" width="10" height="320" fill="#6b5236" />
    </g>
  );
  const crate = (x: number, y: number, fill: string, r = 18) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="170" height="70" rx="6" fill="#a77c52" />
      {Array.from({ length: 8 }, (_, j) => (
        <circle key={j} cx={x + 22 + (j % 4) * 42} cy={y + 4 + Math.floor(j / 4) * 22} r={r} fill={fill} />
      ))}
    </g>
  );
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      {/* Mury pałacu Dioklecjana */}
      <rect y="150" width="1600" height="360" fill="url(#st-stone)" />
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={i * 100 + 10} y="120" width="60" height="40" fill="#e6d4b2" />
      ))}
      {[200, 700, 1200].map((x) => (
        <path key={x} d={`M${x} 420 v-110 q0 -50 50 -50 q50 0 50 50 v110z`} fill="#b59a6c" opacity="0.7" />
      ))}
      <rect y="640" width="1600" height="260" fill="#cdb38b" />
      {awning(60, "#d9534f")}
      {awning(580, "#f2c14e")}
      {awning(1100, "#4f8a4a")}
      {/* Stoły straganów */}
      {[60, 580, 1100].map((x) => (
        <rect key={x} x={x} y="560" width="440" height="24" rx="6" fill="#8f6440" />
      ))}
      {crate(80, 492, "#d9534f")}
      {crate(310, 492, "#e8c547")}
      {crate(600, 492, "#7fb069")}
      {crate(830, 492, "#e8823a")}
      {crate(1120, 492, "#4f8a4a", 16)}
      {crate(1350, 492, "#8f2440", 14)}
      {/* Tabliczki z cenami */}
      {[["jabuke 3 €/kg", 160], ["naranče 2 €/kg", 680], ["povrće", 1200]].map(([t, x]) => (
        <g key={t as string}>
          <rect x={x as number} y="420" width="150" height="44" rx="6" fill="#2c2321" />
          <text x={(x as number) + 75} y="449" textAnchor="middle" fill="#f3ead8" fontSize="20" fontFamily="Georgia, serif">{t}</text>
        </g>
      ))}
      {/* Skrzynki na ziemi */}
      {crate(240, 760, "#d9534f")}
      {crate(1180, 760, "#e8c547")}
    </svg>
  );
}

/** Plaża Bačvice: piasek, płytka zatoka, leżaki z parasolami, piłka do picigina. */
export function BeachScene() {
  const umbrella = (x: number, color: string) => (
    <g key={x}>
      <rect x={x - 5} y="470" width="10" height="250" fill="#f3ead8" />
      <path d={`M${x - 150} 490 q150 -130 300 0z`} fill={color} />
      {[-100, -50, 0, 50, 100].map((d) => (
        <path key={d} d={`M${x + d - 25} 490 q25 18 50 0`} fill={color} />
      ))}
    </g>
  );
  const sunbed = (x: number) => (
    <g key={x}>
      <path d={`M${x} 760 h220 l40 -70 h-30 l-30 50 h-200z`} fill="#f3ead8" stroke="#c8b8a0" strokeWidth="4" />
      <rect x={x + 10} y="760" width="8" height="40" fill="#a77c52" />
      <rect x={x + 200} y="760" width="8" height="40" fill="#a77c52" />
      <rect x={x + 20} y="738" width="150" height="16" rx="6" fill="#2f8fb1" opacity="0.8" />
    </g>
  );
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <circle cx="1300" cy="140" r="140" fill="url(#st-sun)" />
      <circle cx="1300" cy="140" r="54" fill="#fff3c4" />
      <path d="M0 360 q240 -60 520 -10 q200 -40 400 10 v40 h-920z" fill="#8ea37c" opacity="0.8" />
      <rect y="380" width="1600" height="240" fill="url(#st-sea)" />
      {[440, 500, 560].map((y, i) => (
        <path key={y} d={`M${100 + i * 200} ${y} q60 -16 120 0 M${900 + i * 120} ${y + 20} q60 -16 120 0`} stroke="#bfe3f0" strokeWidth="4" fill="none" opacity="0.7" />
      ))}
      <path d="M0 600 q400 -50 800 -10 q400 40 800 -20 v330 h-1600z" fill="#ecd9a8" />
      <path d="M0 610 q400 -50 800 -10 q400 40 800 -20" stroke="#f7f3e6" strokeWidth="10" fill="none" opacity="0.8" />
      {umbrella(360, "#d9534f")}
      {umbrella(1220, "#2f8fb1")}
      {sunbed(220)}
      {sunbed(1080)}
      {/* Piłka do picigina i ręcznik */}
      <circle cx="760" cy="780" r="26" fill="#f2c14e" />
      <path d="M738 770 q22 20 44 0" stroke="#e8823a" strokeWidth="4" fill="none" />
      <rect x="560" y="820" width="200" height="60" rx="8" fill="#8f2440" transform="rotate(-6 660 850)" />
      <rect x="560" y="836" width="200" height="10" fill="#f3ead8" transform="rotate(-6 660 850)" />
      <Palm x={60} y={700} s={0.9} />
    </svg>
  );
}

/** Port: nabrzeże, prom z otwartą rampą, kasa biletowa z rozkładem rejsów. */
export function PortScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <path d="M0 360 q200 -80 420 -30 q260 -60 520 -10 q300 -50 660 10 v80 h-1600z" fill="#8ea37c" opacity="0.75" />
      <rect y="400" width="1600" height="300" fill="url(#st-sea)" />
      {/* Prom */}
      <path d="M760 560 h760 l-60 110 h-660z" fill="#f7f7f2" />
      <rect x="760" y="600" width="760" height="22" fill="#1f4e79" />
      <rect x="880" y="470" width="520" height="90" rx="8" fill="#f7f7f2" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={904 + i * 62} y="490" width="40" height="28" rx="4" fill="#a6d0e4" />
      ))}
      <rect x="1240" y="400" width="44" height="72" fill="#d9534f" />
      <rect x="1240" y="400" width="44" height="14" fill="#2c2321" />
      <path d="M760 640 l-140 60 h40 l120 -40z" fill="#9a9a96" />
      <text x="1140" y="652" textAnchor="middle" fill="#1f4e79" fontSize="30" fontFamily="Georgia, serif" letterSpacing="4">BRAČ</text>
      {/* Nabrzeże */}
      <rect y="690" width="1600" height="210" fill="#cdbfa6" />
      <rect y="690" width="1600" height="14" fill="#a89a80" />
      {[120, 520].map((x) => (
        <g key={x}>
          <rect x={x} y="660" width="34" height="40" rx="8" fill="#3b3b3b" />
          <rect x={x - 6} y="656" width="46" height="10" rx="4" fill="#5c5650" />
        </g>
      ))}
      {/* Kasa biletowa */}
      <rect x="40" y="300" width="560" height="400" fill="url(#st-stone)" />
      <rect x="20" y="270" width="600" height="50" fill="#1f4e79" />
      <text x="320" y="306" textAnchor="middle" fill="#f3ead8" fontSize="30" fontFamily="Georgia, serif" letterSpacing="4">KARTE · TICKETS</text>
      <rect x="100" y="360" width="200" height="160" rx="8" fill="#a6d0e4" stroke="#7a4a2e" strokeWidth="8" />
      <rect x="340" y="350" width="220" height="230" rx="6" fill="#2c2321" />
      <text x="450" y="384" textAnchor="middle" fill="#f2c14e" fontSize="22" fontFamily="monospace">POLASCI</text>
      {[["Brač", "11:00"], ["Hvar", "12:30"], ["Šolta", "14:15"], ["Vis", "17:00"]].map(([d, t], i) => (
        <g key={d}>
          <text x="360" y={426 + i * 38} fill="#efe2c8" fontSize="22" fontFamily="monospace">{d}</text>
          <text x="540" y={426 + i * 38} textAnchor="end" fill="#8fd18f" fontSize="22" fontFamily="monospace">{t}</text>
        </g>
      ))}
      <rect x="80" y="560" width="480" height="140" fill="#7a4a2e" />
      <rect x="80" y="548" width="480" height="20" rx="6" fill="#a77c52" />
    </svg>
  );
}

/** Dworzec autobusowy: wiata, tablica odjazdów, autobus przy stanowisku 3. */
export function StationScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <rect y="380" width="1600" height="160" fill="url(#st-sea)" opacity="0.8" />
      <rect y="520" width="1600" height="380" fill="#9a958c" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={i * 210 + 40} y="700" width="120" height="12" rx="4" fill="#f3ead8" opacity="0.7" />
      ))}
      {/* Wiata */}
      <rect x="0" y="160" width="1600" height="40" fill="#5c5650" />
      {[80, 560, 1040, 1520].map((x) => (
        <rect key={x} x={x} y="200" width="20" height="440" fill="#6f6a62" />
      ))}
      {/* Autobus */}
      <rect x="760" y="380" width="760" height="270" rx="30" fill="#f7f7f2" />
      <rect x="760" y="560" width="760" height="40" fill="#2f8fb1" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={800 + i * 116} y="410" width="96" height="110" rx="10" fill="#a6d0e4" />
      ))}
      <rect x="1440" y="410" width="60" height="150" rx="8" fill="#a6d0e4" />
      <rect x="1250" y="396" width="200" height="10" fill="#3b3b3b" />
      <text x="1000" y="590" textAnchor="middle" fill="#f7f7f2" fontSize="26" fontFamily="Georgia, serif" letterSpacing="4">ZAGREB</text>
      {[880, 1380].map((x) => (
        <g key={x}>
          <circle cx={x} cy="650" r="46" fill="#2c2321" />
          <circle cx={x} cy="650" r="20" fill="#9a9a96" />
        </g>
      ))}
      {/* Stanowisko 3 */}
      <rect x="640" y="230" width="90" height="90" rx="10" fill="#1f4e79" />
      <text x="685" y="296" textAnchor="middle" fill="#f3ead8" fontSize="60" fontFamily="Georgia, serif">3</text>
      {/* Tablica odjazdów i okienko informacji */}
      <rect x="60" y="240" width="520" height="290" rx="8" fill="#2c2321" />
      <text x="320" y="282" textAnchor="middle" fill="#f2c14e" fontSize="24" fontFamily="monospace">POLASCI · DEPARTURES</text>
      {[["Zagreb", "09:30", "3", "+10"], ["Rijeka", "10:15", "5", ""], ["Dubrovnik", "11:00", "1", ""], ["Zadar", "12:45", "2", ""]].map(([d, t, p, late], i) => (
        <g key={d}>
          <text x="84" y={330 + i * 50} fill="#efe2c8" fontSize="24" fontFamily="monospace">{d}</text>
          <text x="370" y={330 + i * 50} fill="#8fd18f" fontSize="24" fontFamily="monospace">{t}</text>
          <text x="470" y={330 + i * 50} fill="#efe2c8" fontSize="24" fontFamily="monospace">{p}</text>
          {late && <text x="560" y={330 + i * 50} textAnchor="end" fill="#e8823a" fontSize="22" fontFamily="monospace">{late}</text>}
        </g>
      ))}
      <rect x="60" y="560" width="520" height="340" fill="#8f2440" />
      <rect x="60" y="548" width="520" height="22" rx="6" fill="#721c33" />
      <circle cx="320" cy="640" r="34" fill="#f3ead8" />
      <text x="320" y="656" textAnchor="middle" fill="#8f2440" fontSize="44" fontFamily="Georgia, serif">i</text>
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
