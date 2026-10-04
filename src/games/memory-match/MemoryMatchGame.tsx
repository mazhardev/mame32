import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { createBoard, isPair, scoreBoard, SYMBOLS } from './engine';

export default function MemoryMatchGame() {
  const shell = useGameShell();
  const pairs = { easy: 6, normal: 8, hard: 12 }[shell.difficulty];
  const [board, setBoard] = useState(() => createBoard(pairs));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const started = useRef(false);
  const finished = useRef(false);
  const reset = useCallback(() => {
    setBoard(createBoard(pairs));
    setOpen([]);
    setMatched([]);
    setMoves(0);
    started.current = false;
    finished.current = false;
  }, [pairs]);
  useEffect(() => {
    shell.registerRestart(reset);
  }, [shell, reset]);
  useEffect(() => {
    reset();
  }, [reset]);
  useEffect(() => {
    if (open.length !== 2 || shell.paused) return;
    const timer = window.setTimeout(() => setOpen([]), 850);
    return () => window.clearTimeout(timer);
  }, [open, shell.paused]);
  function flip(index: number) {
    if (
      shell.paused ||
      finished.current ||
      open.length === 2 ||
      open.includes(index) ||
      matched.includes(index)
    )
      return;
    if (!started.current) {
      started.current = true;
      shell.startRound();
    }
    shell.play('card');
    if (!open.length) {
      setOpen([index]);
      return;
    }
    const turns = moves + 1;
    setMoves(turns);
    if (isPair(board, open[0], index)) {
      const next = [...matched, open[0], index];
      setMatched(next);
      setOpen([]);
      shell.play('success');
      if (next.length === board.length) {
        finished.current = true;
        const score = scoreBoard(pairs, turns);
        void reportProgress('memory-match.first-win', 1);
        void reportProgress('memory-match.score', score);
        if (turns === pairs) void reportProgress('memory-match.perfect', 1);
        shell.endRound({
          title: 'Every pair found!',
          won: true,
          score,
          details: [{ label: 'Moves', value: String(turns) }],
        });
      }
    } else setOpen([open[0], index]);
  }
  return (
    <div className="game-canvas-wrap" style={{ flexDirection: 'column', gap: 16, padding: 12 }}>
      <GameHud
        items={[
          { label: 'Pairs', value: `${matched.length / 2} / ${pairs}` },
          { label: 'Moves', value: moves },
        ]}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${pairs === 12 ? 6 : 4}, minmax(0,1fr))`,
          gap: 8,
          width: 'min(100%, 560px)',
        }}
      >
        {board.map((symbol, i) => {
          const visible = matched.includes(i) || open.includes(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              disabled={shell.paused || matched.includes(i)}
              aria-label={`Card ${i + 1}: ${visible ? SYMBOLS[symbol] : 'face down'}`}
              aria-pressed={visible}
              style={{
                aspectRatio: '1',
                minWidth: 0,
                minHeight: 44,
                fontSize: 'clamp(1.1rem,5vw,2.2rem)',
                borderRadius: 12,
                border: '2px solid var(--border)',
                background: visible ? 'var(--surface)' : 'var(--brand-soft)',
                color: 'var(--text)',
              }}
            >
              {visible ? SYMBOLS[symbol] : '?'}
            </button>
          );
        })}
      </div>
      <p role="status" className="small muted">
        {open.length === 2
          ? 'Different symbols — remember their positions.'
          : 'Turn over two cards to find a pair.'}
      </p>
    </div>
  );
}
