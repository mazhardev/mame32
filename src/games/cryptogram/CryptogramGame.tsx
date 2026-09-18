import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { SAYINGS } from '../_shared/words/sayings';
import { WordKeyboard, WordLayout, WordToast, useLetterKeys } from '../_shared/words/WordUI';
import { answerFor, cipherLetters, encode, isSolved, makeKey } from './engine';

const GIVEN = { easy: 4, normal: 2, hard: 0 } as const;

interface Puzzle {
  plain: string;
  source: string;
  cipher: string;
  key: Record<string, string>;
}

function newPuzzle(level: 'easy' | 'normal' | 'hard'): Puzzle {
  const rng = createRng(Date.now());
  // Longer quotations on harder levels give more letters to work with.
  const pool = SAYINGS.filter(([t]) =>
    level === 'easy' ? t.length <= 45 : level === 'normal' ? t.length <= 60 : t.length > 30,
  );
  const [plain, source] = rng.pick(pool);
  const key = makeKey(rng);
  return { plain, source, cipher: encode(plain, key), key };
}

export default function CryptogramGame() {
  const shell = useGameShell();
  const [puzzle, setPuzzle] = useState<Puzzle>(() => newPuzzle(shell.difficulty));
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedAt = useRef<number | null>(null);

  const setup = useCallback(() => {
    const p = newPuzzle(shell.difficulty);
    const letters = createRng(Date.now() + 1)
      .shuffle(cipherLetters(p.cipher))
      .slice(0, GIVEN[shell.difficulty]);
    const given = Object.fromEntries(letters.map((c) => [c, answerFor(c, p.key)]));
    setPuzzle(p);
    setGuesses(given);
    setLocked(new Set(letters));
    setSelected(null);
    setHints(0);
    setMessage(null);
    setDone(false);
    startedAt.current = null;
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(setup), [shell, setup]);
  useEffect(() => setup(), [setup]);

  const letters = cipherLetters(puzzle.cipher);

  const finishCheck = (next: Record<string, string>, hintCount: number) => {
    if (!isSolved(puzzle.cipher, puzzle.plain, next)) return;
    setDone(true);
    setSelected(null);
    shell.play('levelComplete');
    const seconds = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
    const score = Math.max(100, Math.round(1000 - hintCount * 120 - seconds * 2));
    void reportProgress('cryptogram.first', 1);
    if (hintCount === 0) void reportProgress('cryptogram.no-hints', 1);
    if (seconds < 120) void reportProgress('cryptogram.fast', 1);
    shell.endRound({
      score,
      won: true,
      title: 'Code cracked!',
      message: `“${puzzle.plain}” — ${puzzle.source}`,
      details: [
        { label: 'Hints', value: String(hintCount) },
        { label: 'Time', value: `${Math.round(seconds)}s` },
      ],
    });
  };

  const assign = (plainLetter: string | null) => {
    if (!selected || done || shell.paused || locked.has(selected)) return;
    if (startedAt.current === null) {
      startedAt.current = Date.now();
      shell.startRound();
    }
    const next = { ...guesses };
    if (plainLetter) next[selected] = plainLetter.toUpperCase();
    else delete next[selected];
    setGuesses(next);
    // Move to the next undecoded cipher letter.
    const i = letters.indexOf(selected);
    const after = [...letters.slice(i + 1), ...letters.slice(0, i)].find((c) => !next[c]);
    if (after) setSelected(after);
    finishCheck(next, hints);
  };

  useLetterKeys((k) => {
    if (k === 'backspace') assign(null);
    else if (k.length === 1) assign(k);
  }, !done && !shell.paused);

  const hint = () => {
    const open = letters.filter((c) => guesses[c] !== answerFor(c, puzzle.key));
    const target = selected && open.includes(selected) ? selected : open[0];
    if (!target) return;
    if (startedAt.current === null) {
      startedAt.current = Date.now();
      shell.startRound();
    }
    const next = { ...guesses, [target]: answerFor(target, puzzle.key) };
    setGuesses(next);
    setLocked((l) => new Set(l).add(target));
    setHints((h) => h + 1);
    setMessage(`${target} decodes to ${next[target]}`);
    finishCheck(next, hints + 1);
  };

  // Plain letters used for two different cipher letters can't both be right.
  const counts = new Map<string, number>();
  for (const v of Object.values(guesses)) counts.set(v, (counts.get(v) ?? 0) + 1);

  const words = puzzle.cipher.split(' ');

  return (
    <WordLayout>
      <GameHud
        items={[
          {
            label: 'Decoded',
            value: `${letters.filter((c) => guesses[c]).length}/${letters.length}`,
          },
          { label: 'Hints', value: hints },
        ]}
        extra={
          <button className="btn" onClick={hint} disabled={done || shell.paused}>
            Hint
          </button>
        }
      />
      <p className="small muted" style={{ textAlign: 'center' }}>
        Every letter has been swapped for another. Select a coded letter and type what you think it
        really is.
      </p>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 18px', justifyContent: 'center' }}
      >
        {words.map((w, wi) => (
          <div key={wi} style={{ display: 'flex', gap: 3 }}>
            {[...w].map((c, ci) => {
              const isLetter = c >= 'A' && c <= 'Z';
              if (!isLetter) {
                return (
                  <span
                    key={ci}
                    style={{ alignSelf: 'flex-start', fontWeight: 800, fontSize: '1.2rem' }}
                  >
                    {c}
                  </span>
                );
              }
              const g = guesses[c];
              const conflict = g && (counts.get(g) ?? 0) > 1;
              return (
                <button
                  key={ci}
                  type="button"
                  onClick={() => !done && setSelected(c)}
                  aria-label={`Code letter ${c}${g ? `, guessed ${g}` : ''}`}
                  style={{
                    display: 'grid',
                    justifyItems: 'center',
                    width: 28,
                    padding: '2px 0',
                    borderRadius: 6,
                    background: selected === c ? 'var(--brand-soft)' : 'transparent',
                    outline: selected === c ? '2px solid var(--brand)' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      minHeight: '1.4em',
                      borderBottom: '2px solid var(--border-strong)',
                      width: '100%',
                      textAlign: 'center',
                      color: conflict
                        ? 'var(--danger)'
                        : locked.has(c)
                          ? 'var(--success)'
                          : 'var(--text)',
                    }}
                  >
                    {g ?? ''}
                  </span>
                  <small className="muted" style={{ fontWeight: 600 }}>
                    {c}
                  </small>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <WordToast message={done ? `— ${puzzle.source}` : message} />
      {!done && (
        <WordKeyboard
          onKey={(k) => (k === 'backspace' ? assign(null) : k.length === 1 ? assign(k) : undefined)}
          disabled={shell.paused || !selected}
          enterLabel="—"
        />
      )}
    </WordLayout>
  );
}
