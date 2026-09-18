import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { useCanvasGame } from '@/game-engine/useCanvasGame';
import { InputManager } from '@/game-engine/InputManager';
import type { Direction } from '@/game-engine/InputManager';
import { ParticleSystem } from '@/game-engine/ParticleSystem';
import { GameHud } from '@/components/game/GameHud';
import { DPad, TouchControls } from '@/components/game/TouchControls';
import { useIsCoarsePointer } from '@/hooks/usePlatform';
import { reportProgress } from '@/achievements/AchievementService';
import { DIFFICULTY_CONFIG, SnakeEngine } from './engine';
import type { Dir } from './engine';

const COLORS = {
  grid: 'rgba(255,255,255,0.03)',
  head: '#4ade80',
  body: '#22c55e',
  bodyAlt: '#16a34a',
  food: '#f87171',
  bg: '#0e1420',
};

export default function SnakeGame() {
  const shell = useGameShell();
  const coarse = useIsCoarsePointer();
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number | null>(shell.personalBest);
  const [started, setStarted] = useState(false);

  const engineRef = useRef<SnakeEngine | null>(null);
  const particlesRef = useRef(new ParticleSystem(160));
  const accRef = useRef(0);
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);

  const config = DIFFICULTY_CONFIG[shell.difficulty];

  if (!engineRef.current || engineRef.current.config !== config) {
    engineRef.current = new SnakeEngine(config);
  }

  useEffect(() => setBest(shell.personalBest), [shell.personalBest]);

  const restart = useCallback(() => {
    engineRef.current = new SnakeEngine(DIFFICULTY_CONFIG[shell.difficulty]);
    particlesRef.current.clear();
    accRef.current = 0;
    setScore(0);
    setStarted(false);
    startedRef.current = false;
  }, [shell.difficulty]);

  useEffect(() => {
    shell.registerRestart(restart);
  }, [shell, restart]);

  // Changing difficulty rebuilds the board, so start a fresh run.
  useEffect(() => {
    restart();
  }, [shell.difficulty, restart]);

  const beginRun = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    shell.startRound();
  }, [shell]);

  const handleDirection = useCallback(
    (dir: Direction) => {
      beginRun();
      engineRef.current?.turn(dir as Dir);
    },
    [beginRun],
  );

  const endRun = useCallback(
    (engine: SnakeEngine) => {
      void reportProgress('snake.first-bite', engine.score > 0 ? 1 : 0);
      void reportProgress('snake.score-10', engine.score);
      void reportProgress('snake.score-25', engine.score);
      void reportProgress('snake.score-50', engine.score);
      void reportProgress('snake.length-30', engine.length);
      if (shell.difficulty === 'hard') void reportProgress('snake.hard-20', engine.score);
      shell.endRound({
        score: engine.score,
        lost: true,
        details: [
          { label: 'Length', value: String(engine.length) },
          { label: 'Difficulty', value: shell.difficulty },
        ],
      });
    },
    [shell],
  );

  const { containerRef, canvasRef, size, fps } = useCanvasGame({
    aspectRatio: 1,
    logicalWidth: 480,
    logicalHeight: 480,
    update: (dt) => {
      const engine = engineRef.current;
      if (!engine || !engine.alive || !startedRef.current) return;
      particlesRef.current.update(dt);
      accRef.current += dt;
      while (accRef.current >= engine.interval) {
        accRef.current -= engine.interval;
        const result = engine.step();
        if (result.ate) {
          setScore(engine.score);
          shell.play('coin');
          shell.vibrate(20);
          const cell = 480 / engine.config.cols;
          particlesRef.current.burst(
            (engine.snake[0].x + 0.5) * cell,
            (engine.snake[0].y + 0.5) * cell,
            {
              count: 10,
              colors: ['#f87171', '#fca5a5', '#fbbf24'],
              speed: 90,
              life: 0.5,
              size: 2.5,
            },
          );
        }
        if (result.dead) {
          endRun(engine);
          break;
        }
      }
    },
    render: (ctx) => {
      const engine = engineRef.current;
      if (!engine) return;
      const { cols, rows } = engine.config;
      const w = 480;
      const cell = w / cols;

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, w, w);

      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < cols; i++) {
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, rows * cell);
      }
      for (let i = 1; i < rows; i++) {
        ctx.moveTo(0, i * cell);
        ctx.lineTo(cols * cell, i * cell);
      }
      ctx.stroke();

      // Food with a soft pulse so it reads clearly at small sizes.
      const pulse = 1 + Math.sin(performance.now() / 220) * 0.08;
      ctx.fillStyle = COLORS.food;
      ctx.beginPath();
      ctx.arc(
        (engine.food.x + 0.5) * cell,
        (engine.food.y + 0.5) * cell,
        (cell / 2 - 2) * pulse,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      engine.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? COLORS.head : i % 2 === 0 ? COLORS.body : COLORS.bodyAlt;
        const pad = i === 0 ? 1 : 2;
        const r = Math.min(5, cell / 3);
        const x = seg.x * cell + pad;
        const y = seg.y * cell + pad;
        const s = cell - pad * 2;
        ctx.beginPath();
        ctx.roundRect(x, y, s, s, r);
        ctx.fill();
      });

      // Eyes on the head give the snake a clear facing direction.
      const head = engine.snake[0];
      ctx.fillStyle = '#0e1420';
      const ex = (head.x + 0.5) * cell;
      const ey = (head.y + 0.5) * cell;
      const off = cell * 0.16;
      const dirOff: Record<Dir, [number, number]> = {
        up: [0, -off],
        down: [0, off],
        left: [-off, 0],
        right: [off, 0],
      };
      const [dx, dy] = dirOff[engine.dir];
      const perp = engine.dir === 'left' || engine.dir === 'right' ? [0, off] : [off, 0];
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(ex + dx + perp[0] * sign, ey + dy + perp[1] * sign, cell * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }

      particlesRef.current.render(ctx);
    },
  });

  // Keyboard + swipe input, scoped to the board so page scroll is preserved.
  useEffect(() => {
    const input = new InputManager({
      target: containerElRef.current,
      onDirection: handleDirection,
      onSwipe: handleDirection,
      onPointerDown: () => beginRun(),
      onKeyDown: (key) => {
        if (key === ' ' || key === 'Enter') beginRun();
      },
    });
    return () => input.dispose();
  }, [handleDirection, beginRun]);

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 10, padding: 8 }}>
      <GameHud
        items={[
          { label: 'Score', value: score },
          { label: 'Best', value: best ?? '—' },
          { label: 'Length', value: engineRef.current?.length ?? 3 },
        ]}
        extra={
          <select
            className="select"
            style={{ width: 'auto' }}
            value={shell.difficulty}
            aria-label="Difficulty"
            onChange={(e) => shell.setDifficulty(e.target.value as 'easy' | 'normal' | 'hard')}
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        }
      />

      <div
        ref={(el) => {
          containerRef.current = el;
          containerElRef.current = el;
        }}
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
        }}
      >
        <canvas ref={canvasRef} style={{ borderRadius: 12 }} aria-label="Snake game board" />
        {fps !== null && <div className="fps-meter">{fps} fps</div>}
        {!started && size.width > 0 && (
          <div
            className="game-overlay"
            style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)' }}
          >
            <div className="overlay-card">
              <h3>Snake</h3>
              <p className="small muted">
                {coarse ? 'Swipe or use the pad to start.' : 'Press an arrow key or WASD to start.'}
              </p>
              <button
                className="btn btn-primary btn-block"
                onClick={() => handleDirection('right')}
              >
                Start
              </button>
            </div>
          </div>
        )}
      </div>

      {coarse && (
        <TouchControls>
          <DPad onPress={handleDirection} />
          <div className="small muted" style={{ maxWidth: 140 }}>
            Swipe the board or use the pad.
          </div>
        </TouchControls>
      )}
    </div>
  );
}
