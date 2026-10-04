import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { BoardLayout, StatusBar } from '../_shared/board/BoardUI';
import { PuzzleActions, StartPanel } from '../_shared/puzzle/PuzzleUI';
import { useCountdown } from '../_shared/useCountdown';
import { LEVELS, generateScene, hitDifference, scoreFor } from './engine';
import type { Scene } from './engine';
import { SceneSvg } from './SceneArt';
import './spot.css';

type Phase = 'intro' | 'playing' | 'over';

const newSeed = () => Math.random().toString(36).slice(2, 10);

export default function SpotDifferenceGame() {
  const shell = useGameShell();
  const level = LEVELS[shell.difficulty];
  const [scene, setScene] = useState<Scene>(() => generateScene(shell.difficulty, newSeed()));
  const [found, setFound] = useState<Set<number>>(new Set());
  const [misses, setMisses] = useState<{ x: number; y: number; key: number; side: 'left' | 'right' }[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [note, setNote] = useState<string | null>(null);
  const missKey = useRef(0);
  const overRef = useRef(false);

  const end = useCallback(
    (foundCount: number, secondsLeft: number, mistakeCount: number, hintCount: number) => {
      if (overRef.current) return;
      overRef.current = true;
      setPhase('over');
      const all = foundCount === level.diffs;
      if (all) {
        void reportProgress('spot-the-difference.first', 1);
        void incrementProgress('spot-the-difference.ten');
        if (mistakeCount === 0) void reportProgress('spot-the-difference.eagle', 1);
        if (shell.difficulty === 'hard') void reportProgress('spot-the-difference.hard', 1);
        if (secondsLeft >= level.seconds / 2) void reportProgress('spot-the-difference.fast', 1);
      }
      shell.play(all ? 'levelComplete' : 'gameOver');
      shell.endRound({
        won: all,
        lost: !all,
        score: scoreFor(foundCount, level.diffs, secondsLeft, mistakeCount, hintCount),
        title: all ? 'All differences found!' : "Time's up",
        details: [
          { label: 'Found', value: `${foundCount} / ${level.diffs}` },
          { label: 'Wrong taps', value: String(mistakeCount) },
          { label: 'Hints', value: String(hintCount) },
        ],
      });
    },
    [level, shell],
  );

  const timer = useCountdown(level.seconds, phase === 'playing' && !shell.paused, () =>
    end(found.size, 0, mistakes, hints),
  );
  const resetTimer = timer.reset;

  const restart = useCallback(() => {
    setScene(generateScene(shell.difficulty, newSeed()));
    setFound(new Set());
    setMisses([]);
    setMistakes(0);
    setHints(0);
    setNote(null);
    overRef.current = false;
    resetTimer(level.seconds);
    setPhase('intro');
  }, [level.seconds, resetTimer, shell.difficulty]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const begin = () => {
    setPhase('playing');
    shell.startRound();
  };

  const tap = (side: 'left' | 'right', x: number, y: number) => {
    if (phase !== 'playing' || shell.paused) return;
    const d = hitDifference(scene, found, x, y);
    if (d) {
      const next = new Set(found).add(d.id);
      setFound(next);
      setNote(null);
      shell.play('success');
      if (next.size === scene.diffs.length) end(next.size, timer.left, mistakes, hints);
    } else {
      // Wrong taps cost five seconds.
      timer.add(-5);
      setMistakes(mistakes + 1);
      setMisses((m) => [...m.slice(-5), { x, y, key: ++missKey.current, side }]);
      setNote('Not a difference — 5 seconds lost.');
      shell.play('failure');
      shell.vibrate(40);
    }
  };

  const hint = () => {
    if (phase !== 'playing') return;
    const d = scene.diffs.find((x) => !found.has(x.id));
    if (!d) return;
    timer.add(-10);
    setHints(hints + 1);
    const next = new Set(found).add(d.id);
    setFound(next);
    setNote('Hint used: one difference circled for you (−10 seconds).');
    if (next.size === scene.diffs.length) end(next.size, timer.left, mistakes, hints + 1);
  };

  const marks = scene.diffs.filter((d) => found.has(d.id));

  return (
    <BoardLayout>
      <GameHud
        items={[
          { label: 'Found', value: `${found.size}/${level.diffs}` },
          { label: 'Time', value: `${timer.seconds}s` },
          { label: 'Wrong taps', value: mistakes },
        ]}
      />
      {phase === 'intro' && (
        <StartPanel title={`Find ${level.diffs} differences`} onStart={begin}>
          <p className="small muted">
            The two pictures are almost the same. Tap each difference in either picture before time runs out. Wrong
            taps cost five seconds.
          </p>
        </StartPanel>
      )}
      <StatusBar>
        {phase === 'over'
          ? found.size === level.diffs
            ? 'Well spotted!'
            : 'Time is up.'
          : (note ?? 'Look for objects that are missing, added, recoloured, resized or flipped.')}
      </StatusBar>
      <div className={`sd-pair${phase === 'intro' ? ' blurred' : ''}`}>
        {(['left', 'right'] as const).map((side) => (
          <SceneSvg
            key={side}
            scene={scene}
            side={side}
            marks={marks}
            misses={misses.filter((m) => m.side === side)}
            label={`${side === 'left' ? 'First' : 'Second'} picture. ${found.size} of ${level.diffs} differences found.`}
            onTap={(x, y) => tap(side, x, y)}
          />
        ))}
      </div>
      <PuzzleActions>
        <button type="button" className="btn btn-sm" onClick={hint} disabled={phase !== 'playing' || shell.paused}>
          💡 Hint (−10s)
        </button>
      </PuzzleActions>
    </BoardLayout>
  );
}
