/**
 * Offline word lists shared by every word game.
 * Everything is bundled: no dictionary API, no network access at runtime.
 */

const RAW: Record<string, string> = {
  animals:
    'tiger lion zebra horse mouse whale shark eagle snake camel panda koala otter moose bison sheep goose robin finch heron gecko lemur llama rhino sloth stork viper wolf bear deer crab moth wasp swan hawk toad seal mole lynx bat owl fox ant elk',
  food:
    'bread cheese butter tomato potato carrot pepper onion garlic ginger lemon mango grape peach melon berry olive pasta pizza salad soup rice bean corn cake pie jam honey pancake muffin cookie waffle yogurt cereal noodle pretzel almond walnut',
  nature:
    'forest desert island valley canyon meadow prairie glacier volcano river stream ocean beach cliff cavern jungle tundra swamp lagoon summit ridge boulder pebble blossom branch leaf root seed storm cloud thunder rainbow sunset sunrise breeze frost',
  science:
    'atom energy gravity photon neutron proton electron molecule enzyme genome orbit comet galaxy nebula quasar plasma vector matrix physics biology geology algebra circuit magnet crystal mineral fossil isotope catalyst polymer neuron protein',
  sports:
    'soccer tennis cricket hockey rugby boxing rowing skiing surfing cycling running jumping archery bowling curling fencing sailing skating diving relay medal referee stadium athlete striker goalie racket paddle helmet trophy',
  travel:
    'airport station harbour compass luggage passport journey voyage safari cruise hostel cabin ticket border shuttle terminal subway highway bridge tunnel village castle museum market plaza island resort camping backpack itinerary',
  home:
    'kitchen bedroom garden window mirror carpet curtain pillow blanket cabinet drawer shelf lantern candle basket teapot kettle ladder garage balcony fireplace doorway staircase cushion wardrobe napkin faucet toaster',
  music:
    'guitar violin piano drums trumpet flute cello banjo harp organ melody harmony rhythm chorus lyric tempo octave chord concert album single studio ballad anthem encore',
  technology:
    'browser network server keyboard monitor printer laptop tablet router pixel binary compiler variable function library package version debug cursor folder backup wireless battery charger antenna',
  general:
    'answer bridge candle danger effort family garden harvest island jacket kitten ladder magnet number orange pencil quiver ribbon silver ticket umbrella velvet wonder yellow zipper anchor basket circle diamond engine feather gallery hammer insect jungle kernel lantern marble needle object palace quartz rocket saddle temple unique voyage window',
};

export interface WordEntry {
  word: string;
  category: string;
}

function buildEntries(): WordEntry[] {
  const seen = new Set<string>();
  const entries: WordEntry[] = [];
  for (const [category, list] of Object.entries(RAW)) {
    for (const raw of list.split(/\s+/)) {
      const word = raw.trim().toLowerCase();
      if (!word || seen.has(word)) continue;
      seen.add(word);
      entries.push({ word, category });
    }
  }
  return entries;
}

export const WORD_ENTRIES: WordEntry[] = buildEntries();
export const WORDS: string[] = WORD_ENTRIES.map((e) => e.word);
const WORD_SET = new Set(WORDS);

export const CATEGORIES = Object.keys(RAW);

export function isWord(word: string): boolean {
  return WORD_SET.has(word.toLowerCase());
}

export function wordsByLength(min: number, max = min): WordEntry[] {
  return WORD_ENTRIES.filter((e) => e.word.length >= min && e.word.length <= max);
}

export function wordsInCategory(category: string): WordEntry[] {
  return WORD_ENTRIES.filter((e) => e.category === category);
}

/** Deterministic pick so daily puzzles are stable for a given seed. */
export function pickWord(entries: WordEntry[], random: () => number): WordEntry {
  return entries[Math.floor(random() * entries.length)];
}

export const CATEGORY_LABEL: Record<string, string> = {
  animals: 'Animals',
  food: 'Food & Drink',
  nature: 'Nature',
  science: 'Science',
  sports: 'Sports',
  travel: 'Travel',
  home: 'Around the Home',
  music: 'Music',
  technology: 'Technology',
  general: 'General',
};
