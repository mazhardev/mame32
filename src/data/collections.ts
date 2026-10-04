import type { GameDefinition } from '@/types';
import { hasComputerOpponent, isTwoPlayer, type Faq } from '@/seo/content';

/**
 * Collections are landing pages for the ways people actually search for games
 * ("2 player games", "games against the computer", "offline games"). Each one
 * is a filter over the playable registry plus its own intro copy and FAQ, so
 * the page has unique content rather than being a thin duplicate of a category.
 */
export interface CollectionMeta {
  slug: string;
  /** Short name used in links, e.g. "2 Player Games". */
  name: string;
  icon: string;
  /** Page H1. */
  heading: string;
  /** <title> without the brand; kept short enough to fit with it. */
  title: string;
  /** Meta description; `{count}` is replaced with the number of games. */
  description: string;
  /** Visible introduction, one string per paragraph. */
  intro: string[];
  faqs: Faq[];
  includes: (game: GameDefinition) => boolean;
}

const hasTag = (game: GameDefinition, ...tags: string[]) => tags.some((t) => game.tags.includes(t));

/** A collection needs this many games before it is linked or indexed. */
export const MIN_COLLECTION_SIZE = 4;

export const COLLECTIONS: CollectionMeta[] = [
  {
    slug: '2-player-games',
    name: '2 Player Games',
    icon: '👥',
    heading: '2 player games',
    title: '2 Player Games – Play Free on One Device',
    description:
      'Play {count} free 2 player games on one screen: chess, checkers, Connect Four, Tic-Tac-Toe, Ludo and more. No download, no sign-up – take turns on the same device.',
    intro: [
      'Challenge a friend, a sibling or a parent on the same computer, tablet or phone. Every game below has a two-player mode where you take turns on one device – no second screen, no account and no online lobby needed.',
      'Most of these games also include a computer opponent, so you can practise alone and then play each other.',
    ],
    faqs: [
      {
        q: 'Can two people play on the same device?',
        a: 'Yes. Pick the two-player (local) mode at the start of a game and pass the device back and forth, or sit side by side at one keyboard.',
      },
      {
        q: 'Do I need an internet connection to play with a friend?',
        a: 'No. Two-player games run entirely in your browser on one device, so they keep working offline once the site has loaded.',
      },
    ],
    includes: isTwoPlayer,
  },
  {
    slug: 'games-against-computer',
    name: 'Games vs Computer',
    icon: '🤖',
    heading: 'Games against the computer',
    title: 'Play Against the Computer – Free Games',
    description:
      'Play {count} free games against the computer: chess, checkers, reversi, Connect Four, card games and more. Pick Easy, Normal or Hard – no download, no sign-up.',
    intro: [
      'No opponent around? Every game here has a computer player that runs on your own device. Choose Easy to learn the rules, or Hard for a real fight – the difficulty changes how far ahead the computer thinks.',
      'Because the computer opponent runs in your browser, games start instantly, never wait for a server, and work offline.',
    ],
    faqs: [
      {
        q: 'How strong is the computer opponent?',
        a: 'Each game has Easy, Normal and Hard settings. Easy makes deliberate mistakes; Hard searches several moves ahead and plays to win.',
      },
      {
        q: 'Is the computer player an online AI service?',
        a: 'No. The computer opponent is a small program that runs entirely in your browser. Nothing you play is sent anywhere.',
      },
    ],
    includes: hasComputerOpponent,
  },
  {
    slug: 'mobile-games',
    name: 'Mobile Games',
    icon: '📱',
    heading: 'Free mobile games – no app needed',
    title: 'Free Mobile Games – No App, No Download',
    description:
      'Play {count} free games on your phone or tablet straight in the browser – no app store, no download. Touch controls for puzzle, arcade, card and board games.',
    intro: [
      'These games are built for touch screens. Open them in Safari, Chrome or any mobile browser and play straight away – there is nothing to install from an app store.',
      'Want it on your home screen? Use “Add to Home Screen” and GamesPlayLand opens like an app, full screen, and keeps working offline.',
    ],
    faqs: [
      {
        q: 'Do I need to download an app?',
        a: 'No. The games run in your phone’s web browser. You can optionally add the site to your home screen to open it like an app.',
      },
      {
        q: 'Do the games work on iPhone and Android?',
        a: 'Yes. They work in current versions of Safari on iPhone and iPad and in Chrome, Firefox, Samsung Internet and Edge on Android.',
      },
    ],
    includes: (g) => g.supportsTouch,
  },
  {
    slug: 'offline-games',
    name: 'Offline Games',
    icon: '📴',
    heading: 'Offline games – play without internet',
    title: 'Offline Games – Play Free Without Internet',
    description:
      'Play {count} free browser games offline. Open them once and they keep working with no internet connection – on planes, trains and patchy Wi-Fi. No download.',
    intro: [
      'Every game on GamesPlayLand works offline. The site is an installable web app: once a game has loaded, its files stay in your browser, so you can keep playing with no connection at all.',
      'Your high scores, achievements and saved games are stored on your own device too, so nothing is lost while you are offline.',
    ],
    faqs: [
      {
        q: 'How do I play these games offline?',
        a: 'Open the site while you are online and play the games you want once. After that they load from your browser’s cache even without an internet connection. Installing the site as an app makes this easiest.',
      },
      {
        q: 'Will my progress save while I am offline?',
        a: 'Yes. Scores and saved games are always stored locally in your browser, online or offline.',
      },
    ],
    includes: () => true,
  },
  {
    slug: 'quick-games',
    name: 'Quick Games',
    icon: '⏱️',
    heading: 'Quick games you can play in a few minutes',
    title: 'Quick Games – Play Free in Under 5 Minutes',
    description:
      'Play {count} quick free games that take three minutes or less: reflex tests, arcade runs, word puzzles and more. Perfect for a short break – no download.',
    intro: [
      'Got a coffee break, a bus ride or five minutes between meetings? Each of these games is designed for a round of three minutes or less, and starts the moment the page opens.',
      'Your best scores are saved automatically, so every quick round is a chance to beat yourself.',
    ],
    faqs: [
      {
        q: 'How long does a round take?',
        a: 'Every game in this list is designed for rounds of about three minutes or less.',
      },
    ],
    includes: (g) => g.estimatedMinutes <= 3,
  },
  {
    slug: 'classic-games',
    name: 'Classic Games',
    icon: '🏛️',
    heading: 'Classic games',
    title: 'Classic Games – Play Free Online',
    description:
      'Play {count} classic games free online: chess, solitaire, Sudoku, Snake, Minesweeper, checkers, Mancala and more. Original versions that run in your browser.',
    intro: [
      'The games people have played for decades – and in some cases centuries – rebuilt from scratch for the browser. Board games, card games, pencil puzzles and arcade classics, all with original artwork and sounds.',
      'They save your best scores and progress, adapt to phones and tablets, and include a computer opponent where the game needs one.',
    ],
    faqs: [
      {
        q: 'Are these the original games?',
        a: 'They follow the traditional rules, but every game here was written from scratch with original graphics and sounds. No commercial artwork or branding is used.',
      },
    ],
    includes: (g) => hasTag(g, 'classic'),
  },
  {
    slug: 'solitaire-games',
    name: 'Solitaire Games',
    icon: '🂡',
    heading: 'Solitaire games',
    title: 'Solitaire Games – Klondike, Spider, FreeCell',
    description:
      'Play {count} free solitaire games online: Klondike, Spider, FreeCell, Pyramid, TriPeaks and Golf. Full screen, drag and drop or tap, no download.',
    intro: [
      'Patience card games for one player, from the classic Klondike to Spider, FreeCell, Pyramid, TriPeaks and Golf. Every deal is shuffled fairly, and your wins and best times are saved in your browser.',
      'Drag and drop with a mouse, or tap cards on a phone – the layout adapts to any screen.',
    ],
    faqs: [
      {
        q: 'Which solitaire game is easiest?',
        a: 'Golf and TriPeaks are quick and forgiving. Klondike with one-card draw is a good next step, while Spider with four suits and FreeCell reward careful planning.',
      },
    ],
    includes: (g) => hasTag(g, 'solitaire', 'patience'),
  },
  {
    slug: 'games-for-kids',
    name: 'Games for Kids',
    icon: '🧒',
    heading: 'Free games for kids',
    title: 'Free Games for Kids – No Sign-up, No Chat',
    description:
      'Play {count} free games for kids: counting, alphabet, memory, colours and family board games. No sign-up, no chat, no purchases – everything runs in the browser.',
    intro: [
      'Friendly games for younger players: learning games for counting, letters, shapes and colours, plus family classics like Snakes and Ladders and Ludo.',
      'There are no accounts, no chat with strangers and no in-game purchases. Scores are stored only on your own device.',
    ],
    faqs: [
      {
        q: 'Are these games safe for children?',
        a: 'Yes. There is no sign-up, no chat with other people and no purchases. Games run entirely in the browser and keep progress on the device.',
      },
    ],
    includes: (g) => hasTag(g, 'kids', 'family') || (g.category === 'educational' && g.difficulty === 'easy'),
  },
  {
    slug: 'math-games',
    name: 'Math Games',
    icon: '➗',
    heading: 'Math games',
    title: 'Math Games – Free Online Number Games',
    description:
      'Play {count} free math games online: mental arithmetic, times tables, number puzzles, Sudoku and more. Practise maths at your own level – no sign-up.',
    intro: [
      'Number games for every level, from counting and times tables to mental arithmetic drills and logic puzzles built on numbers.',
      'Pick a difficulty that suits you – the questions and puzzles get harder as you improve, and your best scores are saved.',
    ],
    faqs: [
      {
        q: 'Are these math games good for school practice?',
        a: 'Yes. Multiplication, mental math and counting games give quick, repeatable practice, and difficulty levels let players progress at their own pace.',
      },
    ],
    includes: (g) => hasTag(g, 'maths', 'numbers', 'math'),
  },
  {
    slug: 'logic-puzzles',
    name: 'Logic Puzzles',
    icon: '💡',
    heading: 'Logic puzzles and brain teasers',
    title: 'Logic Puzzles & Brain Teasers – Free Online',
    description:
      'Play {count} free logic puzzles and brain teasers online: Sudoku, nonograms, Kakuro, code breakers, deduction games and more. No download, no sign-up.',
    intro: [
      'Puzzles that reward careful reasoning rather than fast fingers: fill grids from clues, crack hidden codes and work out the answer step by step.',
      'Puzzles with progress save automatically, so you can stop halfway and pick up where you left off.',
    ],
    faqs: [
      {
        q: 'Do these puzzles have a unique solution?',
        a: 'Generated Sudoku puzzles are checked to have exactly one solution, and level-based puzzles such as Sokoban and Unblock are verified solvable before they ship.',
      },
    ],
    includes: (g) => hasTag(g, 'logic', 'deduction'),
  },
  {
    slug: 'relaxing-games',
    name: 'Relaxing Games',
    icon: '🌿',
    heading: 'Relaxing games',
    title: 'Relaxing Games – Calm Games to Play Free',
    description:
      'Play {count} free relaxing games online: calm puzzles, word searches, jigsaws and patience games. Unwind in your browser – no download.',
    intro: [
      'Low-pressure games to unwind with: calm puzzles, word searches and patience games you can play at your own pace and put down at any time.',
    ],
    faqs: [
      {
        q: 'Can I stop a relaxing game and come back later?',
        a: 'Yes. You can pause at any time, and games with progress save it automatically in your browser.',
      },
    ],
    includes: (g) => hasTag(g, 'relaxing'),
  },
];

const bySlug = new Map(COLLECTIONS.map((c) => [c.slug, c]));

export function getCollection(slug: string): CollectionMeta | undefined {
  return bySlug.get(slug);
}

export function collectionGames(collection: CollectionMeta, games: GameDefinition[]): GameDefinition[] {
  return games.filter((g) => g.status === 'available' && collection.includes(g));
}

/** Collections big enough to link to and index. */
export function activeCollections(games: GameDefinition[]): CollectionMeta[] {
  return COLLECTIONS.filter((c) => collectionGames(c, games).length >= MIN_COLLECTION_SIZE);
}

/** Collections a game belongs to, for internal links from its page. */
export function collectionsForGame(game: GameDefinition, games: GameDefinition[]): CollectionMeta[] {
  // Every game is offline-capable; linking that from every page adds nothing.
  return activeCollections(games).filter((c) => c.slug !== 'offline-games' && c.includes(game));
}

export function collectionPath(slug: string): string {
  return `/collections/${slug}/`;
}

export function collectionDescription(collection: CollectionMeta, count: number): string {
  return collection.description.replace('{count}', String(count));
}
