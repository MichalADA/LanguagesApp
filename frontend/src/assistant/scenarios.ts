import type { Scenario } from "./types";

/** Scenki z życia, jak w lekcjach kursu. Pierwsze kwestie sprawdzone ręcznie (standardowy chorwacki). */
export const SCENARIOS: Scenario[] = [
  {
    id: "free",
    brief: "A relaxed chat between friends about everyday life. Use informal 'ti'.",
    opener: { hr: "Bok! Kako si danas? Što ima novo?", pl: "Cześć! Jak się dziś masz? Co nowego?" },
  },
  {
    id: "about-me",
    brief: "You are Ana, meeting the learner for the first time. Ask about name, origin, age, family and work. Use informal 'ti'.",
    opener: { hr: "Bok! Ja sam Ana. Kako se ti zoveš i odakle si?", pl: "Cześć! Jestem Ana. Jak masz na imię i skąd jesteś?" },
  },
  {
    id: "cafe",
    brief: "You are a waiter in a café on the Riva in Split; the learner is a guest ordering drinks and snacks and paying. Use polite 'Vi'.",
    opener: { hr: "Dobar dan! Izvolite, što želite popiti?", pl: "Dzień dobry! Słucham, czego się Pan/Pani napije?" },
  },
  {
    id: "market",
    brief: "You sell fruit and vegetables at a market in Zagreb; the learner is buying. Talk about prices, quantities and what is fresh. Use polite 'Vi'.",
    opener: { hr: "Dobar dan! Izvolite, sve je svježe. Što trebate?", pl: "Dzień dobry! Proszę, wszystko jest świeże. Czego Pan/Pani potrzebuje?" },
  },
  {
    id: "directions",
    brief: "You are a local in Zagreb; the learner is a tourist asking for directions (station, museum, square, pharmacy). Use polite 'Vi'.",
    opener: { hr: "Dobar dan! Mogu li Vam pomoći? Tražite nešto?", pl: "Dzień dobry! Mogę w czymś pomóc? Szuka Pan/Pani czegoś?" },
  },
  {
    id: "weekend",
    brief: "A friend asks about the learner's last weekend and plans for the next one (past and future tense). Use informal 'ti'.",
    opener: { hr: "Bok! Kako ti je prošao vikend?", pl: "Cześć! Jak ci minął weekend?" },
  },
];

export const findScenario = (id: string) => SCENARIOS.find((item) => item.id === id) ?? SCENARIOS[0];
