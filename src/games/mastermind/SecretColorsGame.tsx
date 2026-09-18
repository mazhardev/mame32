import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { randomCode, scoreCode } from '../_shared/codes';
import { WordLayout, WordToast } from '../_shared/words/WordUI';

const PALETTE = [
  ['Red', '#e53935'],
  ['Blue', '#1e88e5'],
  ['Green', '#43a047'],
  ['Yellow', '#fdd835'],
  ['Purple', '#8e24aa'],
  ['Orange', '#fb8c00'],
  ['Pink', '#f06292'],
  ['Teal', '#00897b'],
] as const;

const LEVELS = {
  easy: { pegs: 4, colors: 5, repeats: false, guesses: 10 },
  normal: { pegs: 4, colors: 6, repeats: true, guesses: 10 },
  hard: { pegs: 5, colors: 8, repeats: true, guesses: 12 },
} as const;

type Row = { guess: number[]; exact: number; partial: number };

function Peg({
  color,
  size = 34,
  onClick,
  label,
}: {
  color?: number;
  size?: number;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label ?? (color === undefined ? 'empty' : PALETTE[color][0])}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color === undefined ? 'var(--bg-sunken)' : PALETTE[color][1],
        border: '2px solid var(--border-strong)',
        boxShadow:
          color === undefined
            ? 'inset 0 2px 4px rgba(0,0,0,0.25)'
            : 'inset 0 -3px 0 rgba(0,0,0,0.2)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    />
  );
}

/** Small feedback pins: black = right colour right place, white = right colour wrong place. */
function Pins({ exact, partial, total }: { exact: number; partial: number; total: number }) {
  const pins = [
    ...Array(exact).fill('#111'),
    ...Array(partial).fill('#fff'),
    ...Array(total - exact - partial).fill('transparent'),
  ];
  return (
    <div
      aria-label={`${exact} exact, ${partial} misplaced`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.ceil(total / 2)}, 12px)`,
        gap: 3,
      }}
    >
      {pins.map((c, i) => (
        <span
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: c,
            border: '1px solid var(--border-strong)',
          }}
        />
      ))}
    </div>
  );
}

export default function SecretColorsGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const colors = Array.from({ length: level.colors }, (_, i) => i);
  const [secret, setSecret] = useState<number[]>(() =>
    randomCode(createRng(Date.now()), colors, level.pegs, !level.repeats),
  );
  const [current, setCurrent] = useState<(number | undefined)[]>(Array(level.pegs).fill(undefined));
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const restart = useCallback(() => {
    const l = LEVELS[shell.difficulty];
    const cs = Array.from({ length: l.colors }, (_, i) => i);
    setSecret(randomCode(createRng(Date.now()), cs, l.pegs, !l.repeats));
    setCurrent(Array(l.pegs).fill(undefined));
    setRows([]);
    setMessage(null);
    setDone(false);
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const place = (color: number) => {
    if (done || shell.paused) return;
    const i = current.findIndex((c) => c === undefined);
    if (i < 0) return;
    const next = [...current];
    next[i] = color;
    setCurrent(next);
  };

  const submit = () => {
    if (done || shell.paused) return;
    if (current.some((c) => c === undefined)) return setMessage('Fill every hole first');
    const guess = current as number[];
    if (!level.repeats && new Set(guess).size !== guess.length)
      return setMessage('No repeated colours on Easy');
    if (rows.length === 0) shell.startRound();
    const { exact, partial } = scoreCode(guess, secret);
    const next = [...rows, { guess, exact, partial }];
    setRows(next);
    setCurrent(Array(level.pegs).fill(undefined));
    setMessage(null);
    const won = exact === level.pegs;
    if (won || next.length >= level.guesses) {
      setDone(true);
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) {
        void reportProgress('mastermind.first', 1);
        if (next.length <= 5) void reportProgress('mastermind.five', 1);
        if (shell.difficulty === 'hard') void reportProgress('mastermind.hard', 1);
      }
      shell.endRound({
        score: won ? (level.guesses - next.length + 1) * 70 + level.pegs * 30 : 0,
        won,
        lost: !won,
        title: won ? `Code cracked in ${next.length}!` : 'Out of guesses',
        details: [{ label: 'Guesses', value: `${next.length} / ${level.guesses}` }],
      });
    } else {
      shell.play(exact ? 'blip' : 'click');
    }
  };

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Pegs', value: level.pegs },
          { label: 'Colours', value: level.colors },
          { label: 'Guesses left', value: level.guesses - rows.length },
        ]}
      />
      <p className="small muted" style={{ textAlign: 'center', maxWidth: 480 }}>
        Guess the hidden colour code. ⚫ black pin = right colour, right place. ⚪ white pin = right
        colour, wrong place.
        {level.repeats ? ' Colours can repeat.' : ' No colour is used twice.'}
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((r, i) => (
          <div key={i} className="row" style={{ justifyContent: 'center', gap: 12 }}>
            <div className="row" style={{ gap: 6 }}>
              {r.guess.map((c, j) => (
                <Peg key={j} color={c} size={30} />
              ))}
            </div>
            <Pins exact={r.exact} partial={r.partial} total={level.pegs} />
          </div>
        ))}
        {done ? (
          <div
            className="row"
            style={{ justifyContent: 'center', gap: 6 }}
            aria-label="The secret code"
          >
            <span className="small muted">Code:</span>
            {secret.map((c, j) => (
              <Peg key={j} color={c} size={30} />
            ))}
          </div>
        ) : (
          <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
            {current.map((c, j) => (
              <Peg
                key={j}
                color={c}
                size={40}
                label={
                  c === undefined
                    ? `Hole ${j + 1}, empty`
                    : `Hole ${j + 1}, ${PALETTE[c][0]} (tap to remove)`
                }
                onClick={
                  c === undefined
                    ? undefined
                    : () => setCurrent((cur) => cur.map((x, k) => (k === j ? undefined : x)))
                }
              />
            ))}
          </div>
        )}
      </div>
      <WordToast message={message} />
      {!done && (
        <>
          <div
            className="row wrap"
            style={{ justifyContent: 'center', gap: 10 }}
            role="group"
            aria-label="Colours"
          >
            {colors.map((c) => (
              <Peg
                key={c}
                color={c}
                size={44}
                onClick={() => place(c)}
                label={`Add ${PALETTE[c][0]}`}
              />
            ))}
          </div>
          <div className="row">
            <button className="btn btn-primary" onClick={submit} disabled={shell.paused}>
              Check code
            </button>
            <button className="btn" onClick={() => setCurrent(Array(level.pegs).fill(undefined))}>
              Clear
            </button>
          </div>
        </>
      )}
    </WordLayout>
  );
}
