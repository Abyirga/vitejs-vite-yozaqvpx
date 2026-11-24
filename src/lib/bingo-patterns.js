/**
 * The only winning shapes in AfroGo Bingo: the five rows, the five columns,
 * both diagonals and the four corners. Cells are laid out row-major with the
 * free centre at index 12.
 */
 const FREE = 12;

 const ROWS = [0, 1, 2, 3, 4].map((r) => ({
   key: `row-${r}`,
   label: `Row ${r + 1}`,
   indices: [0, 1, 2, 3, 4].map((c) => r * 5 + c),
 }));
 
 const COLS = ["B", "I", "N", "G", "O"].map((letter, c) => ({
   key: `col-${letter}`,
   label: `${letter} column`,
   indices: [0, 1, 2, 3, 4].map((r) => r * 5 + c),
 }));
 
 const DIAGONALS = [
   { key: "diag-1", label: "Diagonal", indices: [0, 6, 12, 18, 24] },
   { key: "diag-2", label: "Diagonal", indices: [4, 8, 12, 16, 20] },
 ];
 
 const CORNERS = { key: "corners", label: "Four corners", indices: [0, 4, 20, 24] };
 
 export const WINNING_PATTERNS = [...ROWS, ...COLS, ...DIAGONALS, CORNERS];
 
 /** Card numbers a pattern still needs called (the free centre is always counted). */
 function patternNumbers(card, pattern) {
   return pattern.indices
     .filter((i) => i !== FREE)
     .map((i) => card[i] ?? 0)
     .filter((n) => n > 0);
 }
 
 export function completedPatterns(card, drawnSet) {
   return WINNING_PATTERNS.filter((p) =>
     patternNumbers(card, p).every((n) => drawnSet.has(n))
   );
 }
 
 /** The shape closest to completion, used for the "still missing" messages. */
 export function closestPattern(card, drawnSet) {
  let best = null;
  for (const pattern of WINNING_PATTERNS) {
    const remaining = patternNumbers(card, pattern).filter((n) => !drawnSet.has(n)).length;
    if (!best || remaining < best.remaining) best = { pattern, remaining };
  }
  return best || { pattern: null, remaining: 0 };
}

/**
 * The completed pattern on a card that finished earliest in the draw order —
 * this is the shape shown when a round is revealed to the room.
 */
export function winningPattern(card, drawn) {
  const order = new Map();
  drawn.forEach((n, i) => order.set(n, i));

  let best = null;
  for (const pattern of WINNING_PATTERNS) {
    let last = -1;
    let complete = true;
    for (const n of patternNumbers(card, pattern)) {
      const pos = order.get(n);
      if (pos === undefined) {
        complete = false;
        break;
      }
      if (pos > last) last = pos;
    }
    if (complete && (!best || last < best.last)) best = { pattern, last };
  }
  return best ? best.pattern : null;
}

/** Draw position at which a card first completes any pattern. */
export function fastestPatternIndex(card, sequence) {
  const positionOf = new Map();
  sequence.forEach((n, i) => positionOf.set(n, i));

  let best = Infinity;
  for (const pattern of WINNING_PATTERNS) {
    let last = -1;
    let possible = true;
    for (const n of patternNumbers(card, pattern)) {
      const pos = positionOf.get(n);
      if (pos === undefined) {
        possible = false;
        break;
      }
      if (pos > last) last = pos;
    }
    if (possible && last < best) best = last;
  }
  return best === Infinity ? null : best;
}