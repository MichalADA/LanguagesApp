import type { BranchNode, BuildNode, ChoiceNode, ChoiceOption, Condition, DialogueGraph, DialogueNode, Effect, EndNode, EventNode, Mood, SayNode, TypeNode } from "../types";

/**
 * Zwięzłe konstruktory węzłów dla plików ze scenariuszami. Wynik to zwykłe dane
 * (DialogueGraph) — można je też pisać ręcznie albo trzymać w JSON.
 */

export const say = (id: string, speaker: string, hr: string, pl: string, next: string, extra: { mood?: Mood; effects?: Effect[]; audioSrc?: string } = {}): SayNode => ({
  id,
  kind: "say",
  speaker,
  text: { hr, pl },
  next,
  ...extra,
});

export const option = (id: string, hr: string, pl: string, verdict: ChoiceOption["verdict"], next: string, extra: Partial<Omit<ChoiceOption, "id" | "text" | "verdict" | "next">> = {}): ChoiceOption => ({
  id,
  text: { hr, pl },
  verdict,
  next,
  ...extra,
});

export const choice = (id: string, instruction: string, options: ChoiceOption[], extra: { graded?: boolean } = {}): ChoiceNode => ({ id, kind: "choice", instruction, options, ...extra });

export const build = (id: string, spec: Omit<BuildNode, "id" | "kind">): BuildNode => ({ id, kind: "build", ...spec });

export const type = (id: string, spec: Omit<TypeNode, "id" | "kind">): TypeNode => ({ id, kind: "type", ...spec });

export const branch = (id: string, cases: { when: Condition; next: string }[], otherwise: string): BranchNode => ({ id, kind: "branch", cases, otherwise });

export const event = (id: string, effects: Effect[], next: string): EventNode => ({ id, kind: "event", effects, next });

export const end = (id = "end"): EndNode => ({ id, kind: "end" });

export const graph = (start: string, nodes: DialogueNode[]): DialogueGraph => ({ start, nodes: Object.fromEntries(nodes.map((n) => [n.id, n])) });

export const flag = (name: string): Effect => ({ setFlag: name });
