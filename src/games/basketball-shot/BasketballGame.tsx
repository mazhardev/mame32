import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { useCanvasGame } from '@/game-engine/useCanvasGame';
import { ParticleSystem } from '@/game-engine/ParticleSystem';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import type { DifficultySetting } from '@/types';
import {
  BasketballEngine,
  DIFFICULTY_CONFIG,
  FLOOR_Y,
  HEIGHT,
  THREE_POINT_DISTANCE,
  WIDTH,
} from './engine';
import type { ShotEvent } from './engine';

const ANGLE_STEP = (3 * Math.PI) / 180;
const POWER_STEP = 0.04;
/** Drag distance (logical px) that maps to full power. */
const FULL_DRAG = 170;

interface Hud {
  score: number;
  time: number;
  made: number;
  attempts: number;
  streak: number;
  message: string;
}

function hudFrom(e: BasketballEngine, message: string): Hud {
  return {
    score: e.score,
    time: Math.ceil(e.timeLeft),
    made: e.made,
    attempts: e.attempts,
    streak: e.streak,
    message,
  };
}

export default function BasketballGame() {
  const shell = useGameShell();
  const [initialEngine] = useState(() => new BasketballEngine(DIFFICULTY_CONFIG[shell.difficulty]));
  const engineRef = useRef(initialEngine);
  const particlesRef = useRef(new ParticleSystem(120));
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const hudTimer = useRef(0);
  const [hud, setHud] = useState<Hud>(() =>
    hudFrom(engineRef.current, 'Drag back from the ball and release to shoot.'),
  );
  const [best, setBest] = useState(shell.personalBest);

  useEffect(() => setBest(shell.personalBest), [shell.personalBest]);

  const restart = useCallback(() => {
    engineRef.current = new BasketballEngine(DIFFICULTY_CONFIG[shell.difficulty]);
    particlesRef.current.clear();
    startedRef.current = false;
    endedRef.current = false;
    dragRef.current = null;
    setHud(hudFrom(engineRef.current, 'Drag back from the ball and release to shoot.'));
  }, [shell.difficulty]);

  useEffect(() => {
    shell.registerRestart(restart);
  }, [shell, restart]);

  useEffect(() => {
    restart();
  }, [restart]);

  const finish = useCallback(
    (e: BasketballEngine) => {
      if (endedRef.current) return;
      endedRef.current = true;
      void reportProgress('basketball-shot.first-basket', e.made);
      void reportProgress('basketball-shot.score-20', e.score);
      void reportProgress('basketball-shot.score-40', e.score);
      void reportProgress('basketball-shot.streak-5', e.bestStreak);
      void reportProgress('basketball-shot.swish-3', e.swishes);
      shell.endRound({
        score: e.score,
        won: e.made > 0,
        lost: e.made === 0,
        title: e.made > 0 ? 'Time!' : 'No baskets this time',
        details: [
          { label: 'Baskets', value: `${e.made} / ${e.attempts}` },
          { label: 'Accuracy', value: `${Math.round(e.accuracy * 100)}%` },
          { label: 'Best streak', value: String(e.bestStreak) },
          { label: 'Swishes', value: String(e.swishes) },
        ],
      });
    },
    [shell],
  );

  const handleEvents = useCallback(
    (events: ShotEvent[], e: BasketballEngine) => {
      for (const ev of events) {
        if (ev === 'rim') shell.play('hit');
        else if (ev === 'board') shell.play('blip');
        else if (ev === 'score') {
          shell.play('success');
          shell.vibrate(25);
          particlesRef.current.burst(e.hoop.x, e.hoop.y + 18, {
            count: 18,
            colors: ['#fb923c', '#fde68a', '#f8fafc'],
            speed: 120,
            life: 0.6,
            size: 3,
          });
        } else if (ev === 'miss') shell.play('failure');
      }
      if (events.length > 0 && e.lastShot && e.phase !== 'flying') {
        const shot = e.lastShot;
        const msg = shot.made
          ? `+${shot.points}${shot.swish ? ' · Swish!' : ''}${e.streak >= 3 ? ` · ${e.streak} in a row` : ''}`
          : 'Missed — try again.';
        setHud(hudFrom(e, msg));
      }
      if (events.includes('end')) finish(e);
    },
    [shell, finish],
  );

  const shoot = useCallback(() => {
    const e = engineRef.current;
    if (shell.paused || endedRef.current) return;
    if (!startedRef.current) {
      startedRef.current = true;
      shell.startRound();
    }
    if (e.shoot()) {
      shell.play('whoosh');
      setHud(hudFrom(e, ''));
    }
  }, [shell]);

  const nudge = useCallback(
    (dAngle: number, dPower: number) => {
      const e = engineRef.current;
      if (shell.paused) return;
      e.setAim(e.angle + dAngle, e.power + dPower);
    },
    [shell.paused],
  );

  const { containerRef, canvasRef, fps } = useCanvasGame({
    aspectRatio: WIDTH / HEIGHT,
    logicalWidth: WIDTH,
    logicalHeight: HEIGHT,
    maxWidth: 900,
    update: (dt) => {
      const e = engineRef.current;
      particlesRef.current.update(dt);
      if (!startedRef.current || endedRef.current) return;
      handleEvents(e.update(dt), e);
      hudTimer.current += dt;
      if (hudTimer.current > 0.25) {
        hudTimer.current = 0;
        setHud((h) =>
          h.time === Math.ceil(e.timeLeft) ? h : { ...h, time: Math.ceil(e.timeLeft) },
        );
      }
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

  const onPointerDown = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    if (shell.paused || endedRef.current || engineRef.current.phase !== 'aiming') return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    dragRef.current = toLogical(ev);
  };

  const onPointerMove = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const origin = dragRef.current;
    if (!origin) return;
    const p = toLogical(ev);
    // Pull back like a slingshot: dragging down-left aims up-right.
    const ax = origin.x - p.x;
    const ay = p.y - origin.y;
    if (Math.hypot(ax, ay) < 8) return;
    engineRef.current.setAim(Math.atan2(ay, ax), Math.hypot(ax, ay) / FULL_DRAG);
  };

  const onPointerUp = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const origin = dragRef.current;
    dragRef.current = null;
    if (!origin) return;
    const p = toLogical(ev);
    if (Math.hypot(origin.x - p.x, p.y - origin.y) >= 12) shoot();
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag)) return;
      const actions: Record<string, () => void> = {
        ArrowUp: () => nudge(ANGLE_STEP, 0),
        ArrowDown: () => nudge(-ANGLE_STEP, 0),
        ArrowRight: () => nudge(0, POWER_STEP),
        ArrowLeft: () => nudge(0, -POWER_STEP),
        ' ': shoot,
        Enter: shoot,
      };
      const action = actions[ev.key];
      if (!action) return;
      ev.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudge, shoot]);

  const aiming = engineRef.current.phase === 'aiming' && !shell.paused;

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 10, padding: 8 }}>
      <GameHud
        items={[
          { label: 'Score', value: hud.score },
          { label: 'Time', value: `${hud.time}s` },
          { label: 'Baskets', value: `${hud.made}/${hud.attempts}` },
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
          aria-label="Basketball court. Drag back from the ball and release to shoot at the hoop."
          style={{ borderRadius: 12, touchAction: 'none', maxWidth: '100%' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (dragRef.current = null)}
        />
        {fps !== null && <div className="fps-meter">{fps} fps</div>}
      </div>
      <p
        className="small muted"
        role="status"
        aria-live="polite"
        style={{ textAlign: 'center', minHeight: '1.4em', margin: 0 }}
      >
        {hud.message}
      </p>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
        <button
          className="btn"
          disabled={!aiming}
          onClick={() => nudge(ANGLE_STEP, 0)}
          aria-label="Raise angle"
        >
          Angle ▲
        </button>
        <button
          className="btn"
          disabled={!aiming}
          onClick={() => nudge(-ANGLE_STEP, 0)}
          aria-label="Lower angle"
        >
          Angle ▼
        </button>
        <button
          className="btn"
          disabled={!aiming}
          onClick={() => nudge(0, -POWER_STEP)}
          aria-label="Less power"
        >
          Power −
        </button>
        <button
          className="btn"
          disabled={!aiming}
          onClick={() => nudge(0, POWER_STEP)}
          aria-label="More power"
        >
          Power +
        </button>
        <button className="btn btn-primary" disabled={!aiming || endedRef.current} onClick={shoot}>
          Shoot
        </button>
      </div>
    </div>
  );
}

function draw(ctx: CanvasRenderingContext2D, e: BasketballEngine, particles: ParticleSystem) {
  // Court
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, WIDTH, 60);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < WIDTH; x += 48) ctx.fillRect(x, FLOOR_Y, 1, HEIGHT - FLOOR_Y);

  // Three-point marker
  const arcX = e.hoop.x - THREE_POINT_DISTANCE;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(arcX - 1, FLOOR_Y, 3, HEIGHT - FLOOR_Y);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(248,250,252,0.55)';
  ctx.textAlign = 'center';
  ctx.fillText('3 PT', arcX, FLOOR_Y - 6);

  // Pole and backboard
  const boardX = e.boardX;
  ctx.fillStyle = '#475569';
  ctx.fillRect(boardX + 6, e.hoop.y - 40, 8, FLOOR_Y - e.hoop.y + 40);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(boardX, e.hoop.y - 80, 6, 92);

  // Net
  const f = e.rimFront;
  const b = e.rimBack;
  ctx.strokeStyle = 'rgba(248,250,252,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const top = f.x + (b.x - f.x) * t;
    const bottom = f.x + 8 + (b.x - f.x - 16) * t;
    ctx.moveTo(top, f.y);
    ctx.lineTo(bottom, f.y + 34);
  }
  for (let j = 1; j <= 3; j++) {
    const y = f.y + (34 * j) / 3;
    const inset = (8 * j) / 3;
    ctx.moveTo(f.x + inset, y);
    ctx.lineTo(b.x - inset, y);
  }
  ctx.stroke();

  // Rim
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  ctx.lineTo(boardX, b.y);
  ctx.stroke();

  // Aiming guide and power arrow
  if (e.phase === 'aiming') {
    ctx.fillStyle = 'rgba(248,250,252,0.55)';
    for (const p of e.trajectory()) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const len = 26 + e.power * 60;
    const tipX = e.start.x + Math.cos(e.angle) * len;
    const tipY = e.start.y - Math.sin(e.angle) * len;
    ctx.strokeStyle = `hsl(${120 - e.power * 120} 80% 60%)`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(e.start.x, e.start.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  }

  // Ball
  const ball = e.ball;
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ball.x - ball.r, ball.y);
  ctx.lineTo(ball.x + ball.r, ball.y);
  ctx.moveTo(ball.x, ball.y - ball.r);
  ctx.lineTo(ball.x, ball.y + ball.r);
  ctx.stroke();

  particles.render(ctx);
}
