import { HIGH_BOTTOM, frame, jump, moveLane, onGround, slide } from './game';
import type { State } from './game';
import { laneX } from './track';
import type { Lane } from './track';

/**
 * A runner that reads the track ahead, used by the tests to prove the
 * generated track can always be survived. It picks the nearest lane free of
 * trains, then jumps hurdles and slides under bars in time.
 */
function blockedAt(s: State, lane: number, z0: number, z1: number) {
  return s.items.some((it) => it.kind === 'block' && !it.taken && it.lane === lane && it.z < z1 && it.z + it.len > z0);
}

export function botStep(s: State) {
  const look = s.speed * 0.9 + 4;
  const here = s.z;
  // Choose a lane: stay if clear of trains ahead, else the nearest lane that is
  // clear ahead and that we can reach without scraping a train on the way.
  if (blockedAt(s, s.lane, here - 0.5, here + look)) {
    const options = ([-1, 0, 1] as Lane[])
      .filter((l) => l !== s.lane && !blockedAt(s, l, here - 0.5, here + look))
      .sort((a, b) => Math.abs(a - s.lane) - Math.abs(b - s.lane));
    for (const l of options) {
      const step = l > s.lane ? 1 : -1;
      const via = (s.lane + step) as Lane;
      if (blockedAt(s, via, here - 0.6, here + 1.5)) continue;
      if (Math.abs(s.x - laneX(s.lane)) < 0.05) moveLane(s, step);
      break;
    }
  }
  // Hurdles and bars in the lane we are in (or moving into).
  for (const it of s.items) {
    if (it.taken || it.lane !== s.lane) continue;
    const dz = it.z - s.z;
    if (dz < 0 || dz > 12) continue;
    if (it.kind === 'low' && dz < s.speed * 0.3 && onGround(s)) jump(s);
    if (it.kind === 'high' && dz < s.speed * 0.28 && (s.slideT <= 0.05 || !onGround(s)) && HIGH_BOTTOM > 0) slide(s);
  }
}

/** Plays a whole run with the bot; returns the distance reached. */
export function botRun(s: State, maxZ: number): number {
  while (!s.over && s.z < maxZ) {
    botStep(s);
    frame(s);
  }
  return s.z;
}
