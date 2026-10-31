import type { Story } from "../../types";
import { DUBROVNIK_MISSIONS } from "./missions";

/** Dubrownik — miasto poziomu B1. */
export const DUBROVNIK_B1: Story = {
  id: "dubrovnik-b1",
  courseId: "pl-hr",
  level: "B1",
  city: { hr: "Dubrovnik", pl: "Dubrownik" },
  tagline: "Letnia praca w agencji turystycznej: usterki w apartamencie, zebrania, wycieczki, mury i festiwal.",
  map: "dubrovnik-map",
  languageReview: "unverified",
  narratorVoice: { gender: "male" },
  npcs: [
    { id: "ante", name: "Ante", role: "taksówkarz i właściciel łodzi", portrait: "ante", voice: { gender: "male" } },
    { id: "nikola", name: "Nikola", role: "właściciel apartamentu", portrait: "nikola", voice: { gender: "male" } },
    { id: "vesna", name: "Vesna", role: "szefowa agencji", portrait: "vesna", voice: { gender: "female" } },
    { id: "jelena", name: "Jelena", role: "farmaceutka", portrait: "jelena", voice: { gender: "female" } },
    { id: "ivo", name: "Ivo", role: "przewodnik", portrait: "ivo", voice: { gender: "male" } },
    { id: "tea", name: "Tea", role: "koleżanka z agencji", portrait: "tea", voice: { gender: "female" } },
  ],
  locations: [
    { id: "luka", name: { hr: "Luka Gruž", pl: "Port Gruž" }, description: "Katamarany, promy i łodzie wycieczkowe. Ante zna tu każdego kapitana.", background: "db-luka", map: { x: 18, y: 30 } },
    { id: "apartman", name: { hr: "Apartman", pl: "Apartament" }, description: "Kamienny apartament w Starym Mieście — piękny, ale wilgotny.", background: "db-apartman", map: { x: 73, y: 45 }, unlock: { mission: "m1-dolazak" } },
    { id: "agencija", name: { hr: "Agencija", pl: "Agencja" }, description: "Agencja turystyczna przy Stradunie. Szefowa Vesna nie lubi spóźnień.", background: "db-agencija", map: { x: 60, y: 61 }, unlock: { mission: "m1-dolazak" } },
    { id: "ljekarna", name: { hr: "Ljekarna", pl: "Apteka" }, description: "Apteka przy bramie Pile — latem pełna turystów ze spieczoną skórą.", background: "db-ljekarna", map: { x: 38, y: 52 }, unlock: { mission: "m3-projekt" } },
    { id: "zidine", name: { hr: "Zidine", pl: "Mury" }, description: "Prawie dwa kilometry murów miejskich nad morzem.", background: "db-zidine", map: { x: 78, y: 66 }, unlock: { mission: "m5-izlet" } },
    { id: "stradun", name: { hr: "Stradun", pl: "Stradun" }, description: "Główna ulica Starego Miasta, wypolerowana stopami turystów.", background: "db-stradun", map: { x: 55, y: 46 }, unlock: { mission: "m2-apartman" } },
    { id: "banje", name: { hr: "Banje", pl: "Plaża Banje" }, description: "Plaża z widokiem na mury i wyspę Lokrum.", background: "db-banje", map: { x: 91, y: 56 }, unlock: { mission: "m7-festival" } },
  ],
  missions: DUBROVNIK_MISSIONS,
};
