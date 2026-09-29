import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'sky-hopper',
  title: 'Sky Hopper',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🐦',
  tags: ['flappy', 'tap', 'one button', 'endless', 'reflex', 'featured'],
  short: 'Tap to flap and steer a little bird through the gaps between the towers.',
  full: 'A one-button arcade challenge. Every tap gives your bird a flap upwards; gravity does the rest. Guide it through the gaps between the grassy towers — each one you pass scores a point, and the pace slowly picks up. How far can you fly?',
  minutes: 2,
  controls: {
    keyboard: ['Space, Enter or the up arrow to flap'],
    mouse: ['Click the sky to flap'],
    touch: ['Tap anywhere on the game to flap'],
  },
  instructions: {
    objective: 'Fly through as many gaps as you can without touching a tower or the ground.',
    howToPlay: [
      'Each tap or key press makes the bird flap upwards. Between flaps it falls.',
      'Pass through the gap between the top and bottom towers to score a point.',
      'Touching a tower, the ground or flying off the top ends the flight.',
    ],
    scoring: 'One point per tower passed.',
    difficultyNotes: 'Easy: wide gaps and a gentle speed. Normal: medium gaps. Hard: narrow gaps and fast towers.',
    tips: ['Tap in a steady rhythm rather than in bursts.', 'Aim for the lower half of each gap — it is easier to flap up than to drop.'],
    touchNotes: ['Tap anywhere on the game area to flap.'],
  },
  achievements: [
    ['first', 'Off the Ground', 'Pass your first tower.', 1, '🐣', 5],
    ['ten', 'Frequent Flyer', 'Pass 10 towers in one flight.', 10, '🐦', 15],
    ['twenty-five', 'High Flyer', 'Pass 25 towers in one flight.', 25, '🦅', 25],
    ['fifty', 'Sky Legend', 'Pass 50 towers in one flight.', 50, '🏆', 50],
    ['total', 'Long Haul', 'Pass 250 towers in total.', 250, '🌤️', 30],
  ],
  load: () => import('./SkyHopperGame'),
});
