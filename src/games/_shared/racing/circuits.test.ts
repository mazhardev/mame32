import { describe, expect, it } from 'vitest';
import { emptyInput } from '../arcade/kit';
import { config as topDown, spec as topDownSpec } from '../../top-down-racing/game';
import { config as formula, spec as formulaSpec } from '../../formula-racing/game';
import { config as circuit, spec as circuitSpec } from '../../circuit-racing/game';
import { config as boat, spec as boatSpec } from '../../boat-racing/game';
import { buildTrack } from './track';
import { createRace, updateRace } from './race';

/** Every circuit must be drivable: an AI field finishes the race in reasonable time. */
describe('circuits are raceable', () => {
  const games = [topDown, formula, circuit, boat];
  for (const g of games) {
    for (const t of g.tracks) {
      it(`${g.id}: ${t.name}`, () => {
        const track = buildTrack(t.points, t.width);
        const core = createRace(track, 2, ['A', 'B', 'C'], ['r', 'g', 'b'], [0.3, 0.6, 0.9]);
        for (let i = 0; i < 60 * 240 && core.finishOrder.length < 3; i++) updateRace(core, 1 / 60, { throttle: 0, steer: 0 }, g.player, g.ai.normal, () => 0.5);
        expect(core.finishOrder).toHaveLength(3);
      });
    }
  }

  it('the player starts behind the line and the countdown holds everyone', () => {
    for (const spec of [topDownSpec, formulaSpec, circuitSpec, boatSpec]) {
      const s = spec.create('normal', () => 0.5);
      const before = s.core.racers.map((r) => [r.car.x, r.car.y]);
      spec.update(s, 1, emptyInput(), () => 0.5);
      expect(s.core.racers.map((r) => [r.car.x, r.car.y])).toEqual(before);
    }
  });
});
