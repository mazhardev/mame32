import type { DifficultySetting } from '@/types';

/** Word lists for drawing games, grouped by how hard they are to draw. */
export const WORDS: Record<DifficultySetting, string[]> = {
  easy: [
    'cat',
    'dog',
    'house',
    'sun',
    'apple',
    'tree',
    'car',
    'fish',
    'bird',
    'ball',
    'cake',
    'hat',
    'boat',
    'star',
    'moon',
    'flower',
    'book',
    'chair',
    'shoe',
    'cloud',
    'key',
    'cup',
    'clock',
    'snake',
    'egg',
    'banana',
    'bed',
    'door',
    'eye',
    'heart',
    'kite',
    'ladder',
    'pizza',
    'rain',
    'spider',
    'train',
    'umbrella',
    'worm',
    'duck',
    'bee',
  ],
  normal: [
    'bicycle',
    'rainbow',
    'robot',
    'pirate',
    'volcano',
    'snowman',
    'lighthouse',
    'toothbrush',
    'guitar',
    'dragon',
    'castle',
    'helicopter',
    'octopus',
    'penguin',
    'sandwich',
    'tornado',
    'treasure',
    'unicorn',
    'waterfall',
    'windmill',
    'astronaut',
    'cactus',
    'dinosaur',
    'fireworks',
    'giraffe',
    'hamburger',
    'jellyfish',
    'kangaroo',
    'mermaid',
    'parachute',
    'rollercoaster',
    'scarecrow',
    'skateboard',
    'submarine',
    'telescope',
    'tent',
    'tractor',
    'vampire',
    'wizard',
    'zebra',
  ],
  hard: [
    'brushing teeth',
    'surfing',
    'traffic jam',
    'birthday party',
    'time travel',
    'homework',
    'camping',
    'earthquake',
    'music',
    'dream',
    'sunburn',
    'shadow',
    'gravity',
    'hide and seek',
    'snowball fight',
    'magic trick',
    'thunderstorm',
    'sleepwalking',
    'haircut',
    'picnic',
    'yawning',
    'echo',
    'wedding',
    'shopping',
    'fishing trip',
    'hiccups',
    'jet lag',
    'stage fright',
    'tug of war',
    'sandcastle',
    'treasure map',
    'deep sea',
    'night sky',
    'lost and found',
    'sneezing',
    'balancing act',
    'tightrope',
    'campfire song',
    'sunrise',
    'autumn',
  ],
};

export const TIMER: Record<DifficultySetting, number> = { easy: 90, normal: 60, hard: 75 };

export function drawWord(d: DifficultySetting, used: Set<string>, random: () => number): string {
  const pool = WORDS[d].filter((w) => !used.has(w));
  const list = pool.length ? pool : WORDS[d];
  return list[Math.floor(random() * list.length)];
}

export interface Player {
  name: string;
  score: number;
}

/** Points for a correct guess: guesser 1, drawer 1, +1 drawer bonus for a quick guess. */
export function award(
  players: Player[],
  drawer: number,
  guesser: number,
  secondsLeft: number,
  total: number,
): Player[] {
  return players.map((p, i) => ({
    ...p,
    score:
      p.score +
      (i === guesser ? 1 : 0) +
      (i === drawer ? 1 + (secondsLeft >= total / 2 ? 1 : 0) : 0),
  }));
}

export function cleanName(raw: string, fallback: string): string {
  const s = raw
    .replace(/[<>&"]/g, '')
    .trim()
    .slice(0, 16);
  return s || fallback;
}
