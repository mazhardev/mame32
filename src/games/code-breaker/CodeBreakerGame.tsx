import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { randomCode } from '../_shared/codes';
import { Keypad, useDigitKeys } from '../_shared/Keypad';
import { WordLayout, WordToast } from '../_shared/words/WordUI';
import { feedback } from './engine';
import type { Mark } from './engine';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const LEVELS = {
  easy: { length: 3, guesses: 8 },
  normal: { length: 4, guesses: 7 },
  hard: { length: 5, guesses: 7 },
} as const;

const SYMBOL: Record<Mark, string> = { ok: '✓', up: '▲', down: '▼' };
const COLOR: Record<Mark, string> = { ok: '#2f9e44', up: '#1e63d6', down: '#c2410c' };

export default function CodeBreakerGame() {
  const shell = useGameShell();
  const { length, guesses: allowed } = LEVELS[shell.difficulty];
  const [secret, setSecret] = useState(() =>
    randomCode(createRng(Date.now()), DIGITS, length, false).join(''),
  );
  const [entry, setEntry] = useState('');
  const [rows, setRows] = useState<{ guess: string; marks: Mark[] }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const restart = useCallback(() => {
    const l = LEVELS[shell.difficulty].length;
    setSecret(randomCode(createRng(Date.now()), DIGITS, l, false).join(''));
    setEntry('');
    setRows([]);
    setMessage(null);
    setDone(false);
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const submit = () => {
    if (done || shell.paused) return;
    if (entry.length !== length) return setMessage(`Enter all ${length} digits`);
    if (rows.length === 0) shell.startRound();
    const marks = feedback(entry, secret);
    const next = [...rows, { guess: entry, marks }];
    setRows(next);
    setEntry('');
    setMessage(null);
    const won = marks.every((m) => m === 'ok');
    if (won || next.length >= allowed) {
      setDone(true);
      shell.play(won ? 'levelComplete' : 'gameOver');
      if (won) {
        void reportProgress('code-breaker.first', 1);
        if (next.length <= 4) void reportProgress('code-breaker.four', 1);
        if (shell.difficulty === 'hard') void reportProgress('code-breaker.hard', 1);
      }
      shell.endRound({
        score: won ? (allowed - next.length + 1) * 80 + length * 30 : 0,
        won,
        lost: !won,
        title: won ? 'Safe opened!' : 'Alarm! Out of attempts',
        message: won ? undefined : `The code was ${secret}.`,
        details: [{ label: 'Attempts', value: `${next.length} / ${allowed}` }],
      });
    } else {
      shell.play('click');
    }
  };

  const onKey = (k: string) => {
    if (done || shell.paused) return;
    if (k === 'backspace') setEntry((e) => e.slice(0, -1));
    else if (k === 'enter') submit();
    else if (entry.length < length) setEntry((e) => e + k);
  };
  useDigitKeys(onKey, !done && !shell.paused);

  const Digit = ({ d, mark }: { d?: string; mark?: Mark }) => (
    <span
      className="word-tile"
      style={{
        width: 44,
        height: 52,
        flexDirection: 'column',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: mark ? COLOR[mark] : undefined,
        color: mark ? COLOR[mark] : undefined,
        fontSize: '1.4rem',
      }}
    >
      {d ?? ''}
      {mark && <small style={{ fontSize: '0.7rem', lineHeight: 1 }}>{SYMBOL[mark]}</small>}
    </span>
  );

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Code length', value: length },
          { label: 'Attempts left', value: allowed - rows.length },
        ]}
      />
      <p className="small muted" style={{ textAlign: 'center', maxWidth: 460 }}>
        Crack the {length}-digit safe code. After each try: ✓ correct, ▲ the real digit is higher, ▼
        it’s lower. Digits can repeat.
      </p>
      <div style={{ display: 'grid', gap: 6 }}>
        {rows.map((r, i) => (
          <div key={i} className="tile-row" aria-label={`${r.guess}: ${r.marks.join(', ')}`}>
            {[...r.guess].map((d, j) => (
              <Digit key={j} d={d} mark={r.marks[j]} />
            ))}
          </div>
        ))}
        {!done && (
          <div className="tile-row">
            {Array.from({ length }, (_, j) => (
              <Digit key={j} d={entry[j]} />
            ))}
          </div>
        )}
      </div>
      <WordToast message={message} />
      <Keypad onKey={onKey} disabled={done || shell.paused} />
    </WordLayout>
  );
}
