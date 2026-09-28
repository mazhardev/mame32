/**
 * Random Hamiltonian paths on a w×h grid (a path through every cell once),
 * used to build path-drawing puzzles that are guaranteed solvable.
 *
 * Starts from a serpentine path and applies "backbite" moves: an end of the
 * path jumps to one of its grid neighbours already on the path, and the
 * section in between is reversed. Each move keeps the path Hamiltonian, and
 * many moves produce a well-mixed random path.
 */
export function hamiltonianPath(w: number, h: number, random: () => number): number[] {
  const path: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) path.push(y * w + (y % 2 === 0 ? x : w - 1 - x));
  }
  const pos = new Int32Array(w * h);
  const reindex = (from: number) => {
    for (let i = from; i < path.length; i++) pos[path[i]] = i;
  };
  reindex(0);
  const neighbours = (c: number) => {
    const x = c % w;
    const y = Math.floor(c / w);
    const out: number[] = [];
    if (x > 0) out.push(c - 1);
    if (x < w - 1) out.push(c + 1);
    if (y > 0) out.push(c - w);
    if (y < h - 1) out.push(c + w);
    return out;
  };
  const moves = w * h * 25;
  for (let m = 0; m < moves; m++) {
    if (random() < 0.5) {
      path.reverse();
      reindex(0);
    }
    const end = path[path.length - 1];
    const options = neighbours(end).filter((c) => c !== path[path.length - 2]);
    const pick = options[Math.floor(random() * options.length)];
    const k = pos[pick];
    // path[k] is adjacent to the end: reverse everything after k.
    const tail = path.splice(k + 1).reverse();
    path.push(...tail);
    reindex(k + 1);
  }
  return path;
}

export function areAdjacent(a: number, b: number, w: number): boolean {
  const dx = Math.abs((a % w) - (b % w));
  const dy = Math.abs(Math.floor(a / w) - Math.floor(b / w));
  return dx + dy === 1;
}
