'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, StartPanel } from '../_shared/puzzle/PuzzleUI';
import { useCountdown } from '../_shared/useCountdown';
import { H, ITEMS, LEVELS, W, generateScene, itemAt, scoreFor } from './engine';
import type { Scene } from './engine';
import './hidden.css';

type Phase = 'intro' | 'playing' | 'over';
const newSeed = () => Math.random().toString(36).slice(2, 10);

export default function HiddenObjectGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const [scene, setScene] = useState<Scene>(() => generateScene(shell.difficulty, newSeed()));
  const [found, setFound] = useState<Set<number>>(new Set());
  const [misses, setMisses] = useState(0);
  const [hints, setHints] = useState(0);
  const [pulse, setPulse] = useState<number | null>(null);
  const [miss, setMiss] = useState<{ x: number; y: number; k: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const overRef = useRef(false);
  const pulseTimer = useRef<number | undefined>(undefined);

  const end = useCallback(
    (foundCount: number, secondsLeft: number, missCount: number, hintCount: number) => {
      if (overRef.current) return;
      overRef.current = true;
      setPhase('over');
      const all = foundCount === level.targets;
      if (all) {
        void reportProgress('hidden-object.first', 1);
        void incrementProgress('hidden-object.ten');
        if (missCount === 0 && hintCount === 0) void reportProgress('hidden-object.sharp', 1);
        if (shell.difficulty === 'hard') void reportProgress('hidden-object.hard', 1);
      }
      shell.play(all ? 'levelComplete' : 'gameOver');
      shell.endRound({
        won: all,
        lost: !all,
        score: scoreFor(foundCount, level.targets, secondsLeft, missCount, hintCount),
        title: all ? 'Everything found!' : "Time's up",
        details: [
          { label: 'Found', value: `${foundCount} / ${level.targets}` },
          { label: 'Wrong taps', value: String(missCount) },
          { label: 'Hints', value: String(hintCount) },
        ],
      });
    },
    [level.targets, shell],
  );

  const timer = useCountdown(level.seconds, phase === 'playing' && !shell.paused, () => end(found.size, 0, misses, hints));
  const resetTimer = timer.reset;

  const restart = useCallback(() => {
    setScene(generateScene(shell.difficulty, newSeed()));
    setFound(new Set());
    setMisses(0);
    setHints(0);
    setPulse(null);
    setMiss(null);
    overRef.current = false;
    resetTimer(level.seconds);
    setPhase('intro');
  }, [level.seconds, resetTimer, shell.difficulty]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => () => window.clearTimeout(pulseTimer.current), []);

  const begin = () => {
    setPhase('playing');
    shell.startRound();
  };

  const onTap = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phase !== 'playing' || shell.paused) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    const p = m ? pt.matrixTransform(m.inverse()) : pt;
    const hit = itemAt(scene, p.x, p.y);
    if (hit && scene.targets.includes(hit.item) && !found.has(hit.item)) {
      const next = new Set(found).add(hit.item);
      setFound(next);
      setPulse(null);
      shell.play('success');
      if (next.size === scene.targets.length) end(next.size, timer.left, misses, hints);
      return;
    }
    // Wrong taps cost three seconds.
    timer.add(-3);
    setMisses(misses + 1);
    setMiss({ x: p.x, y: p.y, k: Date.now() });
    shell.play('failure');
  };

  const hint = () => {
    if (phase !== 'playing') return;
    const target = scene.targets.find((t) => !found.has(t));
    if (target === undefined) return;
    timer.add(-10);
    setHints(hints + 1);
    setPulse(target);
    window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(null), 2500);
  };

  const pulsed = pulse !== null ? scene.placed.find((p) => p.item === pulse) : undefined;

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Found', value: `${found.size}/${level.targets}` },
          { label: 'Time', value: `${timer.seconds}s` },
          { label: 'Wrong taps', value: misses },
        ]}
      />
      {phase === 'intro' && (
        <StartPanel title="Find the hidden items" onStart={begin}>
          <p className="small muted">
            {level.targets} items are hidden in a cluttered room. Tap each one on the list before the clock runs out.
            Wrong taps cost three seconds.
          </p>
        </StartPanel>
      )}
      <ul className="ho-list" aria-label="Items to find">
        {scene.targets.map((t) => (
          <li key={t} className={found.has(t) ? 'done' : ''}>
            <span aria-hidden="true">{ITEMS[t][0]}</span> {ITEMS[t][1]}
          </li>
        ))}
      </ul>
      <StatusBar>
        {phase === 'over'
          ? found.size === level.targets
            ? 'You found everything!'
            : 'Time is up.'
          : 'Tap an item from the list when you spot it.'}
      </StatusBar>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`ho-scene${phase === 'intro' ? ' blurred' : ''}`}
        role="img"
        aria-label={`Cluttered room. ${found.size} of ${level.targets} items found.`}
        onPointerDown={onTap}
      >
        <defs>
          <pattern id="ho-planks" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#e7d3b1" />
            <rect width="40" height="1.5" fill="#cdb48c" />
            <rect x="20" y="20" width="1.5" height="20" fill="#cdb48c" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#ho-planks)" />
        {scene.placed.map((p) => (
          <text
            key={p.key}
            x={p.x}
            y={p.y}
            fontSize={p.size}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${p.rot} ${p.x} ${p.y})`}
            className={found.has(p.item) && scene.targets.includes(p.item) ? 'ho-found' : undefined}
          >
            {ITEMS[p.item][0]}
          </text>
        ))}
        {scene.placed
          .filter((p) => found.has(p.item) && scene.targets.includes(p.item))
          .map((p) => (
            <circle key={`f${p.key}`} cx={p.x} cy={p.y} r={p.size * 0.62} className="ho-ring" />
          ))}
        {pulsed && <circle cx={pulsed.x} cy={pulsed.y} r={pulsed.size} className="ho-pulse" />}
        {miss && (
          <g key={miss.k} className="ho-miss" transform={`translate(${miss.x} ${miss.y})`}>
            <line x1="-6" y1="-6" x2="6" y2="6" />
            <line x1="-6" y1="6" x2="6" y2="-6" />
          </g>
        )}
      </svg>
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={hint} disabled={phase !== 'playing' || shell.paused}>
          💡 Hint (−10s)
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
