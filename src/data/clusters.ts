import type { CollectionMeta } from './collections';
import { getTopic } from './topicIndex';

/**
 * Topic clusters: one hub page per topic that a group of games shares, such as
 * chess or memory games. Each hub belongs to one category (its pillar), lists
 * its games explicitly, and links to a few sibling hubs; that data lives in
 * topicIndex.ts, and this file adds each hub's page copy. Games link back to
 * their hub, which is how the site builds topical depth for search.
 *
 * Copy can carry links: [text](game:<id>), [text](hub:<slug>) and
 * [text](cat:<slug>) — see src/seo/links.ts.
 */
type ClusterCopy = Omit<
  CollectionMeta,
  'kind' | 'includes' | 'name' | 'parent' | 'ids' | 'related'
>;

function cluster(copy: ClusterCopy): CollectionMeta {
  const topic = getTopic(copy.slug);
  if (!topic) throw new Error(`No topic entry for hub ${copy.slug}`);
  const ids = new Set(topic.ids);
  return {
    ...copy,
    kind: 'cluster',
    name: topic.name,
    parent: topic.parent,
    ids: topic.ids,
    related: topic.related,
    includes: (g) => ids.has(g.id),
  };
}

export const CLUSTERS: CollectionMeta[] = [
  cluster({
    slug: 'chess-and-checkers-games',
    icon: '♟️',
    heading: 'Chess and checkers games',
    title: 'Chess & Checkers Games – Play Free Online',
    description:
      'Play {count} free chess and checkers games: chess vs the computer, mate-in-two puzzles, tactics drills, checkers, draughts and Chinese checkers. No download.',
    intro: [
      'Play a full game of [chess against the computer](game:chess) at three strengths, or take turns with a friend on one device. To sharpen your eye, find the checkmate in [Chess Puzzle](game:chess-puzzle) or race the clock in [Chess Tactics](game:chess-tactics).',
      'Prefer something lighter? [Checkers](game:checkers) and [Draughts Variants](game:draughts-variants) share the same diagonal jumps, and [Chinese Checkers](game:chinese-checkers) is a race across a star. More classics are in [board games](cat:board).',
    ],
    faqs: [
      {
        q: 'Can I play chess against the computer for free?',
        a: 'Yes. [Chess](game:chess) has a computer opponent with Easy, Normal and Hard levels that runs in your browser, and a two-player mode for one device.',
      },
      {
        q: 'What is the difference between checkers and draughts?',
        a: 'They are one family of games. [Checkers](game:checkers) uses the 8×8 rules most people know; [Draughts Variants](game:draughts-variants) adds international 10×10 and Brazilian draughts, where kings fly along diagonals.',
      },
      {
        q: 'How can I get better at chess?',
        a: 'Solve a few [mate-in-one and mate-in-two puzzles](game:chess-puzzle) every day and drill winning moves in [Chess Tactics](game:chess-tactics). Both train you to see checks, captures and threats before a real game.',
      },
    ],
  }),
  cluster({
    slug: 'family-board-games',
    icon: '🎲',
    heading: 'Ludo, carrom and family board games',
    title: 'Ludo, Carrom & Family Board Games Online',
    description:
      'Play {count} free family board games online: Ludo, Carrom, Snakes and Ladders, Mancala, Dominoes and Backgammon – vs the computer or a friend. No download.',
    intro: [
      'The board games families play at home, ready on any screen. Race your tokens in [Ludo](game:ludo), flick the striker in [Carrom](game:carrom), or climb and slide in [Snakes and Ladders](game:snakes-and-ladders).',
      'For a slower, thinking game, sow seeds in [Mancala](game:mancala), match ends in [Dominoes](game:dominoes) or race home in [Backgammon](game:backgammon). Most play against the computer or a friend on the same device; see all [2 player games](hub:2-player-games).',
    ],
    faqs: [
      {
        q: 'Can I play Ludo with a friend on one phone?',
        a: 'Yes. [Ludo](game:ludo) has a pass-and-play mode for one device, and you can play against computer opponents too.',
      },
      {
        q: 'Is there an online carrom board game?',
        a: 'Yes. [Carrom](game:carrom) is free in your browser: flick the striker to pocket your coins and cover the queen, against the computer or a friend.',
      },
      {
        q: 'Which board game is best for young children?',
        a: '[Snakes and Ladders](game:snakes-and-ladders) needs no strategy at all, just a roll of the die. More ideas are in [games for kids](hub:games-for-kids).',
      },
    ],
  }),
  cluster({
    slug: 'card-games-vs-computer',
    icon: '🃏',
    heading: 'Card games against the computer',
    title: 'Card Games vs Computer – Play Free Online',
    description:
      'Play {count} free card games against the computer: Hearts, Spades, Rummy, Crazy Eights, War and Poker. Computer players run in your browser. No download.',
    intro: [
      'Classic trick-taking and shedding games with computer players that never keep you waiting. Dodge the Queen of Spades in [Hearts](game:hearts), bid with a partner in [Spades](game:spades), or form sets and runs in [Rummy](game:rummy-vs-computer).',
      'For a quick hand, empty your cards first in [Crazy Eights](game:crazy-eights) or flip for the higher card in [War](game:war-card). Playing alone? The [solitaire games](hub:solitaire-games) need no opponent at all.',
    ],
    faqs: [
      {
        q: 'Can I play Hearts and Spades without other people?',
        a: 'Yes. [Hearts](game:hearts) deals you in with three computer players, and in [Spades](game:spades) a computer partner bids and plays with you.',
      },
      {
        q: 'Do the card games use real money?',
        a: 'No. Nothing on the site uses real money. Games with betting, such as [Poker vs Computer](game:poker-vs-computer), use virtual points only.',
      },
      {
        q: 'Which card game is easiest to learn?',
        a: '[War](game:war-card) needs no decisions at all, and [Crazy Eights](game:crazy-eights) only asks you to match suit or rank.',
      },
    ],
  }),
  cluster({
    slug: 'memory-games',
    icon: '🧠',
    heading: 'Memory games',
    title: 'Memory Games – Free Online Brain Training',
    description:
      'Play {count} free memory games online: match pairs, repeat colour sequences, recall digits and train working memory. Short rounds, no download, no sign-up.',
    intro: [
      'Start with [Memory Match](game:memory-match), the classic pairs game, or turn over playing cards in [Memory Cards](game:memory-cards). To train your recall for order, copy the growing light pattern in [Simon Memory](game:simon-memory).',
      'For numbers and positions, try [Memory Sequence](game:memory-sequence) and [Memory Test](game:memory-test). [Memory Training](game:memory-training) uses the N-back task researchers use to test working memory. More drills are in [brain games](cat:brain).',
    ],
    faqs: [
      {
        q: 'Do memory games improve your memory?',
        a: 'Practice makes you better at the game you practise. [Memory Training](game:memory-training) and [Memory Sequence](game:memory-sequence) give clear scores, so you can track your recall over time.',
      },
      {
        q: 'Which memory game is good for kids?',
        a: '[Memory Match](game:memory-match) works for any age: turn over two cards and find the pairs in as few turns as you can.',
      },
      {
        q: 'How long is a game?',
        a: 'Most rounds take one to three minutes, so they fit in a short break. Your best scores are saved in your browser.',
      },
    ],
  }),
  cluster({
    slug: 'code-breaking-games',
    icon: '🔐',
    heading: 'Code-breaking games',
    title: 'Code Breaking Games – Free Logic Puzzles',
    description:
      'Play {count} free code-breaking games: crack colour codes, secret numbers and coded sayings from feedback clues. Pure deduction, no download, no sign-up.',
    intro: [
      'Every game here hides a secret and gives you clues after each guess. Crack a colour code from black and white pins in [Secret Colors](game:mastermind), or a number from bulls and cows in [Bulls and Cows](game:bulls-and-cows).',
      'Start simple with [Guess the Number](game:guess-the-number) and its higher-or-lower clues, open the safe in [Code Breaker](game:code-breaker), then decode a famous saying in [Cryptogram](game:cryptogram). More deduction is in [logic puzzles](hub:logic-puzzles).',
    ],
    faqs: [
      {
        q: 'What is the best strategy for colour-code games?',
        a: 'Use early guesses to learn which colours are in the code, then fix positions one at a time. [Secret Colors](game:mastermind) shows a black pin for each right colour in the right place.',
      },
      {
        q: 'What are bulls and cows?',
        a: 'In [Bulls and Cows](game:bulls-and-cows) a bull is a right digit in the right place and a cow is a right digit in the wrong place.',
      },
      {
        q: 'Which game should I start with?',
        a: '[Guess the Number](game:guess-the-number). Halving the range each time teaches the same thinking the harder games need.',
      },
    ],
  }),
  cluster({
    slug: 'number-puzzles',
    icon: '🔢',
    heading: 'Sudoku and number puzzles',
    title: 'Sudoku & Number Puzzles – Play Free Online',
    description:
      'Play {count} free number puzzles online: Sudoku, Kakuro, Nonogram, binary puzzles and maths equations. Progress saves automatically. No download.',
    intro: [
      'Grid puzzles that only need logic and a little arithmetic. Fill every row, column and box in [Sudoku](game:sudoku), make each run add up in [Kakuro](game:kakuro), and reveal a hidden picture in [Nonogram](game:nonogram).',
      'For something different, balance 0s and 1s in [Binary Puzzle](game:binary-puzzle) or complete equations in [Math Puzzle](game:math-puzzle). Bigger puzzles save automatically, so you can finish later. See also [math games](hub:math-games).',
    ],
    faqs: [
      {
        q: 'Can I play Sudoku online for free?',
        a: 'Yes. [Sudoku](game:sudoku) is free in your browser. Every puzzle has exactly one solution, and a game in progress is saved automatically.',
      },
      {
        q: 'What is the difference between Sudoku and Kakuro?',
        a: 'Both use the digits 1 to 9 without repeats. In [Kakuro](game:kakuro) each run must also add up to its clue, like a number crossword.',
      },
      {
        q: 'Do I need to be good at maths?',
        a: 'No. Sudoku and [Nonogram](game:nonogram) use logic only; [Math Puzzle](game:math-puzzle) and Kakuro use simple adding.',
      },
    ],
  }),
  cluster({
    slug: 'match-3-games',
    icon: '💎',
    heading: 'Match 3 games',
    title: 'Match 3 Games – Play Free Online',
    description:
      'Play {count} free match 3 games online: swap gems, match sweets, pop bubbles and shoot marble chains. No download, no sign-up, no purchases.',
    intro: [
      'Line up three of a kind and watch them vanish. Swap gems against the clock in [Match Three](game:match-three), or work through 120 sweet levels in [Candy Match](game:candy-match).',
      'Prefer to aim? Pop colours in [Bubble Shooter](game:bubble-shooter), trap sea monsters in [Bubble Buddies](game:bubble-buddies), or stop a rolling chain in [Marble Chain](game:marble-chain). For calmer play, see [relaxing games](hub:relaxing-games).',
    ],
    faqs: [
      {
        q: 'Are there match 3 games with levels?',
        a: 'Yes. [Candy Match](game:candy-match) has 120 levels and [Marble Chain](game:marble-chain) has 15 temple levels; your progress is saved in your browser.',
      },
      {
        q: 'Do these games have in-app purchases?',
        a: 'No. Every game is free, and nothing in them can be bought with real money.',
      },
      {
        q: 'Which match 3 game is quickest?',
        a: '[Match Three](game:match-three) is a short, timed gem blitz that fits in a coffee break.',
      },
    ],
  }),
  cluster({
    slug: 'quiz-games',
    icon: '❓',
    heading: 'Quiz and trivia games',
    title: 'Quiz & Trivia Games – Play Free Online',
    description:
      'Play {count} free quiz games online: geography, flags, capital cities, science, history, the periodic table, coding and IQ tests. No download, no sign-up.',
    intro: [
      'Test what you know, one quick round at a time. Travel the world with the [geography quiz](game:geography-quiz), the [flag quiz](game:flag-quiz), [capital cities](game:capital-city-quiz) and [Country Guess](game:country-guess).',
      'For school subjects, try the [science quiz](game:science-quiz), the [history quiz](game:history-quiz) and the [periodic table quiz](game:periodic-table-quiz). Coders can take the [programming quiz](game:programming-quiz), and the [IQ Challenge](game:iq-challenge) mixes puzzles of every kind.',
    ],
    faqs: [
      {
        q: 'Are these quizzes good for students?',
        a: 'Yes. The [periodic table quiz](game:periodic-table-quiz), [science quiz](game:science-quiz) and [history quiz](game:history-quiz) cover common school topics in short rounds.',
      },
      {
        q: 'Is there a world flags quiz?',
        a: 'Yes. The [flag quiz](game:flag-quiz) asks you to name a flag or pick the flag for a country.',
      },
      {
        q: 'Do the quizzes need an internet connection?',
        a: 'No. All questions are stored in the site itself, so quizzes work offline once loaded. See more [educational games](cat:educational).',
      },
    ],
  }),
  cluster({
    slug: 'word-guessing-games',
    icon: '🔤',
    heading: 'Word guessing games',
    title: 'Word Guessing Games – Play Free Online',
    description:
      'Play {count} free word guessing games: find the five-letter word, Hangman, guess the phrase, missing letters and more. Offline dictionary, no download.',
    intro: [
      'Every game here hides a word and gives you clues. Coloured tiles guide you to the answer in [Five Letter Word](game:five-letter-word), and a hidden word must be found before six misses in [Hangman](game:hangman).',
      'Try [Guess the Word](game:guess-the-word) for pure deduction, solve whole sayings in [Guess the Phrase](game:guess-the-phrase), or fill gaps in [Missing Letters](game:missing-letters) and [Finish the Word](game:finish-the-word). More in [word games](cat:word).',
    ],
    faqs: [
      {
        q: 'Is there a free five-letter word game I can play more than once a day?',
        a: 'Yes. [Five Letter Word](game:five-letter-word) gives you a new hidden word every game, as many times as you like.',
      },
      {
        q: 'Can kids play Hangman here?',
        a: 'Yes. [Hangman](game:hangman) uses everyday words and allows six wrong guesses before the round ends.',
      },
      {
        q: 'Do the word games work offline?',
        a: 'Yes. The dictionary is built into the site, so once the page has loaded no connection is needed.',
      },
    ],
  }),
  cluster({
    slug: 'reaction-time-games',
    icon: '⚡',
    heading: 'Reaction time tests and reflex games',
    title: 'Reaction Time Tests & Reflex Games',
    description:
      'Test your reaction time free: simple and choice reaction tests, clicks per second, aim training, timing and reflex games. Results in milliseconds.',
    intro: [
      'Measure how fast you really are. [Reaction Timer](game:reaction-timer) times a simple response, [Reflex Test](game:reflex-test) adds a choice of four pads, and [Reaction Test Pro](game:reaction-test-pro) runs a full three-part battery.',
      'Then train it: count clicks per second in the [click speed test](game:click-speed-test), flick to targets in [Aim Trainer](game:aim-trainer), or beat the gunslinger in [Quick Draw](game:quick-draw). For a lighter round, try [Whack-a-Mole](game:whack-a-mole).',
    ],
    faqs: [
      {
        q: 'What is a good reaction time?',
        a: 'Simple reaction times for adults are usually around 200 to 300 milliseconds. Take five trials in [Reaction Timer](game:reaction-timer) and compare your average.',
      },
      {
        q: 'What is a CPS test?',
        a: 'CPS means clicks per second. The [click speed test](game:click-speed-test) measures it over 5, 10 or 30 seconds.',
      },
      {
        q: 'Can I improve my aim?',
        a: 'Short daily rounds help. [Aim Trainer](game:aim-trainer) counts hits in thirty seconds, so you can see your progress.',
      },
    ],
  }),
  cluster({
    slug: 'runner-games',
    icon: '🏃',
    heading: 'Runner games',
    title: 'Runner Games – Play Free Online',
    description:
      'Play {count} free runner games online: rooftop free running, dino jumps, jetpacks, lane dashes and endless hopping. One button or one tap to play.',
    intro: [
      'Keep moving and see how far you get. Jump the cacti in [Dino Runner](game:dino-runner), free-run the rooftops in [Endless Runner](game:endless-runner), or dash between three lanes in [Lane Rush](game:lane-rush).',
      'Fly instead in [Jetpack Runner](game:jetpack-runner) and [Sky Hopper](game:sky-hopper), cross busy roads in [Road Hopper](game:road-hopper), or follow the beat in [Rhythm Runner](game:rhythm-runner). More fast games are in [arcade games](cat:arcade).',
    ],
    faqs: [
      {
        q: 'Is there a dinosaur running game like the one in the browser?',
        a: 'Yes. In [Dino Runner](game:dino-runner) a little dinosaur leaps cacti and ducks birds as the desert speeds up.',
      },
      {
        q: 'Can I play runner games on my phone?',
        a: 'Yes. Every runner here works with taps or swipes in a mobile browser, with no app to install.',
      },
      {
        q: 'Which runner game is hardest?',
        a: '[Rhythm Runner](game:rhythm-runner) and [Jetpack Runner](game:jetpack-runner) demand the most precise timing.',
      },
    ],
  }),
  cluster({
    slug: 'space-shooter-games',
    icon: '🚀',
    heading: 'Space shooter games',
    title: 'Space Shooter Games – Play Free Online',
    description:
      'Play {count} free space shooter games: shoot-’em-ups, alien waves, asteroid fields and zero-gravity dogfights. Cartoon style, no download, no sign-up.',
    intro: [
      'Blast through space, one wave at a time. Power up and face the boss in [Space Shooter](game:space-shooter), hold back a marching formation in [Alien Defender](game:alien-defender), or dodge dive-bombers in [Alien Shooter](game:alien-shooter).',
      'Clear rocks in [Asteroid Blaster](game:asteroid-blaster), guard a planet in [Asteroid Defense](game:asteroid-defense), save the city in [Alien Invasion](game:alien-invasion), and out-turn fighters in [Space Combat](game:space-combat).',
    ],
    faqs: [
      {
        q: 'Are these shooting games violent?',
        a: 'No. Ships, aliens and rocks are cartoon-style and simply burst into sparks. There is no blood or gore.',
      },
      {
        q: 'Which space game is best for beginners?',
        a: '[Alien Defender](game:alien-defender) moves slowly at first and only asks you to move left and right and fire.',
      },
      {
        q: 'Can I play with a keyboard?',
        a: 'Yes. Every space game plays with the keyboard on a computer and with on-screen controls on a phone.',
      },
    ],
  }),
  cluster({
    slug: 'block-games',
    icon: '🧱',
    heading: 'Block games',
    title: 'Block Games – Free Online Block Puzzles',
    description:
      'Play {count} free block games online: rotate falling pieces, fill rows and columns, dodge falling blocks and stack the tallest tower. No download.',
    intro: [
      'Fit, drop and stack. Rotate falling pieces to clear rows in [Block Drop](game:block-drop), or place shapes on a grid to clear rows and columns in [Block Puzzle](game:block-puzzle).',
      'Build up instead of clearing: stack sliding blocks in [Stack Tower](game:stack-tower) or swing them from a crane in [Stack Blocks](game:stack-blocks). [Falling Blocks](game:falling-blocks) turns it around – dodge them and climb. For number tiles, try [2048](game:number-merge-2048).',
    ],
    faqs: [
      {
        q: 'Is there a falling block puzzle game here?',
        a: 'Yes. [Block Drop](game:block-drop) is the classic: rotate the falling pieces and clear full rows.',
      },
      {
        q: 'Which block game has no timer?',
        a: '[Block Puzzle](game:block-puzzle) has no falling pieces or clock; you lose only when no shape fits.',
      },
      {
        q: 'Do block games work on a phone?',
        a: 'Yes. All of them use taps and swipes in a mobile browser.',
      },
    ],
  }),
  cluster({
    slug: 'maze-games',
    icon: '🌀',
    heading: 'Maze games',
    title: 'Maze Games – Play Free Online',
    description:
      'Play {count} free maze games online: generated mazes, dark escape mazes, dot-munching chases and bomb-blasting mazes. No download, no sign-up.',
    intro: [
      'Find your way out. Every [Maze](game:maze) is freshly generated, and [Escape Maze](game:escape-maze) turns down the lights and adds keys and a timer.',
      'Want company? Munch every dot while ghosts give chase in [Maze Muncher](game:maze-muncher), or blast through walls and bosses in [Blast Maze](game:blast-maze). For push-the-crate mazes, try [Sokoban](game:sokoban).',
    ],
    faqs: [
      {
        q: 'Are the mazes different every time?',
        a: 'Yes. [Maze](game:maze) generates a new layout for every game, so you never solve the same one twice.',
      },
      {
        q: 'Is there a maze game for kids?',
        a: 'On Easy, [Maze](game:maze) uses a small 10×10 grid that suits younger players.',
      },
      {
        q: 'Which maze game has enemies?',
        a: '[Maze Muncher](game:maze-muncher) has four ghosts and [Blast Maze](game:blast-maze) has monsters and bosses.',
      },
    ],
  }),
  cluster({
    slug: 'target-shooting-games',
    icon: '🎯',
    heading: 'Target shooting games',
    title: 'Target Shooting Games – Play Free Online',
    description:
      'Play {count} free target games: rifle targets, ducks, archery, darts, knife throwing and shooting galleries. Cartoon style, no download, no sign-up.',
    intro: [
      'Aim, steady, release. Score ten shots on a ringed target in [Target Shooting](game:target-shooting), tag flying ducks in [Duck Target](game:duck-target), and hit dead centre in [Precision Target](game:precision-target).',
      'Prefer a bow? Shoot 30 to 90 metres in [Archery](game:archery) or race a shooting gallery in [Archery Challenge](game:archery-challenge). Then try [Darts](game:darts), [Knife Throw](game:knife-throw) and [Cannon Shooter](game:cannon-shooter).',
    ],
    faqs: [
      {
        q: 'Are these real shooting games?',
        a: 'They are cartoon target games about aim and timing. There are no people as targets and no gore.',
      },
      {
        q: 'Which game is best for practising aim?',
        a: '[Precision Target](game:precision-target) rewards accuracy over speed, and [Aim Trainer](game:aim-trainer) rewards speed.',
      },
      {
        q: 'Can I play darts against the computer?',
        a: 'Yes. [Darts](game:darts) is a game of 301 against a computer player.',
      },
    ],
  }),
  cluster({
    slug: 'tower-defense-games',
    icon: '🏰',
    heading: 'Tower defense games',
    title: 'Tower Defense Games – Play Free Online',
    description:
      'Play {count} free tower defense games online: towers and upgrades, castle sieges, garden defenders, missile and asteroid defence. No download.',
    intro: [
      'Hold the line, wave after wave. Build and upgrade four kinds of tower over 20 waves in [Tower Defense](game:tower-defense), or plant defenders against marching pests in [Garden Guard](game:garden-guard).',
      'Take the controls yourself in [Castle Defense](game:castle-defense), shield six cities in [Missile Defense](game:missile-defense), or spin an orbital cannon in [Asteroid Defense](game:asteroid-defense). More planning games are in [strategy games](cat:strategy).',
    ],
    faqs: [
      {
        q: 'Which tower defense game is best for beginners?',
        a: '[Garden Guard](game:garden-guard) adds one new defender at a time over 15 levels, so you learn as you go.',
      },
      {
        q: 'Can I save my progress?',
        a: 'Yes. Best scores are saved in your browser, and [Garden Guard](game:garden-guard) also remembers every level you unlock.',
      },
      {
        q: 'Do these games work on a phone?',
        a: 'Yes. Tap to build or aim; every game works in a mobile browser.',
      },
    ],
  }),
  cluster({
    slug: 'idle-games',
    icon: '🍪',
    heading: 'Idle and clicker games',
    title: 'Idle & Clicker Games – Play Free Online',
    description:
      'Play {count} free idle and clicker games: bake cookies, run factories and mines, and grow an empire while you are away. Progress saves in your browser.',
    intro: [
      'Click to start, then let it grow. Bake your way to a cookie empire in [Cookie Factory](game:cookie-factory), or grow a village into an empire of wonders in [Clicker Empire](game:clicker-empire).',
      'Prefer a puzzle in your idle game? Keep every machine fed from ore to robots in [Idle Factory](game:idle-factory), or fix the bottleneck in [Idle Miner](game:idle-miner). For hands-on management, see [tycoon games](hub:tycoon-games).',
    ],
    faqs: [
      {
        q: 'Do idle games keep earning while I am away?',
        a: 'Most do. [Cookie Factory](game:cookie-factory), [Idle Factory](game:idle-factory) and [Idle Miner](game:idle-miner) keep working while you are away, and every game saves in your browser.',
      },
      {
        q: 'Are there any purchases?',
        a: 'No. Every upgrade is earned in the game; nothing costs real money.',
      },
      {
        q: 'Which idle game is the most relaxed?',
        a: '[Cookie Factory](game:cookie-factory) is the simplest: click, buy bakeries and watch the numbers climb.',
      },
    ],
  }),
  cluster({
    slug: 'tycoon-games',
    icon: '💼',
    heading: 'Tycoon and management games',
    title: 'Tycoon & Management Games – Play Free',
    description:
      'Play {count} free tycoon and management games: restaurants, shops, hotels, airports, farms, a start-up and a stock market. Saves in your browser.',
    intro: [
      'Run the business and make the numbers work. Serve hungry customers in [Restaurant Simulator](game:restaurant-simulator), set prices in [Shop Simulator](game:shop-simulator), and grow a five-star hotel in [Hotel Manager](game:hotel-manager).',
      'Bigger ambitions? Launch gadgets in [Business Simulator](game:business-simulator), trade shares in [Stock Market Simulator](game:stock-market-sim), or build from a lemonade cart to theme parks in [Mini Tycoon](game:mini-tycoon). Markets and companies are invented and simulated in your browser.',
    ],
    faqs: [
      {
        q: 'Is the stock market game real?',
        a: 'No. [Stock Market Simulator](game:stock-market-sim) uses eight invented companies and simulated prices. No real money is involved.',
      },
      {
        q: 'Which management game is quickest?',
        a: '[Restaurant Simulator](game:restaurant-simulator) runs over five busy days, and [Shop Simulator](game:shop-simulator) over two weeks.',
      },
      {
        q: 'Does my business save?',
        a: 'Yes. The longer games save automatically as you play, so you can close the page and continue later.',
      },
    ],
  }),
  cluster({
    slug: 'driving-games',
    icon: '🚗',
    heading: 'Car driving games',
    title: 'Car Driving Games – Play Free Online',
    description:
      'Play {count} free car driving games: weave through traffic, race the motorway, chase suspects, haul trucks and park without a scrape. No download.',
    intro: [
      'Hit the road. Chain near misses in [Traffic Racer](game:traffic-racer), beat each checkpoint in [Highway Racer](game:highway-racer), or cruise and collect coins in [Endless Traffic Driving](game:endless-traffic-driving).',
      'Want a job to do? Make the arrest in [Police Chase](game:police-chase), deliver loose crates in [Truck Driving](game:truck-driving), or nail ten tricky bays in [Parking Challenge](game:parking-challenge). For laps and circuits, see [racing games](cat:racing).',
    ],
    faqs: [
      {
        q: 'Can I play car games on my phone?',
        a: 'Yes. Every driving game has on-screen controls in a mobile browser, and arrow keys on a computer.',
      },
      {
        q: 'Which driving game is the most relaxed?',
        a: '[Endless Traffic Driving](game:endless-traffic-driving) is an easy-going endless drive: hop between three lanes, pass slow traffic and collect coins.',
      },
      {
        q: 'Is there a parking game?',
        a: 'Yes. [Parking Challenge](game:parking-challenge) has ten bays, and [Parking Puzzle](game:parking-puzzle) is a car-park logic puzzle.',
      },
    ],
  }),
  cluster({
    slug: 'coloring-games',
    icon: '🎨',
    heading: 'Colouring games',
    title: 'Coloring Games – Free Online Coloring Pages',
    description:
      'Play {count} free colouring games online: colouring pages, endless mandalas, paint by number and pixel art. Tap to colour, no download, no sign-up.',
    intro: [
      'Pick a colour and fill. Colour six original pictures in the [Coloring Game](game:coloring-game), or relax with endlessly generated patterns in [Mandala Coloring](game:mandala-coloring).',
      'For a guided picture, fill numbered squares in [Paint by Number](game:paint-by-number), or draw your own sprites in [Pixel Art](game:pixel-art). More art and drawing games are in [creative games](cat:creative).',
    ],
    faqs: [
      {
        q: 'Are there colouring pages for kids?',
        a: 'Yes. The [Coloring Game](game:coloring-game) has six simple pictures that work well on a tablet. See more [games for kids](hub:games-for-kids).',
      },
      {
        q: 'Are the colouring pages original?',
        a: 'Yes. Every picture and pattern is original artwork made for the site.',
      },
      {
        q: 'Is there a relaxing colouring game for adults?',
        a: '[Mandala Coloring](game:mandala-coloring) creates a new symmetrical pattern each time and paints every matching petal at once.',
      },
    ],
  }),
];
