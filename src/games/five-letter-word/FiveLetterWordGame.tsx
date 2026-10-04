import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { isWord, pickAnswer } from '../_shared/words/lexicon';
import {
  TileRow,
  WordKeyboard,
  WordLayout,
  WordToast,
  useLetterKeys,
} from '../_shared/words/WordUI';
import { hardModeViolation, keyboardStates, roundScore, scoreGuess } from './engine';

const LENGTH = 5;
const CONFIG = {
  easy: { guesses: 7, hard: false, hints: 2 },
  normal: { guesses: 6, hard: false, hints: 1 },
  hard: { guesses: 6, hard: true, hints: 0 },
} as const;

export default function FiveLetterWordGame() {
  const shell = useGameShell();
  const config = CONFIG[shell.difficulty];
  const [answer, setAnswer] = useState(() => pickAnswer(LENGTH, createRng(Date.now())));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const restart = useCallback(() => {
    setAnswer(pickAnswer(LENGTH, createRng(Date.now())));
    setGuesses([]);
    setCurrent('');
    setMessage(null);
    setRevealed([]);
    setDone(false);
    started.current = false;
  }, []);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [shell.difficulty, restart]);

  const finish = useCallback(
    (won: boolean, used: number) => {
      setDone(true);
      const penalty = revealed.length * 50;
      const score = won ? Math.max(50, roundScore(used, config.guesses, config.hard) - penalty) : 0;
      if (won) {
        void reportProgress('five-letter-word.first-win', 1);
        if (used <= 3) void reportProgress('five-letter-word.three-guesses', 1);
        if (used === 2 || used === 1) void reportProgress('five-letter-word.two-guesses', 1);
        if (config.hard) void reportProgress('five-letter-word.hard-win', 1);
      }
      shell.endRound({
        score,
        won,
        lost: !won,
        title: won ? `Solved in ${used}!` : 'Out of guesses',
        message: won ? undefined : `The word was ${answer.toUpperCase()}.`,
        details: [
          { label: 'Word', value: answer.toUpperCase() },
          { label: 'Guesses', value: `${used} / ${config.guesses}` },
          { label: 'Hints used', value: String(revealed.length) },
        ],
      });
    },
    [answer, config, revealed.length, shell],
  );

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
      if (key === 'backspace') {
        setCurrent((c) => c.slice(0, -1));
        return;
      }
      if (key === 'enter') {
        if (current.length < LENGTH) return flash('Not enough letters');
        if (!isWord(current)) {
          shell.play('failure');
          return flash('Not in the word list');
        }
        if (config.hard) {
          const problem = hardModeViolation(current, guesses, answer);
          if (problem) return flash(problem);
        }
        const next = [...guesses, current];
        setGuesses(next);
        setCurrent('');
        if (current === answer) {
          shell.play('success');
          finish(true, next.length);
        } else if (next.length >= config.guesses) {
          shell.play('gameOver');
          finish(false, next.length);
        } else {
          shell.play('click');
        }
        return;
      }
      if (current.length < LENGTH) setCurrent((c) => c + key);
    },
    [answer, config, current, done, finish, guesses, shell],
  );

  useLetterKeys(onKey, !done && !shell.paused);

  const reveal = () => {
    const hidden = [...answer].map((_, i) => i).filter((i) => !revealed.includes(i));
    const known = new Set(
      guesses.flatMap((g) => scoreGuess(g, answer).map((m, i) => (m === 'correct' ? i : -1))),
    );
    const candidates = hidden.filter((i) => !known.has(i));
    if (!candidates.length) return;
    const i = candidates[Math.floor(Math.random() * candidates.length)];
    setRevealed((r) => [...r, i]);
    shell.play('select');
  };

  const rows = Array.from({ length: config.guesses }, (_, i) => {
    if (i < guesses.length) {
      return (
        <TileRow
          key={i}
          word={guesses[i]}
          length={LENGTH}
          states={scoreGuess(guesses[i], answer)}
        />
      );
    }
    if (i === guesses.length && !done)
      return <TileRow key={i} word={current} length={LENGTH} label="Current guess" />;
    return <TileRow key={i} word="" length={LENGTH} />;
  });

  return (
    <WordLayout>
      <GameHud
        items={[
          {
            label: 'Guess',
            value: `${Math.min(guesses.length + 1, config.guesses)}/${config.guesses}`,
          },
          { label: 'Mode', value: config.hard ? 'Hard mode' : shell.difficulty },
        ]}
        extra={
          config.hints > 0 ? (
            <button
              className="btn"
              onClick={reveal}
              disabled={done || revealed.length >= config.hints}
              title="Reveal one letter (−50 points)"
            >
              Hint ({config.hints - revealed.length})
            </button>
          ) : undefined
        }
      />
      {revealed.length > 0 && (
        <p className="small muted">
          Hint:{' '}
          {[...answer].map((ch, i) => (revealed.includes(i) ? ch.toUpperCase() : '_')).join(' ')}
        </p>
      )}
      <div style={{ display: 'grid', gap: 6 }}>{rows}</div>
      <WordToast message={message} />
      <WordKeyboard
        onKey={onKey}
        states={keyboardStates(guesses, answer)}
        disabled={done || shell.paused}
      />
    </WordLayout>
  );
}
