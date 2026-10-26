import { checkLessonAnswerDetailed } from "@/curriculum/answers";
import type { ValidationRules } from "@/courses/types";
import type { ChoiceNode, ChoiceOption, Condition, DialogueGraph, DialogueNode, Effect, Line, Mood, Verdict } from "./types";

/**
 * Silnik dialogów Stories — czyste funkcje na niezmiennym stanie rozmowy.
 * UI (components/Scene.tsx) tylko wyświetla bieżący węzeł i woła answer/proceed.
 *
 * Przebieg: start → (event/branch przechodzą same) → say | choice | build | type → … → end.
 * Odpowiedź gracza daje informację zwrotną i oczekujące przejście (`pending`);
 * `proceed` je wykonuje, gdy gracz przeczyta reakcję. Błąd nigdy nie blokuje postępu:
 * po dwóch nieudanych próbach pokazujemy poprawną odpowiedź i rozmowa idzie dalej.
 */

export const MAX_ATTEMPTS = 2;

/** Kontekst świata, w którym toczy się rozmowa. */
export interface WorldContext {
  /** Flagi świata (zapisane w postępie) — rozmowa może je zmieniać. */
  flags: readonly string[];
  /** Ukończone misje. */
  completed: readonly string[];
  /** Zmienne do szablonów, np. {name} — imię gracza. */
  vars?: Record<string, string>;
}

export interface TranscriptEntry {
  speaker: string;
  text: Line;
  mood?: Mood;
  /** Odpowiedź gracza (true) czy wypowiedź postaci. */
  player?: boolean;
}

export interface Feedback {
  verdict: "correct" | "near" | "wrong" | "neutral";
  /** Poprawna odpowiedź do pokazania (po błędzie / przy „near”). */
  expected?: string;
  explanation?: string;
  /** Po tej informacji gracz próbuje ponownie (ten sam węzeł). */
  retry: boolean;
  /** Ostatnia próba się nie udała — pokazujemy odpowiedź i idziemy dalej. */
  revealed?: boolean;
}

export interface RunState {
  nodeId: string;
  flags: string[];
  transcript: TranscriptEntry[];
  /** Próby w węzłach z odpowiedzią. */
  attempts: Record<string, number>;
  /** Wynik pierwszej próby w ocenianych węzłach (do wyniku misji i FSRS). */
  firstTry: Record<string, boolean>;
  /** Węzły, w których gracz odsłonił tłumaczenie przed odpowiedzią. */
  hints: Record<string, boolean>;
  /** Ostatnia wypowiedź postaci (do panelu dialogowego). */
  lastLine: TranscriptEntry | null;
  pending: { feedback: Feedback; next: string } | null;
  finished: boolean;
}

/** Interfejs prowadzenia dialogu — `scripted` dziś; w przyszłości np. `ai` z tym samym kontraktem. */
export interface DialogueDriver {
  start(world: WorldContext): RunState;
  answer(run: RunState, input: PlayerInput, world: WorldContext): RunState;
  proceed(run: RunState, world: WorldContext): RunState;
}

export type PlayerInput = { kind: "choice"; optionId: string } | { kind: "text"; value: string } | { kind: "continue" };

/* ---------- Warunki, efekty, szablony ---------- */

export function evaluate(condition: Condition, flags: readonly string[], completed: readonly string[]): boolean {
  if ("flag" in condition) return flags.includes(condition.flag);
  if ("notFlag" in condition) return !flags.includes(condition.notFlag);
  if ("mission" in condition) return completed.includes(condition.mission);
  if ("all" in condition) return condition.all.every((c) => evaluate(c, flags, completed));
  return condition.any.some((c) => evaluate(c, flags, completed));
}

export function applyEffects(flags: readonly string[], effects: readonly Effect[] = []): string[] {
  const out = new Set(flags);
  for (const effect of effects) {
    if ("setFlag" in effect) out.add(effect.setFlag);
    else out.delete(effect.clearFlag);
  }
  return [...out].sort();
}

/** {name} → imię gracza. Nieznana zmienna zostaje bez zmian. */
export function fill(text: string, vars: Record<string, string> = {}): string {
  return text.replace(/\{(\w+)\}/g, (all, key: string) => vars[key] ?? all);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Opcje widoczne w danym stanie świata. */
export function visibleOptions(node: ChoiceNode, run: Pick<RunState, "flags">, world: WorldContext): ChoiceOption[] {
  return node.options.filter((option) => !option.when || evaluate(option.when, run.flags, world.completed));
}

/** Węzeł oceniany = sprawdza wiedzę (build, type, wybór z poprawną odpowiedzią). */
export function isGraded(node: DialogueNode): boolean {
  if (node.kind === "build" || node.kind === "type") return true;
  if (node.kind === "choice") return node.graded ?? node.options.some((o) => o.verdict === "correct");
  return false;
}

/* ---------- Przebieg ---------- */

function node(graph: DialogueGraph, id: string): DialogueNode {
  const found = graph.nodes[id];
  if (!found) throw new Error(`Dialog: brak węzła „${id}”`);
  return found;
}

/** Przechodzi przez węzły bez udziału gracza (event, branch) i wchodzi w następny przystanek. */
function enter(graph: DialogueGraph, run: RunState, id: string, world: WorldContext): RunState {
  let current = id;
  let flags = run.flags;
  for (let guard = 0; guard < 100; guard++) {
    const n = node(graph, current);
    if (n.kind === "event") {
      flags = applyEffects(flags, n.effects);
      current = n.next;
      continue;
    }
    if (n.kind === "branch") {
      current = n.cases.find((c) => evaluate(c.when, flags, world.completed))?.next ?? n.otherwise;
      continue;
    }
    if (n.kind === "say") {
      const line: TranscriptEntry = { speaker: n.speaker, text: { hr: fill(n.text.hr, world.vars), pl: fill(n.text.pl, world.vars) }, mood: n.mood };
      return { ...run, nodeId: n.id, flags: applyEffects(flags, n.effects), transcript: [...run.transcript, line], lastLine: line, pending: null };
    }
    return { ...run, nodeId: n.id, flags, pending: null, finished: n.kind === "end" };
  }
  throw new Error("Dialog: pętla bez udziału gracza");
}

export function startRun(graph: DialogueGraph, world: WorldContext): RunState {
  const empty: RunState = { nodeId: graph.start, flags: [...world.flags].sort(), transcript: [], attempts: {}, firstTry: {}, hints: {}, lastLine: null, pending: null, finished: false };
  return enter(graph, empty, graph.start, world);
}

export function currentNode(graph: DialogueGraph, run: RunState): DialogueNode {
  return node(graph, run.nodeId);
}

/** Gracz odsłonił tłumaczenie w bieżącym węźle — pomoc, odnotowana przy ocenie (FSRS: „trudne”). */
export function markHint(run: RunState): RunState {
  return run.hints[run.nodeId] ? run : { ...run, hints: { ...run.hints, [run.nodeId]: true } };
}

function record(run: RunState, nodeId: string, ok: boolean): Pick<RunState, "attempts" | "firstTry"> {
  const attempts = { ...run.attempts, [nodeId]: (run.attempts[nodeId] ?? 0) + 1 };
  const firstTry = nodeId in run.firstTry ? run.firstTry : { ...run.firstTry, [nodeId]: ok };
  return { attempts, firstTry };
}

const playerLine = (hr: string, pl: string): TranscriptEntry => ({ speaker: "player", text: { hr, pl }, player: true });

export function answer(graph: DialogueGraph, run: RunState, input: PlayerInput, world: WorldContext, rules: ValidationRules): RunState {
  if (run.pending || run.finished) return run;
  const n = node(graph, run.nodeId);

  if (n.kind === "say") {
    if (input.kind !== "continue") return run;
    return enter(graph, run, n.next, world);
  }

  if (n.kind === "choice") {
    if (input.kind !== "choice") return run;
    const option = visibleOptions(n, run, world).find((o) => o.id === input.optionId);
    if (!option) return run;
    const graded = isGraded(n) && option.verdict !== "neutral";
    const counted = graded ? record(run, n.id, option.verdict === "correct") : {};
    const verdict: Feedback["verdict"] = option.verdict === "correct" ? "correct" : option.verdict === "wrong" ? "wrong" : "neutral";
    const transcript = option.text.hr ? [...run.transcript, playerLine(fill(option.text.hr, world.vars), fill(option.text.pl, world.vars))] : run.transcript;
    return {
      ...run,
      ...counted,
      transcript,
      flags: applyEffects(run.flags, option.effects),
      pending: { feedback: { verdict, explanation: option.explanation && fill(option.explanation, world.vars), retry: false }, next: option.next },
    };
  }

  if (n.kind === "build" || n.kind === "type") {
    if (input.kind !== "text" || !input.value.trim()) return run;
    const accepted = n.accepted.map((a) => fill(a, world.vars));
    const pattern = n.pattern ? fill(n.pattern, Object.fromEntries(Object.entries(world.vars ?? {}).map(([k, v]) => [k, escapeRegExp(v)]))) : undefined;
    const check = checkLessonAnswerDetailed(input.value, accepted, rules, pattern);
    const ok = check.verdict !== "miss";
    const counted = record(run, n.id, ok);
    const transcript = [...run.transcript, playerLine(input.value.trim(), n.translation ?? "")];
    if (ok) {
      return {
        ...run,
        ...counted,
        transcript,
        pending: { feedback: { verdict: check.verdict === "near" ? "near" : "correct", expected: check.expected ?? undefined, retry: false }, next: n.next },
      };
    }
    const revealed = counted.attempts[n.id] >= MAX_ATTEMPTS;
    const feedback: Feedback = { verdict: "wrong", expected: accepted[0], explanation: n.explanation && fill(n.explanation, world.vars), retry: !revealed, revealed };
    // Reakcja postaci na błąd (np. prośba o doprecyzowanie) — tylko przy pierwszej próbie.
    const next = revealed ? n.next : n.onWrong && counted.attempts[n.id] === 1 ? n.onWrong : n.id;
    return { ...run, ...counted, transcript, pending: { feedback, next } };
  }

  return run;
}

export function proceed(graph: DialogueGraph, run: RunState, world: WorldContext): RunState {
  if (!run.pending) return run;
  const { next } = run.pending;
  if (next === run.nodeId) return { ...run, pending: null };
  return enter(graph, { ...run, pending: null }, next, world);
}

/** Wynik misji: odsetek ocenianych zadań rozwiązanych za pierwszym razem. */
export function scoreOf(run: RunState): { correct: number; total: number; percent: number } {
  const values = Object.values(run.firstTry);
  const correct = values.filter(Boolean).length;
  return { correct, total: values.length, percent: values.length ? Math.round((correct / values.length) * 100) : 100 };
}

/** Domyślny sterownik: dialog napisany ręcznie. */
export function scriptedDriver(graph: DialogueGraph, rules: ValidationRules): DialogueDriver {
  return {
    start: (world) => startRun(graph, world),
    answer: (run, input, world) => answer(graph, run, input, world, rules),
    proceed: (run, world) => proceed(graph, run, world),
  };
}

export type { Verdict };
