import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'reaction-test-pro',
  title: 'Reaction Test Pro',
  category: 'brain',
  difficulty: 'medium',
  icon: '⏱️',
  tags: ['reflex', 'measurement', 'attention', 'brain'],
  short: 'A three-part reaction battery: simple, choice and go/no-go reaction times.',
  full: 'Go beyond a single reaction test. Reaction Test Pro measures three different skills: simple reaction (respond to green), choice reaction (press the side the arrow points to) and inhibition with go/no-go (respond to green but hold still for red). You get your average time and accuracy for each part.',
  minutes: 3,
  controls: {
    keyboard: ['Space or Enter responds; ← and → answer choice trials'],
    mouse: ['Click the panel; in choice trials click the left or right half'],
    touch: ['Tap the panel; in choice trials tap the left or right half'],
  },
  instructions: {
    objective: 'Respond quickly and accurately across all three parts.',
    howToPlay: [
      'Part 1 — Simple: wait for the panel to turn green, then respond immediately.',
      'Part 2 — Choice: an arrow appears; respond on the side it points to.',
      'Part 3 — Go / No-go: respond to GO (green) but do nothing for STOP (red).',
      'Responding before the stimulus appears always counts as a mistake.',
    ],
    scoring: '50 points per correct trial, plus a speed bonus for each part’s average time.',
    difficultyNotes: 'Easy has 4 trials per part, Normal 5 and Hard 6.',
    tips: ['Choice reactions are naturally about 100 ms slower than simple ones.', 'In go/no-go, speed matters less than not reacting to red.'],
    touchNotes: ['For choice trials, tap clearly on the left or right half of the panel.'],
  },
  achievements: [
    ['complete', 'Lab Subject', 'Complete the full battery.', 1, '🔬', 10],
    ['sharp', 'Sharp Reflexes', 'Average under 280 ms in the simple part.', 1, '⚡', 25],
    ['disciplined', 'Self-Control', 'Get every go/no-go trial right.', 1, '🛑', 20],
    ['sessions', 'Regular Tester', 'Complete 15 batteries.', 15, '🎖️', 20],
  ],
  load: () => import('./ReactionTestProGame'),
});
