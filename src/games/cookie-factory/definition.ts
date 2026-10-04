import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cookie-factory',
  title: 'Cookie Factory',
  category: 'strategy',
  difficulty: 'easy',
  icon: '🍪',
  tags: ['idle', 'clicker', 'incremental', 'save', 'economy'],
  short: 'Click the cookie, build bakeries and sugar mines, and bake your way to a cookie empire.',
  full: 'An incremental baking game. Click the big cookie to bake by hand, then spend your cookies on rolling pins, ovens, bakeries, wheat fields, factory lines and more — each one bakes cookies every second, even while you are away. Upgrades double your buildings, golden cookies bring frenzies, and your progress saves automatically.',
  minutes: 20,
  hasSaveState: true,
  controls: {
    keyboard: ['Space bakes a cookie', '1–8 buy buildings', 'Tab to the shop buttons'],
    mouse: ['Click the cookie; click shop items to buy'],
    touch: ['Tap the cookie; tap shop items to buy'],
  },
  instructions: {
    objective: 'Bake the target number of cookies in total.',
    howToPlay: [
      'Click the cookie to bake by hand.',
      'Buildings bake cookies every second; each one costs a little more than the last.',
      'Upgrades appear as you grow — they double a building’s output or make clicks stronger.',
      'Click a golden cookie when it appears for a frenzy or a lucky windfall.',
      'Your bakery keeps working (at half speed) while you are away, up to a time limit.',
    ],
    scoring: 'Reaching the goal faster scores more.',
    difficultyNotes:
      'Easy: goal of 1 million, cheaper buildings, 4 hours of offline baking. Normal: 10 million. Hard: 100 million, steeper prices and only 1 hour offline.',
    tips: [
      'Buy the building that pays for itself fastest.',
      'Save golden-cookie frenzies for when your bakery is big.',
    ],
    touchNotes: ['Tap rapidly on the cookie early on — clicks matter most at the start.'],
  },
  achievements: [
    ['first', 'First Batch', 'Bake 100 cookies.', 1, '🍪', 5],
    ['k', 'Home Baker', 'Bake 100,000 cookies.', 1, '🧁', 15],
    ['m', 'Cookie Tycoon', 'Bake 10 million cookies.', 1, '🏭', 30],
    ['golden', 'Golden Touch', 'Click a golden cookie.', 1, '🌟', 15],
    ['clicks', 'Busy Hands', 'Click the cookie 1,000 times.', 1000, '👆', 20],
  ],
  load: () => import('./CookieFactoryGame'),
});
