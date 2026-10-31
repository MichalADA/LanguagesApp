import type { Mood } from "../types";

/**
 * Portrety postaci — własne ilustracje SVG (placeholdery produkcyjne). Jedna parametryczna
 * postać + konfiguracja per osoba; mimika zależy od nastroju wypowiedzi (neutral / happy / puzzled).
 * Docelowe grafiki podmienia się w art/registry.tsx bez zmian w scenach.
 */

export interface CharacterLook {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  /** Kształt fryzury. */
  hairStyle: "curly" | "bun" | "bob" | "short" | "long";
  outfit: string;
  outfitShade: string;
  accent: string;
  beard?: boolean;
  glasses?: boolean;
  apron?: string;
  /** Mały rekwizyt: klucze (Marko), filiżanka (Ana), plakietka (Ivana), teczka, mikrofon, bilet, torba, chorągiewka przewodnika. */
  prop?: "keys" | "cup" | "badge" | "folder" | "mic" | "ticket" | "bag" | "flag";
  /** Czapka (np. marynarska). */
  cap?: string;
}

export const LOOKS: Record<string, CharacterLook> = {
  marko: {
    skin: "#e2b48f", skinShade: "#c9946f", hair: "#3b2a22", hairShade: "#2a1d17", hairStyle: "curly",
    outfit: "#5f7a5b", outfitShade: "#4b6248", accent: "#e8d9b5", beard: true, prop: "keys",
  },
  ana: {
    skin: "#f0c7a6", skinShade: "#d9a685", hair: "#4a2c2a", hairShade: "#341d1c", hairStyle: "bun",
    outfit: "#f3ead8", outfitShade: "#dccfb6", accent: "#8f2440", apron: "#7a1f36", prop: "cup",
  },
  ivana: {
    skin: "#e9bd9a", skinShade: "#cf9c78", hair: "#9a5a3c", hairShade: "#7a442c", hairStyle: "bob",
    outfit: "#2f6f74", outfitShade: "#245a5e", accent: "#f2c14e", glasses: true, prop: "badge",
  },
  // Zagreb A2
  luka: {
    skin: "#e9c3a0", skinShade: "#cfa07c", hair: "#c9a26a", hairShade: "#a5814f", hairStyle: "short",
    outfit: "#3f5b79", outfitShade: "#324a63", accent: "#e9eef5", prop: "keys",
  },
  petra: {
    skin: "#f1cdb0", skinShade: "#d8ab8b", hair: "#2a1d17", hairShade: "#1a120e", hairStyle: "long",
    outfit: "#2c2c2e", outfitShade: "#1f1f21", accent: "#f3ead8", prop: "folder",
  },
  sanja: {
    skin: "#e7bc98", skinShade: "#cc9a76", hair: "#b8b2a8", hairShade: "#948e84", hairStyle: "bun",
    outfit: "#f7f7f4", outfitShade: "#dcdcd6", accent: "#2e7d4f", glasses: true, prop: "badge",
  },
  maja: {
    skin: "#f3d0b5", skinShade: "#dab092", hair: "#d9824a", hairShade: "#b5663a", hairStyle: "long",
    outfit: "#8f2440", outfitShade: "#741c34", accent: "#f2c14e", prop: "bag",
  },
  dario: {
    skin: "#d9a983", skinShade: "#bd8c66", hair: "#2a1d17", hairShade: "#1a120e", hairStyle: "short",
    outfit: "#7a8f5b", outfitShade: "#627349", accent: "#f3ead8", beard: true, glasses: true, prop: "cup",
  },
  // Dubrovnik B1
  mara: {
    skin: "#e6b996", skinShade: "#c99772", hair: "#d8d4cc", hairShade: "#b3aea4", hairStyle: "bun",
    outfit: "#4a3a5c", outfitShade: "#3a2d49", accent: "#e8d9b5", prop: "keys",
  },
  nikola: {
    skin: "#d8a37c", skinShade: "#bb8660", hair: "#3b2a22", hairShade: "#2a1d17", hairStyle: "curly",
    outfit: "#f3ead8", outfitShade: "#dccfb6", accent: "#1d5f7f", prop: "flag",
  },
  ante: {
    skin: "#cf9a74", skinShade: "#b27e59", hair: "#8c8680", hairShade: "#6e6862", hairStyle: "short",
    outfit: "#1d3557", outfitShade: "#152843", accent: "#f3ead8", beard: true, prop: "ticket", cap: "#1d3557",
  },
  jelena: {
    skin: "#f0c9a8", skinShade: "#d6a887", hair: "#5a3726", hairShade: "#40261a", hairStyle: "bob",
    outfit: "#e2a33a", outfitShade: "#c58a28", accent: "#2c2c2e", prop: "mic",
  },
};

function Eyes({ mood, look }: { mood: Mood; look: CharacterLook }) {
  if (mood === "happy") {
    return (
      <g stroke="#2a1d17" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M150 238 q16 -16 32 0" />
        <path d="M218 238 q16 -16 32 0" />
      </g>
    );
  }
  const r = mood === "puzzled" ? 9 : 8;
  return (
    <g>
      <ellipse cx="166" cy="236" rx="13" ry="15" fill="#fff" />
      <ellipse cx="234" cy="236" rx="13" ry="15" fill="#fff" />
      <circle cx="167" cy="238" r={r} fill={look.hairShade} />
      <circle cx="233" cy="238" r={r} fill={look.hairShade} />
      <circle cx="170" cy="234" r="3" fill="#fff" />
      <circle cx="236" cy="234" r="3" fill="#fff" />
    </g>
  );
}

function Brows({ mood, look }: { mood: Mood; look: CharacterLook }) {
  const left = mood === "puzzled" ? "M146 206 q20 -16 38 -4" : "M146 212 q20 -10 38 -2";
  const right = mood === "puzzled" ? "M216 214 q20 -2 38 4" : "M216 210 q18 -8 38 2";
  return (
    <g stroke={look.hairShade} strokeWidth="7" strokeLinecap="round" fill="none">
      <path d={left} />
      <path d={right} />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === "happy") return <path d="M170 292 q30 34 60 0 q-30 12 -60 0z" fill="#8a2c35" stroke="#6b1f28" strokeWidth="3" strokeLinejoin="round" />;
  if (mood === "puzzled") return <path d="M178 300 q10 -8 20 0 t22 0" fill="none" stroke="#6b1f28" strokeWidth="5" strokeLinecap="round" />;
  return <path d="M176 294 q24 16 48 0" fill="none" stroke="#6b1f28" strokeWidth="5" strokeLinecap="round" />;
}

function HairBack({ look }: { look: CharacterLook }) {
  if (look.hairStyle === "bun") return <circle cx="200" cy="112" r="46" fill={look.hairShade} />;
  if (look.hairStyle === "bob") return <path d="M110 200 q-6 110 34 130 l112 0 q40 -20 34 -130 q-10 -110 -90 -110 q-80 0 -90 110z" fill={look.hairShade} />;
  if (look.hairStyle === "long") return <path d="M106 210 q-14 150 20 230 l148 0 q34 -80 20 -230 q-10 -120 -94 -120 q-84 0 -94 120z" fill={look.hairShade} />;
  return null;
}

function HairFront({ look }: { look: CharacterLook }) {
  if (look.hairStyle === "curly") {
    return (
      <g fill={look.hair}>
        {[118, 146, 176, 206, 236, 264, 288].map((x, i) => (
          <circle key={x} cx={x} cy={170 - Math.sin((i / 6) * Math.PI) * 40} r="30" />
        ))}
        <circle cx="122" cy="206" r="22" />
        <circle cx="282" cy="206" r="22" />
      </g>
    );
  }
  if (look.hairStyle === "bun") {
    return <path d="M122 220 q-6 -96 78 -100 q84 4 78 100 q-24 -54 -78 -58 q-40 4 -60 30 q-10 12 -18 28z" fill={look.hair} />;
  }
  if (look.hairStyle === "short") {
    return <path d="M114 214 q-4 -100 86 -100 q90 0 86 100 q-8 -30 -24 -46 q-60 10 -124 0 q-16 16 -24 46z" fill={look.hair} />;
  }
  if (look.hairStyle === "long") {
    return <path d="M116 236 q-8 -120 84 -120 q92 0 84 120 q-20 -60 -84 -74 q-64 14 -84 74z" fill={look.hair} />;
  }
  return <path d="M116 228 q-8 -112 84 -112 q92 0 84 112 q-14 -40 -46 -58 q-34 22 -92 22 q-20 14 -30 36z" fill={look.hair} />;
}

function Cap({ look }: { look: CharacterLook }) {
  if (!look.cap) return null;
  return (
    <g>
      <path d="M112 170 q0 -80 88 -82 q88 2 88 82z" fill={look.cap} />
      <rect x="100" y="160" width="200" height="22" rx="10" fill={look.cap} />
      <rect x="100" y="160" width="200" height="8" rx="4" fill="#f3ead8" opacity="0.8" />
      <path d="M100 176 q-20 10 -30 26 h70z" fill="#1a1a1a" />
    </g>
  );
}

function Prop({ look }: { look: CharacterLook }) {
  if (look.prop === "keys") {
    return (
      <g transform="translate(276 430)">
        <path d="M0 0 q-8 -26 6 -40" stroke="#c9a227" strokeWidth="4" fill="none" />
        <circle cx="6" cy="-46" r="9" fill="none" stroke="#c9a227" strokeWidth="4" />
        <rect x="-4" y="0" width="10" height="34" rx="3" fill="#d8b23a" />
        <rect x="6" y="20" width="9" height="5" fill="#d8b23a" />
        <rect x="6" y="28" width="6" height="4" fill="#d8b23a" />
      </g>
    );
  }
  if (look.prop === "cup") {
    return (
      <g transform="translate(262 438)">
        <path d="M0 0 h44 l-6 34 h-32z" fill="#fff" stroke="#d9cbb3" strokeWidth="3" />
        <path d="M44 8 q16 2 10 16 q-4 6 -12 4" fill="none" stroke="#d9cbb3" strokeWidth="4" />
        <path d="M14 -10 q-6 -10 2 -18 M28 -10 q-6 -10 2 -18" stroke="#c8b8a0" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (look.prop === "badge") {
    return (
      <g transform="translate(246 426)">
        <rect width="58" height="26" rx="5" fill="#fff" stroke={look.accent} strokeWidth="3" />
        <rect x="8" y="9" width="42" height="4" rx="2" fill="#2f6f74" />
        <rect x="8" y="16" width="26" height="3" rx="1.5" fill="#9bb7b8" />
      </g>
    );
  }
  if (look.prop === "folder") {
    return (
      <g transform="translate(236 412)">
        <rect width="78" height="96" rx="5" fill="#f2c14e" />
        <rect x="8" y="10" width="62" height="8" rx="3" fill="#fff" opacity="0.7" />
        <rect x="8" y="24" width="44" height="6" rx="3" fill="#fff" opacity="0.6" />
      </g>
    );
  }
  if (look.prop === "mic") {
    return (
      <g transform="translate(272 404)">
        <rect x="-6" y="34" width="14" height="70" rx="6" fill="#2c2c2e" />
        <circle cx="1" cy="22" r="20" fill="#5c5c60" />
        <rect x="-16" y="40" width="34" height="18" rx="3" fill="#8f2440" />
      </g>
    );
  }
  if (look.prop === "ticket") {
    return (
      <g transform="translate(240 432) rotate(-8)">
        <rect width="78" height="38" rx="5" fill="#f6efe0" stroke="#1d5f7f" strokeWidth="3" />
        <path d="M56 4 v30" stroke="#1d5f7f" strokeWidth="2" strokeDasharray="4 3" />
        <rect x="8" y="10" width="40" height="5" rx="2" fill="#1d5f7f" />
        <rect x="8" y="21" width="28" height="4" rx="2" fill="#9bb7b8" />
      </g>
    );
  }
  if (look.prop === "bag") {
    return (
      <g transform="translate(250 420)">
        <path d="M14 18 q0 -26 22 -26 q22 0 22 26" fill="none" stroke="#2c2321" strokeWidth="5" />
        <rect y="16" width="72" height="80" rx="6" fill="#f3ead8" />
        <rect x="10" y="40" width="52" height="10" rx="3" fill="#8f2440" />
      </g>
    );
  }
  if (look.prop === "flag") {
    return (
      <g transform="translate(300 300)">
        <path d="M0 220 v-210" stroke="#5c5650" strokeWidth="6" />
        <path d="M2 10 h58 l-12 18 l12 18 h-58z" fill={look.accent} />
      </g>
    );
  }
  return null;
}

/** Portret postaci (popiersie). `mood` zmienia mimikę — postać reaguje na odpowiedzi gracza. */
export function CharacterPortrait({ id, mood = "neutral", title }: { id: string; mood?: Mood; title?: string }) {
  const look = LOOKS[id];
  if (!look) return null;
  return (
    <svg viewBox="0 0 400 520" className={`portrait mood-${mood}`} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <HairBack look={look} />
      {/* Tułów */}
      <path d="M40 520 q10 -120 100 -150 l120 0 q90 30 100 150z" fill={look.outfit} />
      <path d="M140 370 l60 52 l60 -52" fill="none" stroke={look.outfitShade} strokeWidth="10" strokeLinejoin="round" />
      {look.apron && <path d="M118 400 h164 l14 120 h-192z" fill={look.apron} />}
      {look.apron && <path d="M140 380 q60 30 120 0" fill="none" stroke={look.apron} strokeWidth="8" />}
      {/* Szyja i głowa */}
      <rect x="170" y="318" width="60" height="64" rx="24" fill={look.skinShade} />
      <ellipse cx="116" cy="248" rx="18" ry="26" fill={look.skinShade} />
      <ellipse cx="284" cy="248" rx="18" ry="26" fill={look.skinShade} />
      <ellipse cx="200" cy="236" rx="88" ry="104" fill={look.skin} />
      {look.beard && <path d="M118 250 q4 112 82 112 q78 0 82 -112 q-16 54 -82 56 q-66 -2 -82 -56z" fill={look.hair} opacity="0.9" />}
      <ellipse cx="148" cy="272" rx="18" ry="10" fill="#e88c8c" opacity="0.28" />
      <ellipse cx="252" cy="272" rx="18" ry="10" fill="#e88c8c" opacity="0.28" />
      <Brows mood={mood} look={look} />
      <Eyes mood={mood} look={look} />
      {look.glasses && (
        <g fill="none" stroke="#2a2a2a" strokeWidth="5">
          <circle cx="166" cy="238" r="26" />
          <circle cx="234" cy="238" r="26" />
          <path d="M192 236 h16" />
        </g>
      )}
      <path d="M200 246 q-8 26 2 30" fill="none" stroke={look.skinShade} strokeWidth="5" strokeLinecap="round" />
      <Mouth mood={mood} />
      <HairFront look={look} />
      <Cap look={look} />
      <Prop look={look} />
    </svg>
  );
}
