import type { ReactNode } from "react";
import type { Mood } from "../types";
import { CharacterPortrait } from "./Portrait";
import { ApartmentScene, CafeScene, PlaceholderScene, ShopScene, SplitMap } from "./Scenes";

/**
 * Rejestr grafik Stories — jedyne miejsce, które wie, czym jest tło, portret czy mapa.
 * Dane (story.ts) odwołują się do id. Podmiana placeholdera na docelową ilustrację:
 *   apartman: { kind: "image", src: "/stories/split/apartman.webp", alt: "…" }
 * (plik w public/stories/…). Portret jako obraz dostaje osobne pliki per nastrój.
 */
export type ArtAsset = { kind: "svg"; render: () => ReactNode } | { kind: "image"; src: string; alt: string };
export type PortraitAsset = { kind: "svg"; character: string } | { kind: "image"; src: Partial<Record<Mood, string>> & { neutral: string }; alt: string };

export const BACKGROUNDS: Record<string, ArtAsset> = {
  apartman: { kind: "svg", render: () => <ApartmentScene /> },
  kafic: { kind: "svg", render: () => <CafeScene /> },
  trgovina: { kind: "svg", render: () => <ShopScene /> },
  placeholder: { kind: "svg", render: () => <PlaceholderScene /> },
};

export const MAPS: Record<string, ArtAsset> = {
  "split-map": { kind: "svg", render: () => <SplitMap /> },
};

export const PORTRAITS: Record<string, PortraitAsset> = {
  marko: { kind: "svg", character: "marko" },
  ana: { kind: "svg", character: "ana" },
  ivana: { kind: "svg", character: "ivana" },
};

/** Tło albo mapa — z bezpiecznym zastępnikiem, gdy id nie ma w rejestrze. */
export function Art({ id, registry = BACKGROUNDS }: { id: string; registry?: Record<string, ArtAsset> }) {
  const asset = registry[id] ?? BACKGROUNDS.placeholder;
  if (asset.kind === "image") return <img className="scene-art" src={asset.src} alt="" />;
  return <>{asset.render()}</>;
}

export function Portrait({ id, mood = "neutral", title }: { id: string; mood?: Mood; title?: string }) {
  const asset = PORTRAITS[id];
  if (!asset) return null;
  if (asset.kind === "image") return <img className="portrait" src={asset.src[mood] ?? asset.src.neutral} alt={title ?? asset.alt} />;
  return <CharacterPortrait id={asset.character} mood={mood} title={title} />;
}
