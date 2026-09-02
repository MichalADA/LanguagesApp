import type { ComponentType } from "react";
import { BuraGame } from "./bura/BuraGame";
import { TrasaGame } from "./trasa/TrasaGame";
import { OdmianaGame } from "./odmiana/OdmianaGame";

export interface GameModule {
  id: string;
  /** Nazwa własna gry — świadomie nie tłumaczona. */
  name: string;
  /** Klucze i18n opisów. */
  taglineKey: string;
  descriptionKey: string;
  status: "active" | "soon";
  component?: ComponentType;
  /** Czy gra wymaga, żeby kurs miał zdefiniowaną trasę. */
  requiresRoute?: boolean;
}

/**
 * ⬇ NOWĄ GRĘ DODAJESZ TUTAJ.
 * 1. `src/games/<id>/<Nazwa>Game.tsx` — komponent bez propsów.
 * 2. Pulę słów bierz z `useWordPool`, walidację z `checkAnswer`,
 *    zapis z `useProgress().recordRound`.
 * 3. Dopisz wpis poniżej ze statusem "active".
 * Routing, kafelek i rekordy w statystykach pojawią się same.
 */
export const GAMES: GameModule[] = [
  {
    id: "bura",
    name: "Bura",
    taglineKey: "gameList.bura.tagline",
    descriptionKey: "gameList.bura.description",
    status: "active",
    component: BuraGame,
  },
  {
    id: "trasa",
    name: "Trasa",
    taglineKey: "gameList.trasa.tagline",
    descriptionKey: "gameList.trasa.description",
    status: "active",
    component: TrasaGame,
    requiresRoute: true,
  },
  {
    id: "odmiana",
    name: "Odmiana",
    taglineKey: "gameList.odmiana.tagline",
    descriptionKey: "gameList.odmiana.description",
    status: "active",
    component: OdmianaGame,
  },
  {
    id: "flashcards",
    name: "Fiszki",
    taglineKey: "gameList.flashcards.tagline",
    descriptionKey: "gameList.flashcards.description",
    status: "soon",
  },
  {
    id: "multiple-choice",
    name: "Cztery odpowiedzi",
    taglineKey: "gameList.choice.tagline",
    descriptionKey: "gameList.choice.description",
    status: "soon",
  },
  {
    id: "listening",
    name: "Listening",
    taglineKey: "gameList.listening.tagline",
    descriptionKey: "gameList.listening.description",
    status: "soon",
  },
  {
    id: "false-friends",
    name: "False Friends",
    taglineKey: "gameList.falseFriends.tagline",
    descriptionKey: "gameList.falseFriends.description",
    status: "soon",
  },
];

export function findGame(id: string | undefined): GameModule | undefined {
  return GAMES.find((g) => g.id === id);
}
