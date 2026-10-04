import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatNumber } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { LevelPicker } from '../_shared/puzzle/LevelPicker';
import { solvedInPack, usePackLevels } from '../_shared/puzzle/levels';
import { createBoard } from '../_shared/match3/engine';
import type { Config, Step } from '../_shared/match3/engine';
import { Match3Board } from '../_shared/match3/Match3Board';
import type { Skin } from '../_shared/match3/Match3Board';
import { useMatch3 } from '../_shared/match3/useMatch3';
import { LEVELS_PER_PACK, SIZE, goalMet, goalProgress, levelSpec, stars } from './levels';
import type { LevelSpec } from './levels';
import './candy.css';

const ID = 'candy-match';
const PACK_NAMES = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const CANDY_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];
const CANDY_NAMES = ['cherry drop', 'orange twist', 'lemon square', 'mint leaf', 'blueberry gem', 'grape heart'];
const noSave = (_: unknown): _ is never => false;

/** Candies: every flavour has its own shape as well as its colour. */
const CANDY: Skin = {
  colors: CANDY_COLORS,
  names: CANDY_NAMES,
  className: 'candy-skin',
  face: (color) => {
    const fill = CANDY_COLORS[color];
    const body =
      color === 0 ? <circle cx="50" cy="52" r="36" fill={fill} />
      : color === 1 ? (
        <g>
          <polygon points="10,50 26,34 26,66" fill={fill} />
          <polygon points="90,50 74,34 74,66" fill={fill} />
          <ellipse cx="50" cy="50" rx="28" ry="24" fill={fill} />
        </g>
      )
      : color === 2 ? <rect x="18" y="18" width="64" height="64" rx="18" fill={fill} />
      : color === 3 ? <path d="M50 10 C 85 30, 85 70, 50 90 C 15 70, 15 30, 50 10 Z" fill={fill} />
      : color === 4 ? <polygon points="50,12 86,40 72,86 28,86 14,40" fill={fill} />
      : <path d="M50 86 L16 50 C 4 34, 18 12, 36 18 C 44 21, 48 27, 50 32 C 52 27, 56 21, 64 18 C 82 12, 96 34, 84 50 Z" fill={fill} />;
    return (
      <g>
        {body}
        <ellipse cx="38" cy="36" rx="10" ry="6" fill="rgba(255,255,255,0.7)" transform="rotate(-25 38 36)" />
      </g>
    );
  },
};

type Phase = 'playing' | 'won' | 'lost';

export default function CandyMatchGame() {
  const shell = useGameShell();
  const pack = shell.difficulty;
  const levels = usePackLevels(ID, pack, LEVELS_PER_PACK, noSave, shell.requestRestart, {
    packNames: PACK_NAMES,
    better: (a, b) => a > b,
  });
  const [spec, setSpec] = useState<LevelSpec>(() => levelSpec(pack, 0));
  const cfgRef = useRef<Config>({ w: SIZE, h: SIZE, colors: spec.colors, specials: true });
  const [movesLeft, setMovesLeft] = useState(spec.moves);
  const [score, setScore] = useState(0);
  const [collected, setCollected] = useState<number[]>([]);
  const [jelly, setJelly] = useState<number[]>(spec.jelly);
  const [phase, setPhase] = useState<Phase>('playing');
  const [hint, setHint] = useState<[number, number] | null>(null);
  const live = useRef({ score: 0, collected: [] as number[], jelly: spec.jelly, movesLeft: spec.moves, spec });
  const startedRef = useRef(false);
  const idle = useRef<number | undefined>();

  const m3 = useMatch3(cfgRef.current, () => createBoard(cfgRef.current, Math.random), Math.random, {
    onStep: (step: Step, index: number) => {
      const s = live.current;
      s.score += step.points;
      step.clearedColors.forEach((c) => (s.collected[c] = (s.collected[c] ?? 0) + 1));
      if (s.spec.goal.kind === 'jelly') {
        s.jelly = s.jelly.slice();
        step.cleared.forEach((i) => (s.jelly[i] = Math.max(0, s.jelly[i] - 1)));
        step.created.forEach(({ cell }) => (s.jelly[cell] = Math.max(0, s.jelly[cell] - 1)));
        setJelly(s.jelly);
      }
      setScore(s.score);
      setCollected(s.collected.slice());
      if (step.created.some((c) => c.piece.special === 'bomb')) void reportProgress('candy-match.bomb', 1);
      if (step.created.some((c) => c.piece.special === 'rainbow')) void reportProgress('candy-match.rainbow', 1);
      shell.play(index > 0 ? 'powerup' : 'pop');
    },
    onAccepted: () => {
      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }
      live.current.movesLeft -= 1;
      setMovesLeft(live.current.movesLeft);
    },
    onSettled: () => settle(),
    onInvalid: () => shell.play('failure'),
  });

  const load = useCallback(
    (index: number) => {
      const next = levelSpec(pack, index);
      cfgRef.current = { w: SIZE, h: SIZE, colors: next.colors, specials: true };
      live.current = { score: 0, collected: [], jelly: next.jelly.slice(), movesLeft: next.moves, spec: next };
      setSpec(next);
      setMovesLeft(next.moves);
      setScore(0);
      setCollected([]);
      setJelly(next.jelly.slice());
      setPhase('playing');
      startedRef.current = false;
      m3.reset(createBoard(cfgRef.current, Math.random));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack],
  );

  useEffect(() => {
    if (levels.ready) load(levels.indexRef.current);
  }, [levels.ready, levels.indexRef, load]);

  const restart = useCallback(() => load(levels.indexRef.current), [levels.indexRef, load]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  /** After each move's cascade: check the goal, then whether moves are gone. */
  function settle() {
    const s = live.current;
    if (goalMet(s.spec.goal, s.score, s.collected, s.jelly)) {
      // Leftover moves become bonus points.
      const bonus = s.movesLeft * 100;
      const total = s.score + bonus;
      const index = levels.indexRef.current;
      const earned = stars(s.movesLeft, s.spec.moves);
      setPhase('won');
      levels.recordSolve(levels.key, earned);
      shell.play('levelComplete');
      void reportProgress('candy-match.first', 1);
      void incrementProgress('candy-match.twenty');
      if (earned === 3) void reportProgress('candy-match.three-stars', 1);
      if (s.spec.goal.kind === 'jelly') void reportProgress('candy-match.jelly', 1);
      if (solvedInPack({ ...levels.progress.solved, [levels.key]: earned }, pack) === LEVELS_PER_PACK)
        void reportProgress('candy-match.pack', 1);
      shell.endRound({
        won: true,
        score: total,
        title: `Level complete! ${'★'.repeat(earned)}${'☆'.repeat(3 - earned)}`,
        details: [
          { label: 'Level', value: `${PACK_NAMES[pack]} ${index + 1}` },
          { label: 'Moves left', value: `${s.movesLeft} (+${formatNumber(bonus)})` },
        ],
        next:
          index < LEVELS_PER_PACK - 1 ? { label: 'Next level →', action: () => levels.select(index + 1) } : undefined,
      });
    } else if (s.movesLeft <= 0) {
      setPhase('lost');
      shell.play('gameOver');
      shell.endRound({
        lost: true,
        score: s.score,
        title: 'Out of moves',
        message: `${Math.round(goalProgress(s.spec.goal, s.score, s.collected, s.jelly) * 100)}% of the goal done — try again!`,
        details: [{ label: 'Level', value: `${PACK_NAMES[pack]} ${levels.indexRef.current + 1}` }],
      });
    }
  }

  // Illegal swaps bounce back without costing a move (see onAccepted).
  const onSwap = (a: number, b: number) => {
    if (phase !== 'playing' || live.current.movesLeft <= 0) return;
    void m3.swap(a, b);
  };

  // Idle hint after five seconds.
  const { busy, board, hint: findHint } = m3;
  useEffect(() => {
    window.clearTimeout(idle.current);
    setHint(null);
    if (phase !== 'playing' || busy || shell.paused) return;
    idle.current = window.setTimeout(() => setHint(findHint()), 5000);
    return () => window.clearTimeout(idle.current);
  }, [board, busy, findHint, phase, shell.paused]);

  const goal = spec.goal;
  const goalText =
    goal.kind === 'score'
      ? `Score ${formatNumber(goal.target)}`
      : goal.kind === 'collect'
        ? goal.targets.map((t) => `${Math.min(collected[t.color] ?? 0, t.count)}/${t.count} ${CANDY_NAMES[t.color]}s`).join(' · ')
        : `Clear the jelly (${jelly.filter((j) => j > 0).length} tiles left)`;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Moves', value: movesLeft },
          { label: 'Score', value: formatNumber(score) },
          { label: 'Goal', value: `${Math.round(goalProgress(goal, score, collected, jelly) * 100)}%` },
        ]}
      />
      <LevelPicker
        pack={pack}
        count={LEVELS_PER_PACK}
        index={levels.index}
        solved={levels.progress.solved}
        onPick={levels.select}
        formatBest={(s) => '★'.repeat(s)}
        disabled={shell.paused || busy || !levels.ready}
      />
      <StatusBar>{goalText}</StatusBar>
      <Match3Board
        cfg={cfgRef.current}
        board={m3.board}
        popping={m3.popping}
        spawned={m3.spawned}
        skin={CANDY}
        disabled={shell.paused || phase !== 'playing' || busy || !levels.ready}
        hint={hint}
        onSwap={onSwap}
        label={`Candy board. ${movesLeft} moves left. Goal: ${goalText}`}
        underlay={goal.kind === 'jelly' ? (i) => (jelly[i] ? <span className={`candy-jelly j${jelly[i]}`} /> : null) : undefined}
      />
    </BoardLayout>
  );
}
