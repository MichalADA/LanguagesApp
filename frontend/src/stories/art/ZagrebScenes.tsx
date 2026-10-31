import { SKY, svgProps } from "./Scenes";

/**
 * Tła i mapa Zagrzebia — secesyjne kamienice Donjego gradu, niebieskie tramwaje, parasole Dolca.
 * Placeholdery produkcyjne jak w Scenes.tsx: podmiana w art/registry.tsx.
 */

const ZG_TRAM = "#1f5fa8";

/** Rząd okien kamienicy (Donji grad). */
function Windows({ x, y, cols, rows, w = 60, h = 90, gap = 40, fill = "#f4ead6", frame = "#8c7b64" }: { x: number; y: number; cols: number; rows: number; w?: number; h?: number; gap?: number; fill?: string; frame?: string }) {
  return (
    <g>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <g key={`${r}-${c}`}>
            <rect x={x + c * (w + gap)} y={y + r * (h + 50)} width={w} height={h} rx="4" fill={frame} />
            <rect x={x + c * (w + gap) + 6} y={y + r * (h + 50) + 6} width={w - 12} height={h - 12} fill={fill} />
            <path d={`M${x + c * (w + gap) - 6} ${y + r * (h + 50)} h${w + 12}`} stroke={frame} strokeWidth="8" strokeLinecap="round" />
          </g>
        )),
      )}
    </g>
  );
}

function Tram({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M20 -170 v-30" stroke="#3b3b3b" strokeWidth="4" />
      <rect x="0" y="-170" width="520" height="160" rx="26" fill={ZG_TRAM} />
      <rect x="0" y="-60" width="520" height="22" fill="#e9eef5" />
      {[30, 130, 230, 330, 430].map((wx) => (
        <rect key={wx} x={wx} y="-150" width="70" height="70" rx="8" fill="#cfe3f3" />
      ))}
      <circle cx="90" cy="-6" r="20" fill="#2b2b2b" />
      <circle cx="430" cy="-6" r="20" fill="#2b2b2b" />
    </g>
  );
}

/** Mieszkanie na Trešnjevce: parkiet, kaloryfer pod oknem, widok na dachy, kanapa. */
export function ZagrebFlatScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#ece3d3" />
      <rect y="0" width="1600" height="40" fill="#e1d6c2" />
      {/* Okno z widokiem na dachy i katedrę */}
      <rect x="520" y="130" width="520" height="420" rx="8" fill="#f7f3ea" />
      <rect x="540" y="150" width="480" height="380" fill="url(#st-sky)" />
      <path d="M540 420 h480 v110 h-480z" fill="#b5523b" />
      <path d="M540 420 l60 -40 l60 40 l70 -50 l70 50 l60 -30 l70 30 l90 -40 v20 h-480z" fill="#c8664a" />
      <path d="M880 420 v-170 l14 -50 l14 50 v170z M930 420 v-170 l14 -50 l14 50 v170z" fill="#d6cbb8" />
      <rect x="776" y="150" width="8" height="380" fill="#f7f3ea" />
      <rect x="540" y="336" width="480" height="8" fill="#f7f3ea" />
      {/* Kaloryfer */}
      <rect x="590" y="580" width="380" height="110" rx="10" fill="#f2f0eb" stroke="#d2cdc2" strokeWidth="4" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={604 + i * 30} y="590" width="18" height="90" rx="6" fill="#e3dfd6" />
      ))}
      {/* Kanapa i lampa */}
      <rect x="1120" y="560" width="400" height="150" rx="30" fill="#4b6c8f" />
      <rect x="1100" y="520" width="60" height="190" rx="24" fill="#3f5b79" />
      <rect x="1480" y="520" width="60" height="190" rx="24" fill="#3f5b79" />
      <rect x="1180" y="510" width="120" height="80" rx="18" fill="#f2c14e" />
      <path d="M200 720 v-420" stroke="#5c5650" strokeWidth="10" />
      <path d="M140 300 h120 l-30 -90 h-60z" fill="#f2c14e" />
      {/* Obraz */}
      <rect x="160" y="380" width="220" height="160" rx="6" fill="#7a4a2e" />
      <rect x="174" y="394" width="192" height="132" fill="#a6c48a" />
      <circle cx="320" cy="430" r="18" fill="#f7e08a" />
      {/* Parkiet */}
      <rect y="720" width="1600" height="180" fill="#b88a5a" />
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d={`M${i * 110 - 40} 900 l90 -180`} stroke="#a3784b" strokeWidth="4" />
      ))}
      <rect x="560" y="760" width="480" height="110" rx="12" fill="#8f2440" opacity="0.85" />
    </svg>
  );
}

/** Biuro agencji: wysokie okna kamienicy, biurko z laptopem, roślina, tablica z planem. */
export function ZagrebOfficeScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#f0eee9" />
      <rect x="120" y="100" width="300" height="520" rx="6" fill="#dcd8cf" />
      <rect x="140" y="120" width="260" height="480" fill="url(#st-sky)" />
      <Windows x={160} y={420} cols={2} rows={1} w={90} h={120} gap={40} fill="#e9e1cf" frame="#b8a98c" />
      <rect x="266" y="120" width="8" height="480" fill="#dcd8cf" />
      {/* Tablica */}
      <rect x="560" y="140" width="520" height="300" rx="10" fill="#fbfbf8" stroke="#cfcac0" strokeWidth="6" />
      <text x="590" y="196" fill="#2f6f74" fontSize="30" fontFamily="Georgia, serif">Kampanja · plan</text>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={590 + i * 160} y="230" width="140" height="80" rx="8" fill={["#f2c14e", "#9fd0e6", "#e88c8c"][i]} opacity="0.8" />
      ))}
      <path d="M590 380 q120 -60 220 -10 t240 -30" stroke="#8f2440" strokeWidth="6" fill="none" />
      {/* Biurko */}
      <rect x="380" y="600" width="980" height="30" rx="8" fill="#6d5442" />
      <rect x="420" y="630" width="24" height="200" fill="#5a4535" />
      <rect x="1296" y="630" width="24" height="200" fill="#5a4535" />
      <rect x="760" y="470" width="260" height="130" rx="8" fill="#2c2c2e" />
      <rect x="772" y="482" width="236" height="104" rx="4" fill="#7fb3d6" />
      <path d="M720 600 h340 l-20 -12 h-300z" fill="#3a3a3c" />
      <rect x="1110" y="540" width="70" height="60" rx="8" fill="#fff" />
      <path d="M1180 556 q22 4 14 24 q-6 8 -14 6" stroke="#ddd" strokeWidth="6" fill="none" />
      <rect x="500" y="560" width="160" height="40" rx="4" fill="#f4ead6" />
      {/* Roślina */}
      <rect x="1400" y="640" width="120" height="140" rx="12" fill="#c98b4b" />
      {[-50, -20, 10, 40].map((a) => (
        <path key={a} d="M1460 640 q-10 -140 30 -240 q20 120 -30 240z" fill="#4f8a4a" transform={`rotate(${a} 1460 640)`} />
      ))}
      <rect y="830" width="1600" height="70" fill="#c9c4b9" />
    </svg>
  );
}

/** Apteka: zielony krzyż, regały z lekami, lada z kasą. */
export function ZagrebPharmacyScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="#eef4f0" />
      <rect y="0" width="1600" height="100" fill="#2e7d4f" />
      <text x="800" y="68" textAnchor="middle" fill="#f3f7f2" fontSize="46" fontFamily="Georgia, serif" letterSpacing="8">LJEKARNA</text>
      <g transform="translate(1380 50)">
        <rect x="-16" y="-40" width="32" height="80" fill="#7ee08a" />
        <rect x="-40" y="-16" width="80" height="32" fill="#7ee08a" />
      </g>
      {/* Regały */}
      {[180, 340, 500].map((y) => (
        <g key={y}>
          <rect x="120" y={y} width="1360" height="16" rx="4" fill="#cfd8d2" />
          {Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={140 + i * 60} y={y - 70 + (i % 3) * 10} width="44" height={70 - (i % 3) * 10} rx="6" fill={["#ffffff", "#f6d9a8", "#cde6f5", "#f3c4c4"][i % 4]} stroke="#d6dcd8" strokeWidth="2" />
          ))}
        </g>
      ))}
      {/* Lada */}
      <rect x="200" y="600" width="1200" height="200" rx="12" fill="#f8f8f6" stroke="#d4dad6" strokeWidth="4" />
      <rect x="200" y="590" width="1200" height="24" rx="8" fill="#2e7d4f" />
      <rect x="1100" y="500" width="160" height="90" rx="10" fill="#3b3b3b" />
      <rect x="1116" y="516" width="128" height="36" rx="4" fill="#8fd18f" />
      <rect x="420" y="540" width="90" height="50" rx="6" fill="#fff" stroke="#c5ccc8" strokeWidth="3" />
      <rect x="440" y="520" width="50" height="20" rx="4" fill="#e88c8c" />
      <rect x="560" y="550" width="40" height="40" rx="20" fill="#f6d9a8" />
      <rect y="800" width="1600" height="100" fill="#d9e0db" />
    </svg>
  );
}

/** Ilica: kamienice, sklepowa witryna z kurtkami i niebieski tramwaj. */
export function ZagrebIlicaScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <rect x="0" y="80" width="560" height="640" fill="#e8d7b8" />
      <rect x="560" y="40" width="520" height="680" fill="#d9c3c9" />
      <rect x="1080" y="100" width="520" height="620" fill="#cfd9c4" />
      <Windows x={60} y={130} cols={4} rows={2} w={70} h={100} gap={56} />
      <Windows x={620} y={100} cols={4} rows={2} w={64} h={110} gap={52} fill="#f7f0f2" frame="#9c7f86" />
      <Windows x={1130} y={150} cols={4} rows={2} w={66} h={96} gap={54} fill="#f2f5ee" frame="#8a9a7c" />
      {/* Witryna sklepu */}
      <rect x="580" y="430" width="480" height="230" rx="6" fill="#2c2321" />
      <rect x="596" y="446" width="448" height="198" fill="#f4ecdf" />
      <text x="820" y="420" textAnchor="middle" fill="#8f2440" fontSize="34" fontFamily="Georgia, serif" letterSpacing="4">MODA · RASPRODAJA</text>
      {[640, 780, 920].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 470 h60 l30 30 v120 h-120 v-120z`} fill={["#1d3557", "#2b2b2b", "#8f2440"][i]} />
          <path d={`M${x + 30} 470 v150`} stroke="#e9e1d1" strokeWidth="3" />
        </g>
      ))}
      <rect x="620" y="600" width="90" height="34" rx="4" fill="#f2c14e" />
      <text x="665" y="624" textAnchor="middle" fill="#2c2321" fontSize="20" fontFamily="sans-serif" fontWeight="700">-20%</text>
      {/* Ulica z torami i tramwaj */}
      <rect y="720" width="1600" height="180" fill="#8e8a84" />
      <path d="M0 830 h1600 M0 860 h1600" stroke="#5f5b56" strokeWidth="6" />
      <path d="M0 640 h1600" stroke="#3b3b3b" strokeWidth="3" />
      <Tram x={1020} y={860} s={1} />
    </svg>
  );
}

/** Tkalčićeva: kolorowe kamienice, ogródek kawiarni, parasole, wieże katedry w tle. */
export function ZagrebCafeScene() {
  return (
    <svg {...svgProps}>
      {SKY}
      <rect width="1600" height="900" fill="url(#st-sky)" />
      <path d="M1230 300 v-200 l22 -80 l22 80 v200z M1300 300 v-200 l22 -80 l22 80 v200z" fill="#d8cfbf" />
      {[
        { x: 0, w: 380, c: "#f0c987" },
        { x: 380, w: 320, c: "#e7a597" },
        { x: 700, w: 360, c: "#a9c7b6" },
        { x: 1060, w: 540, c: "#f2e3c6" },
      ].map((b, i) => (
        <g key={b.x}>
          <rect x={b.x} y={180 + (i % 2) * 40} width={b.w} height={560} fill={b.c} />
          <path d={`M${b.x - 10} ${180 + (i % 2) * 40} l${b.w / 2 + 10} -80 l${b.w / 2 + 10} 80z`} fill="#b5523b" />
          <Windows x={b.x + 40} y={260 + (i % 2) * 40} cols={Math.floor(b.w / 110)} rows={2} w={56} h={84} gap={50} />
        </g>
      ))}
      {/* Ogródek */}
      <rect y="700" width="1600" height="200" fill="#c4b49a" />
      {[260, 760, 1260].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 760 v-200`} stroke="#5c5650" strokeWidth="8" />
          <path d={`M${x - 170} 560 q170 -90 340 0z`} fill={["#8f2440", "#2f6f74", "#8f2440"][i]} />
          <ellipse cx={x} cy="790" rx="100" ry="20" fill="#f3ead8" />
          <rect x={x - 6} y="796" width="12" height="80" fill="#5c5650" />
          <path d={`M${x - 30} 784 h26 l-4 -26 h-18z`} fill="#fff" />
          <path d={`M${x + 20} 784 h26 l-4 -26 h-18z`} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

/** Mapa Zagrzebia: Górne Miasto na wzgórzu, siatka Donjego gradu, Sawa na południu. */
export function ZagrebMap() {
  return (
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden className="map-art">
      <rect width="1000" height="700" fill="#e9e1cc" />
      {/* Medvednica i Górne Miasto */}
      <path d="M0 0 h1000 v130 q-160 40 -320 10 q-200 -40 -380 20 q-180 40 -300 0z" fill="#9fb37f" opacity="0.8" />
      <ellipse cx="560" cy="150" rx="150" ry="70" fill="#d8c79f" />
      {/* Siatka ulic Donjego gradu */}
      <g stroke="#d1c3a2" strokeWidth="8" strokeLinecap="round">
        {[260, 330, 400, 470, 540].map((y) => (
          <path key={y} d={`M200 ${y} h600`} />
        ))}
        {[260, 360, 460, 560, 660, 760].map((x) => (
          <path key={x} d={`M${x} 240 v320`} />
        ))}
      </g>
      {/* Ilica — długa oś zachód-wschód */}
      <path d="M0 280 q300 -6 600 4" stroke="#c7a46b" strokeWidth="14" fill="none" strokeLinecap="round" />
      {/* Linie tramwajowe */}
      <path d="M40 470 q240 -40 460 -20 q200 20 460 -60" stroke={ZG_TRAM} strokeWidth="5" fill="none" strokeDasharray="14 8" />
      <path d="M480 640 q20 -200 60 -380" stroke={ZG_TRAM} strokeWidth="5" fill="none" strokeDasharray="14 8" />
      {/* Zielona podkowa */}
      <path d="M420 330 h240 v200 h-240" stroke="#8fae6b" strokeWidth="18" fill="none" opacity="0.8" />
      {/* Jarun i Sawa */}
      <ellipse cx="110" cy="610" rx="110" ry="40" fill="#7fb3d6" />
      <path d="M0 660 q260 -40 520 -10 q260 30 480 -20 v70 h-1000z" fill="#7fb3d6" />
      {/* Maksimir */}
      <circle cx="880" cy="210" r="70" fill="#8fae6b" opacity="0.85" />
    </svg>
  );
}
