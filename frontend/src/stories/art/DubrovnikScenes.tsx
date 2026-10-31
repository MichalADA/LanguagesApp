import { Palm, SKY, svgProps } from "./Scenes";

/**
 * Tła i mapa Dubrownika — mury z blankami, Minčeta, wypolerowany Stradun, port Gruž i bar na skałach.
 * Placeholdery produkcyjne jak w Scenes.tsx: podmiana w art/registry.tsx.
 */

const STONE = "#e3d3b0";
const STONE_DARK = "#c9b48a";
const ROOF = "#c4583a";

/** Mury z blankami na wysokości `y`. */
function Battlements({ x, y, w, h = 40, fill = STONE }: { x: number; y: number; w: number; h?: number; fill?: string }) {
  return (
    <g>
      {Array.from({ length: Math.floor(w / 70) }, (_, i) => (
        <rect key={i} x={x + i * 70} y={y - h} width="40" height={h} fill={fill} />
      ))}
    </g>
  );
}

/** Dachy starego miasta z czerwonej dachówki. */
function Roofs({ y, from = 0, to = 1600, s = 1 }: { y: number; from?: number; to?: number; s?: number }) {
  return (
    <g>
      {Array.from({ length: Math.ceil((to - from) / (120 * s)) }, (_, i) => {
        const x = from + i * 120 * s;
        const h = (40 + ((i * 37) % 50)) * s;
        return (
          <g key={i}>
            <rect x={x} y={y - h} width={110 * s} height={h + 200} fill={i % 3 ? "#efe2c8" : "#e6d3ae"} />
            <path d={`M${x - 6 * s} ${y - h} l${61 * s} ${-36 * s} l${61 * s} ${36 * s}z`} fill={i % 2 ? ROOF : "#d36a45"} />
          </g>
        );
      })}
    </g>
  );
}

/** Spacer po murach: chodnik murów, blanki, dachy w dole, Minčeta i morze. */
export function DubrovnikWallsScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <rect y="300" width="1600" height="200" fill="url(#st-sea)" />
      <path d="M1180 330 q60 -40 140 -10 q60 -20 120 10z" fill="#7c8f6a" />
      {/* Minčeta */}
      <rect x="160" y="110" width="260" height="360" fill={STONE_DARK} />
      <Battlements x={150} y={110} w={300} h={44} fill={STONE_DARK} />
      <rect x="250" y="210" width="40" height="70" rx="20" fill="#7a6a52" />
      <Roofs y={520} from={440} to={1600} />
      {/* Chodnik muru */}
      <path d="M0 640 L1600 560 V900 H0z" fill={STONE} />
      <path d="M0 640 L1600 560" stroke={STONE_DARK} strokeWidth="10" />
      <g>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={i * 140} y={600 - i * 5.5} width="90" height="70" fill={STONE_DARK} />
        ))}
      </g>
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${i * 220} 900 l120 -${240 - i * 6}`} stroke="#d6c39c" strokeWidth="4" />
      ))}
      {/* Flaga */}
      <path d="M290 66 v-60" stroke="#5c5650" strokeWidth="5" />
      <path d="M292 10 h50 l-10 14 l10 14 h-50z" fill="#f3ead8" />
    </svg>
  );
}

/** Port Gruž: nabrzeże, katamaran, prom z otwartą rampą, kasa biletowa. */
export function DubrovnikHarborScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <path d="M0 360 q200 -80 420 -40 q240 -60 480 0 q300 -50 700 10 v30 h-1600z" fill="#8ea37c" />
      <rect y="380" width="1600" height="340" fill="url(#st-sea)" />
      {/* Prom */}
      <g transform="translate(820 560)">
        <path d="M0 0 h620 l-40 90 h-560z" fill="#f3f3f0" />
        <rect x="60" y="-110" width="440" height="110" fill="#ffffff" />
        <rect x="60" y="-40" width="440" height="14" fill="#1d5f7f" />
        {[90, 170, 250, 330, 410].map((x) => (
          <rect key={x} x={x} y="-92" width="50" height="34" rx="4" fill="#8fc3e3" />
        ))}
        <rect x="380" y="-170" width="60" height="60" fill="#ffffff" />
        <rect x="380" y="-170" width="60" height="16" fill="#c4583a" />
        <path d="M-40 70 l60 -60 v80z" fill="#a9aaa6" />
      </g>
      {/* Katamaran */}
      <g transform="translate(180 600)">
        <path d="M0 0 h360 l-30 40 h-310z" fill="#ffffff" />
        <path d="M30 0 q40 -70 140 -70 h120 l50 70z" fill="#e9eef3" />
        <path d="M70 -20 h230" stroke="#2f6f74" strokeWidth="14" />
      </g>
      {/* Nabrzeże i kasa */}
      <rect y="720" width="1600" height="180" fill="#bfb6a3" />
      <path d="M0 724 h1600" stroke="#8e877a" strokeWidth="8" />
      <rect x="80" y="520" width="300" height="210" rx="8" fill="#e8dcc2" />
      <rect x="80" y="500" width="300" height="40" rx="6" fill="#1d5f7f" />
      <text x="230" y="528" textAnchor="middle" fill="#f3ead8" fontSize="26" fontFamily="Georgia, serif" letterSpacing="3">KARTE</text>
      <rect x="120" y="570" width="220" height="110" rx="6" fill="#a6d0e4" />
      <rect x="440" y="560" width="200" height="140" rx="6" fill="#2c2321" />
      <text x="456" y="594" fill="#f2c14e" fontSize="20" fontFamily="monospace">LOPUD 10:00</text>
      <text x="456" y="626" fill="#f2c14e" fontSize="20" fontFamily="monospace">LOPUD 11:15</text>
      <text x="456" y="658" fill="#efe2c8" fontSize="20" fontFamily="monospace">ŠIPAN 12:30</text>
      {[700, 760].map((x) => (
        <rect key={x} x={x} y="740" width="26" height="40" rx="8" fill="#5c5650" />
      ))}
    </svg>
  );
}

/** Stradun wieczorem: wypolerowany kamień, latarnie, scena festiwalu, wieża zegarowa. */
export function DubrovnikStradunScene() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="du-dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3f6e" />
          <stop offset="1" stopColor="#e7a597" />
        </linearGradient>
        <linearGradient id="du-street" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9dcc0" />
          <stop offset="1" stopColor="#cdbb98" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#du-dusk)" />
      {/* Wieża zegarowa na końcu ulicy */}
      <rect x="740" y="120" width="120" height="420" fill={STONE} />
      <path d="M730 120 l70 -70 l70 70z" fill="#7d8f6f" />
      <circle cx="800" cy="210" r="34" fill="#f6efe0" stroke="#7a6a52" strokeWidth="6" />
      <path d="M800 210 v-22 M800 210 h16" stroke="#3b3b3b" strokeWidth="5" strokeLinecap="round" />
      {/* Kamienice po obu stronach w perspektywie */}
      <path d="M0 0 L620 200 V600 L0 760z" fill={STONE} />
      <path d="M1600 0 L980 200 V600 L1600 760z" fill={STONE} />
      {Array.from({ length: 4 }, (_, i) => (
        <g key={i}>
          <path d={`M${80 + i * 140} ${120 + i * 26} h70 v${130 - i * 14} h-70z`} fill="#4f7d63" />
          <path d={`M${1450 - i * 140} ${120 + i * 26} h70 v${130 - i * 14} h-70z`} fill="#4f7d63" />
          <path d={`M${80 + i * 140} ${470 + i * 4} h80 v${160 - i * 20} h-80z`} fill="#7a4a2e" />
          <path d={`M${1440 - i * 140} ${470 + i * 4} h80 v${160 - i * 20} h-80z`} fill="#7a4a2e" />
        </g>
      ))}
      {/* Wypolerowany bruk */}
      <path d="M0 760 L620 600 H980 L1600 760 V900 H0z" fill="url(#du-street)" />
      <path d="M700 600 L560 900 M800 600 V900 M900 600 L1040 900" stroke="#f6eedd" strokeWidth="6" opacity="0.6" />
      {/* Latarnie */}
      {[260, 1340].map((x) => (
        <g key={x}>
          <path d={`M${x} 760 v-300`} stroke="#2c2c2c" strokeWidth="10" />
          <rect x={x - 22} y="420" width="44" height="50" rx="6" fill="#f6d77a" />
          <circle cx={x} cy="445" r="70" fill="#f6d77a" opacity="0.18" />
        </g>
      ))}
      {/* Baner festiwalu */}
      <path d="M620 260 q180 40 360 0" stroke="#3b3b3b" strokeWidth="3" fill="none" />
      <rect x="660" y="270" width="280" height="60" rx="6" fill="#8f2440" />
      <text x="800" y="310" textAnchor="middle" fill="#f6efe0" fontSize="26" fontFamily="Georgia, serif" letterSpacing="3">LJETNE IGRE</text>
    </svg>
  );
}

/** Bar na skałach: mury nad głową, stoliki na skałach, zachód słońca nad otwartym morzem. */
export function DubrovnikRocksScene() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="du-sunset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2a65a" />
          <stop offset="1" stopColor="#f6dcb0" />
        </linearGradient>
        <linearGradient id="du-sea-eve" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b7e9c" />
          <stop offset="1" stopColor="#1d4f6b" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#du-sunset)" />
      <circle cx="1100" cy="420" r="90" fill="#ffe2a0" />
      <rect y="420" width="1600" height="480" fill="url(#du-sea-eve)" />
      <path d="M1020 440 h160" stroke="#ffe2a0" strokeWidth="6" opacity="0.7" />
      <path d="M1000 470 h200 M1040 500 h120" stroke="#ffe2a0" strokeWidth="4" opacity="0.5" />
      {/* Mury nad głową */}
      <path d="M0 0 h700 v160 q-200 40 -380 120 q-160 70 -320 60z" fill={STONE} />
      <Battlements x={0} y={10} w={700} h={0} />
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => <rect key={`${r}-${c}`} x={c * 120 + (r % 2 ? 60 : 0)} y={r * 50} width="110" height="44" rx="4" fill={STONE_DARK} opacity="0.4" />),
      )}
      {/* Skały */}
      <path d="M0 520 q120 -60 260 -30 q140 -50 300 10 q120 30 200 120 q60 90 40 280 h-800z" fill="#b9a98c" />
      <path d="M0 640 q200 -40 420 -10 q160 20 300 120 v150 h-720z" fill="#a69779" />
      {/* Stoliki */}
      {[200, 470].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy={600 + i * 40} rx="80" ry="16" fill="#f3ead8" />
          <rect x={x - 6} y={606 + i * 40} width="12" height="80" fill="#5c5650" />
          <path d={`M${x - 30} ${596 + i * 40} h24 l-4 -40 h-16z`} fill="#fff" opacity="0.8" />
          <path d={`M${x + 10} ${596 + i * 40} h24 l-4 -40 h-16z`} fill="#f2c14e" opacity="0.9" />
        </g>
      ))}
      <Palm x={1500} y={900} s={0.8} />
    </svg>
  );
}

/** Mapa Dubrownika: stare miasto w murach, Ploče na wschodzie, Gruž na północnym zachodzie, Lokrum. */
export function DubrovnikMap() {
  return (
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden className="map-art">
      {SKY}
      <rect width="1000" height="700" fill="url(#st-sea)" />
      {/* Ląd */}
      <path d="M0 0 h1000 v300 q-80 30 -160 20 q-40 60 -120 70 q-60 10 -100 60 q-50 50 -120 40 q-80 -10 -120 -60 q-60 -40 -140 -30 q-80 10 -140 -20z" fill="#e7d7b4" />
      <path d="M0 0 h1000 v110 q-220 30 -460 0 q-280 -30 -540 20z" fill="#9fb37f" opacity="0.75" />
      {/* Zatoka Gruž */}
      <path d="M0 120 q120 -10 200 40 q40 40 -20 70 q-80 30 -180 0z" fill="url(#st-sea)" />
      <path d="M100 150 h50 l-8 10 h-34z M160 190 h40 l-6 8 h-28z" fill="#fff" />
      {/* Stare miasto w murach */}
      <path d="M380 260 q120 -40 260 0 q30 80 0 170 q-130 50 -260 0 q-30 -80 0 -170z" fill="#e2cfa6" stroke="#b59a6c" strokeWidth="10" />
      <path d="M400 360 h220" stroke="#f3ead8" strokeWidth="10" strokeLinecap="round" />
      {[[420, 290], [470, 300], [530, 290], [580, 300], [430, 400], [500, 410], [570, 400]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="30" height="22" fill="#c4583a" />
      ))}
      <circle cx="500" cy="248" r="22" fill="#d6c39c" stroke="#b59a6c" strokeWidth="6" />
      {/* Lokrum */}
      <path d="M800 520 q60 -40 130 -10 q40 30 -10 60 q-70 30 -130 0z" fill="#8ea37c" />
      {/* Kolejka na Srđ */}
      <path d="M560 250 L640 60" stroke="#5c5650" strokeWidth="3" strokeDasharray="8 6" />
      <path d="M0 640 q120 -30 260 0" stroke="#bfe3f0" strokeWidth="3" fill="none" opacity="0.6" />
      <path d="M560 660 q120 -30 260 0" stroke="#bfe3f0" strokeWidth="3" fill="none" opacity="0.6" />
    </svg>
  );
}
