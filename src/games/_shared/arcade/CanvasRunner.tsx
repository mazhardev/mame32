import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { useCanvasGame } from '@/game-engine/useCanvasGame';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import type { DifficultySetting } from '@/types';

export interface ArcadeEngine {
  score: number;
  over: boolean;
  won: boolean;
  label: string;
  update(dt: number, keys: Set<string>): void;
  draw(ctx: CanvasRenderingContext2D): void;
  action?(key: string): void;
  pointer?(x: number, y: number): void;
}
interface Props {
  create: (difficulty: DifficultySetting) => ArcadeEngine;
  controls: { key: string; label: string }[];
  instructions: string;
}
export function CanvasRunner({ create, controls, instructions }: Props) {
  const shell = useGameShell();
  const engine = useRef<ArcadeEngine>(create(shell.difficulty));
  const keys = useRef(new Set<string>());
  const [running, setRunning] = useState(false);
  const [snapshot, setSnapshot] = useState({ score: 0, label: engine.current.label });
  const rendered = useRef(0);
  const ended = useRef(false);
  const reset = useCallback(() => {
    engine.current = create(shell.difficulty);
    keys.current.clear();
    ended.current = false;
    setRunning(false);
    setSnapshot({ score: 0, label: engine.current.label });
  }, [create, shell.difficulty]);
  useEffect(() => {
    shell.registerRestart(reset);
  }, [shell, reset]);
  useEffect(() => {
    reset();
  }, [reset]);
  useEffect(() => {
    if (shell.paused) keys.current.clear();
  }, [shell.paused]);
  const { containerRef, canvasRef } = useCanvasGame({
    logicalWidth: 640,
    logicalHeight: 400,
    aspectRatio: 1.6,
    maxWidth: 800,
    update: (dt) => {
      if (!running || ended.current) return;
      const e = engine.current;
      e.update(dt, keys.current);
      rendered.current += dt;
      if (rendered.current > 0.12) {
        setSnapshot({ score: e.score, label: e.label });
        rendered.current = 0;
      }
      if (e.over) {
        ended.current = true;
        setRunning(false);
        setSnapshot({ score: e.score, label: e.label });
        void reportProgress(`${shell.game.id}.score`, e.score);
        if (e.won) void reportProgress(`${shell.game.id}.win`, 1);
        shell.endRound({
          score: e.score,
          won: e.won,
          lost: !e.won,
          details: [{ label: 'Result', value: e.label }],
        });
      }
    },
    render: (ctx) => engine.current.draw(ctx),
  });
  const press = useCallback(
    (key: string) => {
      if (!running || shell.paused) return;
      keys.current.add(key);
      engine.current.action?.(key);
    },
    [running, shell.paused],
  );
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName)
      )
        return;
      const key = e.key === ' ' ? 'Space' : e.key;
      if (controls.some((c) => c.key === key)) {
        e.preventDefault();
        if (!e.repeat) press(key);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key === ' ' ? 'Space' : e.key);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [controls, press]);
  return (
    <div
      className="game-canvas-wrap"
      style={{ flexDirection: 'column', gap: 12, padding: 10, width: '100%' }}
    >
      <GameHud
        items={[
          { label: 'Score', value: snapshot.score },
          { label: 'Status', value: snapshot.label },
        ]}
      />
      {!running && !ended.current && (
        <button
          className="btn btn-primary"
          onClick={() => {
            shell.startRound();
            setRunning(true);
          }}
        >
          Start game
        </button>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 'clamp(200px,50vw,400px)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label={`${shell.game.title} play area`}
          role="img"
          style={{ borderRadius: 14, touchAction: 'none', maxWidth: '100%' }}
          onPointerMove={(event) => {
            if (!running || shell.paused) return;
            const rect = event.currentTarget.getBoundingClientRect();
            engine.current.pointer?.(
              ((event.clientX - rect.left) / rect.width) * 640,
              ((event.clientY - rect.top) / rect.height) * 400,
            );
          }}
        />
      </div>
      <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
        {controls.map((control) => (
          <button
            className="btn"
            key={control.key}
            disabled={!running || shell.paused}
            aria-label={control.label}
            style={{ minWidth: 44, minHeight: 44, touchAction: 'none' }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              press(control.key);
            }}
            onPointerUp={() => keys.current.delete(control.key)}
            onPointerCancel={() => keys.current.delete(control.key)}
            onLostPointerCapture={() => keys.current.delete(control.key)}
            onClick={(e) => {
              if (e.detail === 0) {
                press(control.key);
                keys.current.delete(control.key);
              }
            }}
          >
            {control.label}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>
        {instructions}
      </p>
    </div>
  );
}
export function backdrop(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#101727';
  ctx.fillRect(0, 0, 640, 400);
  ctx.strokeStyle = '#1c2a40';
  ctx.lineWidth = 1;
  for (let x = 0; x < 640; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 400);
    ctx.stroke();
  }
  for (let y = 0; y < 400; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(640, y);
    ctx.stroke();
  }
}
