import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { LIVES, SHOW_MS, complete, failed, gridSize, makePattern, tap } from './engine';
import type { Attempt } from './engine';
import '../_shared/casual/casual.css';

type Phase = 'ready' | 'showing' | 'input' | 'between' | 'done';

export default function MemoryTestGame() {
  const shell = useGameShell();
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(LIVES);
  const [pattern, setPattern] = useState<number[]>([]);
  const [attempt, setAttempt] = useState<Attempt>({ found: [], wrong: [] });
  const [phase, setPhase] = useState<Phase>('ready');
  const timer = useRef<number>();
  const n = gridSize(level);

  const show = useCallback(
    (lv: number) => {
      window.clearTimeout(timer.current);
      setPattern(makePattern(lv, Math.random));
      setAttempt({ found: [], wrong: [] });
      setPhase('showing');
      timer.current = window.setTimeout(() => setPhase('input'), SHOW_MS[shell.difficulty] + 300);
    },
    [shell.difficulty],
  );

  const restart = useCallback(() => {
    window.clearTimeout(timer.current);
    setLevel(1);
    setLives(LIVES);
    setPattern([]);
    setAttempt({ found: [], wrong: [] });
    setPhase('ready');
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [shell.difficulty, restart]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const finish = (lv: number) => {
    setPhase('done');
    const reached = lv - 1;
    void reportProgress('memory-test.level-8', reached);
    void reportProgress('memory-test.level-15', reached);
    void incrementProgress('memory-test.squares', reached);
    shell.play('gameOver');
    shell.endRound({
      score: reached * 100,
      title: `You reached level ${lv}`,
      details: [
        { label: 'Levels cleared', value: String(reached) },
        { label: 'Most squares remembered', value: String(reached ? reached + 2 : 0) },
      ],
    });
  };

  const onCell = (cell: number) => {
    if (phase !== 'input' || shell.paused) return;
    const a = { found: [...attempt.found], wrong: [...attempt.wrong] };
    const r = tap(pattern, a, cell);
    if (r === 'repeat') return;
    setAttempt(a);
    shell.play(r === 'hit' ? 'blip' : 'failure');
    if (complete(pattern, a)) {
      setPhase('between');
      shell.play('success');
      const next = level + 1;
      if (a.wrong.length === 0 && level >= 5) void reportProgress('memory-test.clean', 1);
      timer.current = window.setTimeout(() => {
        setLevel(next);
        show(next);
      }, 700);
    } else if (failed(a)) {
      const left = lives - 1;
      setLives(left);
      setPhase('between');
      if (left <= 0) {
        timer.current = window.setTimeout(() => finish(level), 600);
      } else {
        timer.current = window.setTimeout(() => show(level), 900);
      }
    }
  };

  const begin = () => {
    if (shell.paused) return;
    shell.startRound();
    show(1);
  };

  const reveal = phase === 'showing' || (phase === 'between' && !complete(pattern, attempt));

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: 'Level', value: level },
          { label: 'Lives', value: '❤'.repeat(Math.max(0, lives)) || '–' },
          { label: 'Squares', value: pattern.length || '–' },
        ]}
      />
      <div className="cz-status" style={{ textAlign: 'center' }} aria-live="polite">
        {phase === 'ready' ? 'Remember which squares light up.' : phase === 'showing' ? 'Memorise…' : phase === 'input' ? `Tap the ${pattern.length} squares (${attempt.wrong.length}/3 mistakes)` : phase === 'done' ? 'Test over' : ''}
      </div>
      <div
        role="group"
        aria-label={`Memory grid ${n} by ${n}`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          gap: 6,
          width: 'min(100%, 440px)',
          aspectRatio: '1',
          margin: '0 auto',
          padding: 6,
          borderRadius: 'var(--radius)',
          background: phase === 'between' && attempt.wrong.length >= 3 ? 'var(--danger-soft)' : 'var(--bg-sunken)',
        }}
      >
        {Array.from({ length: n * n }, (_, i) => {
          const lit = (reveal && pattern.includes(i)) || attempt.found.includes(i);
          const wrong = attempt.wrong.includes(i);
          return (
            <button
              key={i}
              type="button"
              aria-label={`Square ${i + 1}${lit ? ', lit' : ''}${wrong ? ', wrong' : ''}`}
              disabled={phase !== 'input' || shell.paused}
              onPointerDown={(e) => {
                e.preventDefault();
                onCell(i);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCell(i);
                }
              }}
              style={{
                borderRadius: 8,
                border: 'none',
                background: wrong ? 'var(--danger)' : lit ? 'var(--brand)' : 'var(--surface)',
                transition: 'background 120ms ease',
                cursor: phase === 'input' ? 'pointer' : 'default',
              }}
            />
          );
        })}
      </div>
      {phase === 'ready' && (
        <button type="button" className="btn btn-primary btn-lg" onClick={begin} disabled={shell.paused}>
          Start
        </button>
      )}
    </div>
  );
}
