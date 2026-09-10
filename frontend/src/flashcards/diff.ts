/**
 * Character-level diff between what the user typed and the correct answer.
 *
 * The point isn't linguistic accuracy — it's to point out "you almost had it,
 * you missed a diacritic here" in a compact way. Green means matches,
 * amber means differs; the correct string is always rendered in full.
 */
export interface DiffSegment {
  text: string;
  match: boolean;
}

export function segmentDiff(user: string, correct: string): DiffSegment[] {
  if (!user) return correct ? [{ text: correct, match: false }] : [];
  const rows = Math.min(correct.length, 200);
  const cols = Math.min(user.length, 200);
  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));

  const c = normalise(correct);
  const u = normalise(user);

  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      if (c[i - 1] === u[j - 1]) table[i][j] = table[i - 1][j - 1] + 1;
      else table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  const marks: boolean[] = new Array(rows).fill(false);
  let i = rows;
  let j = cols;
  while (i > 0 && j > 0) {
    if (c[i - 1] === u[j - 1]) {
      marks[i - 1] = true;
      i -= 1;
      j -= 1;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  const out: DiffSegment[] = [];
  let buffer = "";
  let currentMatch = marks[0] ?? false;
  for (let k = 0; k < rows; k++) {
    const match = marks[k];
    if (match === currentMatch) buffer += correct[k];
    else {
      if (buffer) out.push({ text: buffer, match: currentMatch });
      buffer = correct[k];
      currentMatch = match;
    }
  }
  if (buffer) out.push({ text: buffer, match: currentMatch });
  return out;
}

function normalise(input: string): string {
  return input.normalize("NFC").toLocaleLowerCase();
}
