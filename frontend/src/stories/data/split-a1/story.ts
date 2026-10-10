import type { Story } from "../../types";
import { SPLIT_MISSIONS } from "./missions";

/** Split — miasto poziomu A1. */
export const SPLIT_A1: Story = {
  id: "split-a1",
  courseId: "pl-hr",
  level: "A1",
  city: { hr: "Split", pl: "Split" },
  tagline: "Pierwsze dni w Dalmacji: meldunek, kawa na nabrzeżu i zakupy za rogiem.",
  map: "split-map",
  languageReview: "unverified",
  npcs: [
    { id: "marko", name: "Marko", role: "właściciel apartamentu", portrait: "marko", voice: "male" },
    { id: "ana", name: "Ana", role: "baristka", portrait: "ana", voice: "female" },
    { id: "ivana", name: "Ivana", role: "sprzedawczyni", portrait: "ivana", voice: "female" },
  ],
  locations: [
    { id: "apartman", name: { hr: "Apartman", pl: "Apartament" }, description: "Twój pokój na starym mieście. Marko zna tu każdy kamień.", background: "apartman", map: { x: 34, y: 42 } },
    {
      id: "kafic",
      name: { hr: "Kafić", pl: "Kawiarnia" },
      description: "Mała kawiarnia na Rivie z widokiem na port.",
      background: "kafic",
      map: { x: 58, y: 66 },
    },
    {
      id: "trgovina",
      name: { hr: "Trgovina", pl: "Sklep" },
      description: "Sklepik za rogiem: chleb, mleko, owoce i wszystko na co dzień.",
      background: "trgovina",
      map: { x: 20, y: 70 },
      unlock: { mission: "m2-key" },
    },
    // Zapowiedziane lokacje — architektura gotowa, misje w kolejnych etapach.
    { id: "luka", name: { hr: "Luka", pl: "Port" }, description: "Promy na wyspy.", background: "placeholder", map: { x: 80, y: 74 }, comingSoon: true },
    { id: "plaza", name: { hr: "Plaža", pl: "Plaża" }, description: "Bačvice i picigin.", background: "placeholder", map: { x: 88, y: 46 }, comingSoon: true },
    { id: "kolodvor", name: { hr: "Kolodvor", pl: "Dworzec" }, description: "Pociągi i autobusy.", background: "placeholder", map: { x: 70, y: 86 }, comingSoon: true },
    { id: "pekara", name: { hr: "Pekara", pl: "Piekarnia" }, description: "Burek o poranku.", background: "placeholder", map: { x: 48, y: 30 }, comingSoon: true },
    { id: "trznica", name: { hr: "Tržnica", pl: "Targ" }, description: "Owoce, warzywa i targowanie się.", background: "placeholder", map: { x: 62, y: 22 }, comingSoon: true },
  ],
  missions: SPLIT_MISSIONS,
};
