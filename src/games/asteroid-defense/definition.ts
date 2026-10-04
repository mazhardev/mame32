import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'asteroid-defense',
  title: 'Asteroid Defense',
  category: 'action',
  difficulty: 'medium',
  icon: '☄️',
  tags: ['defense', 'aim', 'waves', 'upgrades', 'action'],
  short: 'Spin an orbital cannon around your planet and shatter asteroids from every side.',
  full: 'Asteroids are falling towards your little planet from every direction. Your cannon rides an orbit around it: rotate it to face the incoming rocks and blast them apart. Big asteroids split into smaller ones, so do not let them get close. Survive a wave and pick an upgrade — a faster fire rate, a twin cannon or shield repairs.',
  minutes: 5,
  controls: {
    keyboard: ['← → rotate the cannon', 'Space fires', '1, 2, 3 choose an upgrade'],
    mouse: ['Point to rotate the cannon, hold to fire, click an upgrade'],
    touch: ['Touch and hold to aim and fire; tap an upgrade'],
  },
  instructions: {
    objective: 'Protect the planet for as many waves as possible.',
    howToPlay: [
      'Asteroids head for the planet from all sides.',
      'The cannon moves around the planet at a limited speed, so turn early.',
      'Large rocks split into two small ones when hit.',
      'Impacts drain the planet’s shield: 2 for a large rock, 1 for a small one.',
      'After each wave, choose an upgrade.',
    ],
    scoring: '20 per large rock, 10 per small rock, plus 100 × the wave number for each wave survived.',
    difficultyNotes: 'Higher difficulty makes asteroids faster.',
    tips: ['Shoot large rocks far out so their pieces have further to travel.', 'Twin cannon early makes later waves much easier.'],
    touchNotes: ['Hold your finger on the side the asteroids are coming from.'],
  },
  achievements: [
    ['wave-5', 'Planetary Guard', 'Survive to wave 5.', 5, '☄️', 15],
    ['wave-10', 'Impact Denied', 'Survive to wave 10.', 10, '🏆', 30],
    ['total', 'Rock Crusher', 'Destroy 1,000 asteroids in total.', 1000, '🎖️', 30],
  ],
  load: () => import('./AsteroidDefenseGame'),
});
