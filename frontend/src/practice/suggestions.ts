import { CHEATSHEETS, type CheatSheet } from "@/grammar/cheatsheets";
import type { ListeningKind, ListeningLevel } from "@/listening/types";

/** Poziomy, dla których są słuchanki i ściągi (B2 kursu dostaje materiał B1). */
type PracticeLevel = ListeningLevel;
const toPracticeLevel = (level: string): PracticeLevel =>
  level === "A1" || level === "A2" ? level : "B1";

/**
 * Ściąga do tematu z bieżącego modułu. Kilka tematów w module → rotacja po numerze lekcji;
 * moduł bez własnej ściągi → ostatni temat omówiony wcześniej na tym poziomie.
 */
export function grammarSheetFor(level: string, module: number | undefined, lessonNumber = 0): CheatSheet | undefined {
  const lv = toPracticeLevel(level);
  const m = module ?? 1;
  const here = CHEATSHEETS.filter(sheet => sheet.modules[lv]?.includes(m));
  if (here.length) return here[lessonNumber % here.length];
  const earlier = CHEATSHEETS
    .map(sheet => ({ sheet, last: Math.max(-1, ...(sheet.modules[lv] ?? []).filter(n => n < m)) }))
    .filter(item => item.last >= 0)
    .sort((a, b) => b.last - a.last);
  return earlier[0]?.sheet ?? CHEATSHEETS.find(sheet => sheet.level.startsWith(lv));
}

export const grammarHref = (sheet?: CheatSheet) => (sheet ? `/gramatyka#${sheet.id}` : "/gramatyka");

/** Dialogi i historie na zmianę, żeby po kolejnych lekcjach podpowiadać oba rodzaje. */
export function listeningSuggestion(level: string, lessonNumber = 0): { level: PracticeLevel; kind: ListeningKind; href: string } {
  const lv = toPracticeLevel(level);
  const kind: ListeningKind = lessonNumber % 2 === 0 ? "stories" : "dialogues";
  return { level: lv, kind, href: `/gry/listening?level=${lv}&kind=${kind}` };
}
