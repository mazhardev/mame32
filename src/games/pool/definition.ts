import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'pool',
  title: 'Pool',
  category: 'sports',
  difficulty: 'medium',
  icon: '🎱',
  tags: ['8-ball', 'billiards', 'cue', 'physics', 'ai', 'sports'],
  short: 'Play 8-ball pool against the computer: pot your group, then sink the 8.',
  full: 'A full frame of 8-ball pool against a computer opponent, with real ball physics. Break the rack, claim solids or stripes with your first pot, clear your group and then sink the black 8 to win. Fouls — scratching the cue ball, hitting the wrong ball first or missing everything — give your opponent ball in hand anywhere on the table.',
  minutes: 8,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['← → aim (hold X for fine aim)', '↑ ↓ set power', 'Space shoots', 'Arrows move the cue ball when you have ball in hand'],
    mouse: ['Point the cue; hold the button to build power and release to shoot', 'With ball in hand, move the ball and click to place it'],
    touch: ['Touch where to aim; hold to build power and lift to shoot', 'With ball in hand, drag the ball and lift to place it'],
  },
  instructions: {
    objective: 'Pot all seven of your balls, then the 8, before the computer does.',
    howToPlay: [
      'Break from behind the line. The table stays open until someone pots a ball after the break.',
      'Your first pot decides your group: solids (1–7) or stripes (9–15).',
      'Each shot must hit one of your own balls first. Pot one to keep shooting.',
      'Once your group is cleared, call the 8: hit it first and sink it to win.',
      'Pot the 8 early, or scratch while potting it, and you lose the frame.',
    ],
    scoring: '50 points for each ball you pot and 500 for winning the frame.',
    difficultyNotes: 'Easy shows a long guide for where the object ball will go and the computer aims loosely. Hard has no object-ball guide, and the computer plans carefully and rarely misses.',
    tips: ['Softer shots leave the cue ball closer to the next target.', 'If nothing is on, roll gently onto one of your balls rather than giving away a foul.'],
    touchNotes: ['The power bar on the right rises and falls while you hold — lift at the right moment.'],
  },
  achievements: [
    ['win', 'Frame Winner', 'Beat the computer.', 1, '🎱', 20],
    ['run', 'On a Roll', 'Pot 3 balls in one visit.', 3, '🔥', 20],
    ['hard', 'Pool Shark', 'Win on Hard.', 1, '🦈', 40],
    ['wins', 'Hall Regular', 'Win 10 frames.', 10, '🎖️', 30],
  ],
  load: () => import('./PoolGame'),
});
