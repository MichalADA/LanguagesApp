import type { Story } from "../../types";
import { ZAGREB_MISSIONS } from "./missions";

/** Zagreb — miasto poziomu A2. */
export const ZAGREB_A2: Story = {
  id: "zagreb-a2",
  courseId: "pl-hr",
  level: "A2",
  city: { hr: "Zagreb", pl: "Zagrzeb" },
  tagline: "Stolica, tramwaje i pierwsza praca: mieszkanie, rozmowa o pracę, apteka i kawa na Tkalčićevej.",
  map: "zagreb-map",
  languageReview: "unverified",
  narratorVoice: { gender: "male", pitch: "-8Hz", rate: "-14%" },
  npcs: [
    { id: "luka", name: "Luka", role: "właściciel mieszkania", portrait: "luka", voice: { gender: "male", pitch: "+6Hz" } },
    { id: "petra", name: "Petra", role: "rekruterka w agencji", portrait: "petra", voice: { gender: "female" } },
    { id: "sanja", name: "Sanja", role: "farmaceutka", portrait: "sanja", voice: { gender: "female", pitch: "-12Hz", rate: "-12%" } },
    { id: "maja", name: "Maja", role: "sprzedawczyni na Ilicy", portrait: "maja", voice: { gender: "female", pitch: "+10Hz", rate: "-4%" } },
    { id: "dario", name: "Dario", role: "kolega z pracy", portrait: "dario", voice: { gender: "male", pitch: "-4Hz", rate: "-4%" } },
  ],
  locations: [
    { id: "stan", name: { hr: "Stan", pl: "Mieszkanie" }, description: "Umeblowane mieszkanie na Trešnjevce, dziesięć minut tramwajem od centrum.", background: "zg-stan", map: { x: 22, y: 62 } },
    { id: "ured", name: { hr: "Ured", pl: "Biuro" }, description: "Agencja marketingowa w kamienicy w Donjim gradzie.", background: "zg-ured", map: { x: 52, y: 58 }, unlock: { mission: "m1-flat" } },
    { id: "ljekarna", name: { hr: "Ljekarna", pl: "Apteka" }, description: "Apteka na rogu, otwarta od siódmej rano.", background: "zg-ljekarna", map: { x: 38, y: 74 }, unlock: { mission: "m1-flat" } },
    { id: "ilica", name: { hr: "Ilica", pl: "Ilica" }, description: "Najdłuższa ulica Zagrzebia — sklepy, tramwaje i wyprzedaże.", background: "zg-ilica", map: { x: 44, y: 40 }, unlock: { mission: "m2-interview" } },
    { id: "tkalca", name: { hr: "Tkalčićeva", pl: "Tkalčićeva" }, description: "Ulica kawiarni pod Górnym Miastem. Tu się pije kawę, nie się spieszy.", background: "zg-kafic", map: { x: 66, y: 32 }, unlock: { mission: "m2-interview" } },
    // Zapowiedziane lokacje — misje w kolejnych etapach.
    { id: "dolac", name: { hr: "Dolac", pl: "Targ Dolac" }, description: "Czerwone parasole i targowanie się.", background: "placeholder", map: { x: 62, y: 46 }, comingSoon: true },
    { id: "kolodvor", name: { hr: "Glavni kolodvor", pl: "Dworzec główny" }, description: "Pociągi do Splitu, Rijeki i Budapesztu.", background: "placeholder", map: { x: 58, y: 84 }, comingSoon: true },
    { id: "gornji-grad", name: { hr: "Gornji grad", pl: "Górne Miasto" }, description: "Uspinjača, kościół św. Marka i widok na miasto.", background: "placeholder", map: { x: 54, y: 16 }, comingSoon: true },
    { id: "maksimir", name: { hr: "Maksimir", pl: "Maksimir" }, description: "Park, zoo i stadion.", background: "placeholder", map: { x: 88, y: 30 }, comingSoon: true },
    { id: "jarun", name: { hr: "Jarun", pl: "Jarun" }, description: "Jezioro, rower i weekendowe grillowanie.", background: "placeholder", map: { x: 10, y: 86 }, comingSoon: true },
  ],
  missions: ZAGREB_MISSIONS,
};
