import type { DifficultySetting } from '@/types';
import {
  CAPACITY,
  FAMILY,
  TUNING,
  build,
  costOf,
  jobs,
  nextMonth,
  hasRoad,
  population,
  powered,
  working,
} from './engine';
import type { City, Tool } from './engine';

/**
 * A simple planner used by the balance tests: roads on rows 2, 5 and 8,
 * factories along the bottom, parks on the top row, homes and shops in
 * between. It is deliberately unclever; if it reaches the goal, a person can.
 */
export function plan(c: City): Record<Exclude<Tool, 'bulldoze' | 'upgrade'>, number[]> {
  const s = c.size;
  const at = (x: number, y: number) => y * s + x;
  const rows = (ys: number[], xs = [...Array(s).keys()]) =>
    ys.flatMap((y) => xs.map((x) => at(x, y)));
  const ok = (i: number) => c.tiles[i].kind !== 'water';
  const power = [at(4, 3), at(4, 7), at(1, 4), at(8, 4)].filter(ok);
  const road = [...rows([5]), ...rows([2]), ...rows([8])].filter(ok);
  const shop = [at(2, 3), at(6, 6), ...rows([7])].filter(ok);
  const factory = rows([9]).filter(ok);
  const park = [at(5, 3), at(1, 6), at(8, 6), at(3, 1), ...rows([0])].filter(ok);
  const taken = new Set([...power, ...road, ...shop, ...factory, ...park]);
  const house = rows([4, 6, 3, 1]).filter((i) => ok(i) && !taken.has(i));
  return { power, road, shop, factory, park, house };
}

export function botMonth(c: City, p: ReturnType<typeof plan>) {
  const next = (tool: Exclude<Tool, 'bulldoze' | 'upgrade'>) =>
    p[tool].find(
      (i) =>
        costOf(c, i, tool) !== null &&
        (tool === 'road' ||
          tool === 'power' ||
          tool === 'park' ||
          (hasRoad(c, i) && powered(c, i))),
    );
  const tryBuild = (tool: Exclude<Tool, 'bulldoze' | 'upgrade'>, reserve = 0) => {
    const i = next(tool);
    if (i === undefined) return false;
    const cost = costOf(c, i, tool)!;
    if (c.money - cost < reserve) return false;
    return build(c, i, tool);
  };
  const upgrade = () => {
    const i = c.tiles.findIndex(
      (t, k) =>
        (t.kind === 'shop' || t.kind === 'factory') &&
        working(c, k) &&
        costOf(c, k, 'upgrade') !== null &&
        c.money >= costOf(c, k, 'upgrade')!,
    );
    return i >= 0 && build(c, i, 'upgrade');
  };
  if (c.month === 1) {
    tryBuild('power');
    for (let k = 0; k < 10; k++) tryBuild('road');
  }
  for (let guard = 0; guard < 30; guard++) {
    const pop = population(c);
    const room = c.tiles.reduce(
      (a, t, i) => a + (t.kind === 'house' && working(c, i) ? CAPACITY[t.level] - t.pop : 0),
      0,
    );
    const demand = jobs(c) * FAMILY + 20 - pop;
    let did = false;
    if (demand < 15)
      did =
        tryBuild('shop') ||
        tryBuild('factory') ||
        upgrade() ||
        tryBuild('road', 150) ||
        tryBuild('power', 100);
    else if (room < 20) {
      // Make sure the next house has a road and power before building it.
      did = tryBuild('house') || tryBuild('road', 150) || tryBuild('power', 100);
    }
    if (!did && c.month > 3 && c.money > 400)
      did = tryBuild('power') || tryBuild('park') || tryBuild('road');
    if (!did) break;
  }
}

export function runBot(
  seed: number,
  d: DifficultySetting,
  newCity: (seed: number, d: DifficultySetting) => City,
) {
  const c = newCity(seed, d);
  const p = plan(c);
  const t = TUNING[d];
  while (c.month <= t.months) {
    botMonth(c, p);
    nextMonth(c, d);
    if (population(c) >= t.goal) return { won: true, month: c.month, pop: population(c), c };
  }
  return { won: false, month: c.month, pop: population(c), c };
}
