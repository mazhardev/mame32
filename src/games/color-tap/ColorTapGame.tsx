'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { COLOURS, makeRound, pointsFor } from './engine';
import type { Round } from './engine';
import '../_shared/casual/casual.css';

type Phase = 'ready' | 'playing' | 'done';

export default function ColorTapGame() {
  const shell = useGameShell();
  const [phase, setPhase] = useState<Phase>('ready');
  const [round, setRound] = useState<Round>(() => makeRound(shell.difficulty, 0, Math.random));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [left, setLeft] = useState(1);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const deadline = useRef(0);
  const raf = useRef(0);
  const stats = useRef({ correct: 0, best: 0 });
  const state = useRef({ round, streak, lives, score, phase });
  state.current = { round, streak, lives, score, phase };

  const end = useCallback(
    (finalScore: number) => {
      cancelAnimationFrame(raf.current);
      setPhase('done');
      shell.play('gameOver');
      void reportProgress('color-tap.streak-20', stats.current.best);
      void reportProgress('color-tap.score-500', finalScore);
      void reportProgress('color-tap.hard-10', shell.difficulty === 'hard' ? stats.current.best : 0);
      void incrementProgress('color-tap.total', stats.current.correct);
      shell.endRound({
        score: finalScore,
        title: 'Colour blind spot!',
        details: [
          { label: 'Correct taps', value: String(stats.current.correct) },
          { label: 'Best streak', value: String(stats.current.best) },
        ],
      });
    },
    [shell],
  );

  const next = useCallback(
    (newStreak: number) => {
      const r = makeRound(shell.difficulty, newStreak, Math.random, state.current.round.options);
      setRound(r);
      deadline.current = performance.now() + r.time * 1000;
    },
    [shell.difficulty],
  );

  const answer = useCallback(
    (choice: number | null) => {
      const cur = state.current;
      if (cur.phase !== 'playing') return;
      const remaining = Math.max(0, (deadline.current - performance.now()) / (cur.round.time * 1000));
      if (choice === cur.round.target) {
        const s = cur.streak + 1;
        const pts = pointsFor(s, remaining);
        stats.current.correct += 1;
        stats.current.best = Math.max(stats.current.best, s);
        setStreak(s);
        setScore(cur.score + pts);
        setFlash('good');
        shell.play('blip');
        next(s);
      } else {
        const l = cur.lives - 1;
        setLives(l);
        setStreak(0);
        setFlash('bad');
        shell.play('failure');
        if (l <= 0) end(cur.score);
        else next(0);
      }
    },
    [end, next, shell],
  );

  const loop = useCallback(() => {
    const cur = state.current;
    if (cur.phase !== 'playing') return;
    const frac = Math.max(0, (deadline.current - performance.now()) / (cur.round.time * 1000));
    setLeft(frac);
    if (frac <= 0) answer(null);
    raf.current = requestAnimationFrame(loop);
  }, [answer]);

  const start = () => {
    if (shell.paused) return;
    stats.current = { correct: 0, best: 0 };
    setScore(0);
    setStreak(0);
    setLives(3);
    setPhase('playing');
    state.current.phase = 'playing';
    shell.startRound();
    const r = makeRound(shell.difficulty, 0, Math.random);
    setRound(r);
    state.current.round = r;
    deadline.current = performance.now() + r.time * 1000;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  };

  const restart = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setPhase('ready');
    setScore(0);
    setStreak(0);
    setLives(3);
    setLeft(1);
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [shell.difficulty, restart]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (shell.paused && phase === 'playing') restart();
  }, [shell.paused, phase, restart]);
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 180);
    return () => window.clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= round.options.length && phase === 'playing') {
        e.preventDefault();
        answer(round.options[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, phase, round.options]);

  const target = COLOURS[round.target];
  const ink = COLOURS[round.ink];

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Score', value: score },
          { label: 'Streak', value: streak },
          { label: 'Lives', value: '❤'.repeat(Math.max(0, lives)) || '–' },
        ]}
      />
      <div className="cz-panel" style={{ outline: flash ? `3px solid ${flash === 'good' ? 'var(--success)' : 'var(--danger)'}` : 'none' }}>
        {phase === 'ready' ? (
          <>
            <div className="cz-status">Tap the colour that matches the word — not the ink!</div>
            <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={shell.paused}>
              Start
            </button>
          </>
        ) : (
          <>
            <div className="cz-big" style={{ color: ink.hex, fontWeight: 900, fontSize: 'clamp(2.6rem, 12vw, 4.2rem)' }} aria-live="polite">
              {target.name}
            </div>
            <div className="progress-track" style={{ width: '100%' }} aria-hidden="true">
              <div className="progress-fill" style={{ width: `${left * 100}%`, transition: 'none' }} />
            </div>
          </>
        )}
      </div>
      <div className="cz-choices" style={{ ['--cz-cols' as string]: round.options.length > 4 ? 3 : 2 }}>
        {round.options.map((c, i) => (
          <button
            key={`${c}-${i}`}
            type="button"
            className="cz-choice"
            style={{ background: COLOURS[c].hex, borderColor: 'transparent', minHeight: 96 }}
            aria-label={`${COLOURS[c].name} (key ${i + 1})`}
            disabled={phase !== 'playing' || shell.paused}
            onPointerDown={(e) => {
              e.preventDefault();
              answer(c);
            }}
          >
            <kbd style={{ color: '#fff' }}>{i + 1}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
