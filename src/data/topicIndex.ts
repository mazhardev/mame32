import type { GameCategory } from '@/types';

/**
 * The topic hubs as plain data: which games each hub lists, the category it
 * belongs to and the hubs it links to. Kept apart from the hub copy
 * (clusters.ts) so the game catalog and the site footer can use it without
 * pulling every hub's intro and FAQ into the main bundle.
 */
export interface TopicEntry {
  slug: string;
  name: string;
  parent: GameCategory;
  /** The hub's games, in the order the hub lists them. */
  ids: string[];
  /** Hubs to link to from this one, nearest first. */
  related: string[];
}

/** A hub needs this many playable games before it is linked or indexed. */
export const MIN_HUB_SIZE = 4;

export const TOPICS: TopicEntry[] = [
  {
    slug: 'chess-and-checkers-games',
    name: 'Chess & Checkers',
    parent: 'board',
    ids: [
      'chess',
      'chess-puzzle',
      'chess-tactics',
      'checkers',
      'draughts-variants',
      'chinese-checkers',
    ],
    related: ['family-board-games', 'code-breaking-games', 'logic-puzzles'],
  },
  {
    slug: 'family-board-games',
    name: 'Family Board Games',
    parent: 'board',
    ids: ['ludo', 'snakes-and-ladders', 'carrom', 'mancala', 'dominoes', 'backgammon'],
    related: ['chess-and-checkers-games', '2-player-games', 'card-games-vs-computer'],
  },
  {
    slug: 'card-games-vs-computer',
    name: 'Card Games vs Computer',
    parent: 'card',
    ids: [
      'hearts',
      'spades',
      'rummy-vs-computer',
      'crazy-eights',
      'war-card',
      'poker-vs-computer',
      'three-card-game',
      'color-match-cards',
    ],
    related: ['solitaire-games', 'family-board-games', 'games-against-computer'],
  },
  {
    slug: 'memory-games',
    name: 'Memory Games',
    parent: 'brain',
    ids: [
      'memory-match',
      'memory-cards',
      'memory-training',
      'memory-sequence',
      'memory-test',
      'simon-memory',
    ],
    related: ['code-breaking-games', 'reaction-time-games', 'quiz-games'],
  },
  {
    slug: 'code-breaking-games',
    name: 'Code-Breaking Games',
    parent: 'brain',
    ids: ['mastermind', 'code-breaker', 'bulls-and-cows', 'guess-the-number', 'cryptogram'],
    related: ['memory-games', 'number-puzzles', 'logic-puzzles'],
  },
  {
    slug: 'number-puzzles',
    name: 'Sudoku & Number Puzzles',
    parent: 'puzzle',
    ids: ['sudoku', 'kakuro', 'nonogram', 'binary-puzzle', 'math-puzzle'],
    related: ['logic-puzzles', 'code-breaking-games', 'math-games'],
  },
  {
    slug: 'match-3-games',
    name: 'Match 3 Games',
    parent: 'puzzle',
    ids: ['match-three', 'candy-match', 'bubble-shooter', 'bubble-buddies', 'marble-chain'],
    related: ['block-games', 'relaxing-games', 'number-puzzles'],
  },
  {
    slug: 'quiz-games',
    name: 'Quiz & Trivia Games',
    parent: 'educational',
    ids: [
      'geography-quiz',
      'flag-quiz',
      'capital-city-quiz',
      'country-guess',
      'periodic-table-quiz',
      'science-quiz',
      'history-quiz',
      'programming-quiz',
      'vocabulary-quiz',
      'iq-challenge',
      'logo-style-quiz',
    ],
    related: ['memory-games', 'word-guessing-games', 'math-games'],
  },
  {
    slug: 'word-guessing-games',
    name: 'Word Guessing Games',
    parent: 'word',
    ids: [
      'five-letter-word',
      'guess-the-word',
      'hangman',
      'guess-the-phrase',
      'missing-letters',
      'finish-the-word',
    ],
    related: ['quiz-games', 'code-breaking-games', 'games-for-kids'],
  },
  {
    slug: 'reaction-time-games',
    name: 'Reaction Time Games',
    parent: 'casual',
    ids: [
      'reaction-timer',
      'reflex-test',
      'reaction-test-pro',
      'click-speed-test',
      'aim-trainer',
      'perfect-timing',
      'color-tap',
      'whack-a-mole',
      'quick-draw',
    ],
    related: ['target-shooting-games', 'memory-games', 'quick-games'],
  },
  {
    slug: 'runner-games',
    name: 'Runner Games',
    parent: 'arcade',
    ids: [
      'endless-runner',
      'dino-runner',
      'jetpack-runner',
      'rhythm-runner',
      'lane-rush',
      'sky-hopper',
      'road-hopper',
      'cloud-jumper',
      'endless-jumper',
    ],
    related: ['driving-games', 'space-shooter-games', 'quick-games'],
  },
  {
    slug: 'space-shooter-games',
    name: 'Space Shooter Games',
    parent: 'arcade',
    ids: [
      'space-shooter',
      'alien-shooter',
      'alien-defender',
      'alien-invasion',
      'asteroid-blaster',
      'asteroid-defense',
      'space-combat',
    ],
    related: ['target-shooting-games', 'tower-defense-games', 'runner-games'],
  },
  {
    slug: 'block-games',
    name: 'Block Games',
    parent: 'arcade',
    ids: ['block-drop', 'falling-blocks', 'block-puzzle', 'stack-tower', 'stack-blocks'],
    related: ['match-3-games', 'maze-games', 'classic-games'],
  },
  {
    slug: 'maze-games',
    name: 'Maze Games',
    parent: 'arcade',
    ids: ['maze', 'escape-maze', 'maze-muncher', 'blast-maze'],
    related: ['block-games', 'logic-puzzles', 'runner-games'],
  },
  {
    slug: 'target-shooting-games',
    name: 'Target Shooting Games',
    parent: 'action',
    ids: [
      'target-shooting',
      'duck-target',
      'precision-target',
      'archery',
      'archery-challenge',
      'cannon-shooter',
      'knife-throw',
      'darts',
    ],
    related: ['reaction-time-games', 'space-shooter-games', 'tower-defense-games'],
  },
  {
    slug: 'tower-defense-games',
    name: 'Tower Defense Games',
    parent: 'strategy',
    ids: ['tower-defense', 'castle-defense', 'garden-guard', 'missile-defense', 'asteroid-defense'],
    related: ['tycoon-games', 'space-shooter-games', 'idle-games'],
  },
  {
    slug: 'idle-games',
    name: 'Idle & Clicker Games',
    parent: 'strategy',
    ids: ['idle-factory', 'idle-miner', 'clicker-empire', 'cookie-factory'],
    related: ['tycoon-games', 'tower-defense-games', 'relaxing-games'],
  },
  {
    slug: 'tycoon-games',
    name: 'Tycoon & Management Games',
    parent: 'strategy',
    ids: [
      'business-simulator',
      'restaurant-simulator',
      'shop-simulator',
      'hotel-manager',
      'airport-manager',
      'mini-tycoon',
      'farm-simulator',
      'stock-market-sim',
      'trading-simulator',
      'resource-manager',
    ],
    related: ['idle-games', 'tower-defense-games', 'math-games'],
  },
  {
    slug: 'driving-games',
    name: 'Car Driving Games',
    parent: 'racing',
    ids: [
      'traffic-racer',
      'highway-racer',
      'endless-traffic-driving',
      'police-chase',
      'truck-driving',
      'parking-challenge',
    ],
    related: ['runner-games', 'quick-games', 'mobile-games'],
  },
  {
    slug: 'coloring-games',
    name: 'Coloring Games',
    parent: 'creative',
    ids: ['coloring-game', 'mandala-coloring', 'paint-by-number', 'pixel-art'],
    related: ['relaxing-games', 'games-for-kids', 'quiz-games'],
  },
];

/**
 * Topic hubs featured on the home page and in the footer. Start with broad,
 * popular topics; swap in the hubs that earn the most search impressions.
 */
export const FEATURED_TOPICS = [
  'chess-and-checkers-games',
  'family-board-games',
  'memory-games',
  'quiz-games',
  'match-3-games',
  'runner-games',
  'tower-defense-games',
  'driving-games',
];

const bySlug = new Map(TOPICS.map((t) => [t.slug, t]));

export function getTopic(slug: string): TopicEntry | undefined {
  return bySlug.get(slug);
}

/** Hubs that list a game, in hub order; the first is the game's own hub. */
export function topicsForGame(
  id: string,
  minGames: number,
  isPlayable: (id: string) => boolean,
): TopicEntry[] {
  return TOPICS.filter((t) => t.ids.includes(id) && t.ids.filter(isPlayable).length >= minGames);
}

/** "Chess & Checkers" → "chess & checkers games"; "Memory Games" stays as it is. */
export function hubLinkText(name: string): string {
  const lower = name.toLowerCase();
  return /(games|puzzles)$/.test(lower) ? lower : `${lower} games`;
}
