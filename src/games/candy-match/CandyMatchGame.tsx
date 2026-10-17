import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { formatNumber } from '@/utils/format';
import { highestUnlocked, levelKey, useLevelProgress } from '../_shared/puzzle/levels';
import { BOOSTERS, useBoosters } from './boosters';
import type { BoosterId } from './boosters';
import { CANDY_NAMES, CandyBoard, CandyShape, IngredientFace } from './CandyBoard';
import type { BoardMode } from './CandyBoard';
import { allMoves, canSwap, createState, freeSwap, hammer, playMove, shuffleBooster, sugarRush } from './engine';
import type { State, Step } from './engine';
import { LEVEL_COUNT, LEVELS_PER_WORLD, WORLDS, allDone, goalStatus, level, overallProgress, stars } from './levels';
import type { Goal, GoalStatus, Level, Tracker } from './levels';
import { SagaMap } from './SagaMap';
import { usePlayer } from './usePlayer';
import './candy.css';

const ID = 'candy-match';
const PACK = 'saga';
const noSave = (_: unknown): _ is never => false;

type Screen = 'map' | 'intro' | 'play' | 'rush' | 'out' | 'over';

function swapped(s: State, a: number, b: number): State {
  const pieces = s.pieces.slice();
  [pieces[a], pieces[b]] = [pieces[b], pieces[a]];
  return { ...s, pieces };
}

function GoalIcon({ goal }: { goal: Goal }) {
  const svg = (child: ReactNode) => (
    <svg viewBox="0 0 100 100" className="cm-goal-icon" aria-hidden="true">
      {child}
    </svg>
  );
  switch (goal.kind) {
    case 'collect':
      return svg(<CandyShape color={goal.color} />);
    case 'ingredients':
      return svg(<IngredientFace type={0} />);
    case 'jelly':
      return svg(<rect x="10" y="10" width="80" height="80" rx="18" fill="rgba(244,114,182,0.75)" stroke="#fbcfe8" strokeWidth="5" />);
    case 'icing':
      return svg(<rect x="10" y="10" width="80" height="80" rx="18" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="5" />);
    case 'chocolate':
      return svg(
        <g>
          <rect x="10" y="10" width="80" height="80" rx="12" fill="#6b3a1e" />
          <path d="M10 50 H90 M50 10 V90" stroke="#3f200e" strokeWidth="6" />
        </g>,
      );
    case 'score':
      return svg(<path d="M50 8 L62 38 L94 38 L68 58 L78 90 L50 71 L22 90 L32 58 L6 38 L38 38 Z" fill="#facc15" stroke="#a16207" strokeWidth="4" />);
  }
}

function goalText(goal: Goal): string {
  switch (goal.kind) {
    case 'collect':
      return `Collect ${goal.count} ${CANDY_NAMES[goal.color]}s`;
    case 'ingredients':
      return `Bring ${goal.count} ingredient${goal.count > 1 ? 's' : ''} to the bottom`;
    case 'jelly':
      return 'Clear all the jelly';
    case 'icing':
      return 'Break all the icing';
    case 'chocolate':
      return 'Clear all the chocolate';
    case 'score':
      return `Score ${formatNumber(goal.target)} points`;
  }
}

export default function CandyMatchGame() {
  const shell = useGameShell();
  const lp = useLevelProgress<never>(ID, noSave, { packNames: { [PACK]: 'Level' }, better: (a, b) => a > b });
  const { boosters, use, give } = useBoosters();

  const [screen, setScreen] = useState<Screen>('map');
  const screenRef = useRef<Screen>('map');
  const go = (next: Screen) => {
    screenRef.current = next;
    setScreen(next);
  };

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const lvlRef = useRef<Level>(level(0));
  const startRef = useRef<State | null>(null);
  const tr = useRef<Tracker>({ score: 0, collected: [], state: null as unknown as State });
  const movesRef = useRef(0);
  const [movesLeft, setMovesLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [goals, setGoals] = useState<GoalStatus[]>([]);
  const [mode, setMode] = useState<BoardMode>('play');
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const startedRef = useRef(false);
  const toMapRef = useRef(false);

  const player = usePlayer(() => {
    const s = createState(level(0).layout, Math.random);
    tr.current.state = s;
    startRef.current = s;
    return s;
  });

  /* ------------------------------------------------------------ progress */

  const solved = lp.progress.solved;
  const starList = useMemo(() => Array.from({ length: LEVEL_COUNT }, (_, i) => solved[levelKey(PACK, i)]), [solved]);
  // Players of the old 72-level version keep their place: one level opened per level they had solved.
  const legacy = useMemo(() => Object.keys(solved).filter((k) => !k.startsWith(`${PACK}:`)).length, [solved]);
  const unlocked = Math.max(highestUnlocked(solved, PACK, LEVEL_COUNT), Math.min(LEVEL_COUNT - 1, legacy));

  /* -------------------------------------------------------------- levels */

  const startLevel = useCallback(
    (i: number) => {
      const lvl = level(i);
      const s = createState(lvl.layout, Math.random);
      indexRef.current = i;
      lvlRef.current = lvl;
      startRef.current = s;
      tr.current = { score: 0, collected: [], state: s };
      movesRef.current = lvl.moves;
      startedRef.current = false;
      setIndex(i);
      setMovesLeft(lvl.moves);
      setScore(0);
      setGoals(goalStatus(lvl, s, tr.current));
      setMode('play');
      setHint(null);
      setReward(null);
      player.reset(s);
      go('intro');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const showMap = useCallback(() => {
    player.reset(tr.current.state);
    go('map');
  }, [player]);

  /** Leaves a level for the map, abandoning the round if one is running. */
  const toMap = () => {
    toMapRef.current = true;
    shell.requestRestart();
  };

  const restart = useCallback(() => {
    if (toMapRef.current || screenRef.current === 'map') {
      toMapRef.current = false;
      showMap();
    } else startLevel(indexRef.current);
  }, [showMap, startLevel]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const ensureStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    shell.startRound();
  };

  /* ------------------------------------------------------------ playing */

  const onStep = (step: Step) => {
    const t = tr.current;
    t.score += step.points;
    step.colors.forEach((c) => (t.collected[c] = (t.collected[c] ?? 0) + 1));
    t.state = step.state;
    setScore(t.score);
    setGoals(goalStatus(lvlRef.current, startRef.current!, t));
    if (step.kind === 'shuffle') shell.play('whoosh');
    else if (step.kind === 'chocolate') shell.play('hit');
    else if (step.fired.length) shell.play('explosion');
    else if (step.created.length) shell.play('powerup');
    else if (step.popped.length) shell.play('pop');
    if (step.ingredientsOut.length) {
      shell.play('coin');
      void reportProgress(`${ID}.ingredient`, 1);
    }
    if (step.created.some((c) => c.piece.special === 'wrap')) void reportProgress(`${ID}.bomb`, 1);
    if (step.created.some((c) => c.piece.special === 'rainbow')) void reportProgress(`${ID}.rainbow`, 1);
  };

  async function run(steps: Step[], preview?: State) {
    ensureStarted();
    const ok = await player.play(steps, onStep, preview);
    if (ok) afterMove();
  }

  function afterMove() {
    const lvl = lvlRef.current;
    const status = goalStatus(lvl, startRef.current!, tr.current);
    if (allDone(status)) void win();
    else if (movesRef.current <= 0) {
      if (boosters.moves > 0) {
        go('out');
        shell.play('failure');
      } else lose();
    }
  }

  async function win() {
    const lvl = lvlRef.current;
    const left = movesRef.current;
    const earned = stars(left, lvl.moves);
    go('rush');
    shell.play('success');
    if (left > 0) {
      player.floatText('Sugar Rush!', -1, true);
      await player.play(sugarRush(tr.current.state, left, Math.random), onStep);
      if (screenRef.current !== 'rush') return;
    }

    const i = indexRef.current;
    const key = levelKey(PACK, i);
    const before = lp.progress.solved[key];
    lp.recordSolve(key, earned);
    const after = { ...lp.progress.solved, [key]: Math.max(earned, before ?? 0) };

    // Rewards: a booster for a level's first three stars, a full set for finishing a world.
    const gifts: string[] = [];
    if (earned === 3 && (before ?? 0) < 3) {
      const pool: BoosterId[] = ['hammer', 'swap', 'shuffle'];
      const id = pool[Math.floor(Math.random() * pool.length)];
      give({ [id]: 1 });
      gifts.push(BOOSTERS.find((b) => b.id === id)!.icon);
    }
    const world = Math.floor(i / LEVELS_PER_WORLD);
    const worldKeys = Array.from({ length: LEVELS_PER_WORLD }, (_, k) => levelKey(PACK, world * LEVELS_PER_WORLD + k));
    const worldDone = worldKeys.every((k) => after[k] !== undefined);
    if (worldDone && before === undefined) {
      give({ hammer: 1, swap: 1, shuffle: 1, moves: 1 });
      gifts.push('🔨🔄🔀➕');
      void reportProgress(`${ID}.pack`, 1);
    }
    setReward(gifts.length ? gifts.join(' ') : null);

    void reportProgress(`${ID}.first`, 1);
    if (before === undefined) void incrementProgress(`${ID}.twenty`);
    if (earned === 3) void reportProgress(`${ID}.three-stars`, 1);
    if (lvl.goals.some((g) => g.kind === 'jelly')) void reportProgress(`${ID}.jelly`, 1);
    if (Object.keys(after).filter((k) => k.startsWith(`${PACK}:`)).length >= LEVEL_COUNT) void reportProgress(`${ID}.saga`, 1);

    go('over');
    shell.endRound({
      won: true,
      score: tr.current.score,
      title: `Level ${i + 1} complete! ${'★'.repeat(earned)}${'☆'.repeat(3 - earned)}`,
      details: [
        { label: 'World', value: WORLDS[world].name },
        { label: 'Moves left', value: String(left) },
        ...(gifts.length ? [{ label: 'Booster reward', value: gifts.join(' ') }] : []),
      ],
      next:
        i < LEVEL_COUNT - 1
          ? { label: `Level ${i + 2} →`, action: () => startLevel(i + 1) }
          : { label: '🗺 World map', action: showMap },
    });
  }

  function lose() {
    const lvl = lvlRef.current;
    const pct = Math.round(overallProgress(goalStatus(lvl, startRef.current!, tr.current)) * 100);
    go('over');
    shell.endRound({
      lost: true,
      score: tr.current.score,
      title: 'Out of moves',
      message: `${pct}% of the way there — have another go!`,
      details: [{ label: 'Level', value: `${indexRef.current + 1} · ${WORLDS[lvl.world].name}` }],
      next: { label: '🗺 World map', action: showMap },
    });
  }

  const extraMoves = () => {
    if (!use('moves')) return;
    movesRef.current += 5;
    setMovesLeft(movesRef.current);
    shell.play('powerup');
    go('play');
  };

  const canAct = screen === 'play' && !player.busy && !shell.paused;

  const onSwap = (a: number, b: number) => {
    if (!canAct) return;
    const s = player.stateRef.current;
    setHint(null);
    if (mode === 'swap') {
      const steps = freeSwap(s, a, b, Math.random);
      if (!steps) {
        shell.play('failure');
        return;
      }
      use('swap');
      setMode('play');
      void run(steps, swapped(s, a, b));
      return;
    }
    const steps = playMove(s, a, b, Math.random);
    if (!steps) {
      if (canSwap(s, a, b)) void player.bounce(swapped(s, a, b));
      shell.play('failure');
      return;
    }
    const pa = s.pieces[a];
    const pb = s.pieces[b];
    if (pa?.kind === 'candy' && pb?.kind === 'candy' && pa.special !== 'none' && pb.special !== 'none') {
      void reportProgress(`${ID}.combo`, 1);
      player.floatText(pa.special === 'rainbow' && pb.special === 'rainbow' ? 'Double Rainbow!' : 'Combo!', -1, true);
    }
    movesRef.current -= 1;
    setMovesLeft(movesRef.current);
    void run(steps, swapped(s, a, b));
  };

  const onCell = (cell: number) => {
    if (!canAct || mode !== 'hammer') return;
    const steps = hammer(player.stateRef.current, cell, Math.random);
    if (!steps) {
      shell.play('failure');
      return;
    }
    use('hammer');
    setMode('play');
    shell.play('hit');
    void run(steps);
  };

  const pressBooster = (id: BoosterId) => {
    if (!canAct || boosters[id] <= 0) return;
    shell.play('click');
    if (id === 'shuffle') {
      use('shuffle');
      void run(shuffleBooster(player.stateRef.current, Math.random));
    } else if (id === 'hammer' || id === 'swap') setMode(mode === id ? 'play' : id);
  };

  // Idle hint after six seconds: the lowest move on the board, which sets off the most cascades.
  const board = player.view.state;
  useEffect(() => {
    setHint(null);
    if (screen !== 'play' || player.busy || shell.paused || mode !== 'play') return;
    const t = window.setTimeout(() => {
      const moves = allMoves(player.stateRef.current);
      setHint(moves.length ? moves.reduce((best, m) => (Math.max(...m) > Math.max(...best) ? m : best)) : null);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [board, player.busy, player.stateRef, screen, shell.paused, mode]);

  /* -------------------------------------------------------------- render */

  if (screen === 'map') {
    return (
      <div className="cm-game">
        {lp.loading ? (
          <p className="cm-loading">Loading your sweets…</p>
        ) : (
          <SagaMap stars={starList} unlocked={unlocked} current={Math.min(unlocked, LEVEL_COUNT - 1)} boosters={boosters} onPick={startLevel} />
        )}
      </div>
    );
  }

  const lvl = lvlRef.current;
  const world = WORLDS[lvl.world];
  const lowMoves = movesLeft <= 5 && screen === 'play';

  return (
    <div className="cm-game" style={{ ['--world' as string]: world.color }}>
      <div className="cm-top">
        <button type="button" className="btn btn-sm cm-map-btn" onClick={toMap} disabled={screen === 'rush'} aria-label="World map">
          🗺<span> Map</span>
        </button>
        <div className="cm-level">
          <strong>Level {index + 1}</strong>
          <span>{world.name}</span>
        </div>
        <div className={`cm-moves${lowMoves ? ' low' : ''}`} aria-live="polite">
          <span>{movesLeft}</span>
          <small>moves</small>
        </div>
        <div className="cm-score">
          <span>{formatNumber(score)}</span>
          <small>score</small>
        </div>
      </div>

      <ul className="cm-goals" aria-label="Goals">
        {goals.map((g, k) => (
          <li key={k} className={g.done ? 'done' : ''} title={goalText(g.goal)}>
            <GoalIcon goal={g.goal} />
            <span>{g.done ? '✓' : g.goal.kind === 'score' ? formatNumber(g.left) : g.left}</span>
          </li>
        ))}
      </ul>

      <div className="cm-stage">
        <CandyBoard
          view={player.view}
          disabled={!canAct}
          hint={hint}
          mode={mode}
          showExits={lvl.layout.ingredients > 0}
          onSwap={onSwap}
          onCell={onCell}
          label={`Level ${index + 1}. ${movesLeft} moves left. ${goals.map((g) => (g.done ? `${goalText(g.goal)}: done` : goalText(g.goal))).join('. ')}`}
        />

        {screen === 'intro' && (
          <div className="cm-overlay" role="dialog" aria-labelledby="cm-intro-title">
            <div className="cm-card">
              <span className="cm-card-world">{world.name}</span>
              <h3 id="cm-intro-title">Level {index + 1}</h3>
              <ul className="cm-intro-goals">
                {lvl.goals.map((g, k) => (
                  <li key={k}>
                    <GoalIcon goal={g} />
                    {goalText(g)}
                  </li>
                ))}
              </ul>
              <p className="cm-card-moves">
                in <strong>{lvl.moves}</strong> moves
              </p>
              {starList[index] !== undefined && <p className="cm-card-best">Best: {'★'.repeat(starList[index]!)}</p>}
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => go('play')} autoFocus>
                Play
              </button>
              <button type="button" className="btn btn-block btn-ghost" onClick={showMap}>
                🗺 World map
              </button>
            </div>
          </div>
        )}

        {screen === 'out' && (
          <div className="cm-overlay" role="alertdialog" aria-labelledby="cm-out-title">
            <div className="cm-card">
              <h3 id="cm-out-title">Out of moves!</h3>
              <p>
                You are {Math.round(overallProgress(goals) * 100)}% of the way there. Keep going with five more moves?
              </p>
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={extraMoves} autoFocus>
                ➕ Use +5 moves ({boosters.moves} left)
              </button>
              <button type="button" className="btn btn-block" onClick={lose}>
                Give up
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="cm-boosters" role="toolbar" aria-label="Boosters">
        {BOOSTERS.filter((b) => b.id !== 'moves').map((b) => (
          <button
            key={b.id}
            type="button"
            className={`cm-booster${mode === b.id ? ' on' : ''}`}
            onClick={() => pressBooster(b.id)}
            disabled={!canAct || boosters[b.id] <= 0}
            aria-pressed={b.id === 'shuffle' ? undefined : mode === b.id}
            title={b.help}
          >
            <span className="cm-booster-icon" aria-hidden="true">
              {b.icon}
            </span>
            <span className="cm-booster-name">{b.name}</span>
            <b>{boosters[b.id]}</b>
          </button>
        ))}
      </div>
      <p className="cm-tip" aria-live="polite">
        {mode === 'hammer'
          ? 'Tap a candy or obstacle to smash it.'
          : mode === 'swap'
            ? 'Swap any two neighbouring candies — no match needed.'
            : reward
              ? `Reward: ${reward}`
              : lvl.layout.ingredients > 0
                ? 'Ingredients leave the board through the arrows at the bottom.'
                : 'Match 4 for a striped candy, an L or T for a wrapped one, 5 for a rainbow.'}
      </p>
    </div>
  );
}
