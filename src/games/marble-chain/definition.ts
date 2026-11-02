import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'marble-chain',
  title: 'Marble Chain',
  category: 'puzzle',
  difficulty: 'medium',
  icon: '🔮',
  tags: ['marbles', 'match three', 'shooter', 'chain', 'temple', 'combo', 'levels'],
  short: 'Shoot marbles into a rolling chain and match three before it reaches the pit — 15 temple levels.',
  full: 'A chain of coloured marbles rolls along a carved temple track toward a bottomless pit. From the stone idol in the middle, shoot marbles into the chain: three or more of a colour touching disappear. When a gap opens and the marbles on either side match, the chain rolls back together, and another match there is a combo. Watch for power marbles that explode, slow the chain or roll it backwards. Clear every marble before any reach the pit, across 15 levels in the Jade, Sun and Moon temples.',
  minutes: 10,
  hasLevels: true,
  controls: {
    mouse: ['Point to aim, click to shoot', 'Click the idol to swap marbles'],
    keyboard: ['← → aim', 'Space or ↑ shoots', '↓ or X swaps marbles'],
    touch: ['Tap where you want to shoot', 'Tap the idol to swap marbles'],
  },
  instructions: {
    objective: 'Clear every marble from the track before the chain reaches the pit.',
    howToPlay: [
      'The idol holds two marbles: the one in its mouth fires next, the one on its back comes after. Swap them whenever you like.',
      'Shoot into the chain so three or more marbles of one colour touch. They vanish.',
      'If the marbles on either side of a gap share a colour, the front part rolls back to close it. A new match there scores a combo.',
      'Power marbles: ✹ explodes and takes nearby marbles with it, ◷ slows the chain for a while, ↺ rolls it backwards.',
      'When no more marbles are still to come, clear the rest to finish the level. If the chain reaches the pit, you lose a life and try the level again.',
      'Each temple you reach can be chosen from "Start at" above the game.',
    ],
    scoring: '10 points per marble, plus 100 × the combo count for chain reactions, and a bonus for every level cleared.',
    difficultyNotes: 'Easy: 5 lives, one colour fewer, a slower chain and fewer marbles. Normal: 3 lives. Hard: a faster chain with more marbles.',
    tips: [
      'Deal with the marbles nearest the pit first.',
      'Set up gaps whose ends match: one shot can then set off a whole chain reaction.',
      'Your next marble is always a colour that is still on the track.',
    ],
    touchNotes: ['Tap anywhere to shoot toward that spot, and tap the idol itself to swap marbles.'],
  },
  achievements: [
    ['first', 'Rolling Start', 'Clear your first level.', 1, '🔮', 10],
    ['combo', 'Chain Reaction', 'Score a ×3 combo.', 3, '⛓️', 25],
    ['power', 'Power Play', 'Set off a power marble.', 1, '✨', 10],
    ['marbles', 'Marble Collector', 'Clear 2,000 marbles in total.', 2000, '🏺', 40],
    ['all', 'Temple Master', 'Clear all 15 levels.', 1, '🏆', 80],
  ],
  load: () => import('./MarbleChainGame'),
});
