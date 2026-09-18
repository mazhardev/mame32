export type Tubes = number[][];
export const CAPACITY = 4;
export function pour(tubes: Tubes, from: number, to: number): Tubes | null {
  if (from === to || !tubes[from]?.length || !tubes[to] || tubes[to].length >= CAPACITY)
    return null;
  const source = tubes[from],
    target = tubes[to],
    color = source[source.length - 1];
  if (target.length && target[target.length - 1] !== color) return null;
  let run = 0;
  for (let i = source.length - 1; i >= 0 && source[i] === color; i--) run++;
  const amount = Math.min(run, CAPACITY - target.length);
  return tubes.map((tube, i) =>
    i === from
      ? tube.slice(0, -amount)
      : i === to
        ? [...tube, ...Array<number>(amount).fill(color)]
        : tube.slice(),
  );
}
export function solved(tubes: Tubes) {
  return tubes.every((t) => !t.length || (t.length === CAPACITY && t.every((v) => v === t[0])));
}
export function generate(colors: number, random = Math.random) {
  let tubes: Tubes = [
    ...Array.from({ length: colors }, (_, i) => Array<number>(CAPACITY).fill(i)),
    [],
    [],
  ];
  const solution: { from: number; to: number }[] = [];
  for (let step = 0; step < 500; step++) {
    const from = Math.floor(random() * tubes.length),
      to = Math.floor(random() * tubes.length);
    if (from === to || !tubes[from].length || tubes[to].length === CAPACITY) continue;
    const color = tubes[from][tubes[from].length - 1];
    const candidate = tubes.map((t) => t.slice());
    candidate[from].pop();
    candidate[to].push(color);
    const restored = pour(candidate, to, from);
    if (!restored || JSON.stringify(restored) !== JSON.stringify(tubes)) continue;
    tubes = candidate;
    solution.unshift({ from: to, to: from });
  }
  return { tubes, solution };
}
export function validSave(value: unknown): value is { tubes: Tubes; moves: number } {
  if (!value || typeof value !== 'object') return false;
  const v = value as { tubes?: unknown; moves?: unknown };
  if (
    !Number.isInteger(v.moves) ||
    Number(v.moves) < 0 ||
    !Array.isArray(v.tubes) ||
    v.tubes.length < 5 ||
    v.tubes.length > 10
  )
    return false;
  const counts = new Map<number, number>();
  for (const tube of v.tubes) {
    if (!Array.isArray(tube) || tube.length > 4) return false;
    for (const c of tube) {
      if (!Number.isInteger(c) || c < 0 || c > 7) return false;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  return counts.size === v.tubes.length - 2 && [...counts.values()].every((n) => n === 4);
}
