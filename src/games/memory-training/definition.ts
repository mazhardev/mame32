import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'memory-training',
  title: 'Memory Training',
  category: 'educational',
  difficulty: 'medium',
  icon: '🧠',
  tags: ['memory', 'drill', 'n-back', 'brain', 'educational'],
  short: 'Train your working memory with the N-back task: spot letters that repeat N steps back.',
  full: 'A working-memory trainer based on the N-back task used in cognitive research. Letters appear one at a time. Press MATCH whenever the letter is the same as the one N steps earlier. A session has three blocks, and the level adapts: score 80 % or more and the next block goes one step further back; score under 50 % and it eases off.',
  minutes: 4,
  controls: {
    keyboard: ['Space, Enter or M presses MATCH'],
    mouse: ['Click MATCH'],
    touch: ['Tap MATCH'],
  },
  instructions: {
    objective: 'Correctly spot matches, and correctly ignore non-matches, for as many letters as possible.',
    howToPlay: [
      'Letters appear one at a time, about every two seconds.',
      'In 1-back, press MATCH when a letter is the same as the one just before it.',
      'In 2-back, compare with the letter two steps back, and so on.',
      'Do nothing when it is not a match. Each session has three blocks of 20 letters.',
    ],
    scoring: 'Your score is your average accuracy multiplied by the highest N you reached.',
    difficultyNotes: 'Easy starts at 1-back with slow letters. Normal starts at 2-back. Hard starts at 3-back with faster letters.',
    tips: ['Keep a running list of the last N letters in your head and update it every letter.', 'Missing a match costs the same as a false alarm, so don’t guess.'],
  },
  achievements: [
    ['two-back', 'Double Back', 'Score 80 % or more on a 2-back block.', 1, '2️⃣', 15],
    ['three-back', 'Triple Back', 'Score 80 % or more on a 3-back block.', 1, '3️⃣', 30],
    ['perfect', 'Flawless Block', 'Score 100 % on any block.', 1, '💯', 20],
    ['sessions', 'Daily Trainer', 'Complete 15 sessions.', 15, '🎖️', 25],
  ],
  load: () => import('./MemoryTrainingGame'),
});
