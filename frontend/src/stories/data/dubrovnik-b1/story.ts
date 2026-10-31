import type { Story } from "../../types";
import { DUBROVNIK_MISSIONS } from "./missions";

/** Dubrovnik — miasto poziomu B1. */
export const DUBROVNIK_B1: Story = {
  id: "dubrovnik-b1",
  courseId: "pl-hr",
  level: "B1",
  city: { hr: "Dubrovnik", pl: "Dubrownik" },
  tagline: "Mury, turyści i rozmowy o wszystkim: usterki, prom na wyspę, wywiad na Stradunie i rada dla przyjaciela.",
  map: "dubrovnik-map",
  languageReview: "unverified",
  narratorVoice: { gender: "male", pitch: "-8Hz", rate: "-14%" },
  npcs: [
    { id: "mara", name: "gospođa Mara", role: "właścicielka apartamentu", portrait: "mara", voice: { gender: "female", pitch: "-16Hz", rate: "-14%" } },
    { id: "nikola", name: "Nikola", role: "przewodnik po mieście", portrait: "nikola", voice: { gender: "male", pitch: "+4Hz", rate: "-2%" } },
    { id: "ante", name: "Ante", role: "kasjer w porcie", portrait: "ante", voice: { gender: "male", pitch: "-14Hz", rate: "-6%" } },
    { id: "jelena", name: "Jelena", role: "dziennikarka portalu", portrait: "jelena", voice: { gender: "female", pitch: "+6Hz", rate: "-2%" } },
  ],
  locations: [
    { id: "ploce", name: { hr: "Apartman u Pločama", pl: "Apartament na Pločach" }, description: "Kamienny dom za Bramą Ploče, z widokiem na port i Lokrum.", background: "apartman", map: { x: 74, y: 44 } },
    { id: "zidine", name: { hr: "Gradske zidine", pl: "Mury miejskie" }, description: "Prawie dwa kilometry murów nad morzem. Najlepszy widok — z Minčety.", background: "du-zidine", map: { x: 50, y: 34 }, unlock: { mission: "m1-repair" } },
    { id: "gruz", name: { hr: "Luka Gruž", pl: "Port Gruž" }, description: "Promy i katamarany na wyspy Elafickie.", background: "du-luka", map: { x: 14, y: 22 }, unlock: { mission: "m1-repair" } },
    { id: "stradun", name: { hr: "Stradun", pl: "Stradun" }, description: "Główna ulica starego miasta. Latem — festiwal i tłumy.", background: "du-stradun", map: { x: 56, y: 52 }, unlock: { mission: "m2-walls" } },
    { id: "stijene", name: { hr: "Bar na stijenama", pl: "Bar na skałach" }, description: "Stoliki na skałach pod murami, przez dziurę w murze.", background: "du-stijene", map: { x: 44, y: 70 }, unlock: { mission: "m4-interview" } },
    // Zapowiedziane lokacje — misje w kolejnych etapach.
    { id: "lokrum", name: { hr: "Lokrum", pl: "Lokrum" }, description: "Wyspa z pawiami i ogrodem botanicznym.", background: "placeholder", map: { x: 86, y: 76 }, comingSoon: true },
    { id: "srd", name: { hr: "Srđ", pl: "Srđ" }, description: "Kolejka linowa i panorama miasta.", background: "placeholder", map: { x: 62, y: 12 }, comingSoon: true },
    { id: "trznica", name: { hr: "Gundulićeva poljana", pl: "Targ" }, description: "Poranny targ: figi, lawenda i kandyzowane skórki.", background: "placeholder", map: { x: 40, y: 46 }, comingSoon: true },
  ],
  missions: DUBROVNIK_MISSIONS,
};
