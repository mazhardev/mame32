import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { useReducedMotion } from '@/hooks/usePlatform';
import { STAKES, START_POINTS, WHEELS, expectedMultiplier, finished, newWheel, pickSegment, spin } from './engine';
import '../_shared/casual/casual.css';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#6366f1', '#ec4899', '#64748b', '#14b8a6'];

function Wheel({ values, rotation, spinning }: { values: number[]; rotation: number; spinning: boolean }) {
  const n = values.length;
  const step = 360 / n;
  return (
    <svg viewBox="-110 -118 220 228" width="100%" style={{ maxWidth: 300 }} role="img" aria-label="Prize wheel">
      <g style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 2.6s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none' }}>
        {values.map((v, i) => {
          const a0 = ((i * step - 90 - step / 2) * Math.PI) / 180;
          const a1 = (((i + 1) * step - 90 - step / 2) * Math.PI) / 180;
          const mid = (a0 + a1) / 2;
          return (
            <g key={i}>
              <path d={`M0 0 L${100 * Math.cos(a0)} ${100 * Math.sin(a0)} A100 100 0 0 1 ${100 * Math.cos(a1)} ${100 * Math.sin(a1)} Z`} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="2" />
              <text x={66 * Math.cos(mid)} y={66 * Math.sin(mid)} fill="#fff" fontSize="15" fontWeight="800" textAnchor="middle" dominantBaseline="middle">
                ×{v}
              </text>
            </g>
          );
        })}
        <circle r="14" fill="#fff" stroke="#cbd5e1" strokeWidth="3" />
      </g>
      <path d="M-10 -116 L10 -116 L0 -96 Z" fill="var(--text)" />
    </svg>
  );
}

export default function SpinTheWheelGame() {
  const shell = useGameShell();
  const reduced = useReducedMotion();
  const level = shell.difficulty;
  const values = WHEELS[level];
  const [state, setState] = useState(newWheel);
  const [stake, setStake] = useState(STAKES[0]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('Pick a stake and spin.');
  const timer = useRef<number>();

  const restart = useCallback(() => {
    window.clearTimeout(timer.current);
    setState(newWheel());
    setSpinning(false);
    setRotation(0);
    setMessage('Pick a stake and spin.');
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [level, restart]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = () => {
    if (spinning || finished(state) || shell.paused) return;
    if (state.log.length === 0) shell.startRound();
    const seg = pickSegment(level, Math.random);
    const step = 360 / values.length;
    // Land the chosen segment under the pointer at the top, after a few turns.
    const target = 360 * 5 - seg * step;
    const base = rotation - (rotation % 360);
    setRotation(base + target);
    setSpinning(!reduced);
    setMessage('Spinning…');
    shell.play('whoosh');
    timer.current = window.setTimeout(
      () => {
        const next = spin(state, level, stake, seg);
        const last = next.log[next.log.length - 1];
        setState(next);
        setSpinning(false);
        setRotation((r) => r % 360);
        setMessage(last.multiplier === 0 ? `×0 — lost ${last.stake}` : `×${last.multiplier} — got back ${last.payout}`);
        shell.play(last.multiplier >= 2 ? 'coin' : last.multiplier >= 1 ? 'success' : 'failure');
        if (finished(next)) {
          void reportProgress('spin-the-wheel.double', next.points >= START_POINTS * 2 ? 1 : 0);
          void reportProgress('spin-the-wheel.jackpot', last.multiplier >= 3 || next.log.some((l) => l.multiplier >= 3) ? 1 : 0);
          void reportProgress('spin-the-wheel.finish', next.points > 0 ? 1 : 0);
          void incrementProgress('spin-the-wheel.spins', next.log.length);
          shell.endRound({
            score: next.points,
            title: next.points <= 0 ? 'Out of points' : 'Ten spins done',
            message: 'Virtual points only — no real money involved.',
            details: [
              { label: 'Final points', value: String(next.points) },
              { label: 'Highest balance', value: String(next.best) },
              { label: 'Spins', value: String(next.log.length) },
            ],
          });
        }
      },
      reduced ? 50 : 2700,
    );
  };

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Points', value: state.points },
          { label: 'Spins left', value: state.spinsLeft },
          { label: 'Stake', value: Math.min(stake, state.points) },
        ]}
      />
      <div className="cz-panel">
        <Wheel values={values} rotation={rotation} spinning={spinning} />
        <div className="cz-status" aria-live="polite">
          {message}
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }} role="group" aria-label="Stake">
          {STAKES.map((v) => (
            <button key={v} type="button" className={`btn btn-sm${stake === v ? ' btn-primary' : ''}`} aria-pressed={stake === v} disabled={spinning} onClick={() => setStake(v)}>
              Stake {v}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={go} disabled={spinning || finished(state) || shell.paused}>
          Spin
        </button>
        <p className="tiny muted">
          Virtual points only. Average return on this wheel: ×{expectedMultiplier(level).toFixed(2)} per spin.
        </p>
      </div>
    </div>
  );
}
