import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'bubble-shooter',
  title: 'Bubble Shooter',
  category: 'arcade',
  difficulty: 'easy',
  icon: '🫧',
  tags: ['bubbles', 'aim', 'match', 'colours', 'classic', 'casual'],
  short: 'Aim, bounce and pop — match three bubbles of a colour before they reach the line.',
  full: 'A classic bubble-popping shooter. Aim the launcher and fire coloured bubbles into the cluster above; bank shots off the walls to reach tricky spots. Three or more bubbles of the same colour pop, and any bubbles left hanging fall for big bonus points. Every few shots the ceiling drops a row — don’t let the bubbles reach the dashed line. Each colour also has its own symbol.',
  minutes: 5,
  controls: {
    keyboard: ['← / → aim', 'Space or ↑ fires'],
    mouse: ['Point to aim, click to fire'],
    touch: ['Drag to aim, release to fire'],
  },
  instructions: {
    objective: 'Clear the board, and keep the bubbles above the dashed line.',
    howToPlay: [
      'Bubbles stick where they touch the cluster or the top.',
      'Connecting three or more bubbles of one colour pops them.',
      'Bubbles that are no longer connected to the top fall off — worth extra points.',
      'The counter at the bottom shows when the ceiling will drop another row.',
      'The next bubble is shown beside the launcher.',
    ],
    scoring: '10 points per popped bubble; 20 or more per dropped bubble, with a bonus for big drops. 500 per board cleared.',
    difficultyNotes: 'Easy: 4 colours, the ceiling drops every 8 shots. Hard: 6 colours, every 5 shots.',
    tips: ['Aim for bubbles holding up big clusters — the drop bonus is huge.', 'Bounce off the walls to reach gaps.'],
    touchNotes: ['Put your finger on the game, drag to aim, and lift to fire.'],
  },
  achievements: [
    ['clear', 'Clean Slate', 'Clear the whole board.', 1, '🫧', 25],
    ['big', 'Avalanche', 'Pop or drop 12 bubbles with one shot.', 12, '💥', 25],
    ['score', 'Bubble Wizard', 'Score 3,000 points.', 3000, '🏆', 30],
    ['popped', 'Pop Star', 'Pop 2,000 bubbles in total.', 2000, '⭐', 30],
  ],
  load: () => import('./BubbleShooterGame'),
});
