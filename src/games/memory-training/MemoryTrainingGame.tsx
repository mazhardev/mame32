'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BLOCKS, START_N, STEP_MS, accuracy, isMatch, makeBlock, nextN, scoreBlock } from './engine';
import type { BlockResult } from './engine';
import '../_shared/casual/casual.css';

type Phase = 'ready' | 'running' | 'summary' | 'done';

export default function MemoryTrainingGame() {
  const shell = useGameShell();
  const [n, setN] = useState(START_N[shell.difficulty]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [seq, setSeq] = useState<string[]>([]);
  const [index, setIndex] = useState(-1);
  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);
  const [results, setResults] = useState<{ n: number; r: BlockResult }[]>([]);
  const timers = useRef<number[]>([]);
  const pressedRef = useRef<boolean[]>([]);
  const resultsRef = useRef<{ n: number; r: BlockResult }[]>([]);
  const finishRef = useRef<(all: { n: number; r: BlockResult }[]) => void>(() => {});

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const runBlock = useCallback(
    (level: number) => {
      clearTimers();
      const s = makeBlock(level, Math.random);
      setSeq(s);
      pressedRef.current = Array(s.length).fill(false);
      setPhase('running');
      const step = STEP_MS[shell.difficulty];
      s.forEach((_, i) => {
        timers.current.push(
          window.setTimeout(() => {
            setIndex(i);
            setVisible(true);
            setFeedback(null);
          }, i * step + 400),
        );
        timers.current.push(window.setTimeout(() => setVisible(false), i * step + 400 + step * 0.6));
      });
      timers.current.push(
        window.setTimeout(() => {
          const r = scoreBlock(s, level, pressedRef.current);
          const all = [...resultsRef.current, { n: level, r }];
          resultsRef.current = all;
          setResults(all);
          setN(nextN(level, r));
          if (all.length >= BLOCKS) finishRef.current(all);
          else setPhase('summary');
        }, s.length * step + 500),
      );
    },
    [shell.difficulty],
  );

  const finish = (all: { n: number; r: BlockResult }[]) => {
    setPhase('done');
    const maxN = Math.max(...all.map((b) => b.n));
    const avg = all.reduce((a, b) => a + accuracy(b.r), 0) / all.length;
    void reportProgress('memory-training.two-back', all.some((b) => b.n >= 2 && accuracy(b.r) >= 0.8) ? 1 : 0);
    void reportProgress('memory-training.three-back', all.some((b) => b.n >= 3 && accuracy(b.r) >= 0.8) ? 1 : 0);
    void reportProgress('memory-training.perfect', all.some((b) => accuracy(b.r) === 1) ? 1 : 0);
    void incrementProgress('memory-training.sessions', 1);
    shell.play('levelComplete');
    shell.endRound({
      score: Math.round(avg * 100 * maxN),
      title: `Session complete — up to ${maxN}-back`,
      details: all.map((b, i) => ({ label: `Block ${i + 1} (${b.n}-back)`, value: `${Math.round(accuracy(b.r) * 100)}%` })),
    });
  };
  finishRef.current = finish;

  const restart = useCallback(() => {
    clearTimers();
    setN(START_N[shell.difficulty]);
    setPhase('ready');
    setSeq([]);
    setIndex(-1);
    setVisible(false);
    setResults([]);
    resultsRef.current = [];
    setFeedback(null);
  }, [shell.difficulty]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);
  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    if (shell.paused && phase === 'running') restart();
  }, [shell.paused, phase, restart]);

  const press = useCallback(() => {
    if (phase !== 'running' || index < 0 || pressedRef.current[index]) return;
    pressedRef.current = pressedRef.current.map((p, i) => (i === index ? true : p));
    const good = isMatch(seq, index, n);
    setFeedback(good ? 'good' : 'bad');
    shell.play(good ? 'blip' : 'failure');
  }, [index, n, phase, seq, shell]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'm') {
        if (phase === 'running') {
          e.preventDefault();
          press();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, press]);

  const start = () => {
    if (shell.paused) return;
    if (phase === 'ready') shell.startRound();
    runBlock(n);
  };

  const last = results[results.length - 1];

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Level', value: `${n}-back` },
          { label: 'Block', value: `${Math.min(results.length + 1, BLOCKS)} / ${BLOCKS}` },
          { label: 'Letter', value: phase === 'running' ? `${Math.max(0, index + 1)} / ${seq.length}` : '–' },
        ]}
      />
      <div className="cz-panel" style={{ minHeight: 220, justifyContent: 'center', outline: feedback ? `3px solid ${feedback === 'good' ? 'var(--success)' : 'var(--danger)'}` : 'none' }}>
        {phase === 'ready' && (
          <>
            <div className="cz-status">
              Press MATCH when a letter is the same as the one {n === 1 ? 'just before it' : `${n} letters back`}.
            </div>
            <p className="small muted">Three blocks of 20 letters. Do well and the next block gets harder.</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={shell.paused}>
              Start
            </button>
          </>
        )}
        {phase === 'running' && (
          <div className="cz-big" style={{ fontFamily: 'var(--font-mono)', minHeight: '1.1em' }} aria-live="assertive">
            {visible && index >= 0 ? seq[index] : ''}
          </div>
        )}
        {phase === 'summary' && last && (
          <>
            <div className="cz-status">
              {Math.round(accuracy(last.r) * 100)}% correct at {last.n}-back
            </div>
            <p className="small muted">
              {last.r.hits} matches caught, {last.r.misses} missed, {last.r.falseAlarms} false alarms.{' '}
              {n > last.n ? `Great — moving up to ${n}-back.` : n < last.n ? `Next block: ${n}-back.` : `Staying at ${n}-back.`}
            </p>
            <button type="button" className="btn btn-primary" onClick={start} disabled={shell.paused}>
              Next block
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        className="cz-choice"
        style={{ minHeight: 90 }}
        disabled={phase !== 'running' || shell.paused}
        onPointerDown={(e) => {
          e.preventDefault();
          press();
        }}
      >
        MATCH
        <kbd>Space, Enter or M</kbd>
      </button>
    </div>
  );
}
