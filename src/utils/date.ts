export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Liczba kolejnych dni nauki zakończona dziś lub wczoraj. */
export function currentStreak(days: readonly string[]): number {
  if (days.length === 0) return 0;
  const nums = Array.from(new Set(days.map(dayNumber))).sort((a, b) => b - a);
  const today = dayNumber(todayKey());
  if (nums[0] !== today && nums[0] !== today - 1) return 0;
  let streak = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i - 1] - nums[i] === 1) streak++;
    else break;
  }
  return streak;
}

export function formatRelative(ts: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const day = 86_400_000;
  if (diff < 3_600_000) return "przed chwilą";
  if (diff < day) return "dzisiaj";
  if (diff < 2 * day) return "wczoraj";
  return `${Math.floor(diff / day)} dni temu`;
}
