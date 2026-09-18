import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { drawFromBank } from '../_shared/quiz/engine';
import type { BankItem, QuizQuestion } from '../_shared/quiz/engine';

type Row = [
  correct: string,
  hint: string,
  misspellings: [string, string, string],
  level: 1 | 2 | 3,
];

/** Commonly misspelled words (British/American agreement where spellings differ is avoided). */
export const WORDS: Row[] = [
  ['because', 'for the reason that', ['becuase', 'beacause', 'becouse'], 1],
  ['friend', 'a person you like and trust', ['freind', 'frend', 'friened'], 1],
  ['beautiful', 'very pretty', ['beautifull', 'beutiful', 'beatiful'], 1],
  ['different', 'not the same', ['diffrent', 'differant', 'diferent'], 1],
  ['believe', 'to accept as true', ['beleive', 'belive', 'beleave'], 1],
  ['tomorrow', 'the day after today', ['tommorow', 'tomorow', 'tommorrow'], 1],
  ['library', 'a place full of books', ['libary', 'librery', 'liberry'], 1],
  ['February', 'the second month', ['Febuary', 'Februry', 'Febraury'], 1],
  ['Wednesday', 'the day after Tuesday', ['Wensday', 'Wednsday', 'Wendesday'], 1],
  ['separate', 'to divide or keep apart', ['seperate', 'separete', 'seprate'], 1],
  ['necessary', 'needed', ['neccessary', 'necessery', 'nessecary'], 2],
  ['definitely', 'without doubt', ['definately', 'defiantly', 'definitly'], 2],
  ['receive', 'to get something', ['recieve', 'receeve', 'receve'], 2],
  ['occasion', 'a particular event', ['ocassion', 'occassion', 'ocasion'], 2],
  ['calendar', 'a chart of days and months', ['calender', 'calandar', 'calander'], 2],
  ['government', 'the group that runs a country', ['goverment', 'governmint', 'govenment'], 2],
  ['environment', 'the natural world around us', ['enviroment', 'environmint', 'envirnment'], 2],
  ['restaurant', 'a place to buy and eat meals', ['restaraunt', 'resturant', 'restuarant'], 2],
  ['immediately', 'at once', ['immediatly', 'imediately', 'immidiately'], 2],
  ['weird', 'strange', ['wierd', 'weerd', 'wiered'], 2],
  ['address', 'where someone lives', ['adress', 'addres', 'adresss'], 2],
  ['beginning', 'the start', ['begining', 'beggining', 'beginnig'], 2],
  ['accommodate', 'to provide room for', ['accomodate', 'acommodate', 'accommadate'], 3],
  ['embarrass', 'to make someone feel awkward', ['embarass', 'embarras', 'embaress'], 3],
  ['millennium', 'a period of 1,000 years', ['millenium', 'milennium', 'millenneum'], 3],
  ['conscience', 'the inner sense of right and wrong', ['concience', 'conscence', 'consciense'], 3],
  ['rhythm', 'a regular repeated beat', ['rythm', 'rhythem', 'rhytm'], 3],
  ['privilege', 'a special right', ['priviledge', 'privelege', 'privilige'], 3],
  ['occurrence', 'something that happens', ['occurence', 'occurance', 'ocurrence'], 3],
  [
    'questionnaire',
    'a set of written questions',
    ['questionaire', 'questionnare', 'questionairre'],
    3,
  ],
  ['liaison', 'a link or connection', ['liason', 'laison', 'liaisson'], 3],
  ['pharaoh', 'a ruler of ancient Egypt', ['pharoah', 'pharoh', 'pharao'], 3],
  ['bureaucracy', 'complicated official rules', ['beaurocracy', 'burocracy', 'bureacracy'], 3],
  ['mischievous', 'playfully naughty', ['mischievious', 'mischevious', 'mischivous'], 3],
  [
    'entrepreneur',
    'a person who starts a business',
    ['entrepeneur', 'entreprenuer', 'enterpreneur'],
    3,
  ],
];

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const items: BankItem[] = WORDS.map(([correct, hint, wrong, level]) => ({
    prompt: `Which spelling is correct? (${hint})`,
    correct,
    wrong,
    level,
  }));
  return drawFromBank(items, rng, d, 10);
}
