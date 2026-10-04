'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { Keypad, useDigitKeys } from '../_shared/Keypad';
import { SHOW_MS, advance, expected, isCorrect, makeSequence, reverse, start } from './engine';
import type { SpanState } from './engine';
import '../_shared/casual/casual.css';

type Phase = 'ready' | 'showing' | 'input' | 'feedback' | 'done';

export default function MemorySequenceGame() {
  const shell = useGameShell();
  const level = shell.difficulty;
  const [span, setSpan] = useState<SpanState>(() => start(level));
  const [phase, setPhase] = useState<Phase>('ready');
  const [seq, setSeq] = useState<number[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const [answer, setAnswer] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const present = useCallback(
    (length: number) => {
      clearTimers();
      const s = makeSequence(length, Math.random);
      setSeq(s);
      setAnswer([]);
      setPhase('showing');
      const step = SHOW_MS[level];
      s.forEach((d, i) => {
        timers.current.push(window.setTimeout(() => setShown(d), i * step + 300));
        timers.current.push(window.setTimeout(() => setShown(null), i * step + 300 + step * 0.75));
      });
      timers.current.push(window.setTimeout(() => setPhase('input'), s.length * step + 400));
    },
    [level],
  );

  const restart = useCallback(() => {
    clearTimers();
    setSpan(start(level));
    setPhase('ready');
    setSeq([]);
    setShown(null);
    setAnswer([]);
    setFeedback('');
  }, [level]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);
  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    if (shell.paused && phase === 'showing') {
      clearTimers();
      setShown(null);
      setPhase('feedback');
      setFeedback('Paused — the sequence will replay.');
    }
  }, [shell.paused, phase]);

  const begin = () => {
    if (shell.paused) return;
    shell.startRound();
    present(span.length);
  };

  const submit = (ans: number[]) => {
    const correct = isCorrect(seq, ans, level);
    const { state, over } = advance(span, correct);
    setSpan(state);
    shell.play(correct ? 'success' : 'failure');
    if (over) {
      setPhase('done');
      setFeedback(`It was ${expected(seq, level).join(' ')}.`);
      void reportProgress('memory-sequence.span-7', state.best);
      void reportProgress('memory-sequence.span-9', state.best);
      void reportProgress('memory-sequence.reverse-6', reverse(level) ? state.best : 0);
      void incrementProgress('memory-sequence.tests', 1);
      shell.endRound({
        score: state.best * 100,
        title: state.best ? `Digit span: ${state.best}` : 'Keep practising',
        details: [
          { label: 'Longest sequence', value: `${state.best} digits` },
          { label: 'Mode', value: reverse(level) ? 'Backwards' : 'Forwards' },
        ],
      });
      return;
    }
    setPhase('feedback');
    setFeedback(correct ? `Correct! Next: ${state.length} digits.` : `Not quite — it was ${expected(seq, level).join(' ')}. One more try at ${state.length}.`);
  };

  const onKey = (k: string) => {
    if (phase !== 'input' || shell.paused) return;
    if (k === 'backspace') setAnswer((a) => a.slice(0, -1));
    else if (k === 'enter') {
      if (answer.length) submit(answer);
    } else if (answer.length < seq.length) {
      const next = [...answer, Number(k)];
      setAnswer(next);
      if (next.length === seq.length) submit(next);
    }
  };
  useDigitKeys(onKey, phase === 'input' && !shell.paused);

  useEffect(() => {
    const onEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && phase === 'feedback') {
        e.preventDefault();
        present(span.length);
      }
    };
    window.addEventListener('keydown', onEnter);
    return () => window.removeEventListener('keydown', onEnter);
  }, [phase, present, span.length]);

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Length', value: span.length },
          { label: 'Best', value: span.best },
          { label: 'Strikes', value: `${span.strikes} / 2` },
        ]}
      />
      <div className="cz-panel" style={{ minHeight: 200, justifyContent: 'center' }}>
        {phase === 'ready' && (
          <>
            <div className="cz-status">
              Watch the digits, then type them {reverse(level) ? 'in reverse order' : 'in the same order'}.
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={begin} disabled={shell.paused}>
              Start
            </button>
          </>
        )}
        {phase === 'showing' && (
          <div className="cz-big" style={{ fontFamily: 'var(--font-mono)', minHeight: '1.1em' }} aria-live="assertive">
            {shown ?? ''}
          </div>
        )}
        {phase === 'input' && (
          <>
            <div className="cz-status">{reverse(level) ? 'Type them backwards' : 'Type the sequence'}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', letterSpacing: '0.3em', minHeight: '1.3em' }}>
              {answer.join('')}
              {'_'.repeat(Math.max(0, seq.length - answer.length))}
            </div>
          </>
        )}
        {(phase === 'feedback' || phase === 'done') && (
          <>
            <div className="cz-status" aria-live="polite">
              {feedback}
            </div>
            {phase === 'feedback' && (
              <button type="button" className="btn btn-primary" onClick={() => present(span.length)} disabled={shell.paused}>
                Next sequence
              </button>
            )}
          </>
        )}
      </div>
      <Keypad onKey={onKey} disabled={phase !== 'input' || shell.paused} />
    </div>
  );
}
