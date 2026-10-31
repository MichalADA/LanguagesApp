import type { Story } from "../../types";
import { ZAGREB_MISSIONS } from "./missions";

/** Zagrzeb — miasto poziomu A2. */
export const ZAGREB_A2: Story = {
  id: "zagreb-a2",
  courseId: "pl-hr",
  level: "A2",
  city: { hr: "Zagreb", pl: "Zagrzeb" },
  tagline: "Stolica, tramwaje i pierwsza praca: mieszkanie, biuro, lekarz, zakupy na Ilicy i kawa na Cvjetnym trgu.",
  map: "zagreb-map",
  languageReview: "unverified",
  narratorVoice: { gender: "male", rate: "-10%" },
  npcs: [
    { id: "ljubica", name: "Ljubica", role: "właścicielka mieszkania", portrait: "ljubica", voice: { gender: "female" } },
    { id: "zoran", name: "Zoran", role: "szef", portrait: "zoran", voice: { gender: "male" } },
    { id: "babic", name: "dr. Babić", role: "lekarka rodzinna", portrait: "babic", voice: { gender: "female" } },
    { id: "lana", name: "Lana", role: "sprzedawczyni w butiku", portrait: "lana", voice: { gender: "female" } },
    { id: "dragan", name: "Dragan", role: "urzędnik pocztowy", portrait: "dragan", voice: { gender: "male" } },
    { id: "maja", name: "Maja", role: "koleżanka z pracy", portrait: "maja", voice: { gender: "female" } },
  ],
  locations: [
    { id: "stan", name: { hr: "Stan", pl: "Mieszkanie" }, description: "Umeblowane mieszkanie na Trešnjevce, trzecie piętro bez windy.", background: "zg-stan", map: { x: 22, y: 62 } },
    { id: "kafic", name: { hr: "Cvjetni trg", pl: "Plac Kwiatowy" }, description: "Kawiarnie z tarasami — tu Zagrzeb pije kawę godzinami.", background: "zg-kafic", map: { x: 47, y: 52 } },
    { id: "ured", name: { hr: "Ured", pl: "Biuro" }, description: "Firma w centrum miasta. Szef Zoran lubi porządek.", background: "zg-ured", map: { x: 60, y: 62 }, unlock: { mission: "m1-stan" } },
    { id: "ambulanta", name: { hr: "Ambulanta", pl: "Przychodnia" }, description: "Przychodnia lekarza rodzinnego. Doktor Babić przyjmuje do południa.", background: "zg-ambulanta", map: { x: 76, y: 44 }, unlock: { mission: "m3-posao" } },
    { id: "butik", name: { hr: "Ilica", pl: "Ilica" }, description: "Najdłuższa ulica Zagrzebia, sklep przy sklepie.", background: "zg-butik", map: { x: 32, y: 44 }, unlock: { mission: "m3-posao" } },
    { id: "posta", name: { hr: "Pošta", pl: "Poczta" }, description: "Poczta główna przy dworcu — okienka i długie kolejki.", background: "zg-posta", map: { x: 58, y: 84 }, unlock: { mission: "m5-jakna" } },
    { id: "gornji-grad", name: { hr: "Gornji grad", pl: "Górne Miasto" }, description: "Kolejka linowa, kościół św. Marka i widok na całe miasto.", background: "zg-gornji-grad", map: { x: 44, y: 22 }, unlock: { mission: "m7-vikend" } },
  ],
  missions: ZAGREB_MISSIONS,
};
