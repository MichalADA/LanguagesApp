import { createElement, type ComponentType } from "react";
import { BuraGame } from "./bura/BuraGame";
import { TrasaGame } from "./trasa/TrasaGame";
import { OdmianaGame } from "./odmiana/OdmianaGame";
import { QuickGame } from "@/quick-games/QuickGame";
import { QUICK_GAME_IDS } from "@/quick-games/helpers";

export const GAME_CATEGORIES = ["main", "quick", "grammar", "sentences", "listening", "radio"] as const;
export interface GameModule {
  id: string;
  nameKey: string;
  taglineKey: string;
  descriptionKey: string;
  category: (typeof GAME_CATEGORIES)[number];
  status: "active" | "soon";
  component?: ComponentType;
  href?: string;
  requiresRoute?: boolean;
}
const existing = (id: string, category: GameModule["category"], component: ComponentType): GameModule => ({
  id, category, component, nameKey: `gameNames.${id}`, taglineKey: `gameList.${id}.tagline`, descriptionKey: `gameList.${id}.description`, status: "active",
});
const planned = (id: string, category: GameModule["category"]): GameModule => ({
  id, category, nameKey: `gameNames.${id}`, taglineKey: `plannedGames.${id}`, descriptionKey: `plannedGames.${id}`, status: "soon",
});

/** Single registry drives category cards and the existing /gry/:gameId router. */
export const GAMES: GameModule[] = [
  existing("bura", "quick", BuraGame),
  { ...existing("trasa", "main", TrasaGame), requiresRoute: true },
  existing("odmiana", "grammar", OdmianaGame),
  { id: "flashcards", category: "main", nameKey: "gameNames.flashcards", taglineKey: "gameList.flashcards.tagline", descriptionKey: "gameList.flashcards.description", status: "active", href: "/fiszki" },
  ...QUICK_GAME_IDS.map((mode): GameModule => ({
    id: mode, category: "quick", nameKey: `gameNames.${mode}`, taglineKey: `quickDescriptions.${mode}`, descriptionKey: `quickDescriptions.${mode}`, status: "active",
    component: () => createElement(QuickGame, { mode }),
  })),
  ...["translate-sentence", "order-sentence", "fill-gap", "correct-sentence", "transform-sentence"].map((id) => planned(id, "sentences")),
  planned("listening", "listening"),
  planned("radio", "radio"),
  planned("false-friends", "quick"),
];
export function findGame(id: string | undefined): GameModule | undefined {
  return GAMES.find((game) => game.id === id);
}
