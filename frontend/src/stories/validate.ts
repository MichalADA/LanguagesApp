import type { Condition, DialogueGraph, DialogueNode, Effect, Story } from "./types";

/**
 * Walidacja danych Stories — uruchamiana w testach (tests/stories.test.mjs) dla każdej
 * historii, więc błąd w scenariuszu zatrzymuje build, a nie gracza w połowie misji.
 * Zwraca listę błędów (pusta = poprawnie).
 */

const SLUG = /^[a-z0-9][a-z0-9:-]{0,63}$/;
const words = (s: string) => s.toLocaleLowerCase("hr").replace(/[.,!?;:„”"…]/g, " ").split(/\s+/).filter(Boolean);

function targets(n: DialogueNode): string[] {
  switch (n.kind) {
    case "say":
    case "event":
      return [n.next];
    case "choice":
      return n.options.map((o) => o.next);
    case "build":
    case "type":
      return [n.next, ...(n.onWrong ? [n.onWrong] : [])];
    case "branch":
      return [...n.cases.map((c) => c.next), n.otherwise];
    case "end":
      return [];
  }
}

function conditionFlags(c: Condition): { flags: string[]; missions: string[] } {
  if ("flag" in c) return { flags: [c.flag], missions: [] };
  if ("notFlag" in c) return { flags: [c.notFlag], missions: [] };
  if ("mission" in c) return { flags: [], missions: [c.mission] };
  const parts = ("all" in c ? c.all : c.any).map(conditionFlags);
  return { flags: parts.flatMap((p) => p.flags), missions: parts.flatMap((p) => p.missions) };
}

const effectFlags = (effects: Effect[] = []) => effects.map((e) => ("setFlag" in e ? e.setFlag : e.clearFlag));

/** Struktura jednego grafu: identyfikatory, przejścia, osiągalność, zadania z odpowiedzią. */
export function validateGraph(graph: DialogueGraph, label: string, speakers: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(`${label}: ${msg}`);
  const ids = Object.keys(graph.nodes);
  if (!graph.nodes[graph.start]) fail(`brak węzła startowego „${graph.start}”`);
  for (const id of ids) {
    const n = graph.nodes[id];
    if (n.id !== id) fail(`klucz „${id}” ≠ id węzła „${n.id}”`);
    for (const next of targets(n)) if (!graph.nodes[next]) fail(`${id} → nieistniejący węzeł „${next}”`);
    if (n.kind === "say" && !speakers.has(n.speaker)) fail(`${id}: nieznana postać „${n.speaker}”`);
    if (n.kind === "say" && (!n.text.hr.trim() || !n.text.pl.trim())) fail(`${id}: wypowiedź bez tekstu lub tłumaczenia`);
    if (n.kind === "choice") {
      if (n.options.length < 2) fail(`${id}: wybór wymaga co najmniej dwóch opcji`);
      const optionIds = n.options.map((o) => o.id);
      if (new Set(optionIds).size !== optionIds.length) fail(`${id}: powtórzone id opcji`);
      const unconditional = n.options.filter((o) => !o.when);
      if (!unconditional.some((o) => o.verdict !== "wrong")) fail(`${id}: brak zawsze dostępnej dobrej lub neutralnej opcji (blokada postępu)`);
      for (const o of n.options) if (o.verdict === "wrong" && !o.explanation) fail(`${id}/${o.id}: błędna opcja bez wyjaśnienia`);
    }
    if (n.kind === "build" || n.kind === "type") {
      if (!n.accepted.length) fail(`${id}: brak poprawnych odpowiedzi`);
      if (!n.explanation) fail(`${id}: brak wyjaśnienia błędu`);
      if (n.pattern) {
        try {
          // {name} to zmienna szablonu; \p{L} to klasa Unicode — tej nie ruszamy.
          const re = new RegExp(n.pattern.replace(/(?<!\\[pP])\{\w+\}/g, "x"), "u");
          for (const a of n.accepted) if (!/\{\w+\}/.test(a) && !re.test(words(a).join(" "))) fail(`${id}: „${a}” nie pasuje do ramy ${n.pattern}`);
        } catch (e) {
          fail(`${id}: błędna rama ${n.pattern}: ${(e as Error).message}`);
        }
      }
    }
    if (n.kind === "build") {
      const bank = n.tokens.map((t) => words(t).join(" "));
      for (const a of n.accepted) {
        const left = [...bank];
        for (const w of words(a)) {
          const i = left.indexOf(w);
          if (i < 0) fail(`${id}: odpowiedzi „${a}” nie da się ułożyć z kafelków (brak „${w}”)`);
          else left.splice(i, 1);
        }
      }
    }
  }

  // Osiągalność: każdy węzeł z startu, a z każdego węzła — koniec rozmowy.
  const reach = (from: string) => {
    const seen = new Set<string>();
    const stack = [from];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id) || !graph.nodes[id]) continue;
      seen.add(id);
      stack.push(...targets(graph.nodes[id]));
    }
    return seen;
  };
  const fromStart = reach(graph.start);
  for (const id of ids) if (!fromStart.has(id)) fail(`węzeł „${id}” jest nieosiągalny`);
  for (const id of fromStart) {
    if (![...reach(id)].some((x) => graph.nodes[x]?.kind === "end")) fail(`z węzła „${id}” nie da się dojść do końca`);
  }
  // onWrong to reakcja na błąd — musi wracać do zadania, a nie omijać je.
  for (const n of Object.values(graph.nodes)) {
    if ((n.kind === "build" || n.kind === "type") && n.onWrong && !reach(n.onWrong).has(n.id)) fail(`${n.id}: reakcja ${n.onWrong} nie wraca do zadania`);
  }
  // Pętle bez udziału gracza (tylko event/branch) zawiesiłyby silnik.
  const auto = ids.filter((id) => ["event", "branch"].includes(graph.nodes[id].kind));
  for (const id of auto) {
    const seen = new Set<string>();
    const walk = (x: string): boolean => {
      const n = graph.nodes[x];
      if (!n || !["event", "branch"].includes(n.kind)) return false;
      if (seen.has(x)) return true;
      seen.add(x);
      return targets(n).some(walk);
    };
    if (walk(id)) fail(`pętla bez udziału gracza przez „${id}”`);
  }
  if (!ids.some((id) => graph.nodes[id].kind === "end")) fail("brak węzła końcowego");
  return errors;
}

/** Cała historia: identyfikatory, odwołania między misjami, lokacjami i postaciami, flagi, słownictwo. */
export function validateStory(story: Story): string[] {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(`${story.id}: ${msg}`);
  const unique = (list: string[], what: string) => {
    if (new Set(list).size !== list.length) fail(`powtórzone id (${what})`);
    for (const id of list) if (!SLUG.test(id)) fail(`id „${id}” (${what}) nie jest slugiem`);
  };
  unique(story.npcs.map((n) => n.id), "postacie");
  unique(story.locations.map((l) => l.id), "lokacje");
  unique(story.missions.map((m) => m.id), "misje");

  const npcs = new Set(story.npcs.map((n) => n.id));
  const locations = new Map(story.locations.map((l) => [l.id, l]));
  const missions = new Set(story.missions.map((m) => m.id));
  const speakers = new Set([...npcs, "narrator"]);

  // Flagi ustawiane gdziekolwiek w historii — warunek na flagę, której nic nie ustawia, to martwa ścieżka.
  const setFlags = new Set<string>();
  for (const m of story.missions) {
    for (const n of Object.values(m.dialogue.graph.nodes)) {
      if (n.kind === "event" || n.kind === "say") effectFlags(n.effects).forEach((f) => setFlags.add(f));
      if (n.kind === "choice") n.options.forEach((o) => effectFlags(o.effects).forEach((f) => setFlags.add(f)));
    }
  }
  const checkCondition = (c: Condition, where: string) => {
    const { flags, missions: ms } = conditionFlags(c);
    for (const f of flags) if (!setFlags.has(f)) fail(`${where}: warunek na flagę „${f}”, której nic nie ustawia`);
    for (const id of ms) if (!missions.has(id)) fail(`${where}: warunek na nieistniejącą misję „${id}”`);
  };

  for (const l of story.locations) {
    if (l.unlock) checkCondition(l.unlock, `lokacja ${l.id}`);
    if (l.map.x < 0 || l.map.x > 100 || l.map.y < 0 || l.map.y > 100) fail(`lokacja ${l.id}: pozycja poza mapą`);
  }

  const orders = story.missions.map((m) => m.order);
  if (new Set(orders).size !== orders.length) fail("powtórzone numery misji");
  for (const m of story.missions) {
    const where = `misja ${m.id}`;
    const location = locations.get(m.locationId);
    if (!location) fail(`${where}: nieznana lokacja „${m.locationId}”`);
    else if (location.comingSoon) fail(`${where}: lokacja „${m.locationId}” jest tylko zapowiedziana`);
    if (!npcs.has(m.npcId)) fail(`${where}: nieznana postać „${m.npcId}”`);
    for (const r of m.requires) if (!missions.has(r)) fail(`${where}: wymaga nieistniejącej misji „${r}”`);
    if (m.xp < 0 || m.xp > 500) fail(`${where}: nagroda poza zakresem 0–500`);
    if (!m.vocabulary.length) fail(`${where}: brak słownictwa`);
    for (const w of m.vocabulary) if (!w.review.itemId.startsWith(`${story.courseId}:`)) fail(`${where}: „${w.hr}” — karta spoza kursu`);
    for (const o of m.objectives) checkCondition(o.done, where);
    for (const n of Object.values(m.dialogue.graph.nodes)) {
      if ((n.kind === "build" || n.kind === "type") && n.practice && !m.vocabulary.some((w) => w.hr === n.practice)) {
        fail(`${where}/${n.id}: ćwiczone słowo „${n.practice}” nie jest w słownictwie misji`);
      }
      if (n.kind === "branch") n.cases.forEach((c) => checkCondition(c.when, `${where}/${n.id}`));
      if (n.kind === "choice") n.options.forEach((o) => o.when && checkCondition(o.when, `${where}/${n.id}/${o.id}`));
    }
    errors.push(...validateGraph(m.dialogue.graph, `${story.id}/${m.id}`, speakers));
  }

  // Zależności misji bez cykli — inaczej któraś misja nigdy się nie odblokuje.
  const byId = new Map(story.missions.map((m) => [m.id, m]));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string): boolean => {
    if (done.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    const cyclic = (byId.get(id)?.requires ?? []).some(visit);
    visiting.delete(id);
    done.add(id);
    return cyclic;
  };
  for (const m of story.missions) if (visit(m.id)) fail(`cykl w wymaganiach misji przez „${m.id}”`);
  return errors;
}
