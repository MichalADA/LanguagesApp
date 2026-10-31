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
  hairStyle: "curly" | "bun" | "bob" | "short";
  outfit: string;
  outfitShade: string;
  accent: string;
  beard?: boolean;
  glasses?: boolean;
  apron?: string;
  /** Mały rekwizyt: klucze (Marko), filiżanka (Ana), plakietka (Ivana), bochenek, koszyk, bilet, okulary przeciwsłoneczne. */
  prop?: "keys" | "cup" | "badge" | "bread" | "basket" | "ticket";
  /** Okulary przeciwsłoneczne zamiast oczu w neutralnym nastroju (Toni). */
  sunglasses?: boolean;
  /** Czapka piekarza. */
  bakerHat?: boolean;
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
  josip: {
    skin: "#e6b38e", skinShade: "#c9916c", hair: "#9a9a96", hairShade: "#6f6f6b", hairStyle: "short",
    outfit: "#f6f1e6", outfitShade: "#dcd3c0", accent: "#c98b4b", beard: true, apron: "#e9dfc9", bakerHat: true, prop: "bread",
  },
  mare: {
    skin: "#e8b995", skinShade: "#cc9872", hair: "#cfcac2", hairShade: "#a8a29a", hairStyle: "bun",
    outfit: "#3f5f8f", outfitShade: "#324c73", accent: "#d9534f", apron: "#c7d8c0", prop: "basket",
  },
  toni: {
    skin: "#c98f62", skinShade: "#a8714a", hair: "#1f1a17", hairShade: "#141110", hairStyle: "short",
    outfit: "#e8c547", outfitShade: "#c9a72f", accent: "#2f8fb1", sunglasses: true,
  },
  petra: {
    skin: "#f2cdb0", skinShade: "#d9ab8b", hair: "#2b2b33", hairShade: "#1c1c22", hairStyle: "curly",
    outfit: "#1f4e79", outfitShade: "#173c5e", accent: "#f3ead8", prop: "ticket",
  },
  davor: {
    skin: "#dcae8a", skinShade: "#bf8f6b", hair: "#5a4636", hairShade: "#3f3126", hairStyle: "short",
    outfit: "#8f2440", outfitShade: "#721c33", accent: "#f2c14e", glasses: true, prop: "badge",
  },
};

function Eyes({ mood, look }: { mood: Mood; look: CharacterLook }) {
  if (look.sunglasses && mood !== "puzzled") {
    return (
      <g>
        <rect x="138" y="218" width="58" height="38" rx="14" fill="#1d2b33" />
        <rect x="204" y="218" width="58" height="38" rx="14" fill="#1d2b33" />
        <path d="M196 232 h8" stroke="#1d2b33" strokeWidth="6" />
        <path d="M150 226 l14 0" stroke="#5f7f8f" strokeWidth="4" strokeLinecap="round" />
        <path d="M216 226 l14 0" stroke="#5f7f8f" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
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
    return <path d="M116 214 q-6 -96 84 -100 q90 4 84 100 q-8 -30 -30 -44 q-50 14 -108 2 q-22 14 -30 42z" fill={look.hair} />;
  }
  return <path d="M116 228 q-8 -112 84 -112 q92 0 84 112 q-14 -40 -46 -58 q-34 22 -92 22 q-20 14 -30 36z" fill={look.hair} />;
}

function BakerHat() {
  return (
    <g>
      <rect x="130" y="112" width="140" height="44" rx="10" fill="#fbf8f1" stroke="#e2dacb" strokeWidth="4" />
      <circle cx="150" cy="96" r="34" fill="#fbf8f1" />
      <circle cx="200" cy="80" r="40" fill="#fbf8f1" />
      <circle cx="250" cy="96" r="34" fill="#fbf8f1" />
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
  if (look.prop === "bread") {
    return (
      <g transform="translate(244 432)">
        <ellipse cx="34" cy="20" rx="44" ry="22" fill="#c98b4b" />
        <path d="M8 14 q8 -8 14 4 M28 8 q8 -8 14 4 M48 10 q8 -8 14 4" stroke="#9a6532" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (look.prop === "basket") {
    return (
      <g transform="translate(244 432)">
        <path d="M6 18 q30 -46 60 0" fill="none" stroke="#8a6a46" strokeWidth="6" />
        <circle cx="22" cy="18" r="12" fill="#d9534f" />
        <circle cx="42" cy="14" r="12" fill="#7fb069" />
        <circle cx="56" cy="22" r="10" fill="#e8c547" />
        <path d="M0 20 h72 l-8 34 h-56z" fill="#b98a5e" stroke="#8a6a46" strokeWidth="3" />
      </g>
    );
  }
  if (look.prop === "ticket") {
    return (
      <g transform="translate(250 432) rotate(-8)">
        <rect width="70" height="34" rx="4" fill="#f3ead8" stroke="#2f8fb1" strokeWidth="3" />
        <path d="M50 0 v34" stroke="#2f8fb1" strokeWidth="2" strokeDasharray="4 3" />
        <rect x="8" y="10" width="34" height="4" rx="2" fill="#1f4e79" />
        <rect x="8" y="18" width="22" height="3" rx="1.5" fill="#9bb7c8" />
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
      {look.bakerHat && <BakerHat />}
      <Prop look={look} />
    </svg>
  );
}
