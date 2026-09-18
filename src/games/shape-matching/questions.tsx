import type { Rng } from '@/utils/random';
import type { DifficultySetting } from '@/types';
import { repeat } from '../_shared/quiz/math';
import type { QuizQuestion } from '../_shared/quiz/engine';

interface Shape {
  name: string;
  /** Straight sides, or null for curved shapes. */
  sides: number | null;
  level: 1 | 2 | 3;
  svg: string;
}

/** Regular polygon points centred in a 100×100 box. */
function polygon(n: number, rotate = -Math.PI / 2): string {
  return Array.from({ length: n }, (_, i) => {
    const a = rotate + (i * 2 * Math.PI) / n;
    return `${(50 + 42 * Math.cos(a)).toFixed(1)},${(52 + 42 * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

function star(): string {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 18 : 44;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(52 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

export const SHAPES: Shape[] = [
  { name: 'Circle', sides: null, level: 1, svg: '<circle cx="50" cy="50" r="42"/>' },
  { name: 'Square', sides: 4, level: 1, svg: '<rect x="12" y="12" width="76" height="76"/>' },
  { name: 'Triangle', sides: 3, level: 1, svg: `<polygon points="${polygon(3)}"/>` },
  { name: 'Rectangle', sides: 4, level: 1, svg: '<rect x="6" y="26" width="88" height="48"/>' },
  { name: 'Star', sides: null, level: 1, svg: `<polygon points="${star()}"/>` },
  {
    name: 'Heart',
    sides: null,
    level: 1,
    svg: '<path d="M50 88 C20 66 6 48 10 30 C14 14 36 10 50 28 C64 10 86 14 90 30 C94 48 80 66 50 88Z"/>',
  },
  { name: 'Oval', sides: null, level: 2, svg: '<ellipse cx="50" cy="50" rx="44" ry="28"/>' },
  { name: 'Pentagon', sides: 5, level: 2, svg: `<polygon points="${polygon(5)}"/>` },
  { name: 'Hexagon', sides: 6, level: 2, svg: `<polygon points="${polygon(6, 0)}"/>` },
  { name: 'Diamond', sides: 4, level: 2, svg: '<polygon points="50,6 86,50 50,94 14,50"/>' },
  { name: 'Octagon', sides: 8, level: 3, svg: `<polygon points="${polygon(8, Math.PI / 8)}"/>` },
  { name: 'Trapezoid', sides: 4, level: 3, svg: '<polygon points="28,24 72,24 94,78 6,78"/>' },
  { name: 'Parallelogram', sides: 4, level: 3, svg: '<polygon points="30,24 94,24 70,78 6,78"/>' },
  {
    name: 'Crescent',
    sides: null,
    level: 3,
    svg: '<path d="M62 8 A44 44 0 1 0 62 92 A34 34 0 1 1 62 8Z"/>',
  },
];

const PALETTE = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899'];

function picture(shape: Shape, rng: Rng, size = 120) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="shape"
      fill={rng.pick(PALETTE)}
      stroke="var(--text)"
      strokeWidth="2"
      // Shape markup is static and defined above, never user input.
      dangerouslySetInnerHTML={{ __html: shape.svg }}
    />
  );
}

function nameQuestion(rng: Rng, pool: Shape[]): QuizQuestion {
  const shape = rng.pick(pool);
  const wrong = rng
    .shuffle(pool.filter((s) => s.name !== shape.name))
    .slice(0, 3)
    .map((s) => s.name);
  const choices = rng.shuffle([shape.name, ...wrong]);
  return {
    prompt: 'What is this shape called?',
    choices,
    answer: choices.indexOf(shape.name),
    visual: picture(shape, rng),
  };
}

function sidesQuestion(rng: Rng, pool: Shape[]): QuizQuestion {
  const shape = rng.pick(pool.filter((s) => s.sides !== null));
  const answer = String(shape.sides);
  const wrong = rng.shuffle(['3', '4', '5', '6', '8'].filter((n) => n !== answer)).slice(0, 3);
  const choices = rng.shuffle([answer, ...wrong]);
  return {
    prompt: `How many sides does a ${shape.name.toLowerCase()} have?`,
    choices,
    answer: choices.indexOf(answer),
    visual: picture(shape, rng),
  };
}

function pickShapeQuestion(rng: Rng, pool: Shape[]): QuizQuestion {
  const options = rng.shuffle([...pool]).slice(0, 4);
  const target = options[0];
  const labels = ['A', 'B', 'C', 'D'];
  const order = rng.shuffle([0, 1, 2, 3]);
  return {
    prompt: `Which one is the ${target.name.toLowerCase()}?`,
    choices: labels,
    answer: order.indexOf(0),
    visual: (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {order.map((i, pos) => (
          <div key={pos} style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
            {picture(options[i], rng, 72)}
            <strong className="small">{labels[pos]}</strong>
          </div>
        ))}
      </div>
    ),
  };
}

export function makeQuestions(rng: Rng, d: DifficultySetting): QuizQuestion[] {
  const maxLevel = d === 'easy' ? 1 : d === 'normal' ? 2 : 3;
  const pool = SHAPES.filter((s) => s.level <= maxLevel);
  return repeat(10, () => {
    const k = rng.int(0, d === 'easy' ? 2 : 3);
    return k === 0
      ? nameQuestion(rng, pool)
      : k === 1
        ? pickShapeQuestion(rng, pool)
        : sidesQuestion(rng, pool);
  });
}
