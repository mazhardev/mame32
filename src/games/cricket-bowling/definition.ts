import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cricket-bowling',
  title: 'Cricket Bowling',
  category: 'sports',
  difficulty: 'medium',
  icon: '🎯',
  tags: ['cricket', 'bowling', 'aim', 'timing', 'sports', 'yorker'],
  short: 'Bowl three overs and defend the total: pick your line, length and pace or spin.',
  full: 'You have the ball and three overs to defend a total against a computer batter. Place your target on the pitch — a yorker at the toes, a good length on off stump, or a short ball — choose pace or spin, then release as the accuracy meter passes through the green. The batter reads every delivery: hit the stumps line, vary your length and pace, and the wickets will come. Bowl too short or too wide and the ball disappears to the boundary.',
  minutes: 5,
  multiplayer: 'vs-ai',
  hasLevels: false,
  controls: {
    keyboard: [
      '↑ ↓ change length, ← → change line',
      'X switches pace and spin',
      'Space runs in, Space again releases',
      'Hold ← at release to turn spin the other way',
    ],
    mouse: ['Click the pitch to place your target; click the target to run in; click to release'],
    touch: ['Tap the pitch to place your target; tap it again to run in; tap to release'],
  },
  instructions: {
    objective: 'Stop the computer reaching the target in three overs.',
    howToPlay: [
      'The yellow ring is where you are aiming to pitch the ball.',
      'Stop the meter in the green for an accurate, quicker delivery; a poor release strays from your target.',
      'Straight, full deliveries and good lengths are hardest to score from. Changing length and pace keeps the batter guessing.',
      'Short, wide balls are easy runs, and a ball well wide of the stumps is a wide (an extra run and the ball is bowled again).',
      'The batter takes more risks as the required run rate climbs.',
    ],
    scoring:
      '100 points per wicket, 10 per dot ball, and 300 plus 10 per run to spare for defending the total.',
    difficultyNotes:
      'Easy: defend 25 against a cautious batter with a slow meter. Hard: defend 33 against a skilful batter, with a fast meter.',
    tips: [
      'Yorkers on the stumps are the hardest ball to hit — and to bowl.',
      'Mix in a slow spinner after a few quick deliveries.',
    ],
    touchNotes: ['Tap on the pitch, then tap the ring to start your run-up.'],
  },
  achievements: [
    ['wicket', 'Breakthrough', 'Take a wicket.', 1, '🎯', 10],
    ['bowled', 'Timber!', 'Bowl the batter.', 1, '🏏', 15],
    ['maiden', 'Maiden Over', 'Bowl an over without conceding a run.', 1, '🧊', 30],
    ['defend', 'Death Bowler', 'Defend the total.', 1, '🛡️', 20],
    ['wickets', 'Strike Bowler', 'Take 25 wickets in total.', 25, '🔥', 30],
    ['hard', 'Spearhead', 'Defend the total on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./CricketBowlingGame'),
});
