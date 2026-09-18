import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { wordsByLength } from '@/games/_shared/words/dictionary';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { evaluateWord, LETTERS } from './engine';

export default function HangmanGame() {
  const shell = useGameShell();
  const pick = useCallback(() => {
    const pool = wordsByLength(4, { easy: 5, normal: 8, hard: 12 }[shell.difficulty]);
    return pool[Math.floor(Math.random() * pool.length)];
  }, [shell.difficulty]);
  const [entry, setEntry] = useState(pick);
  const [guesses, setGuesses] = useState<string[]>([]);
  const started = useRef(false);
  const reset = useCallback(() => {
    setEntry(pick());
    setGuesses([]);
    started.current = false;
  }, [pick]);
  useEffect(() => {
    shell.registerRestart(reset);
  }, [shell, reset]);
  useEffect(() => {
    reset();
  }, [reset]);
  const state = evaluateWord(entry.word, guesses);
  const guess = useCallback(
    (letter: string) => {
      if (
        shell.paused ||
        guesses.includes(letter) ||
        state.won ||
        state.lost ||
        !LETTERS.includes(letter)
      )
        return;
      if (!started.current) {
        started.current = true;
        shell.startRound();
      }
      const next = [...guesses, letter];
      setGuesses(next);
      const result = evaluateWord(entry.word, next);
      shell.play(entry.word.toUpperCase().includes(letter) ? 'success' : 'failure');
      if (result.won || result.lost) {
        if (result.won) {
          void reportProgress('hangman.first-win', 1);
          void reportProgress('hangman.score', result.score);
          if (!result.wrong.length) void reportProgress('hangman.perfect', 1);
        }
        shell.endRound({
          won: result.won,
          lost: result.lost,
          score: result.score,
          title: result.won ? 'Word discovered!' : 'Out of guesses',
          message: `The word was ${entry.word.toUpperCase()}.`,
          details: [{ label: 'Wrong guesses', value: String(result.wrong.length) }],
        });
      }
    },
    [entry, guesses, shell, state.won, state.lost],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat ||
        /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName)
      )
        return;
      const letter = e.key.toUpperCase();
      if (LETTERS.includes(letter) && !['P', 'R', 'F'].includes(letter)) {
        e.preventDefault();
        guess(letter);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [guess]);
  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 16, padding: 16 }}>
      <GameHud
        items={[
          { label: 'Category', value: entry.category },
          { label: 'Chances left', value: state.remaining },
        ]}
      />
      <svg
        viewBox="0 0 200 150"
        width="200"
        height="150"
        aria-label={`${state.wrong.length} of 6 wrong guesses`}
        role="img"
        style={{ color: 'var(--text)' }}
      >
        <path d="M20 140H130M45 140V15H115V32" fill="none" stroke="currentColor" strokeWidth="5" />
        {state.wrong.length > 0 && (
          <circle cx="115" cy="48" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
        )}
        {[
          'M115 64V104',
          'M115 74L90 90',
          'M115 74L140 90',
          'M115 104L92 128',
          'M115 104L138 128',
        ].map(
          (d, i) =>
            state.wrong.length > i + 1 && (
              <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="4" />
            ),
        )}
      </svg>
      <div
        aria-label="Word"
        style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}
      >
        {[...entry.word.toUpperCase()].map((l, i) => (
          <span
            key={i}
            style={{
              borderBottom: '3px solid var(--brand)',
              minWidth: 20,
              textAlign: 'center',
              fontSize: 'clamp(1rem,4vw,1.8rem)',
            }}
          >
            {guesses.includes(l) ? l : '_'}
          </span>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,minmax(0,1fr))',
          gap: 5,
          width: 'min(100%,480px)',
        }}
      >
        {LETTERS.map((l) => (
          <button
            className="btn"
            style={{ padding: 4, minHeight: 44 }}
            key={l}
            disabled={shell.paused || guesses.includes(l) || state.won || state.lost}
            onClick={() => guess(l)}
            aria-label={`Guess ${l}`}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="small muted">
        Use the letter buttons for P, R and F; those keyboard keys control the game toolbar.
      </p>
    </div>
  );
}
