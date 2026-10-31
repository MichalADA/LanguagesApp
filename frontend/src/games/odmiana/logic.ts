import type { Course } from "@/courses/types";
import type { Verdict } from "@/services/validation";
import { canonical, foldDiacritics } from "@/services/validation";
import type { FormProgress } from "@/progress/types";
import type { PersonId, Tense, VerbEntry } from "@/grammar/types";
import { PERSONS, formKey, personDef } from "@/grammar/types";

export const ODMIANA_ID = "odmiana";

export type Level = "easy" | "normal" | "hard";
export const LEVELS: readonly Level[] = ["easy", "normal", "hard"];
export const DEFAULT_LEVEL: Level = "normal";

/** Tryb: jedna osoba na pytanie albo cała tabela odmiany. */
export type Mode = "single" | "full";

export const HIT_POINTS = 10;
export const NEAR_POINTS = 5;
/** Dodatek za czasownik z grupy w pełni nieregularnej. */
export const HARD_VERB_BONUS = 2;
/** Dodatek za poziom trudny. */
export const HARD_LEVEL_BONUS = 2;
/** Premia za pełną odmianę bez ani jednego błędu. */
export const FULL_CLEAN_BONUS = 12;
/** Co które pytanie na poziomie trudnym jest pełną odmianą. */
export const HARD_FULL_EVERY = 4;

/**
 * Warianty równoprawne, których dataset nie mieści w jednej kolumnie:
 * krótkie formy „biti" i drugi standardowy temat „izaći".
 */
const ALTERNATES: Record<string, Partial<Record<PersonId, string[]>>> = {
  biti: {
    ja: ["sam"],
    ti: ["si"],
    on: ["je", "jest"],
    mi: ["smo"],
    vi: ["ste"],
    oni: ["su"],
  },
  izaći: {
    ja: ["iziđem"],
    ti: ["iziđeš"],
    on: ["iziđe"],
    mi: ["iziđemo"],
    vi: ["iziđete"],
    oni: ["iziđu"],
  },
};

export function acceptedForms(verb: VerbEntry, person: PersonId): string[] {
  const extra = (verb.alternates ?? ALTERNATES[verb.infinitive])?.[person] ?? [];
  return [verb.forms[person], ...extra].filter(Boolean);
}

const BITI: Record<PersonId, string> = { ja: "sam", ti: "si", on: "je", mi: "smo", vi: "ste", oni: "su" };
const HTJETI: Record<PersonId, string> = { ja: "ću", ti: "ćeš", on: "će", mi: "ćemo", vi: "ćete", oni: "će" };

/** Bezokolicznik bez „se” i informacja, czy czasownik jest zwrotny. */
function splitReflexive(infinitive: string): { base: string; reflexive: boolean } {
  const reflexive = / se$/.test(infinitive);
  return { base: infinitive.replace(/ se$/, ""), reflexive };
}

/** Bezokolicznik przed „ću”: -ti traci -i (radit ću), -ći zostaje (ići ću). */
export function futureStem(infinitive: string): string {
  return infinitive.endsWith("ti") ? infinitive.slice(0, -1) : infinitive;
}

/**
 * Czasownik w czasie przeszłym (perfekt) albo przyszłym (futur I) — liczony z bezokolicznika
 * i imiesłowu z datasetu. Forma główna jest męska; żeńska i inna kolejność słów to warianty.
 * „Se” stoi po formie „biti” / „htjeti”; w 3. os. lp. czasu przeszłego „je” znika (on se smijao).
 */
export function inTense(verb: VerbEntry, tense: Tense): VerbEntry | null {
  if (tense === "present") return verb;
  const { base, reflexive } = splitReflexive(verb.infinitive);
  const se = reflexive ? " se" : "";
  const forms = {} as Record<PersonId, string>;
  const alternates: Partial<Record<PersonId, string[]>> = {};
  if (tense === "future") {
    for (const p of PERSONS) {
      forms[p.id] = `${HTJETI[p.id]}${se} ${base}`;
      alternates[p.id] = [`${futureStem(base)} ${HTJETI[p.id]}${se}`];
    }
  } else {
    if (!verb.past) return null;
    const { masculine, feminine } = verb.past;
    const plural = feminine.replace(/la$/, "li");
    const pluralF = feminine.replace(/la$/, "le");
    const neuter = feminine.replace(/la$/, "lo");
    for (const p of PERSONS) {
      const aux = BITI[p.id];
      const singular = p.id === "ja" || p.id === "ti" || p.id === "on";
      const [m, f] = singular ? [masculine, feminine] : [plural, pluralF];
      const others = p.id === "on" ? [f, neuter] : [f];
      if (reflexive && p.id === "on") {
        forms[p.id] = `se ${m}`;
        alternates[p.id] = [...others.map((x) => `se ${x}`), `${m} se`, ...others.map((x) => `${x} se`)];
      } else {
        forms[p.id] = `${aux}${se} ${m}`;
        alternates[p.id] = [...others.map((x) => `${aux}${se} ${x}`), `${m} ${aux}${se}`, ...others.map((x) => `${x} ${aux}${se}`)];
      }
    }
  }
  return { ...verb, id: `${verb.id}:${tense}`, tense, forms, alternates };
}

/** Pula czasowników w danym czasie (w przeszłym — tylko te z imiesłowem w datasetcie). */
export function tensePool(verbs: readonly VerbEntry[], tense: Tense): VerbEntry[] {
  return verbs.map((v) => inTense(v, tense)).filter((v): v is VerbEntry => v !== null);
}

/**
 * Ocena jednej formy. Diakrytyki mają znaczenie — odpowiedź bez nich to „prawie",
 * nigdy pełne trafienie. Reguły biorą się z kursu, tak jak w grach słownikowych.
 */
export function judgeForm(
  course: Course,
  verb: VerbEntry,
  person: PersonId,
  input: string | null,
  lenient = true,
): Verdict {
  if (!input || !input.trim()) return "miss";
  const rules = course.validation;
  const canon = (s: string) => canonical(s, rules);
  const accepted = acceptedForms(verb, person);
  if (accepted.some((a) => canon(a) === canon(input))) return "hit";
  if (lenient && rules.diacriticsMatter) {
    const fold = (s: string) => foldDiacritics(canon(s), rules);
    if (accepted.some((a) => fold(a) === fold(input))) return "near";
  }
  return "miss";
}

export function pointsFor(verdict: Verdict, verb: VerbEntry, level: Level): number {
  if (verdict === "miss") return 0;
  const base = verdict === "hit" ? HIT_POINTS : NEAR_POINTS;
  const bonus =
    (verb.type === "irregular" ? HARD_VERB_BONUS : 0) + (level === "hard" ? HARD_LEVEL_BONUS : 0);
  return base + (verdict === "hit" ? bonus : 0);
}

export function levelPool(verbs: readonly VerbEntry[], level: Level): VerbEntry[] {
  if (level === "easy") {
    const core = verbs.filter((v) => v.core);
    return core.length >= 8 ? core : verbs.slice();
  }
  if (level === "hard") {
    const hard = verbs.filter((v) => !v.core);
    return hard.length >= 12 ? hard : verbs.slice();
  }
  return verbs.slice();
}

export function roundLength(mode: Mode, configured: number): number {
  if (mode === "full") return 5;
  return Math.min(16, Math.max(8, Math.round(configured * 0.6)));
}

/**
 * Waga losowania jednej formy. Rdzeń systemu nauki: formy mylone wracają
 * częściej, formy z długą serią trafień prawie znikają, formy nietknięte mają
 * lekką premię, żeby talia się otwierała.
 */
export function weightForForm(stat: FormProgress | undefined): number {
  if (!stat || stat.attempts === 0) return 2.2;
  let w = 1;
  w += 2.6 * stat.difficulty;
  if (stat.currentStreak === 0) w += 1.4;
  w -= Math.min(0.85, 0.28 * stat.currentStreak);
  // Świeżo widziane formy trochę odpuszczamy, żeby runda nie kręciła się w kółko.
  if (Date.now() - stat.lastSeen < 60_000) w *= 0.45;
  return Math.max(0.15, w);
}

function pickWeighted<T>(items: readonly { item: T; weight: number }[]): T | null {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  if (!items.length || total <= 0) return null;
  let roll = Math.random() * total;
  for (const i of items) {
    roll -= i.weight;
    if (roll <= 0) return i.item;
  }
  return items[items.length - 1].item;
}

export interface SinglePick {
  verb: VerbEntry;
  person: PersonId;
}

export type StatLookup = (key: string) => FormProgress | undefined;

/**
 * Wybór pary czasownik + osoba. Unikamy powtórzenia tego samego czasownika
 * i tej samej osoby kilka razy pod rząd — nawet jeśli wagi na to naciskają.
 */
export function pickSingle(
  pool: readonly VerbEntry[],
  statOf: StatLookup,
  recentVerbIds: readonly string[],
  recentPersons: readonly PersonId[],
): SinglePick | null {
  if (pool.length === 0) return null;
  const blockedVerbs = new Set(recentVerbIds.slice(-3));
  const lastTwo = recentPersons.slice(-2);
  const personBlocked = lastTwo.length === 2 && lastTwo[0] === lastTwo[1] ? lastTwo[0] : null;

  const build = (respectBlocks: boolean) => {
    const out: { item: SinglePick; weight: number }[] = [];
    for (const verb of pool) {
      if (respectBlocks && blockedVerbs.has(verb.id) && pool.length > blockedVerbs.size) continue;
      for (const person of PERSONS) {
        if (respectBlocks && personBlocked === person.id) continue;
        out.push({
          item: { verb, person: person.id },
          weight: weightForForm(statOf(formKey(verb.id, person.id))),
        });
      }
    }
    return out;
  };

  return pickWeighted(build(true)) ?? pickWeighted(build(false));
}

/** Wybór czasownika do pełnej odmiany — po średniej wadze jego sześciu form. */
export function pickVerb(
  pool: readonly VerbEntry[],
  statOf: StatLookup,
  recentVerbIds: readonly string[],
): VerbEntry | null {
  if (pool.length === 0) return null;
  const blocked = new Set(recentVerbIds.slice(-3));
  const candidates = pool
    .filter((v) => !blocked.has(v.id) || pool.length <= blocked.size)
    .map((verb) => ({
      item: verb,
      weight:
        PERSONS.reduce((sum, p) => sum + weightForForm(statOf(formKey(verb.id, p.id))), 0) /
        PERSONS.length,
    }));
  return pickWeighted(candidates);
}

/** Etykieta formy do statystyk i ekranu wyniku, np. „ići — oni". */
export function formLabel(verb: VerbEntry, person: PersonId): string {
  const tense = verb.tense === "past" ? " (perfekt)" : verb.tense === "future" ? " (futur)" : "";
  return `${verb.infinitive}${tense} — ${personDef(person).pronoun.split(" / ")[0]}`;
}
