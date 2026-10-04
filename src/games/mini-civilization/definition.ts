import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'mini-civilization',
  title: 'Mini Civilization',
  category: 'strategy',
  difficulty: 'hard',
  icon: '🏛️',
  tags: ['4x', 'civilization', 'turn-based', 'research', 'cities', 'ai'],
  short:
    'Found cities, research a tech tree and race a rival civilization to the stars — or conquer it.',
  full: 'A compact turn-based empire builder against one computer rival on a small map. Send settlers out to found cities; each city works the land around it for food, production and science. Research Pottery, Bronze Working, Writing, Masonry and more, build granaries, libraries and walls, and raise warriors, spearmen, riders and catapults. Win by completing the Grand Observatory wonder first, or by capturing the rival’s capital. The rival plays by the same rules, entirely in your browser.',
  minutes: 30,
  multiplayer: 'vs-ai',
  hasSaveState: true,
  keyboard: false,
  controls: {
    mouse: [
      'Click a unit, then a blue tile to move or a red tile to attack',
      'Click a city to choose what it builds',
    ],
    touch: [
      'Tap a unit, then a blue tile to move or a red tile to attack',
      'Tap a city to choose what it builds',
    ],
  },
  instructions: {
    objective: 'Complete the Grand Observatory first, or capture the rival capital.',
    howToPlay: [
      'Tap a settler and move it to a good spot at least three tiles from other cities, then Found city.',
      'Cities work the tiles around them: grassland and wheat for food, forests and hills for production, lakes and gems for science.',
      'Tap a city to pick what it produces. Research picks one technology at a time.',
      'Military units attack by moving onto an adjacent enemy (red tile). The odds are shown before you attack.',
      'An undefended city is captured when an enemy unit walks in. Losing your capital loses the game.',
      'Astronomy unlocks the Grand Observatory — finish it to win.',
    ],
    scoring:
      'Score: 10 per citizen, 5 per building and 15 per technology; a victory adds 500 plus 5 for every turn to spare. If turn 150 arrives, the higher score wins.',
    difficultyNotes:
      'Easy: the rival gets 25% less production and science and is cautious. Normal: an even match. Hard: the rival gets a 30% bonus and attacks when it is stronger.',
    tips: [
      'Expand early — more cities mean more of everything.',
      'Keep at least one defender in every city; walls make them three times as strong.',
      'Libraries speed research; the Observatory needs a strong production city.',
      'Catapults are the best way to break a walled city.',
    ],
    touchNotes: [
      'The map scales to the screen width; tap a stacked tile again to cycle through its units.',
    ],
  },
  achievements: [
    ['cities', 'Empire Builder', 'Rule 5 cities at once.', 5, '🏙️', 20],
    ['techs', 'Enlightenment', 'Discover every technology.', 8, '💡', 20],
    ['battles', 'Warlord', 'Win 20 battles in total.', 20, '⚔️', 20],
    ['science', 'Reach for the Stars', 'Win by building the Grand Observatory.', 1, '🔭', 30],
    ['conquest', 'Conqueror', 'Win by capturing the rival capital.', 1, '🏰', 30],
    ['hard', 'Wonder of the World', 'Win on Hard.', 1, '🏆', 50],
  ],
  load: () => import('./CivGame'),
});
