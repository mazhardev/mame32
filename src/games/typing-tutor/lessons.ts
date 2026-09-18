import type { Rng } from '@/utils/random';
import { commonWords } from '../_shared/words/lexicon';
import { SAYINGS } from '../_shared/words/sayings';

export interface Lesson {
  title: string;
  keys: string;
  tip: string;
  /** 'drill' = letter groups, 'words' = real words from the keys, 'text' = sentences. */
  kind: 'drill' | 'words' | 'text';
}

export const LESSONS: Lesson[] = [
  {
    title: 'Home row: left hand',
    keys: 'asdf',
    kind: 'drill',
    tip: 'Rest your left fingers on A S D F. Feel the bump on F.',
  },
  {
    title: 'Home row: right hand',
    keys: 'jkl;',
    kind: 'drill',
    tip: 'Rest your right fingers on J K L ;. Feel the bump on J.',
  },
  {
    title: 'Full home row',
    keys: 'asdfjkl;',
    kind: 'drill',
    tip: 'Both hands on the home row. Thumbs press Space.',
  },
  {
    title: 'Adding E and I',
    keys: 'asdfjkleir',
    kind: 'words',
    tip: 'Middle fingers reach up for E and I.',
  },
  {
    title: 'Adding R, U, T, G, H, Y',
    keys: 'asdfjklertuighy',
    kind: 'words',
    tip: 'Index fingers stretch to G, H, T and Y.',
  },
  {
    title: 'Top row',
    keys: 'qwertyuiopasdfghjkl',
    kind: 'words',
    tip: 'Reach up and always return to the home row.',
  },
  {
    title: 'Bottom row',
    keys: 'asdfghjklzxcvbnm',
    kind: 'words',
    tip: 'Curl your fingers down for Z to M.',
  },
  {
    title: 'All letters',
    keys: 'abcdefghijklmnopqrstuvwxyz',
    kind: 'words',
    tip: 'Every letter. Keep your eyes on the screen.',
  },
  {
    title: 'Common words',
    keys: 'abcdefghijklmnopqrstuvwxyz',
    kind: 'words',
    tip: 'Build rhythm with everyday words.',
  },
  {
    title: 'Sentences',
    keys: '',
    kind: 'text',
    tip: 'Capitals use Shift with the opposite hand. Mind the punctuation.',
  },
];

/** Builds the practice text for a lesson (around `length` characters). */
export function lessonText(lesson: Lesson, rng: Rng, length: number): string {
  if (lesson.kind === 'text') {
    let out = '';
    for (const [t] of rng.shuffle([...SAYINGS])) {
      if (out.length >= length) break;
      out += (out ? ' ' : '') + t;
    }
    return out;
  }
  if (lesson.kind === 'drill') {
    const chars = lesson.keys.split('');
    const groups: string[] = [];
    while (groups.join(' ').length < length) {
      groups.push(Array.from({ length: rng.int(2, 6) }, () => rng.pick(chars)).join(''));
    }
    return groups.join(' ');
  }
  const allowed = new Set(lesson.keys);
  const pool = commonWords().filter((w) => w.length <= 7 && [...w].every((c) => allowed.has(c)));
  const words: string[] = [];
  while (words.join(' ').length < length) words.push(rng.pick(pool));
  return words.join(' ');
}

/** Which finger presses a key, for the colour-coded keyboard. */
export const FINGER: Record<string, number> = {};
[
  ['qaz1', 0],
  ['wsx2', 1],
  ['edc3', 2],
  ['rfvtgb45', 3],
  ['yhnujm67', 4],
  ['ik,8', 5],
  ['ol.9', 6],
  ['p;/0', 7],
].forEach(([keys, f]) => [...(keys as string)].forEach((k) => (FINGER[k] = f as number)));
