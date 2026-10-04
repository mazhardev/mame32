import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'rock-paper-scissors',
  title: 'Rock Paper Scissors',
  category: 'casual',
  difficulty: 'easy',
  icon: '✂️',
  tags: ['ai', 'classic', 'quick', 'luck', 'casual'],
  short: 'First to five wins against a computer that learns your habits.',
  full: 'The classic hand game against a computer opponent. On Easy it plays completely at random. On Normal and Hard it watches what you tend to play next and counters it — so if you fall into a pattern, it will catch you. Win five rounds before the computer does.',
  minutes: 2,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['R, P, S (or 1, 2, 3) play rock, paper or scissors'],
    mouse: ['Click a move'],
    touch: ['Tap a move'],
  },
  instructions: {
    objective: 'Win five rounds before the computer does.',
    howToPlay: [
      'Choose rock, paper or scissors. The computer chooses at the same time.',
      'Rock blunts scissors, scissors cut paper, paper wraps rock.',
      'The same move is a draw and nobody scores.',
      'The first to five round wins takes the match.',
    ],
    scoring: 'A match win scores 100 points plus 20 for every round the computer failed to win.',
    difficultyNotes: 'Easy: the computer is random. Normal: it counters what you usually play after your last move. Hard: it also looks at your last two moves.',
    tips: ['Humans are bad at being random: mix it up on purpose.', 'If the computer keeps beating you, change your pattern.'],
  },
  achievements: [
    ['first', 'Winner', 'Win a match.', 1, '✌️', 10],
    ['flawless', 'Flawless', 'Win a match 5–0.', 1, '💯', 20],
    ['streak', 'Mind Reader', 'Win 4 rounds in a row.', 4, '🔮', 15],
    ['hard', 'Beat the Machine', 'Win a match on Hard.', 1, '🤖', 25],
    ['matches', 'Champion', 'Win 20 matches.', 20, '🏆', 30],
  ],
  difficultyPicker: 'toolbar',
  load: () => import('./RockPaperScissorsGame'),
});
