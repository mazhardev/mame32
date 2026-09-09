You are a senior full-stack JavaScript/TypeScript engineer, browser-game engineer, game architect, UI/UX designer, QA engineer, and performance specialist.

Your task is to design and build a production-quality browser gaming website containing a large collection of games.

The entire application must run in the browser.

# 1. MAIN GOAL

Create a modern gaming website where users can browse and play many games directly in their web browser.

The platform must:

* Require NO backend application server.
* Require NO database server.
* Require NO PHP.
* Require NO Node.js backend.
* Require NO Firebase.
* Require NO Supabase.
* Require NO MongoDB.
* Require NO MySQL/PostgreSQL.
* Require NO authentication server.
* Require NO external game API.
* Require NO runtime internet connection after the application assets have loaded.
* Be deployable as a static website.
* Work on desktop, tablet, and mobile browsers.
* Support keyboard, mouse, touch, and game-specific controls where appropriate.

All user information must remain locally in the browser.

Use:

* localStorage
* IndexedDB

for persistence.

The final production build must be deployable on:

* GitHub Pages
* Cloudflare Pages
* Netlify
* Vercel static hosting
* Any normal static hosting provider

Do not create a backend.

---

# 2. TECHNOLOGY STACK

Use:

* React
* TypeScript
* Vite
* React Router
* CSS variables / modern CSS
* Canvas 2D
* SVG where appropriate
* Web Audio API for simple sound effects
* IndexedDB
* localStorage

You may use small, mature npm libraries when they significantly improve reliability.

Avoid huge dependencies unless necessary.

Do not require a game engine for simple games.

Prefer:

* DOM
* Canvas
* SVG

For more complex arcade/action games, create reusable Canvas game utilities.

The website must remain a completely static frontend application.

---

# 3. IMPORTANT COPYRIGHT RULE

Do NOT copy copyrighted source code, graphics, music, characters, logos, maps, sound effects, or proprietary assets from existing commercial games.

Games inspired by famous games must use:

* original graphics
* original UI
* original sounds
* generic names where necessary
* original level layouts

For example, internally we may describe something as "Tetris-style", but the public game can have an original name such as:

Block Drop

Similarly:

Flappy Bird-style → Sky Hopper

Pac-Man-style → Maze Muncher

Geometry Dash-style → Rhythm Runner

Crossy Road-style → Road Hopper

Doodle Jump-style → Cloud Jumper

Do not copy protected branding.

---

# 4. PROJECT ARCHITECTURE

Create a clean scalable architecture similar to:

src/
app/
components/
layouts/
pages/
games/
game-engine/
hooks/
services/
storage/
achievements/
data/
utils/
types/
assets/
styles/

Within games:

src/games/
snake/
block-drop/
pong/
breakout/
minesweeper/
sudoku/
chess/
etc.

Each game must be self-contained.

Example:

src/games/snake/
SnakeGame.tsx
engine.ts
config.ts
types.ts
achievements.ts
instructions.ts

Do not put the entire project into a few giant files.

---

# 5. CREATE A COMMON GAME SDK

Every game should implement a common interface.

Example concept:

interface GameDefinition {
id: string;
name: string;
description: string;
category: GameCategory;
difficulty: "easy" | "medium" | "hard";
controls: GameControls;
supportsTouch: boolean;
supportsKeyboard: boolean;
supportsLocalMultiplayer?: boolean;
hasLevels?: boolean;
hasHighScore?: boolean;
hasAchievements?: boolean;
component: React.LazyExoticComponent<any>;
}

Create reusable systems for:

* game lifecycle
* pause
* resume
* restart
* score
* high score
* timer
* levels
* game-over state
* sound
* vibration when supported
* achievements
* coins
* difficulty
* save state
* restore state
* responsive canvas
* keyboard controls
* touch controls

Games should reuse these systems rather than implementing duplicate infrastructure.

---

# 6. GAME CATALOG

Create a central:

gameCatalog.ts

Every game must have:

* id
* title
* short description
* full description
* category
* icon
* difficulty
* tags
* controls
* mobile support
* multiplayer type
* estimated session duration
* high-score support
* achievement support
* favorite support
* last-played support

Games must be lazy-loaded so loading the homepage does not download every game immediately.

---

# 7. WEBSITE PAGES

Create these pages.

## Home

Show:

* featured games
* recently played
* continue playing
* popular games
* new games
* categories
* favorite games
* achievements summary

Include a prominent search field.

---

## All Games

Display the complete game catalog.

Filters:

* category
* difficulty
* keyboard
* touch
* single player
* local multiplayer
* high-score games
* puzzle
* arcade
* sports
* card
* board
* strategy
* educational

Sorting:

* alphabetical
* recently played
* most played locally
* favorites
* difficulty

---

## Categories

Create individual category pages.

Examples:

Arcade
Puzzle
Word
Board
Card
Sports
Racing
Action
Strategy
Educational
Casual
Creative
Brain Games

---

## Game Details

Route:

/games/:gameId

Show:

* game
* game title
* fullscreen button
* restart
* pause
* mute
* instructions
* controls
* personal best
* achievements
* statistics
* related games

---

## Favorites

Store favorites locally.

---

## Achievements

Show:

* unlocked achievements
* locked achievements
* completion percentage
* game-specific achievements
* global achievements

---

## Statistics

Display local statistics including:

* total games played
* total play time
* favorite game
* highest scoring games
* games completed
* achievements unlocked
* total coins earned
* longest session
* games played by category

---

## Settings

Settings should include:

* sound effects
* music
* vibration
* difficulty preference
* reduced motion
* theme
* fullscreen preference
* keyboard settings
* show FPS developer option
* reset selected game's data
* reset all data
* export save data
* import save data

---

# 8. LOCAL PLAYER PROFILE

No login is required.

Create one local profile.

Example:

interface PlayerProfile {
id: "local-player";
nickname: string;
createdAt: number;
totalGamesPlayed: number;
totalPlayTime: number;
totalCoins: number;
}

Allow the user to choose a nickname.

No account registration.

---

# 9. LOCALSTORAGE

Use localStorage for small frequently accessed settings.

Example keys:

browserArcade.profile
browserArcade.preferences
browserArcade.theme
browserArcade.audio
browserArcade.favorites
browserArcade.recentGames
browserArcade.lastGame
browserArcade.dataVersion

Do NOT store very large data structures in localStorage.

---

# 10. INDEXEDDB

Create a centralized IndexedDB service.

Database name:

BrowserArcadeDB

Use versioned migrations.

Suggested object stores:

profiles
gameProgress
highScores
scoreHistory
achievements
statistics
gameSettings
savedGames
replays
activityHistory

Example high-score object:

{
id,
gameId,
mode,
difficulty,
score,
createdAt
}

Game progress example:

{
gameId,
level,
checkpoint,
state,
updatedAt
}

Achievement example:

{
achievementId,
gameId,
unlocked,
unlockedAt,
progress,
target
}

Never access IndexedDB directly from individual games.

Create a StorageService abstraction.

---

# 11. SAVE / RESTORE

Games that have progression must automatically save.

Examples:

Sudoku
Chess
2048-style game
Tower Defense
City Builder
Farm Simulator
Idle games
Crossword
Puzzle games

When the user returns, display:

Continue Game

or

New Game

Allow individual saves to be deleted.

---

# 12. EXPORT / IMPORT

Because there is no server or cloud backup, provide:

Export Game Data

This downloads a JSON file containing:

* achievements
* scores
* progress
* settings
* statistics
* favorites
* coins

Provide:

Import Game Data

Validate the JSON before importing it.

Include:

* data version
* exported timestamp
* schema validation

Never execute arbitrary imported code.

---

# 13. SHARED COIN SYSTEM

Create optional local virtual coins.

Coins have NO real-world monetary value.

Users can earn coins by:

* completing levels
* unlocking achievements
* beating personal high scores
* playing daily locally
* completing challenges

Coins can unlock:

* themes
* board skins
* card backs
* game backgrounds
* visual effects

Everything remains local.

No payments.

---

# 14. ACHIEVEMENT SYSTEM

Create global achievements such as:

First Game
Play 5 Games
Play 10 Games
Play 25 Games
Play 50 Games
Try Every Category
Win Your First Game
Beat Your First High Score
Score Master
Puzzle Beginner
Puzzle Master
Arcade Fan
Board Game Fan
Sports Fan
10 Achievements
25 Achievements
50 Achievements

Each game should additionally have 3–10 game-specific achievements.

---

# 15. DAILY CHALLENGE

Implement a browser-local daily challenge.

Use the calendar date as a deterministic seed.

No server.

Examples:

Score 20 points in Snake
Solve a Sudoku
Win Tic-Tac-Toe
Complete a memory board
Score five baskets

Daily challenge state should be stored locally.

Do not pretend it is globally synchronized.

---

# 16. GAME UI

Every game needs consistent controls.

Desktop toolbar:

Back
Restart
Pause
Sound
Fullscreen
Instructions

Mobile:

large touch-friendly controls

The actual game area should maximize available space.

Games must never overflow horizontally on mobile.

---

# 17. RESPONSIVE DESIGN

Support:

320px mobile width
large phones
tablets
laptops
desktop monitors
large monitors

Canvas games must resize while preserving logical coordinates.

Do not simply stretch game graphics.

Use devicePixelRatio appropriately so Canvas stays sharp.

---

# 18. THEMES

Support:

Dark
Light
System

Default gaming design should feel modern and premium.

Use CSS variables.

Avoid excessive neon effects.

Use smooth but lightweight animations.

Respect:

prefers-reduced-motion

---

# 19. ACCESSIBILITY

Where technically possible:

* keyboard accessible navigation
* ARIA labels
* visible focus indicators
* sufficient contrast
* screen-reader descriptions
* reduced animation
* alternative keyboard controls

Games requiring visual interaction should still have accessible menus and instructions.

---

# 20. SOUND

Create simple original sound effects using:

Web Audio API

when possible.

Examples:

click
success
failure
coin
level complete
game over

Do not download copyrighted music.

Global sound settings must affect all games.

---

# 21. OFFLINE SUPPORT

Turn the website into a PWA.

Add:

manifest
service worker
icons
offline asset caching

After the required assets have been cached, previously loaded games should work offline.

Do not require online APIs.

---

# 22. PERFORMANCE

Target:

Lighthouse Performance >= 90

Use:

React.lazy()
dynamic imports
code splitting
requestAnimationFrame
memoization when useful
efficient Canvas rendering

Never run expensive game loops when:

* game is paused
* browser tab is hidden
* game component is unmounted

Use Page Visibility API.

Clean up:

timers
event listeners
animation frames
audio resources

---

# 23. GAME CATALOG TO IMPLEMENT

Implement the following browser games.

Some games below are inspired by classic mechanics. Use original titles/assets where intellectual-property concerns exist.

## ARCADE

1. Snake
2. Block Drop
3. Pong
4. Brick Breaker
5. Alien Defender
6. Asteroid Blaster
7. Maze Muncher
8. Road Hopper
9. Sky Hopper
10. Cloud Jumper
11. Bubble Shooter
12. Fruit Slice
13. Whack-a-Mole
14. Stack Tower
15. Spiral Drop
16. Color Switch
17. Rhythm Runner
18. Endless Runner
19. Jetpack Runner
20. Dino Runner
21. Missile Defense
22. Lunar Lander
23. Space Shooter
24. Alien Shooter
25. Tank Battle
26. Cannon Shooter
27. Archery Challenge
28. Knife Throw
29. Falling Blocks
30. Ball Bounce

## PUZZLE

31. Sudoku
32. Number Merge 2048
33. Minesweeper
34. Sliding Puzzle
35. Jigsaw Puzzle
36. Match Three
37. Candy Match
38. Block Puzzle
39. Number Merge
40. Water Sort
41. Ball Sort
42. Pipe Connect
43. Flow Connect
44. Connect the Dots
45. Tangram
46. Tower of Hanoi
47. Lights Out
48. Nonogram
49. Picross
50. Kakuro
51. Maze
52. Escape Maze
53. Sokoban
54. Unblock Puzzle
55. Parking Puzzle
56. Chess Puzzle
57. Memory Match
58. Spot the Difference
59. Hidden Object
60. Pattern Puzzle

## WORD

61. Five Letter Word
62. Hangman
63. Crossword
64. Tile Word Builder
65. Word Search
66. Word Scramble
67. Anagram
68. Typing Challenge
69. Speed Typing
70. Letter Connect
71. Guess the Word
72. Vocabulary Quiz
73. Spelling Challenge
74. Word Ladder
75. Categories
76. Finish the Word
77. Missing Letters
78. Word Builder
79. Letter Grid
80. Guess the Phrase

## BOARD

81. Chess
82. Checkers
83. Tic-Tac-Toe
84. Connect Four
85. Reversi
86. Ludo
87. Snakes and Ladders
88. Backgammon
89. Nine Men's Morris
90. Chinese Checkers
91. Gomoku
92. Mancala
93. Battleship
94. Hex
95. Mastermind
96. Peg Solitaire
97. Dominoes
98. Tile Solitaire
99. Go
100. Draughts Variants

All computer opponents must run locally.

Never connect to an online chess service or multiplayer server.

## CARD

101. Klondike Solitaire
102. Spider Solitaire
103. FreeCell
104. Pyramid Solitaire
105. TriPeaks
106. Classic Solitaire
107. Blackjack
108. Poker vs Computer
109. Three Card Game vs Computer
110. Rummy vs Computer
111. Color Match Card Game
112. War
113. Crazy Eights
114. Hearts vs AI
115. Spades vs AI
116. Memory Cards
117. Higher or Lower
118. Baccarat
119. Twenty-One
120. Golf Solitaire

No gambling involving real money.

No purchase mechanics.

All casino-style games must clearly be simulations using virtual points only.

## SPORTS

121. Basketball Shot
122. Penalty Shootout
123. Soccer Free Kick
124. Cricket Batting
125. Cricket Bowling
126. Cricket Super Over
127. Tennis
128. Table Tennis
129. Air Hockey
130. Golf
131. Mini Golf
132. Bowling
133. Baseball Batting
134. Pool
135. Darts
136. Archery
137. Boxing
138. Sprint Race
139. Bike Race
140. Horse Race Simulation

## RACING

141. Top Down Car Racing
142. Formula Racing
143. Drift Challenge
144. Traffic Racer
145. Highway Racer
146. Motorcycle Racing
147. Hill Racer
148. Parking Challenge
149. Truck Driving
150. Boat Racing
151. Jet Ski Racing
152. Space Racing
153. Circuit Racing
154. Endless Traffic Driving
155. Police Chase

## ACTION

156. Zombie Survival
157. Space Combat
158. Tank Shooter
159. Target Shooting
160. Duck Target
161. Quick Draw
162. Precision Target
163. Cannon Battle
164. Robot Shooter
165. Alien Invasion
166. Asteroid Defense
167. Tower Defense
168. Survival Arena
169. Boss Battle
170. Dungeon Shooter

Keep violence stylized, cartoony, and non-graphic.

## STRATEGY / SIMULATION

171. Tower Defense
172. Mini City Builder
173. Farm Simulator
174. Business Simulator
175. Restaurant Simulator
176. Shop Simulator
177. Idle Factory
178. Idle Miner
179. Clicker Empire
180. Cookie Factory
181. Mini Civilization
182. Kingdom Builder
183. Army Strategy
184. Castle Defense
185. Resource Manager
186. Stock Market Simulator
187. Trading Simulator
188. Airport Manager
189. Hotel Manager
190. Mini Tycoon

All simulation data must be generated locally.

The stock-market simulator must use fictional/local generated market data rather than requiring live financial APIs.

## EDUCATIONAL

191. Math Quiz
192. Math Racing
193. Multiplication Challenge
194. Geography Quiz
195. Country Guess
196. Flag Quiz
197. Capital City Quiz
198. Periodic Table Quiz
199. Science Quiz
200. History Quiz
201. Programming Quiz
202. Typing Tutor
203. Alphabet Game
204. Kids Counting
205. Memory Training
206. Mental Math
207. Language Vocabulary
208. Vocabulary Challenge
209. Shape Matching
210. Color Learning

All educational question databases should be stored locally.

## CASUAL

211. Sky Hopper
212. Jumping Ball
213. Falling Ball
214. Stack Blocks
215. Bottle Flip
216. Coin Toss
217. Rock Paper Scissors
218. Spin the Wheel
219. Reaction Timer
220. Reflex Test
221. Click Speed Test
222. Aim Trainer
223. Perfect Timing
224. Balance Game
225. Keep the Ball Up
226. Catch Falling Objects
227. Avoid Obstacles
228. Endless Jumper
229. Circle Jump
230. Color Tap

## CREATIVE

231. Local Pictionary
232. Pixel Art
233. Coloring Game
234. Paint by Number
235. Drawing Guess
236. Visual Logo-Style Quiz using original fictional logos
237. Shape Drawing
238. Connect-the-Dots Drawing
239. Mandala Coloring
240. Character Dress-Up

Do not use copyrighted logos or characters.

## BRAIN / LOGIC

241. Simon Memory
242. Memory Sequence
243. Pattern Recognition
244. Number Sequence
245. Logic Grid
246. Matchstick Puzzle
247. Balance Puzzle
248. Logic Deduction
249. Guess the Number
250. Bulls and Cows
251. Code Breaker
252. Mastermind Challenge
253. Binary Puzzle
254. Math Puzzle
255. Cryptogram
256. Chess Tactics
257. Reaction Test Pro
258. Memory Test
259. IQ Challenge
260. Brain Training Collection

---

# 24. DUPLICATE MECHANICS

Some games above share mechanics.

Do NOT unnecessarily duplicate engine code.

For example:

Solitaire games can share:

CardEngine
Deck
Pile
DragDropCard
RulesEngine

Racing games can share:

VehicleEngine
Track
Collision
LapTimer

Board games can share:

BoardEngine
TurnManager
MoveHistory
AI utilities

Word games can share:

DictionaryService
WordGrid
Keyboard
Validation

Arcade games can share:

Sprite
Collision
GameLoop
ParticleSystem
InputManager

Sports games can share:

Physics
AimControl
PowerMeter
ScoreManager

---

# 25. AI OPPONENTS

Where a computer opponent is needed, implement it in the browser.

Examples:

Tic-Tac-Toe:
Minimax.

Connect Four:
Minimax with depth limits and heuristics.

Chess:
Create a reasonable local chess AI or use a browser-compatible open-source chess engine if licensing permits.

Checkers:
Minimax.

Reversi:
Minimax / positional heuristic.

Card games:
Rule-based AI.

Do not call external AI APIs.

---

# 26. RANDOMNESS

Create a reusable random utility.

Support deterministic seeded randomness where useful.

Use this for:

* daily challenges
* puzzles
* procedural levels
* card shuffling
* simulated markets
* generated maps

Use Fisher-Yates shuffle for cards.

---

# 27. GAME DIFFICULTY

When applicable provide:

Easy
Normal
Hard

Save the selected difficulty.

Difficulty should actually change gameplay.

Examples:

AI strength
speed
board size
number of enemies
timer duration
puzzle complexity

---

# 28. STATISTICS PER GAME

Track:

gamesStarted
gamesCompleted
wins
losses
draws
highScore
bestTime
totalScore
totalPlayTime
lastPlayed
favorite
currentWinStreak
bestWinStreak

Only use fields relevant to each game.

---

# 29. SESSION TRACKING

Track playing time accurately.

Pause the session timer when:

* game is paused
* tab becomes hidden
* user leaves the game page

Do not count inactive browser time.

---

# 30. FULLSCREEN

Canvas-heavy games should support browser fullscreen mode.

Handle fullscreen exit correctly.

Mobile layout must remain functional without fullscreen.

---

# 31. GAME INSTRUCTIONS

Each game needs:

How to Play

Controls

Objective

Scoring

Difficulty explanation

Tips

For touch-enabled games, explain touch controls separately.

---

# 32. SEARCH

Users should be able to search:

snake
cards
racing
puzzle
word
football
cricket
chess
etc.

Search:

title
description
tags
category

Search should be instant and client-side.

---

# 33. FAVORITES

Every game card has:

heart / favorite button

Store favorites locally.

---

# 34. RECENTLY PLAYED

Track at least the latest 12 games.

Show them on the homepage.

---

# 35. CONTINUE PLAYING

If games have saved progress, show them in:

Continue Playing

Example:

Sudoku – 45% complete
Tower Defense – Level 8
City Builder – Day 23
Crossword – 60% complete

---

# 36. GAME CARDS

Each card should show:

icon
title
category
difficulty
mobile support indicator

Optional:

personal high score

Do not load heavy game bundles from the card.

---

# 37. ASSETS

Create simple original assets locally using:

CSS
SVG
Canvas

Avoid remote image dependencies.

All important game assets must be bundled with the project.

---

# 38. ERROR HANDLING

Create an error boundary around each game.

If a game crashes:

* do not crash the website
* display "Game encountered an error"
* provide Restart Game
* provide Return to Games

Log development errors in console.

---

# 39. STORAGE FAILURE

Handle:

IndexedDB unavailable
storage quota exceeded
private browser mode limitations
corrupted save data

Do not crash.

Show a useful message.

---

# 40. DATA MIGRATIONS

Create:

CURRENT_DATA_VERSION

When storage schema changes, migrate old data safely.

Never silently destroy player data.

---

# 41. RESET OPTIONS

Settings should provide:

Reset current game
Reset achievements
Reset scores
Reset progress
Reset everything

Require confirmation before destructive reset.

---

# 42. TESTING

Use:

Vitest

and React Testing Library where useful.

Test critical shared systems.

Particularly test:

storage
score calculations
game rules
win detection
loss detection
board validation
AI move legality
save/load
achievements
data migration
random seed utility

Games such as:

Chess
Checkers
Connect Four
Tic-Tac-Toe
Sudoku
Minesweeper

must have rule tests.

---

# 43. GAME QUALITY REQUIREMENT

A game is NOT considered implemented merely because:

* there is a card for it
* a blank canvas exists
* there is a Coming Soon label
* there is placeholder text
* buttons do nothing

Every game marked available must actually be playable.

Never claim all 260 games are complete unless they genuinely are playable.

---

# 44. IMPLEMENTATION STRATEGY

Do NOT attempt to put 260 games into one enormous code file.

Build systematically.

## PHASE 1 — FOUNDATION

Build:

application architecture
routing
design system
homepage
catalog
categories
search
favorites
settings
IndexedDB
localStorage
statistics
achievement system
coin system
game SDK
PWA
responsive layout
error handling

Then verify production build.

---

## PHASE 2 — FIRST 20 GAMES

Implement:

Snake
Block Drop
Pong
Brick Breaker
Minesweeper
Sudoku
2048
Tic-Tac-Toe
Connect Four
Memory Match
Hangman
Word Search
Solitaire
Blackjack
Basketball Shot
Penalty Shootout
Reaction Timer
Aim Trainer
Water Sort
Simon Memory

Make these fully polished.

---

## PHASE 3 — 50 GAMES

Add enough games to reach 50 playable games.

Prioritize reusable engines.

---

## PHASE 4 — 100 GAMES

Reach 100 genuinely playable games.

---

## PHASE 5 — 150 GAMES

Reach 150.

---

## PHASE 6 — 200 GAMES

Reach 200.

---

## PHASE 7 — COMPLETE CATALOG

Implement the remaining catalog until every planned game is genuinely playable.

---

# 45. PROGRESS TRACKING

Create:

PROJECT_STATUS.md

Include:

Platform features completed
Games completed
Games currently being implemented
Games remaining
Known bugs
Architecture decisions

Example:

Platform: 95%

Games:
[✓] Snake
[✓] Pong
[✓] Sudoku
[ ] Chess
[ ] Racing
...

Never mark a game complete unless it works.

Update this document continuously.

---

# 46. GAME IMPLEMENTATION CHECKLIST

For each game verify:

[ ] Game launches
[ ] Instructions exist
[ ] Desktop controls work
[ ] Mobile controls work where appropriate
[ ] Restart works
[ ] Pause works where relevant
[ ] Sound respects settings
[ ] Score works
[ ] High score saves
[ ] Progress saves where relevant
[ ] Statistics update
[ ] Achievements work
[ ] Game-over works
[ ] Responsive layout works
[ ] No console errors
[ ] Refresh does not corrupt data

---

# 47. DEVELOPMENT QUALITY

Enable TypeScript strict mode.

Do not use excessive `any`.

Use:

ESLint
Prettier

Keep components reasonably small.

Use descriptive names.

Comment complicated game algorithms.

Do not comment obvious code.

---

# 48. PERFORMANCE RULES FOR GAME LOOPS

Game loops should use:

requestAnimationFrame

Do NOT use React state for values changing 60 times per second.

For fast game state use:

refs
engine objects
Canvas state

React should manage:

menus
score display
settings
lifecycle

Canvas engine handles high-frequency rendering.

---

# 49. COLLISION SYSTEM

Create reusable collision helpers for:

rectangle intersection
circle intersection
circle vs rectangle
bounds
distance
line intersection

Reuse across arcade/action/sports games.

---

# 50. INPUT MANAGER

Create a centralized browser game input system supporting:

Arrow keys
WASD
Space
Enter
Escape
mouse
pointer events
touch
swipe

Use Pointer Events where possible so mouse and touch share logic.

Prevent browser scrolling only when necessary inside active games.

---

# 51. MOBILE CONTROLS

For action games provide:

virtual directional pad

and/or:

left/right buttons
jump
shoot/action

Controls should have large hit areas.

Support multi-touch where necessary.

---

# 52. GAME PAUSE

Automatically pause when:

document.visibilityState === "hidden"

Do not let games continue running invisibly.

---

# 53. INSTALLABLE APP

The gaming website should be installable as a PWA on supported devices.

Use an app name such as:

Browser Arcade

Keep branding in configuration so it can be renamed later.

Create:

src/config/site.ts

with:

siteName
tagline
description
theme configuration

---

# 54. SEO

Even though this is a game platform, include proper:

page titles
meta descriptions
Open Graph metadata
canonical setup where appropriate
semantic HTML

Each game page should have descriptive metadata.

Because this is static hosting, use an SEO-friendly routing/deployment strategy.

---

# 55. PRIVACY

No analytics should be required by default.

No personal information should leave the browser.

Create a Privacy page stating approximately:

"Game progress, scores, achievements and preferences are stored locally in your browser. This website does not require an account."

Do not make claims that are untrue if future analytics are added.

---

# 56. STORAGE WARNING

Clearly inform users:

Clearing browser/site storage may remove:

scores
progress
achievements
coins
preferences

Encourage Export Save Data for backup.

---

# 57. LOCAL MULTIPLAYER

Games that support two or more people should use:

same-device multiplayer

Examples:

Pong
Tic-Tac-Toe
Connect Four
Chess
Checkers
Ludo
Battleship where feasible

Do NOT implement network multiplayer.

---

# 58. NO SERVER ASSUMPTIONS

Before adding any feature ask internally:

"Can this work entirely in the browser?"

If yes, implement locally.

If it genuinely requires a backend, do not add it.

Examples that are out of scope:

global leaderboard
online matchmaking
cloud synchronization
email registration
server-based tournaments
online chat
remote multiplayer
cross-device accounts

Instead provide local equivalents.

---

# 59. README

Create a professional README.md containing:

Project overview

Features

Technology stack

Architecture

Installation

Development:

npm install
npm run dev

Production:

npm run build
npm run preview

Testing:

npm test

Static deployment instructions for:

GitHub Pages
Cloudflare Pages
Netlify
Vercel

Explain:

localStorage usage
IndexedDB usage
offline/PWA behavior
data export/import
adding another game

---

# 60. ADDING NEW GAMES

Document exactly how another developer can add a game.

Ideally they should only need to:

1. Create the game folder.
2. Implement GameDefinition.
3. Register game in catalog.
4. Use shared score/storage APIs.
5. Add tests.
6. Add achievements.

Do not require editing many unrelated files.

---

# 61. DEVELOPMENT MODE

Create optional developer tools enabled only in development.

Examples:

FPS
canvas dimensions
active game state
storage inspector
reset save
unlock test achievements
add test coins

Never expose intrusive developer controls in production.

---

# 62. BUILD VALIDATION

After significant changes run:

npm run typecheck
npm run lint
npm test
npm run build

Fix failures instead of ignoring them.

Do not leave TypeScript errors.

Do not leave obvious console errors.

---

# 63. BROWSER SUPPORT

Target modern versions of:

Chrome
Edge
Firefox
Safari
Android Chrome
iOS Safari

Use feature detection for optional browser APIs.

---

# 64. FINAL QUALITY STANDARD

The end result should feel like a real gaming portal, not a collection of programming tutorials.

Prioritize:

fast loading
easy discovery
quick game startup
responsive controls
polished game over screens
consistent UI
saved progress
meaningful achievements
high scores
mobile usability

---

# 65. IMPORTANT EXECUTION INSTRUCTION

Start by inspecting the existing repository if one exists.

Do NOT destroy good existing code.

If starting from an empty directory:

initialize the Vite + React + TypeScript project.

Then implement Phase 1.

After Phase 1 passes:

typecheck
lint
tests
production build

begin Phase 2.

Do not generate all 260 folders containing placeholders.

Only register games as playable after actual implementation.

However, the complete catalog may show planned games if they are clearly marked as "Planned" rather than pretending they work.

Continue using the architecture so additional games can be implemented efficiently.

---

# 66. VISUAL DESIGN

Create a modern game portal.

Desktop header:

Logo
Home
Games
Categories
Achievements
Statistics
Search
Settings

Mobile header:

Logo
Search
menu button

Homepage hero:

"Play instantly. No downloads."

Subheading:

"Classic, puzzle, arcade, strategy and casual games that run directly in your browser."

Cards should have:

original SVG icon
game title
category
difficulty
favorite button

Use subtle:

shadows
rounded corners
hover animation
micro-interactions

Avoid excessive gradients and clutter.

---

# 67. GAME RESULT SCREEN

At the end of a game display:

Game Over / Victory
Score
Personal Best
Coins earned
Achievements unlocked
Play Again
Return to Games

If a new high score is achieved:

clearly celebrate it.

---

# 68. ACHIEVEMENT NOTIFICATIONS

When unlocked, display a small non-blocking toast:

🏆 Achievement Unlocked
Snake Beginner
Score 20 points in Snake

Do not interrupt active gameplay.

---

# 69. STORAGE API

Create clean APIs such as:

storage.getHighScore(gameId)
storage.setHighScore(gameId, score)

storage.saveProgress(gameId, data)
storage.loadProgress(gameId)

storage.recordGameStart(gameId)
storage.recordGameComplete(gameId, result)

storage.unlockAchievement(id)

storage.addCoins(amount)

storage.toggleFavorite(gameId)

Individual game components should not need to know whether the underlying data is stored in IndexedDB or localStorage.

---

# 70. SECURITY

Never use:

eval()
new Function()
unsafe imported executable data

Validate all imported save files.

Sanitize user nickname.

Game state imported from JSON must only contain expected fields.

---

# 71. FINAL DELIVERABLE

Ultimately the repository should contain:

A production-ready browser gaming platform.

A scalable shared game architecture.

LocalStorage persistence.

IndexedDB persistence.

High scores.

Game progress.

Settings.

Unlocked levels.

Coins.

Achievements.

Preferences.

Favorites.

Statistics.

Offline support.

Responsive mobile design.

Original game assets.

A large library of genuinely playable games.

No backend dependency.

No database server dependency.

No required external API dependency.

No fake functionality.

No placeholder functionality presented as complete.

Begin implementation now.
