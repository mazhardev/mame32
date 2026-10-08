import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DifficultySetting, GameDefinition } from '@/types';
import { GameShellContext } from '@/game-engine/context';
import type { GameOverPayload, GameShellApi } from '@/game-engine/context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader } from '@/components/Loader';
import { FitToStage } from './FitToStage';
import {
  useDocumentHidden,
  useExpandMode,
  useIsCoarsePointer,
  usePreferences,
  useWakeLock,
} from '@/hooks/usePlatform';
import { playSound, unlockAudio, vibrate } from '@/services/audio';
import {
  addPlayTime,
  getGameSettings,
  getBestHighScore,
  recordGameComplete,
  recordGameStart,
  setGameSettings,
} from '@/storage/StorageService';
import {
  evaluateGlobalAchievements,
  reportHighScoreBeaten,
} from '@/achievements/AchievementService';
import { track } from '@/services/analytics';
import { reportRoundForChallenge } from '@/services/dailyChallenge';
import { formatClock, formatNumber } from '@/utils/format';

interface Props {
  game: GameDefinition;
}

const DIFFICULTY_LABEL: Record<DifficultySetting, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

interface ResultState extends GameOverPayload {
  isRecord: boolean;
  previousBest: number | null;
  challengeCompleted: boolean;
}

/**
 * Hosts a single game: toolbar, pause/resume, fullscreen, session timing,
 * statistics recording and the result screen. Games only implement gameplay
 * and talk to the shell through `useGameShell()`.
 */
export function GameShell({ game }: Props) {
  return <GameSession key={game.id} game={game} />;
}

function GameSession({ game }: Props) {
  const navigate = useNavigate();
  const [prefs, setPrefs] = usePreferences();
  const shellRef = useRef<HTMLDivElement>(null);
  const expand = useExpandMode(shellRef);
  const isFullscreen = expand.expanded;
  const coarse = useIsCoarsePointer();
  const hidden = useDocumentHidden();
  const [showHelp, setShowHelp] = useState(false);
  const helpPausedRef = useRef(false);

  const [paused, setPausedState] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [difficulty, setDifficultyState] = useState<DifficultySetting>(prefs.difficulty);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [caps, setCaps] = useState({ pausable: true, restartable: true });
  const [instanceKey, setInstanceKey] = useState(0);
  const [pendingDifficulty, setPendingDifficulty] = useState<DifficultySetting | null>(null);

  const restartRef = useRef<(() => void) | null>(null);
  const roundStartRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const roundActiveRef = useRef(false);
  const roundVersionRef = useRef(0);
  const finishingRef = useRef(false);

  // Restore this game's saved difficulty, falling back to the global preference.
  useEffect(() => {
    let alive = true;
    void getGameSettings(game.id, { difficulty: prefs.difficulty }).then((s) => {
      if (alive && s.difficulty) setDifficultyState(s.difficulty);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  useEffect(() => {
    let alive = true;
    void getBestHighScore(game.id).then((v) => {
      if (alive) setPersonalBest(v);
    });
    return () => {
      alive = false;
    };
  }, [game.id, result]);

  // "Open games full screen": start expanded; browser fullscreen needs a tap, so
  // it is requested on the first touch or click inside the shell.
  useEffect(() => {
    if (!prefs.preferFullscreen) return;
    expand.enter({ native: false });
    const shell = shellRef.current;
    if (!shell) return;
    const onFirstPress = () => expand.upgrade();
    shell.addEventListener('pointerdown', onFirstPress, { once: true });
    return () => shell.removeEventListener('pointerdown', onFirstPress);
    // Only on arrival at the game page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  /* --------------------------------------------------------- session timing */

  const flushPlayTime = useCallback(() => {
    if (roundStartRef.current !== null) {
      accumulatedRef.current += Date.now() - roundStartRef.current;
      roundStartRef.current = null;
    }
    const total = accumulatedRef.current;
    accumulatedRef.current = 0;
    if (total > 0) void addPlayTime(game.id, total);
    return total;
  }, [game.id]);

  const pauseTimer = useCallback(() => {
    if (roundStartRef.current !== null) {
      accumulatedRef.current += Date.now() - roundStartRef.current;
      roundStartRef.current = null;
    }
  }, []);

  const resumeTimer = useCallback(() => {
    if (roundActiveRef.current && roundStartRef.current === null) {
      roundStartRef.current = Date.now();
    }
  }, []);

  // Tab hidden -> always pause. Never run a loop off-screen.
  useEffect(() => {
    if (hidden) {
      setPausedState(true);
      pauseTimer();
    } else if (!manualPause && !result && !pendingDifficulty && !finishingRef.current) {
      setPausedState(false);
      resumeTimer();
    }
  }, [hidden, manualPause, result, pendingDifficulty, pauseTimer, resumeTimer]);

  // Flush any unsaved play time when leaving the page.
  useEffect(() => {
    const onLeave = () => { flushPlayTime(); };
    window.addEventListener('pagehide', onLeave);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      roundVersionRef.current += 1;
      onLeave();
    };
  }, [flushPlayTime]);

  /* ------------------------------------------------------------------- api */

  const setPaused = useCallback(
    (next: boolean) => {
      setManualPause(next);
      setPausedState(next || hidden || finishingRef.current);
      if (next) pauseTimer();
      else if (!hidden && !finishingRef.current) resumeTimer();
    },
    [hidden, pauseTimer, resumeTimer],
  );

  const togglePause = useCallback(() => {
    setPaused(!manualPause);
    playSound('click');
  }, [manualPause, setPaused]);

  const registerRestart = useCallback((fn: () => void) => {
    restartRef.current = fn;
  }, []);

  const setCapabilities = useCallback(
    (next: { pausable?: boolean; restartable?: boolean }) =>
      setCaps((prev) => {
        const updated = { ...prev, ...next };
        return updated.pausable === prev.pausable && updated.restartable === prev.restartable
          ? prev
          : updated;
      }),
    [],
  );

  const requestRestart = useCallback(() => {
    flushPlayTime();
    roundActiveRef.current = false;
    roundVersionRef.current += 1;
    finishingRef.current = false;
    setResult(null);
    setManualPause(false);
    setPausedState(hidden);
    unlockAudio();
    if (restartRef.current) restartRef.current();
    else setInstanceKey((k) => k + 1);
  }, [flushPlayTime, hidden]);

  const startRound = useCallback(() => {
    if (roundActiveRef.current) return;
    unlockAudio();
    roundActiveRef.current = true;
    roundVersionRef.current += 1;
    finishingRef.current = false;
    setResult(null);
    setPausedState(manualPause || hidden);
    accumulatedRef.current = 0;
    roundStartRef.current = manualPause || hidden ? null : Date.now();
    void recordGameStart(game.id);
    track('game_start', { game_id: game.id, category: game.category, difficulty });
  }, [difficulty, game.category, game.id, hidden, manualPause]);

  const endRound = useCallback(
    (payload: GameOverPayload) => {
      if (!roundActiveRef.current) return;
      roundActiveRef.current = false;
      finishingRef.current = true;
      const version = roundVersionRef.current;
      const durationMs = flushPlayTime();
      setPausedState(true);
      track('game_complete', {
        game_id: game.id,
        difficulty,
        score: payload.score,
        result: payload.won ? 'won' : payload.lost ? 'lost' : payload.draw ? 'draw' : 'finished',
        seconds: Math.round(durationMs / 1000),
      });
      void (async () => {
        const outcome = await recordGameComplete(game.id, {
          score: payload.score,
          won: payload.won,
          lost: payload.lost,
          draw: payload.draw,
          durationMs,
          timeMs: payload.timeMs,
          difficulty,
          mode: payload.mode,
          scoreDirection: game.scoreDirection,
        });
        if (outcome.isRecord) void reportHighScoreBeaten();
        const challengeCompleted = await reportRoundForChallenge({
          gameId: game.id,
          score: payload.score,
          won: payload.won,
          completed: true,
        });
        await evaluateGlobalAchievements();
        if (version === roundVersionRef.current) {
          setResult({ ...payload, ...outcome, challengeCompleted });
        }
      })();
      playSound(payload.won ? 'levelComplete' : 'gameOver');
      vibrate(payload.won ? [40, 60, 40] : 120);
    },
    [difficulty, flushPlayTime, game.id, game.scoreDirection],
  );

  const clearResult = useCallback(() => {
    roundVersionRef.current += 1;
    finishingRef.current = false;
    setResult(null);
    setPausedState(manualPause || hidden);
  }, [hidden, manualPause]);

  const setDifficulty = useCallback(
    (d: DifficultySetting) => {
      setDifficultyState(d);
      void setGameSettings(game.id, { difficulty: d });
    },
    [game.id],
  );

  /** Switches difficulty and remounts the game so it starts fresh on the new setting. */
  const applyDifficulty = useCallback(
    (d: DifficultySetting) => {
      flushPlayTime();
      roundActiveRef.current = false;
      roundVersionRef.current += 1;
      finishingRef.current = false;
      setPendingDifficulty(null);
      setResult(null);
      setManualPause(false);
      setPausedState(hidden);
      setDifficulty(d);
      setInstanceKey((k) => k + 1);
    },
    [flushPlayTime, hidden, setDifficulty],
  );

  // A round in progress would be lost, so ask first; otherwise switch at once.
  const chooseDifficulty = useCallback(
    (d: DifficultySetting) => {
      if (d === difficulty) return;
      if (!roundActiveRef.current) {
        applyDifficulty(d);
        return;
      }
      setPendingDifficulty(d);
      setPausedState(true);
      pauseTimer();
    },
    [applyDifficulty, difficulty, pauseTimer],
  );

  const cancelDifficulty = useCallback(() => {
    setPendingDifficulty(null);
    const stayPaused = manualPause || hidden || finishingRef.current;
    setPausedState(stayPaused);
    if (!stayPaused) resumeTimer();
  }, [hidden, manualPause, resumeTimer]);

  const showDifficulty = (game.difficultyPicker ?? 'toolbar') === 'toolbar';

  const api: GameShellApi = useMemo(
    () => ({
      game,
      paused,
      setPaused,
      togglePause,
      soundEnabled: prefs.sound,
      difficulty,
      setDifficulty,
      isFullscreen,
      registerRestart,
      setCapabilities,
      requestRestart,
      startRound,
      endRound,
      clearResult,
      personalBest,
      play: playSound,
      vibrate,
    }),
    [
      game,
      paused,
      setPaused,
      togglePause,
      prefs.sound,
      difficulty,
      setDifficulty,
      isFullscreen,
      registerRestart,
      setCapabilities,
      requestRestart,
      startRound,
      endRound,
      clearResult,
      personalBest,
    ],
  );

  // P pause, R restart, F fullscreen — ignored while typing or using modifiers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === 'p' || e.key === 'P') {
        if (caps.pausable) togglePause();
      } else if (e.key === 'r' || e.key === 'R') {
        if (caps.restartable) requestRestart();
      } else if (e.key === 'f' || e.key === 'F') {
        expand.toggle();
      } else if (e.key === 'Escape' && expand.expanded && !expand.native) {
        // In browser fullscreen the browser handles Escape itself.
        if (showHelp) setShowHelp(false);
        else expand.exit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [caps.pausable, caps.restartable, requestRestart, expand, showHelp, togglePause]);

  // Keep the phone screen on while playing full screen.
  useWakeLock(isFullscreen && !paused);

  const openHelp = useCallback(() => {
    helpPausedRef.current = caps.pausable && !manualPause && !result;
    if (helpPausedRef.current) setPaused(true);
    setShowHelp(true);
  }, [caps.pausable, manualPause, result, setPaused]);

  const closeHelp = useCallback(() => {
    setShowHelp(false);
    if (helpPausedRef.current) setPaused(false);
    helpPausedRef.current = false;
  }, [setPaused]);

  // Help is part of the expanded layout only; close it when leaving.
  useEffect(() => {
    if (!isFullscreen && showHelp) closeHelp();
  }, [closeHelp, isFullscreen, showHelp]);

  const goBack = () => {
    // Replace the history entry expanded play added, so Back later returns here.
    const replace = expand.exit({ keepHistory: true });
    navigate('/games/', { replace });
  };

  const GameComponent = game.component;
  const { instructions, controls } = game;
  const controlGroups = (
    [
      ['Touch', controls.touch],
      ['Keyboard', controls.keyboard],
      ['Mouse', controls.mouse],
    ] as const
  )
    .filter(([, list]) => list && list.length)
    .sort(([a], [b]) => (coarse ? (a === 'Touch' ? -1 : b === 'Touch' ? 1 : 0) : 0));

  return (
    <div
      className={`game-shell${isFullscreen ? ' fullscreen expanded' : ''}${expand.native ? ' native-fullscreen' : ''}`}
      ref={shellRef}
    >
      <div className="game-toolbar">
        <button
          className="icon-btn"
          onClick={goBack}
          aria-label="Back to games"
          title="Back to games"
        >
          ←
        </button>
        {/* The game title is the page heading on /games/:id. */}
        <h1 className="title">{game.title}</h1>

        {showDifficulty && (
          <select
            className="select toolbar-select"
            value={pendingDifficulty ?? difficulty}
            onChange={(e) => chooseDifficulty(e.target.value as DifficultySetting)}
            aria-label="Difficulty"
            title="Difficulty"
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        )}

        {caps.restartable && (
          <button
            className="icon-btn"
            onClick={requestRestart}
            aria-label="Restart game"
            title="Restart (R)"
          >
            ↻
          </button>
        )}
        {caps.pausable && (
          <button
            className={`icon-btn${manualPause ? ' active' : ''}`}
            onClick={togglePause}
            aria-label={manualPause ? 'Resume game' : 'Pause game'}
            aria-pressed={manualPause}
            title="Pause (P)"
          >
            {manualPause ? '▶' : '⏸'}
          </button>
        )}
        <button
          className={`icon-btn${prefs.sound ? ' active' : ''}`}
          onClick={() => {
            setPrefs({ sound: !prefs.sound });
            if (!prefs.sound) {
              unlockAudio();
              playSound('select');
            }
          }}
          aria-label={prefs.sound ? 'Mute sound' : 'Unmute sound'}
          aria-pressed={prefs.sound}
          title="Sound"
        >
          {prefs.sound ? '🔊' : '🔇'}
        </button>
        <a
          className={`icon-btn${showHelp ? ' active' : ''}`}
          href="#instructions"
          aria-label="How to play"
          title="How to play"
          onClick={(e) => {
            e.preventDefault();
            if (isFullscreen) {
              if (showHelp) closeHelp();
              else openHelp();
              return;
            }
            document.getElementById('instructions')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          ❓
        </a>
        <button
          className={`icon-btn expand-btn${isFullscreen ? ' active' : ''}`}
          onClick={() => expand.toggle()}
          aria-label={isFullscreen ? 'Exit full screen' : 'Play full screen'}
          aria-pressed={isFullscreen}
          title={isFullscreen ? 'Exit full screen (F)' : 'Full screen (F)'}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path
              d={
                isFullscreen
                  ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'
                  : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'
              }
            />
          </svg>
        </button>
      </div>

      <div className="game-stage">
        <div className="game-stage-body">
          <FitToStage active={isFullscreen}>
            <GameShellContext.Provider value={api}>
              <ErrorBoundary
                resetKey={instanceKey}
                reportTitle={game.title}
                onRetry={() => setInstanceKey((k) => k + 1)}
                fallbackActions={
                  <Link className="btn" to="/games/">
                    Return to Games
                  </Link>
                }
              >
                <Suspense fallback={<Loader label={`Loading ${game.title}…`} />}>
                  {GameComponent ? (
                    <GameComponent key={instanceKey} gameId={game.id} />
                  ) : (
                    <div className="empty-state">
                      <div className="emoji">🚧</div>
                      <p>This game is planned but not implemented yet.</p>
                    </div>
                  )}
                </Suspense>
              </ErrorBoundary>
            </GameShellContext.Provider>
          </FitToStage>
        </div>

        {showHelp && (
          <div className="game-overlay" onClick={closeHelp}>
            <div
              className="overlay-card help-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-help-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="game-help-title">How to play</h3>
              {instructions.objective && <p className="small muted">{instructions.objective}</p>}
              {instructions.howToPlay.length > 0 && (
                <ol className="help-steps">
                  {instructions.howToPlay.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
              {controlGroups.map(([label, list]) => (
                <div className="help-controls" key={label}>
                  <div className="help-label">{label}</div>
                  <ul>
                    {list!.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
              {coarse && instructions.touchNotes?.length ? (
                <div className="help-controls">
                  <div className="help-label">On touch screens</div>
                  <ul>
                    {instructions.touchNotes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <button className="btn btn-primary btn-block" onClick={closeHelp}>
                Back to the game
              </button>
            </div>
          </div>
        )}

        {pendingDifficulty && (
          <div className="game-overlay">
            <div className="overlay-card" role="alertdialog" aria-labelledby="difficulty-confirm">
              <h3 id="difficulty-confirm">Switch to {DIFFICULTY_LABEL[pendingDifficulty]}?</h3>
              <p className="small muted">This ends the current game and starts a new one.</p>
              <button
                className="btn btn-primary btn-block"
                onClick={() => applyDifficulty(pendingDifficulty)}
              >
                Start new game
              </button>
              <button className="btn btn-block" onClick={cancelDifficulty}>
                Keep playing
              </button>
            </div>
          </div>
        )}

        {paused && !result && !pendingDifficulty && !showHelp && caps.pausable && (
          <div className="game-overlay">
            <div className="overlay-card">
              <h3>Paused</h3>
              <p className="small muted">
                {hidden ? 'Paused because the tab is in the background.' : 'Take your time.'}
              </p>
              <button className="btn btn-primary btn-block" onClick={() => setPaused(false)}>
                Resume
              </button>
              {caps.restartable && (
                <button className="btn btn-block" onClick={requestRestart}>
                  Restart
                </button>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="game-overlay">
            <div className="overlay-card">
              <h3>
                {result.title ?? (result.won ? 'Victory!' : result.draw ? 'Draw' : 'Game Over')}
              </h3>
              {result.message && <p className="small muted">{result.message}</p>}

              {result.isRecord && <div className="record-banner">🎉 New personal best!</div>}

              <div className="result-rows">
                {result.score !== undefined && (
                  <div className="result-row">
                    <span>{result.scoreLabel ?? 'Score'}</span>
                    <strong>{formatNumber(result.score)}</strong>
                  </div>
                )}
                {personalBest !== null && (
                  <div className="result-row">
                    <span>Personal best</span>
                    <strong>{formatNumber(personalBest)}</strong>
                  </div>
                )}
                {result.timeMs !== undefined && (
                  <div className="result-row">
                    <span>Time</span>
                    <strong>{formatClock(result.timeMs)}</strong>
                  </div>
                )}
                {result.details?.map((d) => (
                  <div className="result-row" key={d.label}>
                    <span>{d.label}</span>
                    <strong>{d.value}</strong>
                  </div>
                ))}
                {result.challengeCompleted && (
                  <div className="result-row" style={{ color: 'var(--success)' }}>
                    <span>Daily challenge</span>
                    <strong>Completed</strong>
                  </div>
                )}
              </div>

              {result.next && (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    const { action } = result.next!;
                    clearResult();
                    action();
                  }}
                >
                  {result.next.label}
                </button>
              )}
              <button
                className={`btn btn-block${result.next ? '' : ' btn-primary'}`}
                onClick={requestRestart}
              >
                Play Again
              </button>
              <Link className="btn btn-block" to="/games/">
                Return to Games
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
