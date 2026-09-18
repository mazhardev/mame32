import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import type { QuizQuestion } from '../_shared/quiz/engine';
import { BRANDS, Logo } from './logos';
import type { Brand } from './logos';

function others(brand: Brand, rng: Rng): Brand[] {
  return rng.shuffle(BRANDS.filter((b) => b.name !== brand.name)).slice(0, 3);
}

function whichCompany(brand: Brand, rng: Rng): QuizQuestion {
  const choices = rng.shuffle([brand.name, ...others(brand, rng).map((b) => b.name)]);
  return {
    prompt: 'Which fictional company most likely uses this logo?',
    choices,
    answer: choices.indexOf(brand.name),
    explain: `${brand.name} is ${brand.business}.`,
    visual: <Logo brand={brand} />,
  };
}

function whichBusiness(brand: Brand, rng: Rng): QuizQuestion {
  const correct = brand.business;
  const choices = rng.shuffle([correct, ...others(brand, rng).map((b) => b.business)]);
  return {
    prompt: 'What kind of business does this logo suggest?',
    choices,
    answer: choices.indexOf(correct),
    explain: `It belongs to ${brand.name}.`,
    visual: <Logo brand={brand} />,
  };
}

function whichLogo(brand: Brand, rng: Rng): QuizQuestion {
  const options = rng.shuffle([brand, ...others(brand, rng)]);
  const labels = ['A', 'B', 'C', 'D'];
  return {
    prompt: `Which logo would suit ${brand.name}, ${brand.business}?`,
    choices: labels,
    answer: options.indexOf(brand),
    visual: (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {options.map((b, i) => (
          <div key={b.name} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
            <Logo brand={b} size={72} />
            <strong className="small">{labels[i]}</strong>
          </div>
        ))}
      </div>
    ),
  };
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const maxLevel = d === 'easy' ? 1 : d === 'normal' ? 2 : 3;
  const pool = rng.shuffle(BRANDS.filter((b) => b.level <= maxLevel)).slice(0, 10);
  const kinds =
    d === 'easy' ? [whichCompany, whichBusiness] : [whichCompany, whichBusiness, whichLogo];
  return pool.map((b) => rng.pick(kinds)(b, rng));
}
