import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';

type Row = [country: string, capital: string, level: 1 | 2 | 3, region: string];

export const CAPITALS: Row[] = [
  // Europe
  ['France', 'Paris', 1, 'eu'],
  ['Germany', 'Berlin', 1, 'eu'],
  ['Italy', 'Rome', 1, 'eu'],
  ['Spain', 'Madrid', 1, 'eu'],
  ['United Kingdom', 'London', 1, 'eu'],
  ['Russia', 'Moscow', 1, 'eu'],
  ['Portugal', 'Lisbon', 1, 'eu'],
  ['Greece', 'Athens', 1, 'eu'],
  ['Netherlands', 'Amsterdam', 2, 'eu'],
  ['Belgium', 'Brussels', 2, 'eu'],
  ['Austria', 'Vienna', 2, 'eu'],
  ['Sweden', 'Stockholm', 2, 'eu'],
  ['Norway', 'Oslo', 2, 'eu'],
  ['Denmark', 'Copenhagen', 2, 'eu'],
  ['Finland', 'Helsinki', 2, 'eu'],
  ['Ireland', 'Dublin', 2, 'eu'],
  ['Poland', 'Warsaw', 2, 'eu'],
  ['Switzerland', 'Bern', 3, 'eu'],
  ['Czechia', 'Prague', 2, 'eu'],
  ['Hungary', 'Budapest', 2, 'eu'],
  ['Romania', 'Bucharest', 3, 'eu'],
  ['Bulgaria', 'Sofia', 3, 'eu'],
  ['Croatia', 'Zagreb', 3, 'eu'],
  ['Serbia', 'Belgrade', 3, 'eu'],
  ['Ukraine', 'Kyiv', 2, 'eu'],
  ['Iceland', 'Reykjavík', 3, 'eu'],
  ['Slovakia', 'Bratislava', 3, 'eu'],
  ['Slovenia', 'Ljubljana', 3, 'eu'],
  ['Estonia', 'Tallinn', 3, 'eu'],
  ['Latvia', 'Riga', 3, 'eu'],
  ['Lithuania', 'Vilnius', 3, 'eu'],
  // Asia
  ['Japan', 'Tokyo', 1, 'as'],
  ['China', 'Beijing', 1, 'as'],
  ['India', 'New Delhi', 1, 'as'],
  ['South Korea', 'Seoul', 1, 'as'],
  ['Thailand', 'Bangkok', 2, 'as'],
  ['Indonesia', 'Jakarta', 2, 'as'],
  ['Philippines', 'Manila', 2, 'as'],
  ['Vietnam', 'Hanoi', 2, 'as'],
  ['Pakistan', 'Islamabad', 2, 'as'],
  ['Bangladesh', 'Dhaka', 2, 'as'],
  ['Malaysia', 'Kuala Lumpur', 2, 'as'],
  ['Nepal', 'Kathmandu', 2, 'as'],
  ['Sri Lanka', 'Sri Jayawardenepura Kotte', 3, 'as'],
  ['Afghanistan', 'Kabul', 3, 'as'],
  ['Mongolia', 'Ulaanbaatar', 3, 'as'],
  ['Kazakhstan', 'Astana', 3, 'as'],
  ['Myanmar', 'Naypyidaw', 3, 'as'],
  ['Cambodia', 'Phnom Penh', 3, 'as'],
  ['Laos', 'Vientiane', 3, 'as'],
  // Middle East
  ['Saudi Arabia', 'Riyadh', 2, 'me'],
  ['Turkey', 'Ankara', 2, 'me'],
  ['Iran', 'Tehran', 2, 'me'],
  ['Iraq', 'Baghdad', 2, 'me'],
  ['United Arab Emirates', 'Abu Dhabi', 2, 'me'],
  ['Qatar', 'Doha', 2, 'me'],
  ['Jordan', 'Amman', 3, 'me'],
  ['Lebanon', 'Beirut', 3, 'me'],
  ['Oman', 'Muscat', 3, 'me'],
  ['Kuwait', 'Kuwait City', 3, 'me'],
  // Africa
  ['Egypt', 'Cairo', 1, 'af'],
  ['Kenya', 'Nairobi', 2, 'af'],
  ['Nigeria', 'Abuja', 2, 'af'],
  ['Ethiopia', 'Addis Ababa', 2, 'af'],
  ['Morocco', 'Rabat', 3, 'af'],
  ['Ghana', 'Accra', 2, 'af'],
  ['Algeria', 'Algiers', 3, 'af'],
  ['Tunisia', 'Tunis', 3, 'af'],
  ['Senegal', 'Dakar', 3, 'af'],
  ['Uganda', 'Kampala', 3, 'af'],
  ['Tanzania', 'Dodoma', 3, 'af'],
  ['Zimbabwe', 'Harare', 3, 'af'],
  ['Zambia', 'Lusaka', 3, 'af'],
  ['Angola', 'Luanda', 3, 'af'],
  ['Rwanda', 'Kigali', 3, 'af'],
  // Americas
  ['United States', 'Washington, D.C.', 1, 'am'],
  ['Canada', 'Ottawa', 1, 'am'],
  ['Mexico', 'Mexico City', 1, 'am'],
  ['Brazil', 'Brasília', 2, 'am'],
  ['Argentina', 'Buenos Aires', 1, 'am'],
  ['Chile', 'Santiago', 2, 'am'],
  ['Peru', 'Lima', 2, 'am'],
  ['Colombia', 'Bogotá', 2, 'am'],
  ['Venezuela', 'Caracas', 2, 'am'],
  ['Cuba', 'Havana', 2, 'am'],
  ['Ecuador', 'Quito', 3, 'am'],
  ['Uruguay', 'Montevideo', 3, 'am'],
  ['Paraguay', 'Asunción', 3, 'am'],
  ['Jamaica', 'Kingston', 3, 'am'],
  ['Costa Rica', 'San José', 3, 'am'],
  ['Panama', 'Panama City', 3, 'am'],
  // Oceania
  ['Australia', 'Canberra', 1, 'oc'],
  ['New Zealand', 'Wellington', 2, 'oc'],
  ['Fiji', 'Suva', 3, 'oc'],
  ['Papua New Guinea', 'Port Moresby', 3, 'oc'],
];

/** Famous cities that are NOT capitals make the best traps. */
const TRAPS: Record<string, string[]> = {
  Australia: ['Sydney', 'Melbourne'],
  Canada: ['Toronto', 'Vancouver'],
  Brazil: ['Rio de Janeiro', 'São Paulo'],
  Turkey: ['Istanbul'],
  'United States': ['New York City', 'Los Angeles'],
  Switzerland: ['Zurich', 'Geneva'],
  Morocco: ['Casablanca', 'Marrakesh'],
  Nigeria: ['Lagos'],
  'New Zealand': ['Auckland'],
  Pakistan: ['Karachi', 'Lahore'],
  India: ['Mumbai', 'Kolkata'],
  China: ['Shanghai', 'Hong Kong'],
  'United Arab Emirates': ['Dubai'],
  Vietnam: ['Ho Chi Minh City'],
  'South Africa': ['Cape Town', 'Johannesburg'],
  Tanzania: ['Dar es Salaam'],
  Kazakhstan: ['Almaty'],
  Myanmar: ['Yangon'],
  'Sri Lanka': ['Colombo'],
  Italy: ['Milan'],
  Spain: ['Barcelona'],
  Germany: ['Munich', 'Hamburg'],
};

const EXPLAIN: Record<string, string> = {
  Netherlands: 'Amsterdam is the constitutional capital; the government sits in The Hague.',
  'Sri Lanka': 'Sri Jayawardenepura Kotte is the official capital; Colombo is the largest city.',
  Australia: 'Canberra was purpose-built as a compromise between Sydney and Melbourne.',
  Canada: 'Ottawa, not Toronto, is the capital of Canada.',
  Brazil: 'Brasília became the capital in 1960, replacing Rio de Janeiro.',
  Turkey: 'Ankara has been the capital since 1923; Istanbul is the largest city.',
  Nigeria: 'Abuja replaced Lagos as the capital in 1991.',
  Kazakhstan: 'Astana replaced Almaty as the capital in 1997.',
  Myanmar: 'Naypyidaw replaced Yangon as the capital in 2006.',
  Tanzania: 'Dodoma is the official capital; Dar es Salaam is the largest city.',
};

/** Builds one question: up to two famous non-capital traps, then same-region capitals. */
function item(rng: Rng, [country, capital, level, region]: Row): BankItem {
  const traps = rng.shuffle([...(TRAPS[country] ?? [])]).slice(0, 2);
  const sameRegion = rng.shuffle(
    CAPITALS.filter((r) => r[3] === region && r[1] !== capital).map((r) => r[1]),
  );
  return {
    prompt: `What is the capital of ${country}?`,
    correct: capital,
    // Exactly three wrong answers, so toQuestion keeps the traps.
    wrong: [...traps, ...sameRegion].slice(0, 3),
    level,
    explain: EXPLAIN[country],
  };
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const items = CAPITALS.map((row) => item(rng, row));
  items.push({
    prompt: 'Which city is the seat of government (executive capital) of South Africa?',
    correct: 'Pretoria',
    wrong: ['Cape Town', 'Johannesburg', 'Durban'],
    level: 3,
    explain:
      'South Africa has three capitals: Pretoria (executive), Cape Town (legislative) and Bloemfontein (judicial).',
  });
  return drawFromBank(items, rng, d, 10);
}
