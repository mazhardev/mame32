import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective:
    'Get three of your marks in a row — across, down or diagonally — before your opponent does.',
  howToPlay: [
    'X always moves first.',
    'Click or tap any empty square to place your mark.',
    'Choose "vs Computer" to play the local AI, or "Two Players" to pass the device.',
    'The winning line is highlighted when the game ends.',
  ],
  scoring: 'A win scores 100, a draw scores 25, and the difficulty multiplies the result.',
  difficultyNotes:
    'Easy plays mostly at random. Normal plays well but blunders about one move in five. Hard searches the whole game tree and plays perfectly — the best you can do is force a draw.',
  tips: [
    'Taking the centre first gives you the most winning lines.',
    'Against a perfect opponent, always block a line where they already have two marks.',
    'Corners create two threats at once more often than edges do.',
  ],
  touchNotes: [
    'Tap a square to place your mark. Squares are large enough for comfortable tapping.',
  ],
};
