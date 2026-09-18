import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { useCanvasGame } from '@/game-engine/useCanvasGame';
import { ParticleSystem } from '@/game-engine/ParticleSystem';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { answerWords } from '../_shared/words/lexicon';
import { CONFIGS, FallingWords, GROUND, HEIGHT, WIDTH } from './engine';

function makeEngine(level: 'easy' | 'normal' | 'hard') {
  const rng = createRng(Date.now());
  return new FallingWords(CONFIGS[level], (n) => rng.pick(answerWords(n)), rng);
}

export default function TypingChallengeGame() {
  const shell = useGameShell();
  const engineRef = useRef(makeEngine(shell.difficulty));
  const particles = useRef(new ParticleSystem(200));
  const typedRef = useRef('');
  const [typed, setTyped] = useState('');
  const [hud, setHud] = useState({ score: 0, lives: engineRef.current.lives, cleared: 0 });
  const [running, setRunning] = useState(false);
  const ended = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const restart = useCallback(() => {
    engineRef.current = makeEngine(shell.difficulty);
    particles.current.clear();
    typedRef.current = '';
    setTyped('');
    setHud({ score: 0, lives: engineRef.current.lives, cleared: 0 });
    setRunning(false);
    ended.current = false;
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart]);

  const finish = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    const e = engineRef.current;
    setRunning(false);
    void reportProgress('typing-challenge.cleared', e.cleared);
    void reportProgress('typing-challenge.score', e.score);
    void reportProgress('typing-challenge.combo', e.bestCombo);
    shell.endRound({
      score: e.score,
      lost: true,
      title: 'The words got through!',
      details: [
        { label: 'Words cleared', value: String(e.cleared) },
        { label: 'Best combo', value: String(e.bestCombo) },
      ],
    });
  }, [shell]);

  const { containerRef, canvasRef } = useCanvasGame({
    aspectRatio: WIDTH / HEIGHT,
    logicalWidth: WIDTH,
    logicalHeight: HEIGHT,
    maxWidth: 820,
    update: (dt) => {
      particles.current.update(dt);
      if (!running || ended.current) return;
      const e = engineRef.current;
      const missed = e.update(dt);
      if (missed) {
        shell.play('hit');
        shell.vibrate(40);
        setHud((h) => ({ ...h, lives: e.lives }));
      }
      if (e.over) finish();
    },
    render: (ctx) => {
      const e = engineRef.current;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, GROUND);
      ctx.lineTo(WIDTH, GROUND);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 22px ui-monospace, "Cascadia Mono", Menlo, monospace';
      ctx.textBaseline = 'top';
      const target = e.target(typedRef.current);
      for (const w of e.words) {
        const danger = w.y > GROUND - 80;
        if (w === target) {
          const done = typedRef.current.length;
          ctx.fillStyle = '#4ade80';
          ctx.fillText(w.text.slice(0, done), w.x, w.y);
          const offset = ctx.measureText(w.text.slice(0, done)).width;
          ctx.fillStyle = '#fef08a';
          ctx.fillText(w.text.slice(done), w.x + (Number.isFinite(offset) ? offset : 0), w.y);
        } else {
          ctx.fillStyle = danger ? '#fca5a5' : '#e2e8f0';
          ctx.fillText(w.text, w.x, w.y);
        }
      }
      particles.current.render(ctx);
      if (!running && !ended.current) {
        ctx.fillStyle = 'rgba(15,23,42,0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Start typing to begin', WIDTH / 2, HEIGHT / 2 - 12);
        ctx.textAlign = 'left';
      }
    },
  });

  const onChange = (raw: string) => {
    if (ended.current || shell.paused) return;
    const value = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (!running && value) {
      setRunning(true);
      shell.startRound();
    }
    const e = engineRef.current;
    const target = e.words.find((w) => w.text === value);
    if (target) {
      const pts = e.type(value);
      particles.current.burst(target.x + target.text.length * 6, target.y + 10, {
        count: 14,
        colors: ['#4ade80', '#fef08a', '#38bdf8'],
        speed: 120,
        life: 0.5,
        size: 3,
      });
      shell.play('pop');
      setHud({ score: e.score, lives: e.lives, cleared: e.cleared });
      typedRef.current = '';
      setTyped('');
      if (pts && e.combo % 10 === 0) shell.play('powerup');
      return;
    }
    typedRef.current = value;
    setTyped(value);
  };

  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 10, padding: 8 }}>
      <GameHud
        items={[
          { label: 'Score', value: hud.score },
          { label: 'Lives', value: '❤️'.repeat(hud.lives) || '0' },
          { label: 'Cleared', value: hud.cleared },
        ]}
      />
      <div
        ref={containerRef}
        style={{ width: '100%', flex: 1, minHeight: 0, display: 'grid', placeItems: 'center' }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Falling words. Type each word before it reaches the red line."
          style={{ borderRadius: 12 }}
          onClick={() => inputRef.current?.focus()}
        />
      </div>
      <input
        ref={inputRef}
        className="input"
        style={{
          maxWidth: 420,
          width: '100%',
          fontSize: '1.2rem',
          fontFamily: 'var(--font-mono)',
          textAlign: 'center',
        }}
        value={typed}
        onChange={(e) => onChange(e.target.value)}
        disabled={ended.current || shell.paused}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="Type the falling words"
        placeholder="Type a falling word…"
      />
    </div>
  );
}
