import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import {
  TileRow,
  WordKeyboard,
  WordLayout,
  WordToast,
  useLetterKeys,
} from '../_shared/words/WordUI';
import type { LetterState } from '../_shared/words/WordUI';
import { checkGuess, pickSecret, remainingCandidates, sharedLetters } from './engine';

const CONFIG = {
  easy: { length: 4, guesses: 15 },
  normal: { length: 5, guesses: 12 },
  hard: { length: 5, guesses: 9 },
} as const;

type Note = 'unknown' | 'out' | 'in';
const NEXT_NOTE: Record<Note, Note> = { unknown: 'out', out: 'in', in: 'unknown' };

export default function GuessTheWordGame() {
  const shell = useGameShell();
  const { length, guesses: maxGuesses } = CONFIG[shell.difficulty];
  const [secret, setSecret] = useState(() => pickSecret(length, createRng(Date.now())));
  const [clues, setClues] = useState<[string, number][]>([]);
  const [current, setCurrent] = useState('');
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const restart = useCallback(() => {
    setSecret(pickSecret(CONFIG[shell.difficulty].length, createRng(Date.now())));
    setClues([]);
    setCurrent('');
    setNotes({});
    setMessage(null);
    setDone(false);
    started.current = false;
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((m) => (m === text ? null : m)), 1800);
  };

  const onKey = useCallback(
    (key: string) => {
      if (done || shell.paused) return;
      if (!started.current) {
        started.current = true;
        shell.startRound();
      }
      if (key === 'backspace') return setCurrent((c) => c.slice(0, -1));
      if (key !== 'enter') {
        if (current.length < length) setCurrent((c) => c + key);
        return;
      }
      const check = checkGuess(
        current,
        length,
        clues.map((c) => c[0]),
      );
      if (!check.ok) {
        shell.play('failure');
        return flash(check.reason);
      }
      const n = sharedLetters(current, secret);
      const next: [string, number][] = [...clues, [current, n]];
      setClues(next);
      setCurrent('');
      const won = current === secret;
      if (won || next.length >= maxGuesses) {
        setDone(true);
        shell.play(won ? 'success' : 'gameOver');
        const score = won ? (maxGuesses - next.length + 1) * 60 + length * 20 : 0;
        if (won) {
          void reportProgress('guess-the-word.first-win', 1);
          if (next.length <= 6) void reportProgress('guess-the-word.six', 1);
          if (shell.difficulty === 'hard') void reportProgress('guess-the-word.hard-win', 1);
        }
        shell.endRound({
          score,
          won,
          lost: !won,
          title: won ? `Found in ${next.length} guesses!` : 'Out of guesses',
          message: won ? undefined : `The word was ${secret.toUpperCase()}.`,
          details: [
            { label: 'Word', value: secret.toUpperCase() },
            { label: 'Guesses', value: `${next.length} / ${maxGuesses}` },
          ],
        });
      } else {
        shell.play(n > 0 ? 'blip' : 'click');
      }
    },
    [clues, current, done, length, maxGuesses, secret, shell],
  );

  useLetterKeys(onKey, !done && !shell.paused);

  const possible = useMemo(
    () => (clues.length ? remainingCandidates(length, clues).length : null),
    [clues, length],
  );

  const keyStates: Record<string, LetterState | undefined> = {};
  for (const [ch, note] of Object.entries(notes)) {
    if (note === 'out') keyStates[ch] = 'absent';
    if (note === 'in') keyStates[ch] = 'correct';
  }

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Guesses', value: `${clues.length}/${maxGuesses}` },
          { label: 'Letters', value: length },
          { label: 'Words left', value: possible ?? '—' },
        ]}
      />
      <p className="small muted" style={{ textAlign: 'center', maxWidth: 460 }}>
        Guess real {length}-letter words with no repeated letters. Each guess shows how many of its
        letters are in the secret word (position doesn’t matter).
      </p>
      <div style={{ display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto', padding: 2 }}>
        {clues.map(([g, n]) => (
          <div key={g} className="row" style={{ justifyContent: 'center' }}>
            <TileRow
              word={g}
              length={length}
              size={36}
              states={[...g].map((ch) =>
                notes[ch] === 'out' ? 'absent' : notes[ch] === 'in' ? 'correct' : 'pending',
              )}
            />
            <strong
              style={{ width: 44, textAlign: 'center', fontSize: '1.3rem' }}
              aria-label={`${n} letters in common`}
            >
              {n}
            </strong>
          </div>
        ))}
        {!done && (
          <div className="row" style={{ justifyContent: 'center' }}>
            <TileRow word={current} length={length} size={36} />
            <span style={{ width: 44 }} />
          </div>
        )}
      </div>
      <WordToast message={message} />
      <WordKeyboard onKey={onKey} states={keyStates} disabled={done || shell.paused} />
      <div style={{ width: '100%' }}>
        <p className="small muted" style={{ textAlign: 'center', marginBottom: 6 }}>
          Notes — tap a letter to mark it: grey = not in the word, green = in the word.
        </p>
        <div className="word-chips">
          {'abcdefghijklmnopqrstuvwxyz'.split('').map((ch) => (
            <button
              key={ch}
              type="button"
              className={`word-chip ${notes[ch] === 'in' ? 'found' : notes[ch] === 'out' ? 'missed' : ''}`}
              style={notes[ch] === 'out' ? { textDecoration: 'line-through' } : undefined}
              aria-label={`${ch.toUpperCase()}: ${notes[ch] ?? 'unknown'}`}
              onClick={() => setNotes((n) => ({ ...n, [ch]: NEXT_NOTE[n[ch] ?? 'unknown'] }))}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    </WordLayout>
  );
}
