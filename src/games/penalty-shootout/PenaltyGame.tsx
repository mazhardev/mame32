import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { useCanvasGame } from '@/game-engine/useCanvasGame';
import { ParticleSystem } from '@/game-engine/ParticleSystem';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import type { DifficultySetting } from '@/types';
import {
  DIFFICULTY_CONFIG,
  GOAL,
  HEIGHT,
  PenaltyEngine,
  REGULATION_KICKS,
  SPOT,
  SWEET_SPOT,
  WIDTH,
  columnOf,
} from './engine';
import type { Column, Kick, ShootoutEvent } from './engine';

const AIM_STEP = 14;

interface View {
  turn: 'shoot' | 'keep';
  phase: PenaltyEngine['phase'];
  kicks: Kick[];
  message: string;
}

function viewOf(e: PenaltyEngine, message: string): View {
  return { turn: e.turn, phase: e.phase, kicks: [...e.kicks], message };
}

const SHOOT_HINT =
  'Your kick: aim at the goal, tap once to lock, then tap again to strike in the green zone.';
const KEEP_HINT = 'You are in goal: dive Left, Stay or Right before the ball arrives.';

export default function PenaltyGame() {
  const shell = useGameShell();
  const [initial] = useState(() => new PenaltyEngine(DIFFICULTY_CONFIG[shell.difficulty]));
  const engineRef = useRef(initial);
  const particlesRef = useRef(new ParticleSystem(120));
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const [view, setView] = useState<View>(() => viewOf(initial, SHOOT_HINT));
  const [best, setBest] = useState(shell.personalBest);

  useEffect(() => setBest(shell.personalBest), [shell.personalBest]);

  const restart = useCallback(() => {
    engineRef.current = new PenaltyEngine(DIFFICULTY_CONFIG[shell.difficulty]);
    particlesRef.current.clear();
    startedRef.current = false;
    endedRef.current = false;
    setView(viewOf(engineRef.current, SHOOT_HINT));
  }, [shell.difficulty]);

  useEffect(() => {
    shell.registerRestart(restart);
  }, [shell, restart]);

  useEffect(() => {
    restart();
  }, [restart]);

  const begin = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    shell.startRound();
  }, [shell]);

  const finish = useCallback(
    (e: PenaltyEngine) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const won = e.winner === 'player';
      void reportProgress('penalty-shootout.first-goal', e.playerGoals);
      void reportProgress('penalty-shootout.keeper-3', e.saves);
      void reportProgress('penalty-shootout.top-bins-3', e.topCorners);
      if (won) void reportProgress('penalty-shootout.win', 1);
      if (won && shell.difficulty === 'hard') void reportProgress('penalty-shootout.hard-win', 1);
      shell.endRound({
        score: e.score,
        won,
        lost: e.winner === 'cpu',
        draw: e.winner === 'draw',
        title: won
          ? 'You win the shootout!'
          : e.winner === 'draw'
            ? 'Honours even'
            : 'The computer wins',
        details: [
          { label: 'Final score', value: `${e.playerGoals} – ${e.cpuGoals}` },
          { label: 'Saves', value: String(e.saves) },
          { label: 'Top-corner goals', value: String(e.topCorners) },
        ],
      });
    },
    [shell],
  );

  const handleEvents = useCallback(
    (events: ShootoutEvent[], e: PenaltyEngine) => {
      if (events.length === 0) return;
      let message: string | null = null;
      for (const ev of events) {
        if (ev === 'kick') shell.play('whoosh');
        else if (ev === 'goal') {
          const mine = e.turn === 'shoot';
          shell.play(mine ? 'success' : 'failure');
          if (mine) {
            shell.vibrate(30);
            particlesRef.current.burst(e.target.x, e.target.y, {
              count: 22,
              colors: ['#4ade80', '#fde68a', '#f8fafc'],
              speed: 140,
              life: 0.7,
              size: 3,
            });
          }
          message = mine ? 'GOAL!' : 'The computer scores.';
        } else if (ev === 'save') {
          const mine = e.turn === 'keep';
          shell.play(mine ? 'success' : 'hit');
          message = mine ? 'Great save!' : 'Saved by the keeper.';
        } else if (ev === 'miss') {
          shell.play(e.turn === 'shoot' ? 'failure' : 'success');
          message = e.turn === 'shoot' ? 'Off target!' : 'The computer misses!';
        } else if (ev === 'turn') {
          message = e.turn === 'shoot' ? SHOOT_HINT : KEEP_HINT;
          if (e.suddenDeath && e.turn === 'shoot') message = `Sudden death! ${SHOOT_HINT}`;
        }
      }
      setView((v) => viewOf(e, message ?? v.message));
      if (events.includes('end')) finish(e);
    },
    [shell, finish],
  );

  const press = useCallback(() => {
    const e = engineRef.current;
    if (shell.paused || endedRef.current || e.turn !== 'shoot') return;
    begin();
    const events = e.press();
    if (e.phase === 'power') shell.play('select');
    handleEvents(events, e);
    setView((v) => viewOf(e, v.message));
  }, [shell, begin, handleEvents]);

  const dive = useCallback(
    (col: Column) => {
      const e = engineRef.current;
      if (shell.paused || endedRef.current) return;
      e.diveTo(col);
      setView((v) => viewOf(e, v.message));
    },
    [shell.paused],
  );

  const { containerRef, canvasRef, fps } = useCanvasGame({
    aspectRatio: WIDTH / HEIGHT,
    logicalWidth: WIDTH,
    logicalHeight: HEIGHT,
    maxWidth: 900,
    update: (dt) => {
      particlesRef.current.update(dt);
      if (!startedRef.current || endedRef.current) return;
      const e = engineRef.current;
      handleEvents(e.update(dt), e);
    },
    render: (ctx) => draw(ctx, engineRef.current, particlesRef.current),
  });

  const toLogical = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    return {
      x: ((ev.clientX - rect.left) / rect.width) * WIDTH,
      y: ((ev.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const onPointerMove = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const e = engineRef.current;
    if (shell.paused || e.turn !== 'shoot' || e.phase !== 'aim') return;
    const p = toLogical(ev);
    e.setAim(p.x, p.y);
  };

  const onPointerDown = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const e = engineRef.current;
    if (shell.paused || endedRef.current) return;
    const p = toLogical(ev);
    if (e.turn === 'keep') {
      begin();
      dive(p.x < 320 - 60 ? -1 : p.x > 320 + 60 ? 1 : 0);
      return;
    }
    if (e.phase === 'aim') e.setAim(p.x, p.y);
    press();
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag)) return;
      const e = engineRef.current;
      let handled = true;
      if (e.turn === 'keep') {
        if (ev.key === 'ArrowLeft') dive(-1);
        else if (ev.key === 'ArrowRight') dive(1);
        else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === ' ') dive(0);
        else handled = false;
      } else {
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-AIM_STEP, 0],
          ArrowRight: [AIM_STEP, 0],
          ArrowUp: [0, -AIM_STEP],
          ArrowDown: [0, AIM_STEP],
        };
        if (moves[ev.key] && e.phase === 'aim' && !shell.paused) {
          e.setAim(e.aim.x + moves[ev.key][0], e.aim.y + moves[ev.key][1]);
        } else if (ev.key === ' ' || ev.key === 'Enter') press();
        else handled = false;
      }
      if (handled) ev.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dive, press, shell.paused]);

  const e = engineRef.current;
  const keeping = view.turn === 'keep' && (view.phase === 'windup' || view.phase === 'flight');
  const shooting = view.turn === 'shoot' && (view.phase === 'aim' || view.phase === 'power');
  const disabled = shell.paused || endedRef.current;

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 10, padding: 8 }}>
      <GameHud
        items={[
          { label: 'You', value: e.playerGoals },
          { label: 'CPU', value: e.cpuGoals },
          {
            label: 'Round',
            value: e.suddenDeath
              ? 'Sudden death'
              : `${Math.min(REGULATION_KICKS, e.playerKicks + (view.turn === 'shoot' ? 1 : 0))}/${REGULATION_KICKS}`,
          },
          { label: 'Best', value: best ?? '—' },
        ]}
        extra={
          <select
            className="select"
            style={{ width: 'auto' }}
            value={shell.difficulty}
            aria-label="Difficulty"
            onChange={(ev) => shell.setDifficulty(ev.target.value as DifficultySetting)}
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        }
      />
      <KickTracker kicks={view.kicks} />
      <div
        ref={containerRef}
        style={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Penalty area with the goal. When shooting, tap to aim and tap again to strike. When keeping, tap the left, middle or right of the goal to dive."
          style={{ borderRadius: 12, touchAction: 'none', maxWidth: '100%' }}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
        />
        {fps !== null && <div className="fps-meter">{fps} fps</div>}
      </div>
      <p
        className="small muted"
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', minHeight: '1.4em', margin: 0 }}
      >
        {view.message}
      </p>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
        {view.turn === 'shoot' ? (
          <button className="btn btn-primary" disabled={disabled || !shooting} onClick={press}>
            {view.phase === 'power' ? 'Strike!' : 'Lock aim'}
          </button>
        ) : (
          <>
            <button className="btn" disabled={disabled || !keeping} onClick={() => dive(-1)}>
              ◀ Dive left
            </button>
            <button className="btn" disabled={disabled || !keeping} onClick={() => dive(0)}>
              Stay
            </button>
            <button className="btn" disabled={disabled || !keeping} onClick={() => dive(1)}>
              Dive right ▶
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function KickTracker({ kicks }: { kicks: Kick[] }) {
  const row = (by: Kick['by'], label: string) => {
    const mine = kicks.filter((k) => k.by === by);
    const slots = Math.max(REGULATION_KICKS, mine.length);
    return (
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        <span className="small muted" style={{ width: 34 }}>
          {label}
        </span>
        {Array.from({ length: slots }, (_, i) => {
          const k = mine[i];
          const color = !k ? 'var(--surface-2)' : k.outcome === 'goal' ? '#22c55e' : '#ef4444';
          return (
            <span
              key={i}
              aria-label={
                k ? `${label} kick ${i + 1}: ${k.outcome}` : `${label} kick ${i + 1}: not taken`
              }
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: color,
                border: '1px solid var(--border)',
              }}
            />
          );
        })}
      </div>
    );
  };
  return (
    <div style={{ display: 'grid', gap: 4, justifyContent: 'center' }}>
      {row('player', 'You')}
      {row('cpu', 'CPU')}
    </div>
  );
}

function draw(ctx: CanvasRenderingContext2D, e: PenaltyEngine, particles: ParticleSystem) {
  // Pitch with mowing stripes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#166534' : '#15803d';
    ctx.fillRect(0, i * 50, WIDTH, 50);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GOAL.bottom);
  ctx.lineTo(WIDTH, GOAL.bottom);
  ctx.moveTo(90, GOAL.bottom);
  ctx.lineTo(60, 395);
  ctx.moveTo(WIDTH - 90, GOAL.bottom);
  ctx.lineTo(WIDTH - 60, 395);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(SPOT.x, SPOT.y + 12, 4, 0, Math.PI * 2);
  ctx.fill();

  // Net
  ctx.fillStyle = 'rgba(15,23,42,0.35)';
  ctx.fillRect(GOAL.left, GOAL.top, GOAL.right - GOAL.left, GOAL.bottom - GOAL.top);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = GOAL.left; x <= GOAL.right; x += 15) {
    ctx.moveTo(x, GOAL.top);
    ctx.lineTo(x, GOAL.bottom);
  }
  for (let y = GOAL.top; y <= GOAL.bottom; y += 15) {
    ctx.moveTo(GOAL.left, y);
    ctx.lineTo(GOAL.right, y);
  }
  ctx.stroke();

  // Frame
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(GOAL.left, GOAL.bottom);
  ctx.lineTo(GOAL.left, GOAL.top);
  ctx.lineTo(GOAL.right, GOAL.top);
  ctx.lineTo(GOAL.right, GOAL.bottom);
  ctx.stroke();

  // Keeper: slides and tilts toward the dive column.
  const keeperX = 320 + e.keeperCol * 95 * e.dive;
  const tilt = e.keeperCol * e.dive * 0.9;
  ctx.save();
  ctx.translate(keeperX, GOAL.bottom - 4);
  ctx.rotate(tilt);
  ctx.fillStyle = e.turn === 'keep' ? '#38bdf8' : '#facc15';
  ctx.beginPath();
  ctx.roundRect(-16, -78, 32, 56, 8);
  ctx.fill();
  ctx.fillRect(-12, -22, 9, 22);
  ctx.fillRect(3, -22, 9, 22);
  ctx.beginPath();
  ctx.roundRect(-40, -76, 24, 9, 4);
  ctx.roundRect(16, -76, 24, 9, 4);
  ctx.fill();
  ctx.fillStyle = '#fcd9b6';
  ctx.beginPath();
  ctx.arc(0, -90, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Kicker marker during the computer's run-up.
  if (e.turn === 'keep' && e.phase === 'windup') {
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(SPOT.x - 30, SPOT.y - 10, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Aim reticle and column guides while shooting.
  if (e.turn === 'shoot' && (e.phase === 'aim' || e.phase === 'power')) {
    const onGoal = columnOf(e.aim.x);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    const third = (GOAL.right - GOAL.left) / 3;
    ctx.fillRect(GOAL.left + third * (onGoal + 1), GOAL.top, third, GOAL.bottom - GOAL.top);
    ctx.strokeStyle = e.phase === 'power' ? '#facc15' : '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.aim.x, e.aim.y, 13, 0, Math.PI * 2);
    ctx.moveTo(e.aim.x - 20, e.aim.y);
    ctx.lineTo(e.aim.x + 20, e.aim.y);
    ctx.moveTo(e.aim.x, e.aim.y - 20);
    ctx.lineTo(e.aim.x, e.aim.y + 20);
    ctx.stroke();
  }

  // Power meter with the accurate band highlighted.
  if (e.turn === 'shoot' && e.phase === 'power') {
    const x = WIDTH - 50;
    const top = 250;
    const h = 130;
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.fillRect(x, top, 22, h);
    ctx.fillStyle = 'rgba(34,197,94,0.8)';
    ctx.fillRect(x, top + h * (1 - SWEET_SPOT - 0.08), 22, h * 0.16);
    ctx.fillStyle = 'rgba(239,68,68,0.7)';
    ctx.fillRect(x, top, 22, h * 0.1);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x - 4, top + h * (1 - e.meter.value) - 2, 30, 4);
  }

  // Ball, shrinking as it travels toward the goal, with a soft shadow.
  if (e.phase === 'flight') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(e.ball.x, e.ball.y + 16, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const scale =
    e.phase === 'flight' || e.phase === 'result'
      ? 0.75 + 0.25 * ((e.ball.y - GOAL.top) / (SPOT.y - GOAL.top))
      : 1;
  const r = 10 * Math.max(0.7, scale);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(e.ball.x, e.ball.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(e.ball.x, e.ball.y, r * 0.38, 0, Math.PI * 2);
  ctx.fill();

  particles.render(ctx);
}
