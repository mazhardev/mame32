import type { ShotLog } from './physics';

/** 8-ball rules for one visit to the table. */
export type Group = 'solids' | 'stripes';
export type Player = 0 | 1;

export interface Table {
  /** Group of each player once the table is no longer open. */
  groups: [Group | null, Group | null];
  turn: Player;
  /** Balls still on the table, excluding the cue ball. */
  remaining: number[];
  isBreak: boolean;
}

export interface Verdict {
  foul: string | null;
  /** The shooter keeps the table. */
  again: boolean;
  /** Game over: who won. */
  winner: Player | null;
  /** The 8 was potted on the break and must be re-spotted. */
  respot8: boolean;
  /** Groups after the shot. */
  groups: [Group | null, Group | null];
}

export const groupOf = (n: number): Group | null => (n >= 1 && n <= 7 ? 'solids' : n >= 9 && n <= 15 ? 'stripes' : null);

export function onTheEight(t: Table, p: Player): boolean {
  const g = t.groups[p];
  return g !== null && !t.remaining.some((n) => groupOf(n) === g);
}

/**
 * Judges a shot. `t.remaining` is the state before the shot; `log` is what
 * happened during it.
 */
export function judge(t: Table, log: ShotLog): Verdict {
  const p = t.turn;
  const other: Player = p === 0 ? 1 : 0;
  const groups: [Group | null, Group | null] = [...t.groups];
  const mine = groups[p];
  const eight = onTheEight(t, p);
  const scratch = log.potted.includes(0);
  const pottedEight = log.potted.includes(8);
  const pottedObjects = log.potted.filter((n) => n !== 0 && n !== 8);

  let foul: string | null = null;
  if (log.firstHit === null) foul = 'No ball hit';
  else if (scratch) foul = 'Scratch — the cue ball went in';
  else if (mine === null && log.firstHit === 8 && !t.isBreak) foul = 'Hit the 8 first';
  else if (mine !== null && !eight && groupOf(log.firstHit) !== mine) foul = `Hit ${groupOf(log.firstHit) ?? 'the 8'} first`;
  else if (mine !== null && eight && log.firstHit !== 8) foul = 'Must hit the 8 first';

  if (pottedEight) {
    if (t.isBreak && !scratch) return { foul: null, again: true, winner: null, respot8: true, groups };
    const legal = eight && foul === null;
    return { foul: legal ? null : foul ?? 'Potted the 8 too early', again: false, winner: legal ? p : other, respot8: false, groups };
  }

  if (foul) return { foul, again: false, winner: null, respot8: false, groups };

  // Open table: the first object ball potted decides the groups.
  if (mine === null && !t.isBreak && pottedObjects.length > 0) {
    const g = groupOf(pottedObjects[0]) as Group;
    groups[p] = g;
    groups[other] = g === 'solids' ? 'stripes' : 'solids';
  }
  const myGroup = groups[p];
  const pottedOwn = myGroup === null ? pottedObjects.length > 0 : pottedObjects.some((n) => groupOf(n) === myGroup);
  return { foul: null, again: pottedOwn, winner: null, respot8: false, groups };
}
