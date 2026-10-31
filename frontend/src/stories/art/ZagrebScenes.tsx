import { SKY, svgProps } from "./Scenes";

/**
 * Tła lokacji i mapa Zagrzebia — własne ilustracje SVG: secesyjne kamienice, niebieskie tramwaje,
 * Górne Miasto z kościołem św. Marka. Placeholdery produkcyjne (podmiana w art/registry.tsx).
 */

const BLUE_TRAM = "#1f5fa8";

function Tram({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M150 -150 l-40 -40 M150 -150 l40 -40" stroke="#3b3b3b" strokeWidth="4" />
      <rect x="0" y="-150" width="420" height="140" rx="24" fill={BLUE_TRAM} />
      <rect x="0" y="-60" width="420" height="16" fill="#f3ead8" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={20 + i * 80} y="-132" width="60" height="58" rx="8" fill="#cfe6f2" />
      ))}
      <circle cx="80" cy="-6" r="20" fill="#2c2321" />
      <circle cx="340" cy="-6" r="20" fill="#2c2321" />
    </g>
  );
}

/** Mieszkanie na Trešnjevce: salon z kanapą, okno na kamienice, bojler w kącie. */
export function ZgFlatScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#ece3d3" />
      <rect y="0" width="1600" height="40" fill="#d9ccb4" />
      {/* Okno z widokiem na kamienice */}
      <rect x="560" y="140" width="420" height="360" rx="6" fill="url(#st-sky)" stroke="#f7f3e6" strokeWidth="16" />
      {[600, 720, 840].map((x, i) => (
        <g key={x}>
          <rect x={x} y={300 - i * 20} width="110" height={200 + i * 20} fill={["#d9a46b", "#e8c5a0", "#b9c7a4"][i]} />
          {Array.from({ length: 6 }, (_, j) => (
            <rect key={j} x={x + 16 + (j % 2) * 48} y={320 - i * 20 + Math.floor(j / 2) * 50} width="28" height="34" fill="#f7f3e6" />
          ))}
        </g>
      ))}
      <path d="M770 140 v360 M560 320 h420" stroke="#f7f3e6" strokeWidth="10" />
      {/* Bojler */}
      <rect x="1260" y="120" width="180" height="300" rx="80" fill="#f7f7f2" stroke="#c8c2b4" strokeWidth="6" />
      <circle cx="1350" cy="330" r="22" fill="#d9534f" />
      <path d="M1320 420 v80 M1380 420 v80" stroke="#9a9a96" strokeWidth="10" />
      {/* Kanapa i dywan */}
      <ellipse cx="760" cy="820" rx="460" ry="60" fill="#c96f5a" opacity="0.5" />
      <rect x="440" y="600" width="640" height="150" rx="40" fill="#5f7a5b" />
      <rect x="400" y="560" width="90" height="200" rx="30" fill="#4b6248" />
      <rect x="1030" y="560" width="90" height="200" rx="30" fill="#4b6248" />
      <rect x="470" y="520" width="580" height="110" rx="30" fill="#6e8a69" />
      {/* Regał */}
      <rect x="100" y="200" width="260" height="600" fill="#a77c52" />
      {[300, 440, 580].map((y) => (
        <g key={y}>
          <rect x="100" y={y} width="260" height="12" fill="#7a4a2e" />
          {[120, 160, 200, 250, 300].map((x, i) => (
            <rect key={x} x={x} y={y - 80 + (i % 2) * 10} width="30" height={80 - (i % 2) * 10} fill={["#8f2440", "#2f6f74", "#e8c547", "#3f5f8f", "#d9534f"][i]} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Cvjetni trg: taras kawiarni, parasole, kwiaty, przejeżdżający tramwaj. */
export function ZgCafeScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      {/* Secesyjne kamienice */}
      {[
        [0, 200, "#e8c5a0"],
        [330, 160, "#d9a46b"],
        [640, 210, "#c7d3b0"],
        [960, 170, "#e3b8a8"],
        [1280, 190, "#efe2c8"],
      ].map(([x, y, c]) => (
        <g key={x as number}>
          <rect x={x as number} y={y as number} width="320" height={560 - (y as number) + 200} fill={c as string} />
          <rect x={x as number} y={(y as number) - 20} width="320" height="30" fill="#f7f3e6" opacity="0.7" />
          {Array.from({ length: 8 }, (_, j) => (
            <rect key={j} x={(x as number) + 40 + (j % 4) * 70} y={(y as number) + 50 + Math.floor(j / 4) * 110} width="40" height="70" rx="20" fill="#f7f3e6" opacity="0.85" />
          ))}
        </g>
      ))}
      <Tram x={900} y={600} s={0.9} />
      <rect y="600" width="1600" height="300" fill="#cfc4b2" />
      <path d="M0 640 h1600" stroke="#9a958c" strokeWidth="6" />
      {/* Parasole i stoliki */}
      {[200, 620].map((x, i) => (
        <g key={x}>
          <rect x={x - 5} y="420" width="10" height="320" fill="#f3ead8" />
          <path d={`M${x - 170} 440 q170 -120 340 0z`} fill={i ? "#8f2440" : "#2f6f74"} />
          <ellipse cx={x} cy="760" rx="110" ry="20" fill="#f3ead8" />
          <rect x={x - 6} y="770" width="12" height="90" fill="#5c5650" />
          <path d={`M${x - 30} 750 h30 l-4 -30 h-22z`} fill="#fff" />
        </g>
      ))}
      {/* Kwiaty */}
      {[1180, 1300, 1420].map((x, i) => (
        <g key={x}>
          <rect x={x} y="780" width="100" height="80" rx="6" fill="#a77c52" />
          {Array.from({ length: 5 }, (_, j) => (
            <circle key={j} cx={x + 14 + j * 18} cy={770 - (j % 2) * 14} r="16" fill={["#d9534f", "#f2c14e", "#e88cb4"][i]} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Biuro: open space, biurka z monitorami, tablica z planem zebrań, widok na miasto. */
export function ZgOfficeScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#e9eef0" />
      <rect x="80" y="80" width="900" height="420" fill="url(#st-sky)" />
      {[100, 260, 420, 600, 760].map((x, i) => (
        <rect key={x} x={x} y={260 - (i % 2) * 60} width="140" height={240 + (i % 2) * 60} fill={["#c7d3b0", "#d9a46b", "#efe2c8", "#e3b8a8", "#b9c7a4"][i]} />
      ))}
      <path d="M80 80 h900 v420 h-900z M380 80 v420 M680 80 v420" fill="none" stroke="#5c5650" strokeWidth="14" />
      {/* Tablica */}
      <rect x="1080" y="120" width="420" height="300" rx="8" fill="#fbfbf8" stroke="#9a9a96" strokeWidth="8" />
      <text x="1290" y="170" textAnchor="middle" fill="#1f4e79" fontSize="30" fontFamily="Georgia, serif">SASTANAK</text>
      <text x="1290" y="215" textAnchor="middle" fill="#3b3b3b" fontSize="24" fontFamily="monospace">ponedjeljak 10:00</text>
      {[260, 310, 360].map((y, i) => (
        <rect key={y} x="1120" y={y} width={[300, 240, 280][i]} height="12" rx="6" fill={["#d9534f", "#2f8fb1", "#7fb069"][i]} />
      ))}
      {/* Biurka */}
      <rect y="620" width="1600" height="280" fill="#cfc8bc" />
      {[160, 680, 1200].map((x) => (
        <g key={x}>
          <rect x={x} y="600" width="360" height="24" rx="6" fill="#a77c52" />
          <rect x={x + 20} y="624" width="16" height="200" fill="#7a4a2e" />
          <rect x={x + 324} y="624" width="16" height="200" fill="#7a4a2e" />
          <rect x={x + 100} y="460" width="180" height="120" rx="8" fill="#2c2321" />
          <rect x={x + 112} y="472" width="156" height="96" rx="4" fill="#8fc3e3" />
          <rect x={x + 180} y="580" width="20" height="22" fill="#3b3b3b" />
          <path d={`M${x + 300} 600 h36 l-4 -40 h-28z`} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

/** Przychodnia: gabinet z leżanką, tablica do badania wzroku, szafka z lekami. */
export function ZgClinicScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#eef4f2" />
      <rect y="0" width="1600" height="420" fill="#dcebe6" />
      <rect y="420" width="1600" height="14" fill="#9bc4b6" />
      {/* Tablica Snellena */}
      <rect x="140" y="120" width="220" height="300" rx="6" fill="#fff" stroke="#c8c2b4" strokeWidth="6" />
      {["E", "F P", "T O Z", "L P E D", "P E C F D"].map((row, i) => (
        <text key={row} x="250" y={190 + i * 48} textAnchor="middle" fill="#2c2321" fontSize={56 - i * 10} fontFamily="monospace">{row}</text>
      ))}
      {/* Okno */}
      <rect x="560" y="110" width="400" height="260" fill="url(#st-sky)" stroke="#f7f7f2" strokeWidth="14" />
      <path d="M760 110 v260" stroke="#f7f7f2" strokeWidth="10" />
      {/* Szafka z lekami */}
      <rect x="1140" y="100" width="320" height="420" rx="8" fill="#f7f7f2" stroke="#c8c2b4" strokeWidth="6" />
      <path d="M1290 200 v80 M1250 240 h80" stroke="#d9534f" strokeWidth="22" />
      {[360, 440].map((y) => (
        <g key={y}>
          <rect x="1160" y={y} width="280" height="8" fill="#c8c2b4" />
          {[1180, 1240, 1300, 1360].map((x, i) => (
            <rect key={x} x={x} y={y - 50} width="34" height="50" rx="6" fill={["#e8823a", "#9fd0e6", "#f2c14e", "#7fb069"][i]} />
          ))}
        </g>
      ))}
      {/* Leżanka i biurko */}
      <rect y="640" width="1600" height="260" fill="#cfd8d4" />
      <rect x="160" y="560" width="560" height="70" rx="18" fill="#9bc4b6" />
      <rect x="160" y="520" width="140" height="60" rx="18" fill="#b6d6cb" />
      <rect x="190" y="630" width="20" height="150" fill="#9a9a96" />
      <rect x="670" y="630" width="20" height="150" fill="#9a9a96" />
      <rect x="900" y="600" width="520" height="24" rx="6" fill="#a77c52" />
      <rect x="930" y="624" width="460" height="200" fill="#8f6440" />
      <rect x="1160" y="540" width="120" height="60" rx="4" fill="#f7f7f2" stroke="#c8c2b4" strokeWidth="4" />
    </svg>
  );
}

/** Butik na Ilicy: wieszaki z kurtkami, lustro, przymierzalnia, tabliczka z rabatem. */
export function ZgBoutiqueScene() {
  const jacket = (x: number, color: string) => (
    <g key={x}>
      <path d={`M${x + 40} 300 q20 -20 40 0`} fill="none" stroke="#9a9a96" strokeWidth="4" />
      <path d={`M${x} 330 l40 -30 h40 l40 30 v210 h-120z`} fill={color} />
      <path d={`M${x + 60} 300 v240`} stroke="#00000033" strokeWidth="4" />
    </g>
  );
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#f1ebe3" />
      <rect y="0" width="1600" height="90" fill="#2f2f2f" />
      <text x="800" y="60" textAnchor="middle" fill="#f3ead8" fontSize="40" fontFamily="Georgia, serif" letterSpacing="10">BUTIK · ILICA</text>
      {/* Wieszak */}
      <rect x="100" y="290" width="860" height="10" rx="5" fill="#9a9a96" />
      <rect x="110" y="290" width="10" height="460" fill="#9a9a96" />
      <rect x="940" y="290" width="10" height="460" fill="#9a9a96" />
      {[150, 300, 450, 600, 750].map((x, i) => jacket(x, ["#2c2321", "#1f4e79", "#2c2321", "#8f2440", "#1f4e79"][i]))}
      {/* Tabliczka rabatowa */}
      <rect x="380" y="140" width="300" height="100" rx="10" fill="#d9534f" />
      <text x="530" y="205" textAnchor="middle" fill="#fff" fontSize="46" fontFamily="Georgia, serif">−20 %</text>
      {/* Lustro i przymierzalnia */}
      <rect x="1040" y="160" width="160" height="560" rx="80" fill="#cfe6f2" stroke="#c9a227" strokeWidth="12" />
      <path d="M1080 260 l60 -60 M1080 330 l90 -90" stroke="#fff" strokeWidth="10" opacity="0.6" />
      <rect x="1260" y="140" width="280" height="600" fill="#e3d2b0" />
      <path d="M1270 160 q35 300 0 580 h40 q-30 -290 0 -580z M1340 160 q35 300 0 580 h40 q-30 -290 0 -580z M1410 160 q35 300 0 580 h40 q-30 -290 0 -580z" fill="#8f2440" />
      <rect x="1250" y="130" width="300" height="16" rx="8" fill="#9a9a96" />
      <rect y="750" width="1600" height="150" fill="#cdb38b" />
    </svg>
  );
}

/** Poczta: okienka, waga, wieszak z kopertami, numerki kolejki. */
export function ZgPostScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#efe9dc" />
      <rect y="0" width="1600" height="110" fill="#e8c547" />
      <text x="800" y="76" textAnchor="middle" fill="#1f4e79" fontSize="54" fontFamily="Georgia, serif" letterSpacing="12">POŠTA</text>
      {/* Wyświetlacz kolejki */}
      <rect x="660" y="150" width="280" height="110" rx="10" fill="#2c2321" />
      <text x="800" y="225" textAnchor="middle" fill="#d9534f" fontSize="58" fontFamily="monospace">A 047</text>
      {/* Okienka */}
      {[120, 620, 1120].map((x, i) => (
        <g key={x}>
          <rect x={x} y="300" width="360" height="300" fill="#d9ccb4" />
          <rect x={x + 30} y="320" width="300" height="200" rx="6" fill="#cfe6f2" opacity="0.8" />
          <rect x={x + 120} y="290" width="120" height="44" rx="6" fill="#1f4e79" />
          <text x={x + 180} y="322" textAnchor="middle" fill="#f3ead8" fontSize="28" fontFamily="Georgia, serif">{i + 1}</text>
        </g>
      ))}
      <rect y="600" width="1600" height="40" fill="#a77c52" />
      <rect y="640" width="1600" height="260" fill="#8f6440" />
      {/* Waga i paczka */}
      <rect x="720" y="560" width="160" height="40" rx="6" fill="#9a9a96" />
      <rect x="745" y="470" width="110" height="90" fill="#c98b4b" />
      <path d="M745 515 h110 M800 470 v90" stroke="#e8c547" strokeWidth="8" />
      <rect x="1240" y="540" width="120" height="60" fill="#f3ead8" stroke="#a89a80" strokeWidth="4" />
      <path d="M1240 540 l60 30 l60 -30" fill="none" stroke="#a89a80" strokeWidth="4" />
    </svg>
  );
}

/** Górne Miasto: kościół św. Marka z kolorowym dachem, kolejka linowa, latarnie gazowe. */
export function ZgUpperTownScene() {
  const tiles = ["#d9534f", "#f7f3e6", "#1f4e79"];
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <circle cx="1350" cy="150" r="110" fill="url(#st-sun)" />
      {/* Kościół św. Marka */}
      <rect x="560" y="360" width="480" height="380" fill="#efe2c8" />
      <path d="M540 370 l260 -190 l260 190z" fill="#7a4a2e" />
      {Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 12 - r * 2 }, (_, c) => (
          <rect key={`${r}-${c}`} x={570 + r * 40 + c * 38} y={350 - r * 30} width="34" height="24" fill={tiles[(r + c) % 3]} opacity="0.95" />
        )),
      )}
      <rect x="980" y="160" width="100" height="580" fill="#e6d4b2" />
      <path d="M970 170 l60 -90 l60 90z" fill="#4f7d63" />
      <rect x="1010" y="240" width="40" height="70" rx="20" fill="#2c2321" />
      <path d="M760 740 v-130 q40 -60 80 0 v130z" fill="#7a4a2e" />
      <circle cx="800" cy="480" r="44" fill="#f7f3e6" stroke="#b59a6c" strokeWidth="8" />
      {/* Kolejka linowa */}
      <path d="M0 860 L420 420" stroke="#5c5650" strokeWidth="12" />
      <g transform="translate(170 640) rotate(-46)">
        <rect x="-60" y="-70" width="140" height="90" rx="10" fill={BLUE_TRAM} />
        <rect x="-44" y="-56" width="40" height="40" rx="4" fill="#cfe6f2" />
        <rect x="10" y="-56" width="40" height="40" rx="4" fill="#cfe6f2" />
      </g>
      {/* Bruk i latarnie */}
      <rect y="740" width="1600" height="160" fill="#b5a68a" />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={(i % 15) * 110 + (Math.floor(i / 15) % 2) * 55} y={760 + Math.floor(i / 15) * 60} width="100" height="50" rx="10" fill="#a6977b" />
      ))}
      {[420, 1240].map((x) => (
        <g key={x}>
          <rect x={x} y="480" width="12" height="270" fill="#2c2321" />
          <path d={`M${x - 24} 480 h60 l-10 -50 h-40z`} fill="#2c2321" />
          <rect x={x - 14} y="440" width="40" height="34" fill="#f2c14e" opacity="0.9" />
        </g>
      ))}
    </svg>
  );
}

/** Mapa Zagrzebia: Medvednica na północy, Górne Miasto, Ilica, plac Jelačicia, Sawa na południu. */
export function ZagrebMap() {
  return (
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden className="map-art">
      {SKY}
      <rect width="1000" height="700" fill="#e7d7b4" />
      {/* Medvednica */}
      <path d="M0 0 h1000 v110 q-140 40 -280 10 q-160 -40 -300 20 q-200 60 -420 0z" fill="#8ea37c" />
      <path d="M0 0 h1000 v60 q-200 30 -400 0 q-300 -30 -600 20z" fill="#6f8a5f" opacity="0.6" />
      {/* Sawa */}
      <path d="M0 640 q250 -60 500 -20 q250 40 500 -30 v110 h-1000z" fill="url(#st-sea)" />
      {/* Górne Miasto */}
      <path d="M360 120 h180 l20 120 h-220z" fill="#d9c6a3" stroke="#b59a6c" strokeWidth="6" />
      {/* Ulice */}
      <g stroke="#cdb48a" strokeWidth="12" strokeLinecap="round" fill="none">
        <path d="M60 330 q240 -10 420 20 q200 30 460 10" />
        <path d="M470 240 q10 120 -10 520" />
        <path d="M150 520 q300 -40 700 20" />
        <path d="M640 330 q60 140 20 260" />
      </g>
      {/* Tory tramwajowe */}
      <path d="M60 330 q240 -10 420 20 q200 30 460 10" stroke={BLUE_TRAM} strokeWidth="3" strokeDasharray="10 8" fill="none" />
      {/* Plac Jelačicia */}
      <rect x="440" y="320" width="70" height="56" fill="#efe2c8" stroke="#b59a6c" strokeWidth="4" />
      {/* Park Zrinjevac */}
      {[520, 550, 580, 610].map((x) => (
        <circle key={x} cx={x} cy="440" r="14" fill="#4f8a4a" />
      ))}
    </svg>
  );
}
