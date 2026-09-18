import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { randomCode, scoreCode } from '../_shared/codes';
import { Keypad, useDigitKeys } from '../_shared/Keypad';
import { TileRow, WordLayout, WordToast } from '../_shared/words/WordUI';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const LEVELS = {
  easy: { length: 3, guesses: 10 },
  normal: { length: 4, guesses: 10 },
  hard: { length: 5, guesses: 12 },
} as const;

type Row = { guess: string; bulls: number; cows: number };

export default function BullsAndCowsGame() {
  const shell = useGameShell();
  const { length, guesses: allowed } = LEVELS[shell.difficulty];
  const [secret, setSecret] = useState(() =>
    randomCode(createRng(Date.now()), DIGITS, length, true).join(''),
  );
  const [entry, setEntry] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const restart = useCallback(() => {
    const l = LEVELS[shell.difficulty].length;
    setSecret(randomCode(createRng(Date.now()), DIGITS, l, true).join(''));
    setEntry('');
    setRows([]);
    setMessage(null);
    setDone(false);
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const submit = () => {
    if (done || shell.paused) return;
    if (entry.length !== length) return setMessage(`Enter ${length} different digits`);
    if (rows.some((r) => r.guess === entry)) return setMessage('Already tried that');
    if (rows.length === 0) shell.startRound();
    const { exact, partial } = scoreCode([...entry], [...secret]);
    const next = [...rows, { guess: entry, bulls: exact, cows: partial }];
    setRows(next);
    setEntry('');
    setMessage(null);
    const won = exact === length;
    if (won || next.length >= allowed) {
      setDone(true);
      shell.play(won ? 'success' : 'gameOver');
      if (won) {
        void reportProgress('bulls-and-cows.first', 1);
        if (next.length <= 6) void reportProgress('bulls-and-cows.six', 1);
        if (shell.difficulty === 'hard') void reportProgress('bulls-and-cows.hard', 1);
      }
      shell.endRound({
        score: won ? (allowed - next.length + 1) * 60 + length * 40 : 0,
        won,
        lost: !won,
        title: won ? `Cracked in ${next.length} guesses!` : 'Out of guesses',
        message: won ? undefined : `The number was ${secret}.`,
        details: [{ label: 'Guesses', value: `${next.length} / ${allowed}` }],
      });
    } else {
      shell.play(exact ? 'blip' : 'click');
    }
  };

  const onKey = (k: string) => {
    if (done || shell.paused) return;
    if (k === 'backspace') setEntry((e) => e.slice(0, -1));
    else if (k === 'enter') submit();
    else if (entry.length < length && !entry.includes(k)) setEntry((e) => e + k);
  };
  useDigitKeys(onKey, !done && !shell.paused);

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Digits', value: length },
          { label: 'Guesses left', value: allowed - rows.length },
        ]}
      />
      <p className="small muted" style={{ textAlign: 'center', maxWidth: 460 }}>
        Guess the secret {length}-digit number (all digits different). 🎯 Bull = right digit, right
        place. 🐄 Cow = right digit, wrong place.
      </p>
      <div style={{ display: 'grid', gap: 6 }}>
        {rows.map((r) => (
          <div key={r.guess} className="row" style={{ justifyContent: 'center' }}>
            <TileRow
              word={r.guess}
              length={length}
              size={38}
              states={[...r.guess].map(() => 'pending')}
            />
            <span
              style={{ width: 96, fontWeight: 700 }}
              aria-label={`${r.bulls} bulls, ${r.cows} cows`}
            >
              🎯{r.bulls} 🐄{r.cows}
            </span>
          </div>
        ))}
        {!done && (
          <div className="row" style={{ justifyContent: 'center' }}>
            <TileRow word={entry} length={length} size={38} />
            <span style={{ width: 96 }} />
          </div>
        )}
      </div>
      <WordToast message={message} />
      <Keypad onKey={onKey} disabled={done || shell.paused} disabledDigits={[...entry]} />
    </WordLayout>
  );
}
