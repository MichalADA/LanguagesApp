/**
 * Lexodromia Stories — model świata i dialogów. Same dane, zero Reacta:
 * miasta, lokacje, postacie i misje opisują pliki w src/stories/data/<miasto>/,
 * a silnik (engine.ts) i progresja (progress.ts) nie wiedzą nic o konkretnej treści.
 * Nowe miasto = nowy katalog z danymi + wpis w data/index.ts.
 */

import type { ReviewRef } from "@/curriculum/types";

/** Tekst po chorwacku z polskim tłumaczeniem (tłumaczenie to pomoc, nie domyślny widok). */
export interface Line {
  hr: string;
  pl: string;
}

export type Mood = "neutral" | "happy" | "puzzled";

/* ---------- Warunki i efekty (wspólne dla świata i dialogów) ---------- */

export type Condition =
  | { flag: string }
  | { notFlag: string }
  | { mission: string }
  | { all: Condition[] }
  | { any: Condition[] };

export type Effect = { setFlag: string } | { clearFlag: string };

/* ---------- Dialog: graf węzłów ---------- */

interface NodeBase {
  id: string;
}

/** Wypowiedź postaci (NPC albo narratora). */
export interface SayNode extends NodeBase {
  kind: "say";
  /** Id postaci z `story.npcs` albo "narrator". */
  speaker: string;
  text: Line;
  mood?: Mood;
  next: string;
  effects?: Effect[];
}

export type Verdict = "correct" | "wrong" | "neutral";

export interface ChoiceOption {
  id: string;
  /** Co mówi gracz (po chorwacku) — albo polski opis gestu, gdy `text.hr` jest pusty. */
  text: Line;
  /** correct — dobra odpowiedź; wrong — błąd (z wyjaśnieniem); neutral — np. „Ne razumijem.” (nie liczy się). */
  verdict: Verdict;
  explanation?: string;
  next: string;
  effects?: Effect[];
  /** Opcja widoczna tylko przy spełnionym warunku (ścieżki odblokowywane warunkowo). */
  when?: Condition;
}

/** Wybór odpowiedzi (rozpoznanie). */
export interface ChoiceNode extends NodeBase {
  kind: "choice";
  instruction: string;
  options: ChoiceOption[];
  /** Czy pierwszy wybór liczy się do wyniku misji (domyślnie tak, gdy jest poprawna opcja). */
  graded?: boolean;
}

interface AnswerNodeBase extends NodeBase {
  instruction: string;
  /** Polskie znaczenie zdania, które gracz ma powiedzieć. */
  translation?: string;
  /** Poprawne warianty (pierwszy pokazujemy po błędzie). Mogą zawierać {name}. */
  accepted: string[];
  /** Rama zdania (RegExp) dla odpowiedzi otwartych, np. „Zovem se \p{L}+”. */
  pattern?: string;
  /** Krótkie wyjaśnienie pokazywane po błędzie. */
  explanation?: string;
  /** Słowo z `mission.vocabulary`, którego wiedzę sprawdza zadanie (→ FSRS). */
  practice?: string;
  next: string;
  /** Węzeł z reakcją postaci na błąd (np. prośba o doprecyzowanie); domyślnie ponowna próba. */
  onWrong?: string;
}

/** Ułóż zdanie z kafelków (mogą być dodatkowe, mylące kafelki). */
export interface BuildNode extends AnswerNodeBase {
  kind: "build";
  tokens: string[];
}

/** Wpisz odpowiedź samodzielnie. */
export interface TypeNode extends AnswerNodeBase {
  kind: "type";
  hint?: string;
}

/** Rozgałęzienie bez udziału gracza (np. zależnie od wcześniejszego wyboru). */
export interface BranchNode extends NodeBase {
  kind: "branch";
  cases: { when: Condition; next: string }[];
  otherwise: string;
}

/** Wydarzenie w grze (ustawienie flag) bez wypowiedzi. */
export interface EventNode extends NodeBase {
  kind: "event";
  effects: Effect[];
  next: string;
}

export interface EndNode extends NodeBase {
  kind: "end";
}

export type DialogueNode = SayNode | ChoiceNode | BuildNode | TypeNode | BranchNode | EventNode | EndNode;

export interface DialogueGraph {
  start: string;
  nodes: Record<string, DialogueNode>;
}

/**
 * Sposób prowadzenia dialogu. Dziś tylko `scripted` (graf napisany ręcznie).
 * Miejsce na przyszły `{ kind: "ai"; persona; goals; ... }` — misje, świat i zapis postępu
 * nie zależą od tego, kto prowadzi rozmowę (zob. DialogueDriver w engine.ts).
 */
export type DialogueSpec = { kind: "scripted"; graph: DialogueGraph };

/* ---------- Świat ---------- */

/** Słowo ćwiczone w misji — z tą samą kartą FSRS co w lekcjach kursu. */
export interface MissionWord extends Line {
  review: ReviewRef;
}

export interface Mission {
  id: string;
  /** Numer misji w mieście (1, 2, …). */
  order: number;
  title: Line;
  locationId: string;
  npcId: string;
  /** Cel komunikacyjny („Przedstawisz się…”). */
  goal: string;
  /** Krótka historia na ekran startowy misji. */
  story: string;
  /** Cele widoczne podczas rozmowy, odhaczane flagami. */
  objectives: { text: string; done: Condition }[];
  /** Misje, które trzeba ukończyć wcześniej. */
  requires: string[];
  /** Nagroda za pierwsze ukończenie (powtórka nie daje jej ponownie). */
  xp: number;
  vocabulary: MissionWord[];
  dialogue: DialogueSpec;
  /** Podsumowanie po ukończeniu. */
  debrief: string[];
}

export interface Npc {
  id: string;
  name: string;
  role: string;
  /** Id portretu w rejestrze grafik (art/registry.tsx). */
  portrait: string;
  /** Głos nagrań (nagranie pasuje do postaci tylko przy zgodnym tekście i głosie). */
  voice: "female" | "male";
}

export interface StoryLocation {
  id: string;
  name: Line;
  description: string;
  /** Id tła w rejestrze grafik. */
  background: string;
  /** Pozycja pinezki na mapie miasta, w procentach. */
  map: { x: number; y: number };
  /** Brak = dostępna od początku. */
  unlock?: Condition;
  /** Lokacja zapowiedziana (port, plaża…) — widoczna na mapie, jeszcze bez misji. */
  comingSoon?: boolean;
}

export interface Story {
  /** np. "split-a1" — klucz zapisu postępu. */
  id: string;
  courseId: string;
  level: "A1" | "A2" | "B1" | "B2";
  city: Line;
  tagline: string;
  /** Id mapy w rejestrze grafik. */
  map: string;
  /** Status treści: językowa weryfikacja przez native speakera jeszcze się nie odbyła. */
  languageReview: "unverified" | "native-reviewed";
  npcs: Npc[];
  locations: StoryLocation[];
  missions: Mission[];
}

/** Miasto na ekranie wyboru: grywalne albo zapowiedziane. */
export interface StoryEntry {
  id: string;
  city: Line;
  level: Story["level"];
  tagline: string;
  courseId: string;
  load?: () => Promise<Story>;
  /** Nagrania kursu pasujące do wypowiedzi (generowane: npm run stories:audio). */
  loadAudio?: () => Promise<Record<string, { female?: string; male?: string }>>;
}
