import type { Course } from "./types";

/**
 * Kurs demonstracyjny: polski → chorwacki.
 *
 * ⬇ NOWY KURS DODAJESZ TUTAJ.
 * 1. Wrzuć dataset do `public/data/<plik>.csv`.
 * 2. Dopisz obiekt Course z mapowaniem kolumn i regułami walidacji.
 * 3. Ustaw status na "available".
 * Żaden komponent nie wymaga zmian — gry czytają aktywny kurs z kontekstu.
 */
export const COURSE_PL_HR: Course = {
  id: "pl-hr",
  sourceLanguage: "pl",
  targetLanguage: "hr",
  name: { pl: "Chorwacki", en: "Croatian" },
  nativeName: "Hrvatski",
  sourceName: { pl: "polskiego", en: "Polish" },
  targetName: { pl: "chorwacku", en: "Croatian" },
  flag: "🇭🇷",
  writingSystem: "latin",
  specialCharacters: ["č", "ć", "đ", "š", "ž"],
  validation: {
    caseInsensitive: true,
    trimWhitespace: true,
    diacriticsMatter: true,
    foldMap: { č: "c", ć: "c", š: "s", ž: "z", đ: "d" },
  },
  dataset: {
    url: "data/chorwacki_2000_PL-HR.csv",
    format: "csv-semicolon",
    columns: {
      rank: "Rank",
      source: "Polish",
      target: "Croatian",
      partOfSpeech: "PartOfSpeech",
      grammar: "Grammar",
      exampleTarget: "ExampleCroatian",
      exampleSource: "ExamplePolish",
      falseFriend: "FalseFriend",
      falseFriendNote: "FalseFriendNote",
      tags: "Tags",
    },
    blockTagPattern: "^HR_\\d{4}_\\d{4}$",
  },
  grammar: {
    url: "data/chorwacki_czasowniki_PL-HR.csv",
    format: "csv-semicolon",
    columns: {
      rank: "Rank",
      infinitive: "Infinitive",
      translation: "Polish",
      persons: {
        ja: "Ja",
        ti: "Ti",
        on: "OnOnaOno",
        mi: "Mi",
        vi: "Vi",
        oni: "OniOneOna",
      },
      exampleTarget: "ExampleCroatian",
      exampleSource: "ExamplePolish",
      type: "Type",
      note: "Note",
      tags: "Tags",
    },
    coreTag: "core",
  },
  blocks: [
    { id: "HR_0001_0500", range: "1–500" },
    { id: "HR_0501_1000", range: "501–1000" },
    { id: "HR_1001_1500", range: "1001–1500" },
    { id: "HR_1501_2000", range: "1501–2000" },
    { id: "HR_2001_2500", range: "2001–2500" },
    { id: "HR_2501_3000", range: "2501–3000" },
  ],
  routes: [
    {
      id: "jadran",
      name: { pl: "Z Zagrzebia nad Adriatyk", en: "From Zagreb to the Adriatic" },
      answersPerLeg: 10,
      stops: [
        { id: "zagreb", name: "Zagreb", x: 46, y: 26 },
        { id: "karlovac", name: "Karlovac", x: 62, y: 52 },
        { id: "plitvice", name: "Plitvice", x: 88, y: 76 },
        { id: "zadar", name: "Zadar", x: 116, y: 102 },
        { id: "sibenik", name: "Šibenik", x: 150, y: 122 },
        { id: "split", name: "Split", x: 186, y: 140 },
        { id: "makarska", name: "Makarska", x: 222, y: 154 },
        { id: "dubrovnik", name: "Dubrovnik", x: 276, y: 176 },
      ],
    },
  ],
  status: "available",
};

/**
 * Kursy zapowiedziane. Nie mają datasetu i nie da się ich wybrać —
 * są tu wyłącznie po to, żeby ekran „Moje języki" mówił prawdę o planach.
 */
export const PLANNED_COURSES: Pick<Course, "id" | "name" | "flag" | "nativeName">[] = [
  { id: "en-pl", name: { pl: "Polski dla anglojęzycznych", en: "Polish" }, flag: "🇵🇱", nativeName: "Polski" },
  { id: "pl-sr", name: { pl: "Serbski", en: "Serbian" }, flag: "🇷🇸", nativeName: "Српски / Srpski" },
  { id: "pl-cs", name: { pl: "Czeski", en: "Czech" }, flag: "🇨🇿", nativeName: "Čeština" },
];

export const COURSES: Course[] = [COURSE_PL_HR];

export const DEFAULT_COURSE_ID = COURSE_PL_HR.id;

export function findCourse(id: string | undefined): Course | undefined {
  return COURSES.find((c) => c.id === id);
}
