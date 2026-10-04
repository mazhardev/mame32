import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'pixel-art',
  title: 'Pixel Art',
  category: 'creative',
  difficulty: 'easy',
  icon: '🟪',
  tags: ['drawing', 'pixel', 'creative', 'save', 'art', 'sprites'],
  short:
    'Draw pixel art with pencil, fill and mirror tools — or copy sprites as accurately as you can.',
  full: 'A pixel-art studio with two ways to play. In the Copy challenge, recreate three original sprites cell by cell and see how accurate you were. In Free drawing, paint on a 16×16 or 32×32 canvas with pencil, eraser, fill bucket, colour picker and a mirror mode for symmetrical designs, then save your work to a local gallery or download it as a PNG.',
  minutes: 8,
  hasSaveState: true,
  controls: {
    keyboard: [
      'Arrow keys move the cursor, Space paints',
      'B pencil, E eraser, G fill, I picker, Z undo',
    ],
    mouse: ['Click or drag on the canvas to paint'],
    touch: ['Tap or drag on the canvas to paint'],
  },
  instructions: {
    objective: 'Copy each picture as exactly as you can — or make your own art.',
    howToPlay: [
      'Pick a colour, then click or drag over the grid to paint.',
      'The fill bucket colours a whole connected area; the picker copies a colour from the canvas.',
      'Mirror paints the matching cell on the other side as well.',
      'In the challenge, press Check my copy when you are done. Accuracy counts every cell filled in either picture.',
    ],
    scoring:
      'Challenge score is your average accuracy over three pictures (1,000 for perfect copies).',
    difficultyNotes:
      'Easy shows a faint guide of the picture on the canvas. Normal shows the picture beside the canvas. Hard shows it for only 12 seconds — then paint from memory.',
    tips: [
      'Start with the outline, then use the fill bucket.',
      'Count cells along the edges to place features exactly.',
    ],
    touchNotes: ['Drag with one finger to paint several cells in one stroke.'],
  },
  achievements: [
    ['save', 'Artist', 'Save an artwork to your gallery.', 1, '🖼️', 10],
    ['export', 'Show It Off', 'Download your art as a PNG.', 1, '⬇️', 10],
    ['perfect', 'Pixel Perfect', 'Copy a picture with 100% accuracy.', 1, '💯', 25],
    ['copies', 'Copyist', 'Copy 10 pictures with 90% accuracy or better.', 10, '🎯', 25],
    ['gallery', 'Exhibition', 'Keep 8 artworks in your gallery.', 8, '🏛️', 20],
    ['hard', 'Photographic Memory', 'Average 90% on Hard.', 1, '🧠', 40],
  ],
  load: () => import('./PixelArtGame'),
});
