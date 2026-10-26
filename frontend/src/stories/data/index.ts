import type { StoryEntry } from "../types";

/**
 * Miasta Lexodromia Stories. Każdy poziom CEFR to osobne miasto; grywalne ładują
 * swoje dane leniwie. Nowe miasto = katalog z danymi + wpis tutaj (silnik bez zmian).
 */
export const STORIES: StoryEntry[] = [
  {
    id: "split-a1",
    city: { hr: "Split", pl: "Split" },
    level: "A1",
    tagline: "Pierwsze dni w Dalmacji: meldunek, kawa na nabrzeżu i zakupy za rogiem.",
    courseId: "pl-hr",
    load: () => import("./split-a1/story").then((m) => m.SPLIT_A1),
    loadAudio: () => import("./split-a1/audio").then((m) => m.SPLIT_A1_AUDIO),
  },
  { id: "zagreb-a2", city: { hr: "Zagreb", pl: "Zagrzeb" }, level: "A2", tagline: "Stolica, tramwaje i pierwsza praca.", courseId: "pl-hr" },
  { id: "dubrovnik-b1", city: { hr: "Dubrovnik", pl: "Dubrownik" }, level: "B1", tagline: "Mury, turyści i rozmowy o wszystkim.", courseId: "pl-hr" },
];

export const findStoryEntry = (id: string | undefined) => STORIES.find((s) => s.id === id);
