import { site } from '@/config/site';
import type { CategoryMeta } from '@/data/categories';
import type { GameDefinition } from '@/types';

/**
 * Search copy rendered both by the React pages and by the build-time
 * prerenderer (scripts/prerender.ts). Keeping it in one place means the FAQ
 * structured data always matches the questions visitors can actually see.
 */

export interface Faq {
  q: string;
  a: string;
}

export function isTwoPlayer(game: GameDefinition): boolean {
  return (
    game.multiplayer === 'local-multiplayer' ||
    game.tags.includes('two player') ||
    game.tags.includes('two-player')
  );
}

export function hasComputerOpponent(game: GameDefinition): boolean {
  return game.multiplayer === 'vs-ai' || game.tags.includes('ai');
}

export function playersLabel(game: GameDefinition): string {
  const two = isTwoPlayer(game);
  const ai = hasComputerOpponent(game);
  if (two && ai) return '1 player vs computer, or 2 players on one device';
  if (two) return '1–2 players on one device';
  if (ai) return '1 player vs computer';
  return '1 player';
}

/** "Brain Games" already ends in "Games"; don't render "Brain Games games". */
export function categoryLabel(category: Pick<CategoryMeta, 'name'>): string {
  return /games$/i.test(category.name) ? category.name : `${category.name} Games`;
}

export function homeFaqs(gameCount: number): Faq[] {
  return [
    {
      q: `What is ${site.siteName}?`,
      a: `${site.siteName} is a free online games website with ${gameCount} games you can play directly in your web browser: puzzle games like Sudoku and Minesweeper, arcade games like Snake, card games like Klondike Solitaire and Blackjack, board games like chess, checkers and Connect Four, plus word, brain and educational games.`,
    },
    {
      q: 'Are the games free?',
      a: 'Yes. Every game is completely free to play. There are no purchases, and casino-style card games use virtual points only.',
    },
    {
      q: 'Do I need to download anything or create an account?',
      a: 'No. Games start instantly in your browser. There is no download, no installation and no sign-up.',
    },
    {
      q: 'Do the games work on phones and tablets?',
      a: 'Yes. The site works in mobile browsers on iPhone, iPad and Android, and games have large touch controls. On a computer you can play with a keyboard and mouse.',
    },
    {
      q: 'Can I play with a friend or against the computer?',
      a: 'Yes. Many board games – including chess, checkers, Connect Four and Tic-Tac-Toe – have a two-player mode on one device, and a computer opponent with Easy, Normal and Hard levels.',
    },
    {
      q: 'Can I play offline?',
      a: `Yes. ${site.siteName} can be installed as an app, and games you have already opened keep working without an internet connection.`,
    },
    {
      q: 'Where are my scores and progress saved?',
      a: 'High scores, achievements, statistics and saved games are stored locally in your own browser. They are not uploaded to a server. You can export a backup from Settings.',
    },
  ];
}

/** Games and a topic hub to suggest in a game's "What games are like…" answer. */
export interface MoreLikeThis {
  games: Pick<GameDefinition, 'id' | 'title'>[];
  hub?: { slug: string; name: string };
}

export { hubLinkText } from '@/data/topicIndex';
import { hubLinkText } from '@/data/topicIndex';

export function gameFaqs(game: GameDefinition, more?: MoreLikeThis): Faq[] {
  const t = game.title;
  const faqs: Faq[] = [
    {
      q: `Is ${t} free to play?`,
      a: `Yes. ${t} is completely free on ${site.siteName}, with no download, no sign-up and no purchases.`,
    },
    {
      q: `How do you play ${t}?`,
      a: `${game.instructions.objective} ${game.instructions.howToPlay.slice(0, 2).join(' ')}`,
    },
    {
      q: `Can I play ${t} on my phone?`,
      a: game.supportsTouch
        ? `Yes. ${t} works in mobile browsers on phones and tablets, with no app to install.${
            game.controls.touch?.length ? ` ${game.controls.touch.join('. ')}.` : ''
          }`
        : `${t} is best played on a computer with a keyboard.`,
    },
  ];
  if (hasComputerOpponent(game)) {
    faqs.push({
      q: `Can I play ${t} against the computer?`,
      a: `Yes. You play against a computer opponent that runs entirely in your browser, and the difficulty setting changes how strong it is.`,
    });
  }
  if (isTwoPlayer(game)) {
    faqs.push({
      q: `Can two people play ${t}?`,
      a: `Yes. ${t} has a two-player mode for playing with a friend on the same device.`,
    });
  }
  faqs.push(
    game.hasSaveState
      ? {
          q: `Does ${t} save my progress?`,
          a: `Yes. ${t} saves your game automatically in your browser, so you can close the page and continue later. Personal bests and achievements are saved too.`,
        }
      : {
          q: `Does ${t} save my high score?`,
          a: `Yes. Your personal best, statistics and achievements for ${t} are saved in your browser automatically.`,
        },
  );
  const similar = (more?.games ?? []).slice(0, 3).map((g) => `[${g.title}](game:${g.id})`);
  if (similar.length) {
    const list =
      similar.length > 1 ? `${similar.slice(0, -1).join(', ')} and ${similar.at(-1)}` : similar[0];
    const hub = more?.hub
      ? `, or browse all [${hubLinkText(more.hub.name)}](hub:${more.hub.slug})`
      : '';
    faqs.push({ q: `What games are like ${t}?`, a: `If you like ${t}, try ${list}${hub}.` });
  }
  return faqs;
}

/** Intros may link to games, hubs and categories with [text](game:id) markup; see links.ts. */
const CATEGORY_INTROS: Record<string, string[]> = {
  arcade: [
    'Arcade games are all about quick reflexes and one more go. Steer, dodge, shoot and jump your way to a new high score in classics like [Snake](game:snake), [Block Drop](game:block-drop) and [Brick Breaker](game:brick-breaker) – every round starts in seconds and lasts just a few minutes.',
    'Looking for something specific? Try the [runner games](hub:runner-games), [space shooters](hub:space-shooter-games), [block games](hub:block-games) or [maze games](hub:maze-games). Play with the keyboard on a computer or with large on-screen controls on a phone.',
  ],
  puzzle: [
    'Puzzle games for every mood: number puzzles like [Sudoku](game:sudoku) and [2048](game:number-merge-2048), logic grids like Nonogram and Kakuro, sorting and matching puzzles, mazes, [Sokoban](game:sokoban) and more.',
    'Browse [Sudoku and number puzzles](hub:number-puzzles) or [match 3 games](hub:match-3-games). Puzzles with longer sessions save automatically, so you can stop halfway and continue later on the same device.',
  ],
  word: [
    'Word games that test your vocabulary and spelling: guess the [five-letter word](game:five-letter-word), find hidden words in a [word search](game:word-search), unscramble anagrams, climb word ladders and race the clock in typing challenges.',
    'Love a mystery word? See all [word guessing games](hub:word-guessing-games). Every word game uses an offline dictionary built into the site, so it keeps working without an internet connection.',
  ],
  board: [
    'Classic board games including [chess](game:chess), checkers, [Connect Four](game:connect-four), Reversi, Go, Backgammon, [Ludo](game:ludo) and Mancala. Play against a computer opponent with three difficulty levels, or take turns with a friend on the same device.',
    'Browse [chess and checkers games](hub:chess-and-checkers-games), [family board games](hub:family-board-games) or every [2 player game](hub:2-player-games). A chess game in progress is saved automatically, so you can close the page and finish it later.',
  ],
  card: [
    'Card games for one player and against the computer: [Klondike](game:klondike-solitaire), Spider, FreeCell and other [solitaire games](hub:solitaire-games), plus [Hearts](game:hearts), Spades, Crazy Eights, Rummy, [Blackjack](game:blackjack) and Poker.',
    'See all [card games against the computer](hub:card-games-vs-computer). Casino-style games are simulations that use virtual points only – there is no real money and nothing to buy.',
  ],
  educational: [
    'Learning games that make practice fun: maths drills and [times tables](game:multiplication-challenge), geography, flags and capital cities, science and history quizzes, [typing practice](game:typing-tutor) and early-years games for counting and the alphabet.',
    'Browse every [quiz and trivia game](hub:quiz-games) and [math game](hub:math-games). All questions are stored in the site itself, so the games work offline and never need an account.',
  ],
  brain: [
    'Brain games that train memory, attention and reasoning: [Simon-style sequences](game:simon-memory), code breakers, number sequences, [logic deduction](game:logic-deduction) puzzles, cryptograms and [chess tactics](game:chess-tactics).',
    'Browse [memory games](hub:memory-games) and [code-breaking games](hub:code-breaking-games). Track your improvement over time – your best scores and statistics are saved in your browser.',
  ],
  casual: [
    'Simple, relaxing games you can pick up in seconds and put down at any time, like [Bottle Flip](game:bottle-flip), [Stack Blocks](game:stack-blocks) and Keep the Ball Up. Perfect for a short break on your phone or computer.',
    'Want to know how fast you are? Try the [reaction time games](hub:reaction-time-games), or browse [quick games](hub:quick-games) you can finish in a few minutes.',
  ],
  sports: [
    'Sports games that test aim, power and timing: football free kicks and [penalties](game:penalty-shootout), [cricket batting](game:cricket-batting), bowling and a super over, tennis, table tennis, golf, ten-pin bowling, [pool](game:pool), darts, archery and more.',
    'Line up the shot, pick your moment and chase a new personal best – most sports games also have a computer opponent. Aiming games are in [target shooting games](hub:target-shooting-games).',
  ],
  racing: [
    'Racing games for quick sessions: [top-down circuits](game:top-down-racing), [formula cars](game:formula-racing), drifting, traffic dodging, motorbikes, boats and even space racing.',
    'For trucks, police chases and parking, see [car driving games](hub:driving-games). Steer with the keyboard or with on-screen controls on a phone, and beat your best lap times.',
  ],
  action: [
    'Action games with stylised, cartoony combat: space battles, [tank duels](game:tank-shooter), target shooting, [zombie survival](game:zombie-survival) and [boss fights](game:boss-battle).',
    'Browse [target shooting games](hub:target-shooting-games) and [space shooter games](hub:space-shooter-games). Every round starts in seconds, and difficulty settings change the number and speed of enemies.',
  ],
  strategy: [
    'Strategy and simulation games that reward planning: a compact [civilization game](game:mini-civilization), turn-based [army tactics](game:army-strategy), tower and castle defence, plus city, kingdom, farm, colony, hotel, airport, restaurant, shop and business management.',
    'Browse [tower defense games](hub:tower-defense-games), [idle and clicker games](hub:idle-games) and [tycoon and management games](hub:tycoon-games). Longer games save automatically after every turn, day or quarter, and every computer opponent and market is simulated in your browser.',
  ],
  creative: [
    'Creative games for drawing and colouring: [pixel art](game:pixel-art), paint by number, mandala and colouring pages, a [pass-and-play drawing party game](game:local-pictionary), character dress-up and a logo quiz built from original, fictional logos.',
    'See all [colouring games](hub:coloring-games). Your pictures stay in your browser, and every page and template is original artwork.',
  ],
};

export function categoryIntro(category: CategoryMeta): string[] {
  return CATEGORY_INTROS[category.id] ?? [category.description];
}

export function categoryFaqs(category: CategoryMeta, games: GameDefinition[]): Faq[] {
  const label = categoryLabel(category).toLowerCase();
  const examples = games
    .slice(0, 5)
    .map((g) => `[${g.title}](game:${g.id})`)
    .join(', ');
  const faqs: Faq[] = [
    {
      q: `Are these ${label} free?`,
      a: `Yes. All ${games.length} ${label} on ${site.siteName} are free to play in your browser, with no download and no sign-up.`,
    },
  ];
  if (examples) {
    faqs.push({
      q: `Which ${label} can I play?`,
      a: `You can play ${examples}${games.length > 5 ? ` and ${games.length - 5} more` : ''}.`,
    });
  }
  const mobile = games.filter((g) => g.supportsTouch).length;
  if (mobile > 0) {
    faqs.push({
      q: `Can I play ${label} on my phone?`,
      a:
        mobile === games.length
          ? `Yes. Every game in this category works in mobile browsers with touch controls.`
          : `Yes. ${mobile} of the ${games.length} games in this category have touch controls for phones and tablets.`,
    });
  }
  return faqs;
}
