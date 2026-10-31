import { Palm, SKY, svgProps } from "./Scenes";

/**
 * Tła lokacji i mapa Dubrownika — własne ilustracje SVG: mury, wypolerowany kamień Straduna,
 * czerwone dachy, Lokrum na horyzoncie. Placeholdery produkcyjne (podmiana w art/registry.tsx).
 */

const STONE = "#efe2c8";
const ROOF = "#c4553a";

function Roofs({ y, n = 10 }: { y: number; n?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={i * (1600 / n)} y={y + (i % 3) * 18} width={1600 / n - 8} height="120" fill={["#efe2c8", "#e6d4b2", "#f3ead8"][i % 3]} />
          <path d={`M${i * (1600 / n) - 6} ${y + (i % 3) * 18} l${1600 / n / 2} -50 l${1600 / n / 2} 50z`} fill={ROOF} />
        </g>
      ))}
    </g>
  );
}

/** Port Gruž: nabrzeże, katamaran, łódź Antego, żółta taksówka. */
export function DbPortScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <path d="M0 330 q300 -90 640 -30 q360 -70 960 10 v80 h-1600z" fill="#8ea37c" opacity="0.8" />
      <rect y="380" width="1600" height="300" fill="url(#st-sea)" />
      {/* Katamaran */}
      <path d="M840 540 h640 l-40 70 h-560z" fill="#f7f7f2" />
      <rect x="900" y="470" width="480" height="70" rx="20" fill="#f7f7f2" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={926 + i * 56} y="488" width="40" height="26" rx="6" fill="#1f4e79" />
      ))}
      <rect x="840" y="566" width="640" height="10" fill="#d9534f" />
      {/* Łódź Antego */}
      <path d="M200 600 h300 l-40 50 h-220z" fill="#1f4e79" />
      <rect x="300" y="540" width="100" height="60" rx="6" fill="#f3ead8" />
      <rect x="345" y="440" width="8" height="100" fill="#7a4a2e" />
      {/* Nabrzeże i taksówka */}
      <rect y="680" width="1600" height="220" fill="#cdbfa6" />
      <rect y="680" width="1600" height="14" fill="#a89a80" />
      <g transform="translate(1100 700)">
        <rect x="0" y="40" width="300" height="80" rx="20" fill="#f2c14e" />
        <path d="M50 40 l40 -50 h120 l40 50z" fill="#f2c14e" />
        <path d="M70 36 l28 -36 h44 v36z M152 36 v-36 h50 l28 36z" fill="#cfe6f2" />
        <rect x="120" y="-24" width="60" height="18" rx="4" fill="#2c2321" />
        <text x="150" y="-10" textAnchor="middle" fill="#f2c14e" fontSize="14" fontFamily="monospace">TAXI</text>
        <circle cx="70" cy="124" r="26" fill="#2c2321" />
        <circle cx="230" cy="124" r="26" fill="#2c2321" />
      </g>
      <Palm x={80} y={720} s={0.8} />
    </svg>
  );
}

/** Apartament: kamienne ściany, belki, okno z okiennicami na dachy, plama wilgoci. */
export function DbFlatScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-stone)" />
      {Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => (
          <rect key={`${r}-${c}`} x={c * 180 + (r % 2) * 90 - 50} y={r * 110} width="172" height="102" rx="10" fill="#e6d4b2" opacity="0.6" />
        )),
      )}
      {[60, 240].map((y) => (
        <rect key={y} x="0" y={y} width="1600" height="30" fill="#7a4a2e" />
      ))}
      {/* Okno */}
      <rect x="560" y="220" width="420" height="340" fill="url(#st-sky)" />
      <rect x="560" y="420" width="420" height="140" fill="#e6d4b2" />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${560 + i * 70} 440 l35 -30 l35 30z`} fill={ROOF} />
      ))}
      <path d="M560 220 h420 v340 h-420z M770 220 v340" fill="none" stroke="#f7f3e6" strokeWidth="14" />
      <rect x="470" y="220" width="90" height="340" fill="#4f7d63" />
      <rect x="980" y="220" width="90" height="340" fill="#4f7d63" />
      {/* Plama wilgoci */}
      <path d="M1280 120 q80 40 60 140 q-20 90 -110 70 q-90 -30 -40 -120 q30 -60 90 -90z" fill="#6f7d5a" opacity="0.35" />
      <circle cx="1350" cy="220" r="22" fill="#4b5a3a" opacity="0.3" />
      {/* Łóżko i komoda */}
      <rect y="700" width="1600" height="200" fill="#b98a5e" />
      <rect x="160" y="600" width="520" height="120" rx="16" fill="#f7f3e6" />
      <rect x="160" y="560" width="120" height="70" rx="16" fill="#e8e1d2" />
      <rect x="140" y="520" width="30" height="220" fill="#7a4a2e" />
      <rect x="1120" y="560" width="300" height="160" rx="6" fill="#a77c52" />
      <rect x="1140" y="590" width="260" height="40" rx="4" fill="#8f6440" />
      <rect x="1140" y="650" width="260" height="40" rx="4" fill="#8f6440" />
    </svg>
  );
}

/** Agencja: plakaty wycieczek, mapa wybrzeża, biurka i tablica z terminem. */
export function DbAgencyScene() {
  const poster = (x: number, title: string, sea: string) => (
    <g key={x}>
      <rect x={x} y="140" width="220" height="300" rx="6" fill="#fbfbf8" stroke="#c8c2b4" strokeWidth="4" />
      <rect x={x + 14} y="154" width="192" height="180" fill="url(#st-sky)" />
      <rect x={x + 14} y="260" width="192" height="74" fill={sea} />
      <path d={`M${x + 40} 270 q60 -60 140 0z`} fill="#8ea37c" />
      <text x={x + 110} y="390" textAnchor="middle" fill="#1f4e79" fontSize="30" fontFamily="Georgia, serif">{title}</text>
    </g>
  );
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#f3ece0" />
      <rect y="0" width="1600" height="90" fill="#1f4e79" />
      <text x="800" y="60" textAnchor="middle" fill="#f3ead8" fontSize="38" fontFamily="Georgia, serif" letterSpacing="8">TURISTIČKA AGENCIJA</text>
      {poster(100, "LOKRUM", "#2f8fb1")}
      {poster(360, "ELAFITI", "#1d5f7f")}
      {poster(620, "ZIDINE", "#2f8fb1")}
      <rect x="980" y="140" width="520" height="300" rx="8" fill="#fbfbf8" stroke="#9a9a96" strokeWidth="8" />
      <text x="1240" y="190" textAnchor="middle" fill="#8f2440" fontSize="30" fontFamily="Georgia, serif">HOTEL LAPAD</text>
      <text x="1240" y="236" textAnchor="middle" fill="#3b3b3b" fontSize="24" fontFamily="monospace">rok: kraj mjeseca</text>
      {[290, 340, 390].map((y, i) => (
        <rect key={y} x="1030" y={y} width={[380, 300, 340][i]} height="14" rx="7" fill={["#2f8fb1", "#e8c547", "#7fb069"][i]} />
      ))}
      <rect y="640" width="1600" height="260" fill="#cfc4b2" />
      {[180, 900].map((x) => (
        <g key={x}>
          <rect x={x} y="600" width="520" height="26" rx="6" fill="#a77c52" />
          <rect x={x + 20} y="626" width="18" height="200" fill="#7a4a2e" />
          <rect x={x + 482} y="626" width="18" height="200" fill="#7a4a2e" />
          <rect x={x + 180} y="470" width="180" height="120" rx="8" fill="#2c2321" />
          <rect x={x + 192} y="482" width="156" height="96" rx="4" fill="#8fc3e3" />
          <rect x={x + 60} y="560" width="90" height="40" rx="4" fill="#f3ead8" />
        </g>
      ))}
    </svg>
  );
}

/** Apteka przy Pile: zielony krzyż, półki z kremami z filtrem, lada. */
export function DbPharmacyScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#f1f6f3" />
      <rect x="680" y="60" width="240" height="240" rx="20" fill="#4f8a4a" />
      <path d="M800 100 v160 M720 180 h160" stroke="#f7f7f2" strokeWidth="48" />
      {[120, 1060].map((x) => (
        <g key={x}>
          <rect x={x} y="80" width="420" height="560" fill="#fbfbf8" stroke="#c8c2b4" strokeWidth="6" />
          {[220, 360, 500].map((y, r) => (
            <g key={y}>
              <rect x={x} y={y} width="420" height="10" fill="#c8c2b4" />
              {Array.from({ length: 6 }, (_, i) => (
                <rect key={i} x={x + 20 + i * 66} y={y - 80 + (i % 2) * 14} width="48" height={80 - (i % 2) * 14} rx="8" fill={["#e8823a", "#f2c14e", "#9fd0e6", "#7fb069", "#e88cb4", "#f7f7f2"][(i + r) % 6]} stroke="#c8c2b4" strokeWidth="2" />
              ))}
            </g>
          ))}
        </g>
      ))}
      <text x="330" y="620" textAnchor="middle" fill="#e8823a" fontSize="30" fontFamily="Georgia, serif">SPF 50</text>
      <rect y="680" width="1600" height="220" fill="#d7e3dd" />
      <rect x="400" y="600" width="800" height="300" fill="#9bc4b6" />
      <rect x="400" y="584" width="800" height="30" rx="8" fill="#7aa999" />
      <rect x="1000" y="520" width="140" height="70" rx="8" fill="#3b3b3b" />
      <rect x="1014" y="534" width="112" height="30" rx="4" fill="#8fd18f" />
    </svg>
  );
}

/** Mury miejskie: blanki, wieża Minčeta, morze i Lokrum. */
export function DbWallsScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <circle cx="1350" cy="140" r="110" fill="url(#st-sun)" />
      <rect y="320" width="1600" height="240" fill="url(#st-sea)" />
      <path d="M1100 360 q140 -60 300 0z" fill="#6f8a5f" />
      <Roofs y={520} n={12} />
      {/* Wieża Minčeta */}
      <path d="M140 640 v-380 h220 v380z" fill={STONE} />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={140 + i * 48} y="230" width="32" height="40" fill={STONE} />
      ))}
      <rect x="225" y="330" width="40" height="70" rx="20" fill="#2c2321" opacity="0.6" />
      {/* Chodnik na murach */}
      <rect y="660" width="1600" height="240" fill="#d9c6a3" />
      <rect y="620" width="1600" height="50" fill={STONE} />
      {Array.from({ length: 20 }, (_, i) => (
        <rect key={i} x={i * 84} y="580" width="56" height="50" fill={STONE} />
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <rect key={i} x={(i % 12) * 140 + (Math.floor(i / 12) % 2) * 70} y={700 + Math.floor(i / 12) * 80} width="130" height="70" rx="8" fill="#cbb791" />
      ))}
    </svg>
  );
}

/** Stradun nocą: wypolerowany kamień, latarnie, fontanna Onufrego, wieża zegarowa w głębi. */
export function DbStradunScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#2b3150" />
      <rect width="1600" height="400" fill="#3b4268" />
      {/* Wieża zegarowa */}
      <rect x="740" y="140" width="120" height="420" fill="#d9c6a3" />
      <path d="M730 150 l70 -90 l70 90z" fill="#4f7d63" />
      <circle cx="800" cy="230" r="34" fill="#f3ead8" />
      <path d="M800 230 v-22 M800 230 h16" stroke="#2c2321" strokeWidth="4" />
      {/* Fasady po bokach w perspektywie */}
      <path d="M0 0 h600 l140 300 v300 l-140 300 h-600z" fill="#cdb48a" />
      <path d="M1600 0 h-600 l-140 300 v300 l140 300 h600z" fill="#c4aa80" />
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect x={60 + i * 90} y={120 + i * 20} width="50" height={140 - i * 10} rx="24" fill="#f2c14e" opacity="0.8" />
          <rect x={1490 - i * 90} y={120 + i * 20} width="50" height={140 - i * 10} rx="24" fill="#f2c14e" opacity="0.8" />
        </g>
      ))}
      {/* Wypolerowany kamień */}
      <path d="M600 900 l140 -300 h120 l140 300z" fill="#e6d8bd" />
      <path d="M660 900 l100 -300 h80 l100 300z" fill="#f3ead8" opacity="0.6" />
      {/* Latarnie */}
      {[420, 1180].map((x) => (
        <g key={x}>
          <rect x={x} y="420" width="12" height="420" fill="#2c2321" />
          <path d={`M${x - 24} 420 h60 l-10 -50 h-40z`} fill="#2c2321" />
          <circle cx={x + 6} cy="400" r="70" fill="#f2c14e" opacity="0.25" />
          <rect x={x - 14} y="378" width="40" height="38" fill="#f2c14e" />
        </g>
      ))}
      {/* Plakat festiwalu */}
      <rect x="180" y="460" width="160" height="230" rx="6" fill="#8f2440" />
      <text x="260" y="540" textAnchor="middle" fill="#f3ead8" fontSize="26" fontFamily="Georgia, serif">HAMLET</text>
      <text x="260" y="580" textAnchor="middle" fill="#f2c14e" fontSize="18" fontFamily="Georgia, serif">Lovrijenac</text>
    </svg>
  );
}

/** Plaża Banje o zachodzie: mury z boku, Lokrum, parasole. */
export function DbBeachScene() {
  return (
    <svg {...svgProps}>
      <defs>
        <linearGradient id="db-sunset" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2a65a" />
          <stop offset="1" stopColor="#f7d9a8" />
        </linearGradient>
        <linearGradient id="db-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d98a5a" />
          <stop offset="1" stopColor="#1d5f7f" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#db-sunset)" />
      <circle cx="1060" cy="380" r="90" fill="#fff1c9" />
      <rect y="400" width="1600" height="260" fill="url(#db-sea)" />
      <path d="M760 420 q240 -90 520 0z" fill="#3f5a3a" />
      {/* Mury po lewej */}
      <path d="M0 220 h420 l60 440 h-480z" fill="#d9c6a3" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={i * 74} y="190" width="50" height="36" fill="#d9c6a3" />
      ))}
      <path d="M0 640 q600 -60 1600 0 v260 h-1600z" fill="#e8d4a8" />
      {[620, 1300].map((x, i) => (
        <g key={x}>
          <rect x={x - 5} y="520" width="10" height="220" fill="#f3ead8" />
          <path d={`M${x - 140} 540 q140 -110 280 0z`} fill={i ? "#8f2440" : "#e8c547"} />
        </g>
      ))}
      <rect x="760" y="780" width="220" height="60" rx="8" fill="#2f8fb1" transform="rotate(-4 870 810)" />
    </svg>
  );
}

/** Mapa Dubrownika: półwysep z Gružem na zachodzie, Stare Miasto w murach, Lokrum na wschodzie. */
export function DubrovnikMap() {
  return (
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden className="map-art">
      {SKY}
      <rect width="1000" height="700" fill="url(#st-sea)" />
      <path d="M0 0 h1000 v280 q-80 30 -140 120 q-60 90 -170 110 q-120 20 -200 -40 q-80 -60 -170 -20 q-100 40 -170 -20 q-90 -70 -150 -40z" fill="#e7d7b4" />
      <path d="M0 0 h1000 v130 q-250 40 -500 0 q-250 -40 -500 30z" fill="#8ea37c" opacity="0.8" />
      {/* Zatoka Gruž */}
      <path d="M0 230 q120 -40 220 10 q-40 60 -220 50z" fill="url(#st-sea)" />
      {/* Stare Miasto w murach */}
      <path d="M470 300 h260 l30 160 h-320z" fill="#efe2c8" stroke="#b59a6c" strokeWidth="10" />
      <path d="M470 380 h290" stroke="#d9c6a3" strokeWidth="10" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={480 + i * 30} y="320" width="22" height="16" fill={ROOF} />
      ))}
      {/* Drogi */}
      <g stroke="#cdb48a" strokeWidth="10" strokeLinecap="round" fill="none">
        <path d="M120 270 q160 40 340 70" />
        <path d="M760 360 q100 -10 200 20" />
      </g>
      {/* Lokrum */}
      <path d="M800 560 q90 -50 180 0 q-90 40 -180 0z" fill="#6f8a5f" />
    </svg>
  );
}
