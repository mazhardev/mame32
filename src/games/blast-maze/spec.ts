import { reportProgress } from '@/achievements/AchievementService';
import { DEFAULT_KEYS } from '../_shared/arcade/kit';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { BOMBER_NAMES, render } from './draw';
import { AREAS, PER_AREA, STAGES, create, update } from './game';
import { H, W } from './maze';
import type { Mode, State } from './world';

const ID = 'blast-maze';

export const stageLabel = (i: number) => `${Math.floor(i / PER_AREA) + 1}-${(i % PER_AREA) + 1}`;

function power(s: State) {
  const b = s.bombers[0];
  const extra = `${b.remote ? '📡' : ''}${b.kick ? '👢' : ''}${b.pass ? '👻' : ''}`;
  return `💣${b.bombs} 🔥${b.fire} 👟${b.speed}${extra ? ` ${extra}` : ''}`;
}

export function makeSpec(mode: () => Mode, start: () => number): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (difficulty, random) => create(difficulty, random, mode(), start()),
    update,
    render,
    hud: (s) =>
      s.mode === 'adventure'
        ? [
            { label: 'Score', value: s.score.toLocaleString() },
            { label: 'Stage', value: stageLabel(s.stage) },
            { label: 'Lives', value: s.lives },
            { label: 'Time', value: Math.ceil(s.clock) },
            { label: 'Power', value: power(s) },
          ]
        : [
            { label: 'Round', value: s.round },
            { label: 'Your wins', value: `${s.bombers[0].wins}/3` },
            { label: 'Best rival', value: `${Math.max(...s.bombers.slice(1).map((b) => b.wins))}/3` },
            { label: 'Time', value: Math.ceil(s.clock) },
            { label: 'Power', value: power(s) },
          ],
    result: (s) => {
      if (s.mode === 'battle') {
        const champ = s.bombers.find((b) => b.wins >= 3);
        return {
          won: s.won,
          lost: !s.won,
          score: s.score,
          title: s.won ? 'Champion! You won the battle 🏆' : `${BOMBER_NAMES[champ?.id ?? 1]} wins the battle`,
          details: [
            { label: 'Rounds won', value: String(s.bombers[0].wins) },
            { label: 'Rivals blasted', value: String(s.bombers[0].kills) },
          ],
        };
      }
      return {
        won: s.won,
        lost: !s.won,
        score: s.score,
        title: s.won ? 'All 40 stages cleared! 💣' : 'Game over',
        message: s.won ? 'Every boss is beaten and the maze is safe.' : `You reached stage ${stageLabel(s.stage)} in ${AREAS[s.plan.area].name}.`,
        details: [
          { label: 'Stages cleared', value: String(s.stats.cleared) },
          { label: 'Bosses beaten', value: String(s.stats.bosses) },
          { label: 'Best blast chain', value: String(s.stats.bestChain) },
        ],
      };
    },
    onEnd: (s) => {
      if (s.stats.cleared > 0) void reportProgress(`${ID}.first`, 1);
      if (s.stats.bosses > 0) void reportProgress(`${ID}.boss`, 1);
      void reportProgress(`${ID}.chain`, s.stats.bestChain);
      void reportProgress(`${ID}.fire`, s.stats.maxFire);
      if (s.mode === 'adventure' && s.won) void reportProgress(`${ID}.champion`, 1);
      if (s.stats.roundsWon > 0) void reportProgress(`${ID}.round`, 1);
      if (s.stats.matchWon) void reportProgress(`${ID}.battle`, 1);
    },
    touch: {
      pad: 'dpad',
      buttons: [
        { action: 'action2', label: '📡' },
        { action: 'action', label: '💣' },
      ],
    },
    keys: { ...DEFAULT_KEYS, z: 'action', Z: 'action', j: 'action', J: 'action', k: 'action2', K: 'action2', c: 'action2', C: 'action2' },
    startHint: 'Arrow keys or WASD move · Space or Z drops a bomb · X or Shift sets off remote bombs.',
  };
}

export const START_POINTS = AREAS.map((a, k) => ({ index: k * PER_AREA, label: `${k + 1}. ${a.name}` }));
export const describe = (reached: number) => `Stage ${stageLabel(reached)} of ${STAGES} reached`;
