import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'tennis',
  title: 'Tennis',
  category: 'sports',
  difficulty: 'medium',
  icon: '🎾',
  tags: ['rally', 'ai', 'sports', 'racket', 'serve', 'volley'],
  short: 'Serve, rally and volley through a fast set of tennis against the computer.',
  full: 'A short set of tennis on a singles court seen from above. Run anywhere in your half — your racket plays the ball automatically when it is in reach, and the arrow you hold at contact sends the ball cross-court, deep or short. You can volley before the bounce, so charging the net is a real tactic. First to 4 games wins; at 40–40 one deciding point settles the game, and 3–3 goes to a tie-break.',
  minutes: 7,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: [
      'Arrow keys / WASD run',
      'Hold ← → at contact to aim; ↑ deep, ↓ short',
      'Space serves',
    ],
    mouse: ['Move the mouse to run to that spot; click to serve'],
    touch: ['Drag to run', 'Tap to serve'],
  },
  instructions: {
    objective: 'Win 4 games before the computer.',
    howToPlay: [
      'Get within reach of the ball and your racket plays it automatically.',
      'Your shot must land inside the singles lines of the other half; the blue alleys are out.',
      'Hold ← or → as you hit to aim, ↑ for a deep drive or ↓ for a short drop.',
      'Volleys are allowed: step in and take the ball before it bounces.',
      'Points go 15, 30, 40; at 40–40 the next point wins the game. At 3–3 games, a tie-break to 7 (win by two) decides the set.',
    ],
    scoring: '10 points for each point won, 50 for each game, 300 for the match.',
    difficultyNotes:
      'On Hard the computer runs faster, hits with more pace, aims away from you and rarely misses. Easy shows where its shots will land.',
    tips: [
      'Wide shots pull the computer out of position — then hit to the open court.',
      'After serving, move back to the middle of your baseline.',
    ],
    touchNotes: ['Drag below your player so your finger does not hide the ball.'],
  },
  achievements: [
    ['win', 'Set Point', 'Beat the computer.', 1, '🎾', 20],
    ['ace', 'Ace', 'Win a point with an unreturned serve.', 1, '⚡', 15],
    ['love', 'Love Game', 'Win a game without losing a point.', 1, '💚', 20],
    ['hard', 'Grand Slam', 'Win on Hard.', 1, '🏆', 40],
    ['wins', 'Tour Regular', 'Win 10 matches.', 10, '🎖️', 30],
  ],
  load: () => import('./TennisGame'),
});
