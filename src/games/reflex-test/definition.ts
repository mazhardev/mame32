import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'reflex-test',
  title: 'Reflex Test',
  category: 'casual',
  difficulty: 'easy',
  icon: '🖱️',
  tags: ['reflex', 'measurement', 'quick', 'casual'],
  short: 'A choice-reaction test: hit whichever of four pads lights up, as fast as you can.',
  full: 'A harder cousin of the classic reaction test. After a random wait, one of four pads lights up and you must hit that exact pad — with a tap or the matching arrow key. Fifteen trials measure your average reaction time and accuracy. On Hard, some pads light red: those are traps and must be left alone.',
  minutes: 1,
  controls: {
    keyboard: ['Arrow keys hit the matching pad (↑ ← → ↓)'],
    mouse: ['Click the lit pad'],
    touch: ['Tap the lit pad'],
  },
  instructions: {
    objective: 'React to the lit pad as quickly and accurately as possible over 15 trials.',
    howToPlay: [
      'Press Start and wait. Do not press anything yet.',
      'When a pad lights up, hit it immediately.',
      'Pressing before a pad lights, or hitting the wrong pad, counts as a miss.',
      'On Hard, a red pad means “do not press”: wait for it to go out.',
    ],
    scoring: '40 points per correct trial, plus a bonus for a fast average reaction time.',
    difficultyNotes: 'Easy: 1.5 s to respond. Normal: 1.1 s. Hard: 0.9 s and red decoy pads.',
    tips: ['Rest your fingers on the arrow keys.', 'Watch the centre of the pads rather than any one pad.'],
    touchNotes: ['Use two thumbs, one for each column.'],
  },
  achievements: [
    ['fast', 'Quick Hands', 'Average under 450 ms.', 1, '⚡', 15],
    ['lightning', 'Lightning Reflexes', 'Average under 350 ms.', 1, '🌩️', 30],
    ['perfect', 'No Mistakes', 'Get all 15 trials correct.', 1, '✅', 20],
    ['rounds', 'Lab Regular', 'Complete 25 tests.', 25, '🎖️', 20],
  ],
  load: () => import('./ReflexTestGame'),
});
