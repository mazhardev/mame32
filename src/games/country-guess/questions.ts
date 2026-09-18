import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';

type Clue = [country: string, clues: [string, string, string], level: 1 | 2 | 3, region: string];

/**
 * Three clues per country, from vague to obvious. Easy rounds show all three,
 * normal two and hard only the first.
 */
export const COUNTRIES: Clue[] = [
  [
    'France',
    [
      'Its national symbol is the rooster.',
      'It has more time zones than any other country.',
      'The Eiffel Tower is in its capital.',
    ],
    1,
    'eu',
  ],
  [
    'Italy',
    [
      'It contains two independent countries within its borders.',
      'Its islands include Sicily and Sardinia.',
      'Its capital is home to the Colosseum.',
    ],
    1,
    'eu',
  ],
  [
    'Japan',
    [
      'It is made of four main islands and thousands of smaller ones.',
      'Its high-speed trains are called Shinkansen.',
      'Mount Fuji is its highest peak.',
    ],
    1,
    'as',
  ],
  [
    'Egypt',
    [
      'It controls the Suez Canal.',
      'Most of its people live along one great river.',
      'The Great Pyramid of Giza is here.',
    ],
    1,
    'af',
  ],
  [
    'Brazil',
    [
      'Its official language is Portuguese.',
      'It is the largest country in South America.',
      'Rio de Janeiro hosts its famous carnival.',
    ],
    1,
    'am',
  ],
  [
    'Australia',
    [
      'It is both a country and a continent.',
      'Kangaroos and koalas are native here.',
      'The Sydney Opera House is here.',
    ],
    1,
    'oc',
  ],
  [
    'India',
    [
      'It has 22 officially recognised languages.',
      'It is the most populous country in the world.',
      'The Taj Mahal is in Agra.',
    ],
    1,
    'as',
  ],
  [
    'China',
    [
      'It uses a single time zone despite its size.',
      'Giant pandas live in its mountain forests.',
      'The Great Wall stretches across it.',
    ],
    1,
    'as',
  ],
  [
    'Mexico',
    [
      'Its capital was built on the site of an Aztec city.',
      'It gave the world chocolate and chili peppers.',
      'Its southern neighbour is Guatemala and its northern one the United States.',
    ],
    1,
    'am',
  ],
  [
    'Canada',
    [
      'It has the longest coastline in the world.',
      'A maple leaf is on its flag.',
      'Its capital is Ottawa.',
    ],
    1,
    'am',
  ],
  [
    'Greece',
    [
      'It has around 6,000 islands.',
      'The first Olympic Games were held here.',
      'The Parthenon stands in its capital.',
    ],
    1,
    'eu',
  ],
  [
    'United Kingdom',
    [
      'It is made of four countries.',
      'Its currency is the pound sterling.',
      'Big Ben is in its capital.',
    ],
    1,
    'eu',
  ],
  [
    'Spain',
    [
      'It shares the Iberian Peninsula with one other country.',
      'Flamenco dance comes from its south.',
      'Its capital is Madrid.',
    ],
    1,
    'eu',
  ],
  [
    'Russia',
    [
      'It spans eleven time zones.',
      'Lake Baikal, the deepest lake, is here.',
      'Its capital has the Kremlin and Red Square.',
    ],
    2,
    'eu',
  ],
  [
    'Peru',
    ['Lake Titicaca is on its border.', 'Its capital is Lima.', 'Machu Picchu is here.'],
    2,
    'am',
  ],
  [
    'Kenya',
    ['The equator runs through it.', 'The Maasai Mara reserve is here.', 'Its capital is Nairobi.'],
    2,
    'af',
  ],
  [
    'Norway',
    [
      'It has many long, deep sea inlets called fjords.',
      'In summer its far north has the midnight sun.',
      'Its capital is Oslo.',
    ],
    2,
    'eu',
  ],
  [
    'Netherlands',
    [
      'About a quarter of it lies below sea level.',
      'It is famous for tulips and windmills.',
      'Its capital is Amsterdam.',
    ],
    2,
    'eu',
  ],
  [
    'Argentina',
    [
      'Its southern tip is called Tierra del Fuego.',
      'Tango was born in its capital.',
      'Its capital is Buenos Aires.',
    ],
    2,
    'am',
  ],
  [
    'Thailand',
    [
      'It is the only Southeast Asian country never colonised by a European power.',
      'It was formerly called Siam.',
      'Its capital is Bangkok.',
    ],
    2,
    'as',
  ],
  [
    'Turkey',
    [
      'It spans two continents.',
      'Cappadocia is known for its hot-air balloons.',
      'Istanbul is its largest city.',
    ],
    2,
    'me',
  ],
  [
    'South Africa',
    [
      'It has three capital cities.',
      'Table Mountain overlooks one of its cities.',
      'Nelson Mandela was its president.',
    ],
    2,
    'af',
  ],
  [
    'New Zealand',
    [
      'It was among the last large land masses settled by humans.',
      'The kiwi bird is a national symbol.',
      'Its two main islands are called North Island and South Island.',
    ],
    2,
    'oc',
  ],
  [
    'Iceland',
    ['It has no army.', 'Geothermal energy heats most of its homes.', 'Its capital is Reykjavík.'],
    2,
    'eu',
  ],
  [
    'Switzerland',
    [
      'It has four national languages.',
      'It is famous for neutrality, watches and chocolate.',
      'Its largest city is Zurich, but its capital is Bern.',
    ],
    2,
    'eu',
  ],
  [
    'Morocco',
    [
      'It lies just 14 km from Europe across a strait.',
      'Marrakesh and Fes have famous old medinas.',
      'Its capital is Rabat.',
    ],
    3,
    'af',
  ],
  [
    'Mongolia',
    [
      'It is the most sparsely populated sovereign country.',
      'Many of its people live in round tents called gers.',
      'Its capital is Ulaanbaatar.',
    ],
    3,
    'as',
  ],
  [
    'Portugal',
    [
      'It is the westernmost country of mainland Europe.',
      'Its explorers included Vasco da Gama.',
      'Its capital is Lisbon.',
    ],
    2,
    'eu',
  ],
  [
    'Vietnam',
    [
      'Its shape is a long S along the South China Sea.',
      'Ha Long Bay has thousands of limestone islands.',
      'Its capital is Hanoi.',
    ],
    3,
    'as',
  ],
  [
    'Ethiopia',
    [
      'It follows its own calendar, which is about seven years behind.',
      'Coffee is believed to have originated here.',
      'Its capital is Addis Ababa.',
    ],
    3,
    'af',
  ],
  [
    'Nepal',
    [
      'Its flag is not rectangular.',
      'Eight of the world’s ten tallest mountains are on or within its borders.',
      'Its capital is Kathmandu.',
    ],
    3,
    'as',
  ],
  [
    'Chile',
    [
      'It is over 4,000 km long but very narrow.',
      'The Atacama Desert is in its north.',
      'Its capital is Santiago.',
    ],
    3,
    'am',
  ],
  [
    'Madagascar',
    [
      'About 90% of its wildlife is found nowhere else.',
      'Lemurs live only here.',
      'It is an island country off southeast Africa.',
    ],
    2,
    'af',
  ],
  [
    'Jamaica',
    [
      'It is the birthplace of reggae music.',
      'Its capital is Kingston.',
      'Sprinter Usain Bolt comes from here.',
    ],
    2,
    'am',
  ],
  [
    'Ireland',
    [
      'It is known as the Emerald Isle.',
      'Its national symbol is the harp.',
      'Its capital is Dublin.',
    ],
    2,
    'eu',
  ],
  [
    'Indonesia',
    [
      'It is made up of more than 17,000 islands.',
      'The islands of Java, Sumatra and Bali are here.',
      'Its capital is Jakarta.',
    ],
    2,
    'as',
  ],
];

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const shown = d === 'easy' ? 3 : d === 'normal' ? 2 : 1;
  const bank: BankItem[] = COUNTRIES.map(([country, clues, level, region]) => {
    const sameRegion = COUNTRIES.filter((c) => c[3] === region && c[0] !== country).map(
      (c) => c[0],
    );
    const any = COUNTRIES.filter((c) => c[0] !== country).map((c) => c[0]);
    const wrong = [...rng.shuffle(sameRegion), ...rng.shuffle(any)]
      .filter((c, i, a) => a.indexOf(c) === i)
      .slice(0, 3);
    return {
      prompt: `Which country is this?\n${clues
        .slice(0, shown)
        .map((c) => `• ${c}`)
        .join('\n')}`,
      correct: country,
      wrong,
      level,
      explain: shown < 3 ? `Final clue: ${clues[2]}` : undefined,
    };
  });
  return drawFromBank(bank, rng, d, 10);
}
