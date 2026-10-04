import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'mini-tycoon',
  title: 'Mini Tycoon',
  category: 'strategy',
  difficulty: 'easy',
  icon: '🎩',
  tags: ['idle', 'tycoon', 'business', 'managers', 'save', 'economy'],
  short:
    'Run a lemonade cart, then car washes, cafés and theme parks — and hire managers to run them for you.',
  full: 'Start with a single lemonade cart and grow a business empire. Each business pays out when its cycle finishes; tap it to start the next one, or hire a manager to keep it running automatically, even while you are away. Owning 25, 50, 100 and 200 of a business doubles its speed each time. Progress saves automatically.',
  minutes: 20,
  hasSaveState: true,
  controls: {
    keyboard: ['1–7 run a business', 'Tab to the Buy and Manager buttons'],
    mouse: ['Click a business icon to run it; click Buy and Hire buttons'],
    touch: ['Tap a business icon to run it; tap Buy and Hire'],
  },
  instructions: {
    objective: 'Earn the target amount of money in total.',
    howToPlay: [
      'Tap a business to start a cycle; it pays when the bar fills.',
      'Buy more of a business to multiply what each cycle pays.',
      'Hire a manager and the business runs by itself, forever.',
      'Reaching 25, 50, 100 and 200 of a business doubles its speed each time.',
    ],
    scoring: 'Reaching the goal faster scores more.',
    difficultyNotes:
      'Easy: $50 million goal and 20% cheaper prices. Normal: $500 million. Hard: $2 billion with 25% higher prices.',
    tips: [
      'Hire the lemonade manager first — it never stops.',
      'Push a business to the next speed milestone when you can.',
    ],
    touchNotes: [
      'Buttons are large; tap the icon repeatedly for fast businesses until you can hire a manager.',
    ],
  },
  achievements: [
    ['manager', 'Delegation', 'Hire your first manager.', 1, '👔', 10],
    ['carts', 'Lemonade Fleet', 'Own 100 lemonade carts.', 100, '🍋', 20],
    ['million', 'Millionaire', 'Earn $1 million.', 1, '💵', 20],
    ['managers', 'Fully Staffed', 'Hire all 7 managers.', 7, '🏢', 30],
    ['park', 'Showtime', 'Open a theme park.', 1, '🎢', 30],
  ],
  load: () => import('./MiniTycoonGame'),
});
