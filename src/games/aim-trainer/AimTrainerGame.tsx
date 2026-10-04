import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { AimEngine } from './engine';

export default function AimTrainerGame() {
  const shell = useGameShell();
  const live = useRef(shell);
  live.current = shell;
  const engine = useRef(new AimEngine());
  const ended = useRef(false);
  const [running, setRunning] = useState(false);
  const [, paint] = useState(0);
  const reset = useCallback(() => {
    engine.current = new AimEngine();
    ended.current = false;
    setRunning(false);
    paint((v) => v + 1);
  }, []);
  useEffect(() => {
    shell.registerRestart(reset);
  }, [shell, reset]);
  useEffect(() => {
    if (!running || shell.paused) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const game = engine.current;
      if (document.visibilityState === 'hidden') {
        last = now;
        return;
      }
      game.tick((now - last) / 1000);
      last = now;
      paint((v) => v + 1);
      if (game.remaining === 0 && !ended.current) {
        ended.current = true;
        setRunning(false);
        void reportProgress('aim-trainer.hits', game.hits);
        if (game.hits >= 10 && game.misses === 0) void reportProgress('aim-trainer.perfect', 1);
        void reportProgress('aim-trainer.score', game.score);
        live.current.endRound({
          title: 'Time!',
          score: game.score,
          won: game.hits >= 10,
          details: [
            { label: 'Targets hit', value: String(game.hits) },
            { label: 'Accuracy', value: `${game.accuracy}%` },
            { label: 'Misses', value: String(game.misses) },
          ],
        });
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [running, shell.paused]);
  const game = engine.current;
  const targetSize = { easy: 72, normal: 58, hard: 44 }[shell.difficulty];
  const hit = () => {
    if (!running || shell.paused || ended.current || document.visibilityState === 'hidden') return;
    game.hit();
    shell.play('pop');
    paint((v) => v + 1);
  };
  return (
    <div
      className="game-canvas-wrap"
      style={{ flexDirection: 'column', gap: 12, padding: 12, width: '100%' }}
    >
      <GameHud
        items={[
          { label: 'Time', value: `${Math.ceil(game.remaining)}s` },
          { label: 'Hits', value: game.hits },
          { label: 'Accuracy', value: `${game.accuracy}%` },
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
          Start 30-second round
        </button>
      )}
      <div
        role="group"
        aria-label="Target range"
        onPointerDown={() => {
          if (running && !shell.paused) {
            game.miss();
            shell.play('failure');
            paint((v) => v + 1);
          }
        }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 680,
          height: 'clamp(320px,55vh,500px)',
          border: '2px solid var(--border)',
          borderRadius: 16,
          background: 'var(--surface-2)',
          overflow: 'hidden',
          touchAction: 'manipulation',
        }}
      >
        {running && (
          <button
            aria-label="Hit target"
            disabled={shell.paused}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (e.isPrimary && e.button === 0) {
                e.preventDefault();
                hit();
              }
            }}
            onClick={(e) => {
              if (e.detail === 0) hit();
            }}
            style={{
              position: 'absolute',
              left: `${game.target.x}%`,
              top: `${game.target.y}%`,
              transform: 'translate(-50%,-50%)',
              width: targetSize,
              height: targetSize,
              borderRadius: '50%',
              border: '4px solid white',
              boxShadow: '0 0 0 4px var(--brand)',
              background: 'var(--brand)',
              color: 'white',
              fontSize: 24,
            }}
          >
            ◎
          </button>
        )}
        {!running && (
          <p
            style={{
              position: 'absolute',
              inset: 20,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
            }}
          >
            {ended.current
              ? 'Round complete'
              : 'Hit each target as it appears. Misses reduce your accuracy bonus.'}
          </p>
        )}
      </div>
      <p className="small muted">
        Tap targets or focus the target button with Tab and press Enter. P pauses the clock.
      </p>
    </div>
  );
}
