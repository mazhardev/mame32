import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { Keypad, useDigitKeys } from '../_shared/Keypad';
import { WordLayout, WordToast } from '../_shared/words/WordUI';

const LEVELS = {
  easy: { max: 50, guesses: 8 },
  normal: { max: 100, guesses: 7 },
  hard: { max: 1000, guesses: 10 },
} as const;

export default function GuessTheNumberGame() {
  const shell = useGameShell();
  const { max, guesses: allowed } = LEVELS[shell.difficulty];
  const [secret, setSecret] = useState(() => createRng(Date.now()).int(1, max + 1));
  const [entry, setEntry] = useState('');
  const [history, setHistory] = useState<{ n: number; hint: 'higher' | 'lower' | 'correct' }[]>([]);
  const [range, setRange] = useState<[number, number]>([1, max]);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const restart = useCallback(() => {
    const m = LEVELS[shell.difficulty].max;
    setSecret(createRng(Date.now()).int(1, m + 1));
    setEntry('');
    setHistory([]);
    setRange([1, m]);
    setMessage(null);
    setDone(false);
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const submit = () => {
    const n = Number(entry);
    if (!entry || done || shell.paused) return;
    if (n < 1 || n > max) return setMessage(`Pick a number from 1 to ${max}`);
    if (history.length === 0) shell.startRound();
    const hint = n === secret ? 'correct' : n < secret ? 'higher' : 'lower';
    const next = [...history, { n, hint } as const];
    setHistory(next);
    setEntry('');
    if (hint === 'higher') setRange(([lo, hi]) => [Math.max(lo, n + 1), hi]);
    if (hint === 'lower') setRange(([lo, hi]) => [lo, Math.min(hi, n - 1)]);
    const won = hint === 'correct';
    if (won || next.length >= allowed) {
      setDone(true);
      shell.play(won ? 'success' : 'gameOver');
      if (won) {
        void reportProgress('guess-the-number.first', 1);
        if (allowed - next.length >= 2) void reportProgress('guess-the-number.efficient', 1);
        if (shell.difficulty === 'hard') void reportProgress('guess-the-number.hard', 1);
      }
      shell.endRound({
        score: won ? (allowed - next.length + 1) * 100 : 0,
        won,
        lost: !won,
        title: won ? `Got it in ${next.length}!` : 'Out of guesses',
        message: won ? undefined : `The number was ${secret}.`,
        details: [{ label: 'Guesses', value: `${next.length} / ${allowed}` }],
      });
    } else {
      shell.play('click');
      setMessage(hint === 'higher' ? `Higher than ${n}` : `Lower than ${n}`);
    }
  };

  const onKey = (k: string) => {
    if (done || shell.paused) return;
    if (k === 'backspace') setEntry((e) => e.slice(0, -1));
    else if (k === 'enter') submit();
    else if (entry.length < String(max).length) setEntry((e) => (e === '0' ? k : e + k));
  };
  useDigitKeys(onKey, !done && !shell.paused);

  const [lo, hi] = range;

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Range', value: `1–${max}` },
          { label: 'Guesses left', value: allowed - history.length },
        ]}
      />
      <p className="small muted">I’m thinking of a number between 1 and {max}.</p>
      <div className="word-panel" style={{ padding: 'var(--space-3)' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 14,
            borderRadius: 7,
            background: 'var(--bg-sunken)',
          }}
          aria-label={`Possible range ${lo} to ${hi}`}
        >
          <div
            style={{
              position: 'absolute',
              left: `${((lo - 1) / max) * 100}%`,
              width: `${Math.max(1, ((hi - lo + 1) / max) * 100)}%`,
              top: 0,
              bottom: 0,
              borderRadius: 7,
              background: 'var(--brand)',
            }}
          />
        </div>
        <span className="small">
          It’s between <strong>{lo}</strong> and <strong>{hi}</strong>
        </span>
        <strong style={{ fontSize: '2.6rem', minHeight: '1.2em', fontFamily: 'var(--font-mono)' }}>
          {entry || '?'}
        </strong>
      </div>
      <WordToast message={message} />
      <Keypad onKey={onKey} disabled={done || shell.paused} />
      <div className="word-chips">
        {history.map((h, i) => (
          <span key={i} className={`word-chip ${h.hint === 'correct' ? 'found' : ''}`}>
            {h.n} {h.hint === 'higher' ? '↑' : h.hint === 'lower' ? '↓' : '✓'}
          </span>
        ))}
      </div>
    </WordLayout>
  );
}
