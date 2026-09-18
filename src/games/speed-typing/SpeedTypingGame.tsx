import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { commonWords } from '../_shared/words/lexicon';
import { SAYINGS } from '../_shared/words/sayings';
import { accuracy, compareTyped, wpm } from '../_shared/typing';
import { useCountdown } from '../_shared/useCountdown';
import { WordLayout } from '../_shared/words/WordUI';
import '../_shared/typing.css';

const SECONDS = 60;

function makeText(level: 'easy' | 'normal' | 'hard'): string[] {
  const rng = createRng(Date.now());
  if (level === 'hard') {
    return rng.shuffle([...SAYINGS]).flatMap(([t]) => t.split(' '));
  }
  const max = level === 'easy' ? 5 : 7;
  const pool = commonWords().filter((w) => w.length >= 2 && w.length <= max);
  return Array.from({ length: 200 }, () => rng.pick(pool));
}

export default function SpeedTypingGame() {
  const shell = useGameShell();
  const [words, setWords] = useState<string[]>(() => makeText(shell.difficulty));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState<boolean[]>([]);
  const [chars, setChars] = useState({ correct: 0, total: 0 });
  const [phase, setPhase] = useState<'ready' | 'running' | 'done'>('ready');
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = useCallback(() => {
    setPhase('done');
    const speed = wpm(chars.correct, SECONDS);
    const acc = accuracy(chars.correct, chars.total);
    void reportProgress('speed-typing.wpm-30', speed);
    void reportProgress('speed-typing.wpm-50', speed);
    void reportProgress('speed-typing.wpm-70', speed);
    if (acc === 100 && results.length >= 20) void reportProgress('speed-typing.flawless', 1);
    shell.endRound({
      score: Math.round(speed * 10 * (acc / 100)),
      won: speed >= 20,
      lost: speed < 20,
      title: `${speed} words per minute`,
      details: [
        { label: 'Accuracy', value: `${acc}%` },
        {
          label: 'Words typed',
          value: `${results.filter(Boolean).length} correct of ${results.length}`,
        },
      ],
    });
  }, [chars, results, shell]);

  const timer = useCountdown(SECONDS, phase === 'running' && !shell.paused, finish);

  const reset = useCallback(() => {
    setWords(makeText(shell.difficulty));
    setIndex(0);
    setTyped('');
    setResults([]);
    setChars({ correct: 0, total: 0 });
    setPhase('ready');
    timer.reset(SECONDS);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    // timer.reset is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(reset), [shell, reset]);
  useEffect(() => reset(), [reset]);

  const commit = (value: string) => {
    const word = words[index];
    const ok = value === word;
    const correctChars = ok
      ? word.length + 1
      : compareTyped(word, value).filter((s) => s === 'ok').length;
    setChars((c) => ({
      correct: c.correct + correctChars,
      total: c.total + Math.max(word.length, value.length) + 1,
    }));
    setResults((r) => [...r, ok]);
    setIndex((i) => i + 1);
    setTyped('');
    if (!ok) shell.play('failure');
  };

  const onChange = (value: string) => {
    if (phase === 'done' || shell.paused) return;
    if (phase === 'ready' && value) {
      setPhase('running');
      shell.startRound();
    }
    if (value.endsWith(' ')) {
      const w = value.trim();
      if (w) commit(w);
      else setTyped('');
      return;
    }
    setTyped(value);
  };

  // Show the current line and the next one.
  const view = useMemo(() => {
    const start = Math.max(0, index - (index % 10));
    return words.slice(start, start + 20).map((w, k) => ({ w, i: start + k }));
  }, [index, words]);

  const elapsed = SECONDS - timer.left;
  const live = phase === 'ready' ? 0 : wpm(chars.correct, Math.max(1, elapsed));

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: 'Time', value: `${timer.seconds}s` },
          { label: 'WPM', value: live },
          { label: 'Accuracy', value: `${accuracy(chars.correct, chars.total)}%` },
        ]}
      />
      <div className="typing-text" aria-label="Words to type">
        {view.map(({ w, i }) => {
          if (i < index) {
            return (
              <span key={i} className={results[i] ? 'tw done' : 'tw miss'}>
                {w}
              </span>
            );
          }
          if (i === index) {
            const marks = compareTyped(w, typed);
            return (
              <span key={i} className="tw current">
                {[...w].map((ch, k) => (
                  <span key={k} className={`tc ${marks[k]}`}>
                    {ch}
                  </span>
                ))}
                {typed.length > w.length && <span className="tc bad">{typed.slice(w.length)}</span>}
              </span>
            );
          }
          return (
            <span key={i} className="tw">
              {w}
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        className="input typing-input"
        value={typed}
        disabled={phase === 'done' || shell.paused}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="Type here"
        placeholder={phase === 'ready' ? 'Start typing to begin…' : ''}
      />
      <p className="small muted" style={{ textAlign: 'center' }}>
        Type each word and press Space. The timer starts with your first letter.
      </p>
    </WordLayout>
  );
}
