import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { createRng } from '@/utils/random';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions } from '../_shared/puzzle/PuzzleUI';
import { LevelPicker } from '../_shared/puzzle/LevelPicker';
import { solvedInPack, usePackLevels } from '../_shared/puzzle/levels';
import { DX, DY, LEVEL_SIZES, blocker, cells, freeRun, generate, movable } from './engine';
import type { Board } from './engine';
import './arrows.css';

const ID = 'arrow-escape';
export const LEVEL_COUNT = 30;
const HEARTS = 3;
const PACK_NAMES = { easy: 'Easy 5×5', normal: 'Normal 6×6', hard: 'Hard 7×7' };
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

const cache = new Map<string, Board>();
export function levelBoard(pack: 'easy' | 'normal' | 'hard', index: number): Board {
  const key = `${pack}-${index}`;
  let b = cache.get(key);
  if (!b) {
    const [n, fill] = LEVEL_SIZES[pack];
    b = generate(n, n, fill, createRng(`arrow-escape-${pack}-${index}`).next);
    cache.set(key, b);
  }
  return b;
}

interface InProgress {
  gone: number[];
  hearts: number;
}

type Motion = { i: number; kind: 'out' | 'bump'; dist: number } | null;

export default function ArrowEscapeGame() {
  const shell = useGameShell();
  const pack = shell.difficulty;
  const validProgress = useCallback((v: unknown): v is InProgress => {
    if (typeof v !== 'object' || v === null) return false;
    const s = v as Record<string, unknown>;
    return Array.isArray(s.gone) && s.gone.every((i) => Number.isInteger(i)) && Number.isInteger(s.hearts) && (s.hearts as number) > 0;
  }, []);
  const levels = usePackLevels(ID, pack, LEVEL_COUNT, validProgress, shell.requestRestart, {
    packNames: PACK_NAMES,
  });
  const board = useMemo(() => levelBoard(pack, levels.index), [pack, levels.index]);
  const [gone, setGone] = useState<Set<number>>(new Set());
  const [hearts, setHearts] = useState(HEARTS);
  const [motion, setMotion] = useState<Motion>(null);
  const [hint, setHint] = useState(-1);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>();

  const load = useCallback(
    (index: number) => {
      window.clearTimeout(timer.current);
      const saved = levels.savedFor(index);
      const b = levelBoard(pack, index);
      const g = saved ? saved.gone.filter((i) => i >= 0 && i < b.arrows.length) : [];
      setGone(new Set(g));
      setHearts(saved ? saved.hearts : HEARTS);
      setMotion(null);
      setHint(-1);
      setHintsUsed(0);
      setStarted(!!saved);
      setDone(false);
    },
    [levels, pack],
  );

  useEffect(() => {
    if (levels.ready) load(levels.indexRef.current);
    // Only when progress first loads or the pack changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels.ready, pack]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const restart = useCallback(() => {
    levels.clearCurrent();
    window.clearTimeout(timer.current);
    setGone(new Set());
    setHearts(HEARTS);
    setMotion(null);
    setHint(-1);
    setHintsUsed(0);
    setStarted(false);
    setDone(false);
  }, [levels]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = useCallback(
    (won: boolean, heartsLeft: number) => {
      setDone(true);
      const index = levels.indexRef.current;
      const key = levels.key;
      levels.clearCurrent();
      if (won) {
        levels.recordSolve(key, heartsLeft);
        void reportProgress(`${ID}.first`, 1);
        void incrementProgress(`${ID}.ten`);
        if (heartsLeft === HEARTS) void reportProgress(`${ID}.flawless`, 1);
        if (pack === 'hard' && heartsLeft === HEARTS) void reportProgress(`${ID}.hard`, 1);
        if (solvedInPack({ ...levels.progress.solved, [key]: heartsLeft }, pack) === LEVEL_COUNT) void reportProgress(`${ID}.pack`, 1);
      }
      shell.play(won ? 'levelComplete' : 'gameOver');
      shell.endRound({
        won,
        score: won ? board.arrows.length * 20 + heartsLeft * 100 - hintsUsed * 40 : (gone.size + 1) * 10,
        title: won ? `${'❤️'.repeat(heartsLeft)} Board cleared!` : 'Out of hearts',
        details: [
          { label: 'Level', value: `${PACK_NAMES[pack]} · ${index + 1}` },
          { label: 'Arrows', value: `${won ? board.arrows.length : gone.size}/${board.arrows.length}` },
          { label: 'Hearts left', value: String(heartsLeft) },
        ],
        next: won && index < LEVEL_COUNT - 1 ? { label: 'Next level →', action: () => levels.select(index + 1) } : undefined,
      });
    },
    [board.arrows.length, gone.size, hintsUsed, levels, pack, shell],
  );

  const tap = (i: number) => {
    if (shell.paused || done || motion || gone.has(i)) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    setHint(-1);
    if (blocker(board, i, gone) < 0) {
      setMotion({ i, kind: 'out', dist: board.w + 3 });
      shell.play('whoosh');
      timer.current = window.setTimeout(() => {
        const next = new Set(gone);
        next.add(i);
        setGone(next);
        setMotion(null);
        if (next.size === board.arrows.length) finish(true, hearts);
        else levels.saveCurrent(levels.key, { gone: [...next], hearts });
      }, 320);
    } else {
      const run = freeRun(board, i, gone);
      setMotion({ i, kind: 'bump', dist: run });
      shell.play('failure');
      if (navigator.vibrate) navigator.vibrate(60);
      const left = hearts - 1;
      timer.current = window.setTimeout(() => {
        setMotion(null);
        setHearts(left);
        if (left <= 0) finish(false, 0);
        else levels.saveCurrent(levels.key, { gone: [...gone], hearts: left });
      }, 360);
    }
  };

  const giveHint = () => {
    if (done || shell.paused) return;
    const m = movable(board, gone);
    if (!m.length) return;
    setHint(m[Math.floor(Math.random() * m.length)]);
    setHintsUsed(hintsUsed + 1);
    shell.play('select');
  };

  const { w, h } = board;
  const left = board.arrows.length - gone.size;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Level', value: `${levels.index + 1}/${LEVEL_COUNT}` },
          { label: 'Arrows left', value: left },
          { label: 'Hearts', value: '❤️'.repeat(hearts) + '🖤'.repeat(HEARTS - hearts) },
        ]}
      />
      <LevelPicker
        pack={pack}
        count={LEVEL_COUNT}
        index={levels.index}
        solved={levels.progress.solved}
        onPick={levels.select}
        formatBest={(n) => '❤️'.repeat(n)}
        disabled={shell.paused || !levels.ready}
      />
      <StatusBar>
        {done
          ? hearts > 0
            ? 'Every arrow escaped!'
            : 'Out of hearts. Try again: look for arrows with a clear path to the edge.'
          : 'Tap an arrow to send it off the board. If another arrow is in its way, it bumps back and you lose a heart.'}
      </StatusBar>
      <div className="ae-board" style={{ ['--n' as string]: w }}>
        <svg viewBox={`-0.1 -0.1 ${w + 0.2} ${h + 0.2}`} className="ae-svg" role="group" aria-label={`${left} arrows left`}>
          {Array.from({ length: w * h }, (_, c) => (
            <circle key={c} cx={(c % w) + 0.5} cy={Math.floor(c / w) + 0.5} r={0.05} className="ae-dot" />
          ))}
          {board.arrows.map((a, i) => {
            if (gone.has(i)) return null;
            const body = cells(a);
            const tail = body[body.length - 1];
            const x1 = Math.min(a.x, tail[0]);
            const y1 = Math.min(a.y, tail[1]);
            const horiz = a.dir === 1 || a.dir === 3;
            const len = a.length;
            const m = motion?.i === i ? motion : null;
            const shift = m ? (m.kind === 'out' ? m.dist : Math.max(0.25, m.dist + 0.25)) : 0;
            const style = {
              ['--tx' as string]: `${DX[a.dir] * shift}px`,
              ['--ty' as string]: `${DY[a.dir] * shift}px`,
            };
            const cx = a.x + 0.5;
            const cy = a.y + 0.5;
            // Arrowhead pointing in the arrow's direction.
            const tip = [cx + DX[a.dir] * 0.42, cy + DY[a.dir] * 0.42];
            const side = [DY[a.dir] * 0.3, -DX[a.dir] * 0.3];
            const back = [cx - DX[a.dir] * 0.05, cy - DY[a.dir] * 0.05];
            return (
              <g
                key={i}
                className={`ae-arrow${m ? ` ${m.kind}` : ''}${hint === i ? ' hint' : ''}`}
                style={style}
                role="button"
                tabIndex={0}
                aria-label={`Arrow pointing ${['up', 'right', 'down', 'left'][a.dir]}, length ${len}`}
                onClick={() => tap(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(i))}
              >
                <rect x={x1} y={y1} width={horiz ? len : 1} height={horiz ? 1 : len} fill="transparent" />
                <rect
                  x={x1 + (horiz ? 0.18 : 0.33)}
                  y={y1 + (horiz ? 0.33 : 0.18)}
                  width={horiz ? len - 0.36 : 0.34}
                  height={horiz ? 0.34 : len - 0.36}
                  rx={0.17}
                  fill={COLORS[i % COLORS.length]}
                />
                <polygon
                  points={`${tip[0]},${tip[1]} ${back[0] + side[0]},${back[1] + side[1]} ${back[0] - side[0]},${back[1] - side[1]}`}
                  fill={COLORS[i % COLORS.length]}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={giveHint} disabled={done || shell.paused}>
          💡 Hint
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
