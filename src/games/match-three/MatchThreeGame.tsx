'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { formatNumber } from '@/utils/format';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { StartPanel } from '../_shared/puzzle/PuzzleUI';
import { useCountdown } from '../_shared/useCountdown';
import { createBoard } from '../_shared/match3/engine';
import type { Config, Step } from '../_shared/match3/engine';
import { Match3Board } from '../_shared/match3/Match3Board';
import type { Skin } from '../_shared/match3/Match3Board';
import { useMatch3 } from '../_shared/match3/useMatch3';

const SETTINGS = {
  easy: { colors: 5, seconds: 120 },
  normal: { colors: 6, seconds: 90 },
  hard: { colors: 7, seconds: 60 },
};

const GEM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316', '#e2e8f0'];
const GEM_NAMES = ['red circle', 'blue diamond', 'green square', 'yellow triangle', 'purple hexagon', 'orange pentagon', 'white star'];

function polygon(sides: number, r: number, rot = -Math.PI / 2): string {
  return Array.from({ length: sides }, (_, k) => {
    const a = rot + (k / sides) * Math.PI * 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(' ');
}

const STAR = Array.from({ length: 10 }, (_, k) => {
  const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
  const r = k % 2 ? 19 : 42;
  return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
}).join(' ');

/** Each colour also has its own shape, so gems are distinguishable without colour. */
export const GEMS: Skin = {
  colors: GEM_COLORS,
  names: GEM_NAMES,
  face: (color) => {
    const fill = GEM_COLORS[color];
    const shape =
      color === 0 ? <circle cx="50" cy="50" r="38" fill={fill} />
      : color === 1 ? <polygon points="50,8 90,50 50,92 10,50" fill={fill} />
      : color === 2 ? <rect x="14" y="14" width="72" height="72" rx="14" fill={fill} />
      : color === 3 ? <polygon points={polygon(3, 44, -Math.PI / 2)} fill={fill} transform="translate(0 6)" />
      : color === 4 ? <polygon points={polygon(6, 40, 0)} fill={fill} />
      : color === 5 ? <polygon points={polygon(5, 41)} fill={fill} />
      : <polygon points={STAR} fill={fill} />;
    return (
      <g>
        {shape}
        <ellipse cx="38" cy="34" rx="12" ry="7" fill="rgba(255,255,255,0.55)" transform="rotate(-30 38 34)" />
      </g>
    );
  },
};

type Phase = 'intro' | 'playing' | 'over';

export default function MatchThreeGame() {
  const shell = useGameShell();
  const settings = SETTINGS[shell.difficulty];
  // Difficulty changes remount the game, so the config is fixed per mount.
  const cfgRef = useRef<Config>({ w: 8, h: 8, colors: settings.colors, specials: true });
  const [phase, setPhase] = useState<Phase>('intro');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const scoreRef = useRef(0);
  const timeUp = useRef(false);
  const idleTimer = useRef<number | undefined>(undefined);
  const stats = useRef({ specials: 0 });
  const overRef = useRef(false);

  const finish = useCallback(() => {
    if (overRef.current) return;
    overRef.current = true;
    setPhase('over');
    shell.play('gameOver');
    shell.endRound({
      score: scoreRef.current,
      title: "Time's up!",
      details: [
        { label: 'Best cascade', value: `×${bestCombo}` },
        { label: 'Specials made', value: String(stats.current.specials) },
      ],
    });
  }, [bestCombo, shell]);

  const m3 = useMatch3(cfgRef.current, () => createBoard(cfgRef.current, Math.random), Math.random, {
    onStep: (step: Step, index: number) => {
      scoreRef.current += step.points;
      setScore(scoreRef.current);
      setCombo(index + 1);
      if (index + 1 > bestCombo) setBestCombo(index + 1);
      if (step.created.length) {
        stats.current.specials += step.created.length;
        void reportProgress('match-three.special', 1);
        if (step.created.some((c) => c.piece.special === 'rainbow')) void reportProgress('match-three.rainbow', 1);
      }
      if (index >= 3) void reportProgress('match-three.cascade', 1);
      shell.play(index > 0 ? 'powerup' : step.created.length ? 'success' : 'pop');
      void reportProgress('match-three.score-3000', scoreRef.current);
      void reportProgress('match-three.score-8000', scoreRef.current);
    },
    onSettled: () => {
      if (timeUp.current) finish();
    },
    onInvalid: () => shell.play('failure'),
  });

  const timer = useCountdown(settings.seconds, phase === 'playing' && !shell.paused, () => {
    timeUp.current = true;
    if (!m3.busy) finish();
  });

  // After a few idle seconds, point out a possible move.
  const { busy, board, hint: findHint } = m3;
  useEffect(() => {
    window.clearTimeout(idleTimer.current);
    setHint(null);
    if (phase !== 'playing' || busy || shell.paused) return;
    idleTimer.current = window.setTimeout(() => setHint(findHint()), 5000);
    return () => window.clearTimeout(idleTimer.current);
  }, [board, busy, findHint, phase, shell.paused]);

  const restart = useCallback(() => {
    m3.reset(createBoard(cfgRef.current, Math.random));
    scoreRef.current = 0;
    timeUp.current = false;
    overRef.current = false;
    stats.current = { specials: 0 };
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    timer.reset(settings.seconds);
    setPhase('intro');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.seconds]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const begin = () => {
    setPhase('playing');
    shell.startRound();
  };

  const onSwap = (a: number, b: number) => {
    if (phase === 'intro') begin();
    if (timeUp.current) return;
    setCombo(0);
    void m3.swap(a, b);
  };

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Score', value: formatNumber(score) },
          { label: 'Time', value: `${timer.seconds}s` },
          { label: 'Cascade', value: combo > 1 ? `×${combo}` : '—' },
        ]}
      />
      {phase === 'intro' ? (
        <StartPanel title="Gem blitz" onStart={begin}>
          <p className="small muted">
            Swap neighbouring gems to line up three or more. You have {settings.seconds} seconds. Lines of
            four make striped gems, L and T shapes make bombs, and five in a row makes a rainbow gem.
          </p>
        </StartPanel>
      ) : (
        <StatusBar>
          {phase === 'over'
            ? "Time's up!"
            : timer.seconds <= 10
              ? 'Hurry — the clock is nearly out!'
              : 'Swap neighbouring gems to match three or more.'}
        </StatusBar>
      )}
      <Match3Board
        cfg={cfgRef.current}
        board={m3.board}
        popping={m3.popping}
        spawned={m3.spawned}
        skin={GEMS}
        disabled={shell.paused || phase === 'over' || m3.busy}
        hint={hint}
        onSwap={onSwap}
        label={`Gem board, score ${score}, ${timer.seconds} seconds left`}
      />
    </BoardLayout>
  );
}
