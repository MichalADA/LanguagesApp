import type { ReactNode } from "react";
import type { Mood } from "../types";
import { CharacterPortrait } from "./Portrait";
import { DbAgencyScene, DbBeachScene, DbFlatScene, DbPharmacyScene, DbPortScene, DbStradunScene, DbWallsScene, DubrovnikMap } from "./DubrovnikScenes";
import { ZagrebMap, ZgBoutiqueScene, ZgCafeScene, ZgClinicScene, ZgFlatScene, ZgOfficeScene, ZgPostScene, ZgUpperTownScene } from "./ZagrebScenes";
import { ApartmentScene, BakeryScene, BeachScene, CafeScene, MarketScene, PlaceholderScene, PortScene, ShopScene, SplitMap, StationScene } from "./Scenes";

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
  pekara: { kind: "svg", render: () => <BakeryScene /> },
  trznica: { kind: "svg", render: () => <MarketScene /> },
  plaza: { kind: "svg", render: () => <BeachScene /> },
  luka: { kind: "svg", render: () => <PortScene /> },
  kolodvor: { kind: "svg", render: () => <StationScene /> },
  "zg-stan": { kind: "svg", render: () => <ZgFlatScene /> },
  "zg-kafic": { kind: "svg", render: () => <ZgCafeScene /> },
  "zg-ured": { kind: "svg", render: () => <ZgOfficeScene /> },
  "zg-ambulanta": { kind: "svg", render: () => <ZgClinicScene /> },
  "zg-butik": { kind: "svg", render: () => <ZgBoutiqueScene /> },
  "zg-posta": { kind: "svg", render: () => <ZgPostScene /> },
  "zg-gornji-grad": { kind: "svg", render: () => <ZgUpperTownScene /> },
  "db-luka": { kind: "svg", render: () => <DbPortScene /> },
  "db-apartman": { kind: "svg", render: () => <DbFlatScene /> },
  "db-agencija": { kind: "svg", render: () => <DbAgencyScene /> },
  "db-ljekarna": { kind: "svg", render: () => <DbPharmacyScene /> },
  "db-zidine": { kind: "svg", render: () => <DbWallsScene /> },
  "db-stradun": { kind: "svg", render: () => <DbStradunScene /> },
  "db-banje": { kind: "svg", render: () => <DbBeachScene /> },
  placeholder: { kind: "svg", render: () => <PlaceholderScene /> },
};

export const MAPS: Record<string, ArtAsset> = {
  "split-map": { kind: "svg", render: () => <SplitMap /> },
  "zagreb-map": { kind: "svg", render: () => <ZagrebMap /> },
  "dubrovnik-map": { kind: "svg", render: () => <DubrovnikMap /> },
};

export const PORTRAITS: Record<string, PortraitAsset> = {
  marko: { kind: "svg", character: "marko" },
  ana: { kind: "svg", character: "ana" },
  ivana: { kind: "svg", character: "ivana" },
  josip: { kind: "svg", character: "josip" },
  mare: { kind: "svg", character: "mare" },
  toni: { kind: "svg", character: "toni" },
  petra: { kind: "svg", character: "petra" },
  davor: { kind: "svg", character: "davor" },
  ljubica: { kind: "svg", character: "ljubica" },
  zoran: { kind: "svg", character: "zoran" },
  babic: { kind: "svg", character: "babic" },
  lana: { kind: "svg", character: "lana" },
  dragan: { kind: "svg", character: "dragan" },
  maja: { kind: "svg", character: "maja" },
  ante: { kind: "svg", character: "ante" },
  nikola: { kind: "svg", character: "nikola" },
  vesna: { kind: "svg", character: "vesna" },
  jelena: { kind: "svg", character: "jelena" },
  ivo: { kind: "svg", character: "ivo" },
  tea: { kind: "svg", character: "tea" },
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
