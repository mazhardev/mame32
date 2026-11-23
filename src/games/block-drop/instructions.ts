import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Clear twenty lines before the stack reaches the top.',
  howToPlay: [
    'Pieces fall one at a time. Move and turn each one before it lands.',
    'Fill a row completely to clear it. Clearing several rows at once scores much more.',
    'The box on the right shows the next piece; the outline in the well shows where the current one will land.',
    'A piece that has landed can still slide for a moment before it locks.',
    'The game ends if a new piece has no room to enter the well.',
  ],
  scoring:
    '100 / 300 / 500 / 800 points for clearing 1 / 2 / 3 / 4 lines at once, times the level. Hard drops add 2 points per row and soft drops 1.',
  difficultyNotes: 'Easy starts at level 1, Normal at level 2 and Hard at level 4. Every five lines cleared adds a level and speeds the pieces up.',
  tips: [
    'Keep the stack flat and low.',
    'Leave one column open at the side and wait for the straight piece to clear four lines at once.',
    'Watch the next piece to plan where the current one should go.',
  ],
  touchNotes: [
    'Drag sideways anywhere on the board and the piece follows your finger.',
    'Tap the board to turn the piece; flick down to drop it.',
    'The pad and the ⟳ and Drop buttons below the board work too.',
  ],
};
