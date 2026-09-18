import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'word-ladder',
  title: 'Word Ladder',
  category: 'word',
  difficulty: 'medium',
  icon: '🪜',
  tags: ['letters', 'puzzle', 'logic', 'doublets'],
  short: 'Change one letter at a time to climb from one word to another.',
  full: 'A classic word puzzle: turn one word into another by changing a single letter at each step, and every step must be a real word. Try to match the shortest possible ladder.',
  minutes: 5,
  controls: {
    keyboard: ['Type the next word and press Enter'],
    mouse: ['Click Hint or Undo'],
    touch: ['Type with your phone keyboard'],
  },
  instructions: {
    objective: 'Reach the target word in as few steps as possible.',
    howToPlay: [
      'Read the start and target words.',
      'Type a word that differs from the last word by exactly one letter.',
      'Letters stay in the same positions — you change one, you don’t rearrange.',
      'Keep going until you type the target word.',
      'Undo removes your last step; Hint suggests the next word on a shortest route.',
    ],
    scoring: '500 points × (shortest ladder ÷ your steps), minus 60 per hint.',
    difficultyNotes:
      'Easy: 3-letter words, 3–4 steps. Normal: 4-letter words, 4–5 steps. Hard: 4-letter words, 5–7 steps.',
    tips: [
      'Change letters that already match the target last.',
      'Vowel swaps (CAT → COT) open many routes.',
    ],
  },
  achievements: [
    ['first', 'First Rung', 'Complete a word ladder.', 1, '🪜', 5],
    ['optimal', 'Shortest Route', 'Complete a ladder in the fewest possible steps.', 1, '🎯', 20],
    ['hard', 'Tall Ladder', 'Complete a ladder on Hard.', 1, '💎', 15],
  ],
  load: () => import('./WordLadderGame'),
});
