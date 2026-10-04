'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { DURATION, cps, rank } from './engine';
import '../_shared/casual/casual.css';

type Phase = 'ready' | 'running' | 'done';

export default function ClickSpeedTestGame() {
  const shell = useGameShell();
  const seconds = DURATION[shell.difficulty];
  const [phase, setPhase] = useState<Phase>('ready');
  const [clicks, setClicks] = useState(0);
  const [left, setLeft] = useState(seconds);
  const startedAt = useRef(0);
  const clicksRef = useRef(0);
  const raf = useRef(0);

  const restart = useCallback(() => {
    cancelAnimationFrame(raf.current);
    clicksRef.current = 0;
    setClicks(0);
    setLeft(DURATION[shell.difficulty]);
    setPhase('ready');
  }, [shell.difficulty]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (shell.paused && phase === 'running') restart();
  }, [shell.paused, phase, restart]);

  const finish = useCallback(() => {
    setPhase('done');
    setLeft(0);
    const total = clicksRef.current;
    const rate = cps(total, seconds);
    void reportProgress('click-speed-test.cps-6', rate >= 6 ? 1 : 0);
    void reportProgress('click-speed-test.cps-9', rate >= 9 ? 1 : 0);
    void reportProgress('click-speed-test.marathon', shell.difficulty === 'hard' ? 1 : 0);
    void incrementProgress('click-speed-test.clicks', total);
    shell.play('levelComplete');
    shell.endRound({
      score: total,
      scoreLabel: 'Clicks',
      title: `${rate} clicks per second`,
      message: rank(rate),
      details: [
        { label: 'Clicks', value: String(total) },
        { label: 'Test length', value: `${seconds} s` },
      ],
    });
  }, [seconds, shell]);

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startedAt.current) / 1000;
    const remaining = Math.max(0, seconds - elapsed);
    setLeft(remaining);
    if (remaining <= 0) finish();
    else raf.current = requestAnimationFrame(tick);
  }, [finish, seconds]);

  const click = () => {
    if (shell.paused || phase === 'done') return;
    if (phase === 'ready') {
      setPhase('running');
      startedAt.current = performance.now();
      shell.startRound();
      raf.current = requestAnimationFrame(tick);
    }
    clicksRef.current += 1;
    setClicks(clicksRef.current);
  };

  const elapsed = seconds - left;
  const live = phase === 'running' && elapsed > 0.3 ? cps(clicks, elapsed) : phase === 'done' ? cps(clicks, seconds) : 0;

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Clicks', value: clicks },
          { label: 'Time', value: `${left.toFixed(1)}s` },
          { label: 'CPS', value: live.toFixed(1) },
        ]}
      />
      <button
        type="button"
        className="cz-choice"
        style={{ minHeight: 260, fontSize: '1.4rem', background: phase === 'running' ? 'var(--brand-soft)' : undefined }}
        onPointerDown={(e) => {
          e.preventDefault();
          click();
        }}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            click();
          }
        }}
        disabled={phase === 'done' || shell.paused}
      >
        <span className="cz-emoji" aria-hidden="true">
          👆
        </span>
        {phase === 'ready' ? `Click to start the ${seconds}-second test` : phase === 'running' ? 'Click! Click! Click!' : rank(cps(clicks, seconds))}
      </button>
      {phase === 'done' && (
        <button type="button" className="btn btn-primary btn-lg" onClick={restart}>
          Try again
        </button>
      )}
    </div>
  );
}
