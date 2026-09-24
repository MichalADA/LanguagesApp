import type { CourseLesson, CourseModule, CourseOutline, StoredLessonStatus } from "../types";

/**
 * MOCK: plan poziomu A1 kursu polski → chorwacki (8 modułów × 5 lekcji).
 *
 * `status` symuluje stan konta testowego (12 / 40 ukończonych), żeby dało się
 * obejrzeć wszystkie stany UI. Postęp zapisany lokalnie przez użytkownika
 * ma pierwszeństwo — patrz CurriculumProvider.
 * Pełną treść ma tylko lekcja demonstracyjna a1-01-02 („Skąd jesteś?”).
 */

type LessonSeed = [title: string, shortDescription: string, estimatedMinutes: number];

interface ModuleSeed {
  title: string;
  description: string;
  canDo: string[];
  lessons: LessonSeed[];
}

const MODULES: ModuleSeed[] = [
  {
    title: "Pierwsze kroki",
    description: "Nauczysz się podstawowych zwrotów potrzebnych do rozpoczęcia rozmowy po chorwacku.",
    canDo: ["przywitać się i pożegnać", "przedstawić się", "powiedzieć, skąd jesteś", "zadać proste pytanie"],
    lessons: [
      ["Pozdrowienia i przedstawianie się", "Bok, dobar dan i jak podać swoje imię.", 10],
      ["Skąd jesteś?", "Powiesz, skąd jesteś i gdzie mieszkasz, i zapytasz o to rozmówcę.", 12],
      ["Liczby i wiek", "Liczby od 0 do 20 i pytanie o wiek.", 11],
      ["Podstawowe pytania", "Tko, što, gdje, kada — pytania, które otwierają rozmowę.", 10],
      ["Powtórka modułu", "Krótka rozmowa, w której użyjesz wszystkiego z modułu.", 12],
    ],
  },
  {
    title: "Codzienne życie",
    description: "Opowiesz o swoim dniu, pracy i domu prostymi zdaniami w czasie teraźniejszym.",
    canDo: ["opisać swój dzień", "powiedzieć, czym się zajmujesz", "podać godzinę", "opisać mieszkanie"],
    lessons: [
      ["Mój dzień", "Czasowniki codziennych czynności w czasie teraźniejszym.", 12],
      ["Która godzina?", "Godziny, pory dnia i umawianie się na konkretną porę.", 10],
      ["Praca i nauka", "Zawody i pytanie „Czym się zajmujesz?”.", 11],
      ["Dom i mieszkanie", "Pokoje, meble i opis miejsca, w którym mieszkasz.", 12],
      ["Powtórka modułu", "Opowiedz o swoim zwykłym dniu od rana do wieczora.", 12],
    ],
  },
  {
    title: "Jedzenie i restauracja",
    description: "Zamówisz jedzenie i napoje, zapytasz o cenę i poprosisz o rachunek.",
    canDo: ["zrobić proste zakupy spożywcze", "zamówić w kawiarni i restauracji", "zapytać o cenę", "poprosić o rachunek"],
    lessons: [
      ["Na targu", "Owoce, warzywa i ilości: kilo, pola kile, komad.", 11],
      ["Co lubisz jeść?", "Volim / ne volim i rozmowa o ulubionych potrawach.", 10],
      ["W kawiarni", "Nauczysz się zamawiać jedzenie i napoje.", 12],
      ["W restauracji", "Menu, zamówienie dania i prośba o polecenie.", 13],
      ["Powtórka modułu", "Scenka: od wejścia do restauracji po rachunek.", 12],
    ],
  },
  {
    title: "Miasto i poruszanie się",
    description: "Zapytasz o drogę, kupisz bilet i opiszesz, gdzie coś się znajduje.",
    canDo: ["zapytać o drogę", "zrozumieć proste wskazówki", "kupić bilet", "opisać położenie"],
    lessons: [
      ["W mieście", "Nazwy miejsc: dworzec, poczta, apteka, plac.", 10],
      ["Jak dojść do…?", "Prosto, w lewo, w prawo — pytanie o drogę.", 12],
      ["Transport publiczny", "Autobus, tramwaj i kupowanie biletu.", 11],
      ["Gdzie to jest?", "Przyimki miejsca: pored, iza, ispred, između.", 12],
      ["Powtórka modułu", "Znajdź drogę z dworca do hotelu.", 12],
    ],
  },
  {
    title: "Ludzie i rodzina",
    description: "Opiszesz rodzinę i przyjaciół: wygląd, charakter i relacje.",
    canDo: ["przedstawić rodzinę", "opisać wygląd osoby", "powiedzieć, jaki ktoś jest", "mówić o innych w 3. osobie"],
    lessons: [
      ["Moja rodzina", "Członkowie rodziny i zaimki dzierżawcze.", 11],
      ["Jak wygląda?", "Wygląd: wysoki, niski, włosy, oczy.", 10],
      ["Jaki jest?", "Cechy charakteru i zgodność przymiotnika z rzeczownikiem.", 12],
      ["Przyjaciele", "Mówienie o innych osobach i ich zajęciach.", 11],
      ["Powtórka modułu", "Opisz bliską osobę w kilku zdaniach.", 12],
    ],
  },
  {
    title: "Czas wolny",
    description: "Porozmawiasz o hobby, sporcie i planach na weekend.",
    canDo: ["opowiedzieć o zainteresowaniach", "zaproponować wspólne wyjście", "przyjąć lub odrzucić zaproszenie", "mówić o planach"],
    lessons: [
      ["Hobby", "Co robisz w wolnym czasie i jak często.", 10],
      ["Sport i ruch", "Igrati, trčati, plivati — sport w rozmowie.", 11],
      ["Umawiamy się", "Propozycja, zgoda i odmowa.", 12],
      ["Plany na weekend", "Czas przyszły z htjeti do mówienia o planach.", 12],
      ["Powtórka modułu", "Zaplanuj z kimś weekend w Zagrzebiu.", 12],
    ],
  },
  {
    title: "Podróże",
    description: "Zarezerwujesz nocleg, opowiesz o podróży i poradzisz sobie w prostych sytuacjach.",
    canDo: ["zarezerwować pokój", "mówić o pogodzie", "opowiedzieć o minionej podróży", "poprosić o pomoc"],
    lessons: [
      ["Na wakacjach", "Morze, plaża, wyspa — słownictwo wyjazdu.", 10],
      ["W hotelu", "Rezerwacja, zameldowanie i pytania o pokój.", 12],
      ["Pogoda", "Kakvo je vrijeme? i opis pogody.", 10],
      ["Byłem, widziałem", "Czas przeszły w krótkiej relacji z podróży.", 13],
      ["Powtórka modułu", "Opowiedz o swojej ostatniej podróży.", 12],
    ],
  },
  {
    title: "Powtórka A1",
    description: "Połączysz wszystko z poziomu A1 w dłuższych, samodzielnych wypowiedziach.",
    canDo: ["prowadzić prostą rozmowę na znane tematy", "napisać krótką wiadomość", "zrozumieć krótkie teksty", "przejść na poziom A2"],
    lessons: [
      ["Rozmowa zapoznawcza", "Pełna rozmowa: kim jesteś, skąd, czym się zajmujesz.", 12],
      ["Na mieście", "Zakupy, kawiarnia i droga w jednej scence.", 13],
      ["Wiadomość do przyjaciela", "Napisz krótką wiadomość o swoim tygodniu.", 12],
      ["Czytanie ze zrozumieniem", "Krótkie teksty i pytania do nich.", 11],
      ["Test końcowy A1", "Sprawdź, czy jesteś gotowy na A2.", 15],
    ],
  },
];

/** Ile lekcji konto testowe ma już za sobą (w kolejności kursu). */
const MOCK_COMPLETED_COUNT = 12;

/** Lekcje z pełną treścią w repozytorium. */
export const LESSONS_WITH_CONTENT = new Set(["a1-01-02"]);

const pad = (n: number) => String(n).padStart(2, "0");

function buildModules(): CourseModule[] {
  let index = 0;
  return MODULES.map((seed, m) => {
    const moduleId = `a1-${pad(m + 1)}`;
    const lessons: CourseLesson[] = seed.lessons.map(([title, shortDescription, estimatedMinutes], l) => {
      const id = `${moduleId}-${pad(l + 1)}`;
      const status: StoredLessonStatus = index++ < MOCK_COMPLETED_COUNT ? "completed" : "not_started";
      return {
        id,
        moduleId,
        order: l + 1,
        title,
        shortDescription,
        estimatedMinutes,
        status,
        hasContent: LESSONS_WITH_CONTENT.has(id),
      };
    });
    return {
      id: moduleId,
      levelId: "A1",
      order: m + 1,
      title: seed.title,
      description: seed.description,
      canDo: seed.canDo,
      lessons,
    };
  });
}

export const PL_HR_OUTLINE: CourseOutline = {
  courseId: "pl-hr",
  levels: [
    { id: "A1", title: "Podstawy", available: true, modules: buildModules() },
    { id: "A2", title: "Codzienna komunikacja", available: false, modules: [] },
    { id: "B1", title: "Samodzielna komunikacja", available: false, modules: [] },
    { id: "B2", title: "Swobodna komunikacja", available: false, modules: [] },
  ],
};
