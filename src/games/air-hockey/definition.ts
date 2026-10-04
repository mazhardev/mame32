import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'air-hockey',
  title: 'Air Hockey',
  category: 'sports',
  difficulty: 'easy',
  icon: '🥅',
  tags: ['physics', 'puck', 'ai', 'sports', 'reflex'],
  short: 'Slam the puck past the computer’s mallet on a frictionless air table.',
  full: 'Classic table air hockey against a computer opponent. Your mallet follows your mouse or finger, and the puck flies off it with real momentum — swing fast through the puck for a blistering shot, or bank it off the side boards. Defend your goal at the bottom and score in the top goal. First to 7 goals wins.',
  minutes: 4,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Arrow keys / WASD move the mallet'],
    mouse: ['Move the mouse to move your mallet'],
    touch: ['Drag your finger to move the mallet'],
  },
  instructions: {
    objective: 'Score 7 goals before the computer does.',
    howToPlay: [
      'Your mallet stays in the bottom half of the table.',
      'Hit the puck into the dark slot at the top to score.',
      'The faster your mallet moves when it meets the puck, the harder the shot.',
      'After a goal, the puck is placed in front of the player who conceded.',
    ],
    scoring:
      '100 points per goal, plus 20 for each goal of lead, 300 for winning and 200 more for a shutout.',
    difficultyNotes:
      'On Hard the computer’s mallet is much faster, reads the puck sooner, and attacks anywhere in its half.',
    tips: [
      'Bank shots off the side boards get past a centred defender.',
      'Stay in front of your goal when the puck is in the computer’s half.',
    ],
    touchNotes: ['Keep your finger on the screen and swipe through the puck.'],
  },
  achievements: [
    ['win', 'Face Off', 'Beat the computer.', 1, '🥅', 15],
    ['shutout', 'Clean Sheet', 'Win 7–0.', 1, '🧤', 35],
    ['hard', 'Table Shark', 'Win on Hard.', 1, '🦈', 35],
    ['goals', 'Goal Machine', 'Score 50 goals in total.', 50, '🎯', 25],
  ],
  load: () => import('./AirHockeyGame'),
});
