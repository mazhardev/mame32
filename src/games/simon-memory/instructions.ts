import type { GameInstructions } from '@/types';
export const instructions: GameInstructions = {
  objective: 'Repeat a sequence of 12 steps to win.',
  howToPlay: [
    'Start and watch the numbered pads light up.',
    'When Your turn appears, repeat the exact sequence with pads or keys 1–4.',
    'Each successful round adds a step. A mistake ends the game.',
    'Pausing during playback replays the whole sequence when you resume.',
  ],
  scoring: '100 points per fully repeated sequence.',
  difficultyNotes: 'Harder settings play each signal faster.',
};
