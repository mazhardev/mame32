import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'boss-battle',
  title: 'Boss Battle',
  category: 'action',
  difficulty: 'hard',
  icon: '🐲',
  tags: ['patterns', 'bullet hell', 'shooter', 'boss', 'action'],
  short: 'A bullet-hell duel with a three-phase dragon. Weave through the patterns and shoot it down.',
  full: 'One ship, one boss. The dragon fills the screen with beautiful, deadly bullet patterns that change in each of its three phases: spiralling streams, expanding rings, aimed fans and a final storm of falling fire. Your ship fires on its own, so all you need to do is dodge. Only the tiny red dot in the middle of your ship can be hit. Hold focus to slow down for precise weaving, and save your bombs for emergencies.',
  minutes: 4,
  controls: {
    keyboard: ['Arrows or WASD move', 'Hold X or Shift to focus (slow movement)', 'Space drops a bomb'],
    mouse: ['Hold the button and drag to steer the ship'],
    touch: ['Drag anywhere to steer (the ship stays above your finger)', 'Focus and Bomb buttons'],
  },
  instructions: {
    objective: 'Deplete the boss’s health bar before you run out of lives.',
    howToPlay: [
      'Your ship shoots automatically. Stay below the boss and keep moving.',
      'Only the red dot at the centre of your ship counts as a hit.',
      'Focus mode slows you down and tightens your shots for precise dodging.',
      'A bomb clears every bullet on screen and gives a moment of safety. You have two.',
      'The boss changes pattern at two-thirds and one-third health.',
    ],
    scoring: 'One point per shot that hits, 5 per graze (a bullet passing very close), and a big bonus for winning with lives and bombs left.',
    difficultyNotes: 'Easy: slower bullets and five lives. Hard: faster bullets.',
    tips: ['Make small movements; most patterns have gaps right in front of you.', 'In phase 3, stay low and away from the centre.'],
    touchNotes: ['Drag with one finger; the ship sits above your fingertip so you can see it.'],
  },
  achievements: [
    ['phase-3', 'Into the Storm', 'Reach the boss’s third phase.', 3, '🌩️', 15],
    ['win', 'Dragon Slayer', 'Defeat the boss.', 1, '🐲', 30],
    ['no-bomb', 'No Panic Button', 'Defeat the boss without using a bomb.', 1, '💣', 30],
    ['hard', 'Bullet Ballet', 'Defeat the boss on Hard.', 1, '👑', 40],
    ['grazes', 'Close Shave', 'Graze 1,000 bullets in total.', 1000, '🎖️', 20],
  ],
  load: () => import('./BossBattleGame'),
});
