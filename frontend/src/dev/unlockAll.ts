/**
 * Tryb testowy „odblokuj wszystko”: kurs (lekcje i moduły) oraz Stories (lokacje i misje) są dostępne
 * bez przechodzenia po kolei. Postęp, XP i powtórki działają normalnie — zmienia się tylko dostępność.
 *
 * Włączenie / wyłączenie (zapamiętywane w tej przeglądarce):
 *   http://localhost:5173/?unlockAll=1     albo w konsoli: lexodromia.unlockAll()
 *   http://localhost:5173/?unlockAll=0     albo w konsoli: lexodromia.lockAgain()
 * Gdy tryb jest włączony, w rogu ekranu widać znacznik z przyciskiem „Wyłącz”.
 */
const KEY = "lexodromia:unlock-all";

export function isUnlockAll(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setUnlockAll(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Prywatne okno / zablokowany storage — tryb po prostu się nie zapamięta.
  }
}

/** Przy starcie aplikacji: parametr ?unlockAll=1|0 w adresie i polecenia w konsoli. */
export function initUnlockAll(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const param = url.searchParams.get("unlockAll");
  if (param === "1" || param === "0") {
    setUnlockAll(param === "1");
    url.searchParams.delete("unlockAll");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  const reload = () => window.location.reload();
  (window as unknown as { lexodromia: Record<string, () => void> }).lexodromia = {
    unlockAll: () => (setUnlockAll(true), reload()),
    lockAgain: () => (setUnlockAll(false), reload()),
  };
}
