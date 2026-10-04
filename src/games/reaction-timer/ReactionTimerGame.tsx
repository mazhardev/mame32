import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { reportProgress } from '@/achievements/AchievementService';
import { ReactionEngine, summarize, TRIAL_COUNT } from './engine';
import './reaction-timer.css';

export default function ReactionTimerGame() {
  const shell = useGameShell();
  const { registerRestart } = shell;
  const shellRef = useRef(shell);
  shellRef.current = shell;
  const engineRef = useRef(new ReactionEngine());
  const delayRef = useRef(0);
  const startedRef = useRef(false);
  const [state, setState] = useState(engineRef.current.state);

  const restart = useCallback(() => {
    engineRef.current = new ReactionEngine();
    startedRef.current = false;
    setState(engineRef.current.state);
  }, []);

  useEffect(() => {
    registerRestart(restart);
  }, [registerRestart, restart]);

  useEffect(() => {
    if (shell.paused) {
      engineRef.current.cancelTrial();
      setState(engineRef.current.state);
    }
  }, [shell.paused]);

  useEffect(() => {
    if (state.phase !== 'waiting' || shell.paused) return;
    const engine = engineRef.current;
    const timer = window.setTimeout(() => {
      if (
        engineRef.current !== engine ||
        shellRef.current.paused ||
        document.visibilityState === 'hidden'
      )
        return;
      engine.signal(performance.now());
      setState(engine.state);
    }, delayRef.current);
    return () => window.clearTimeout(timer);
  }, [state.phase, shell.paused]);

  const activate = () => {
    if (shell.paused || document.visibilityState === 'hidden') return;
    const engine = engineRef.current;
    if (engine.state.phase === 'idle' || engine.state.phase === 'between') {
      if (!startedRef.current) {
        startedRef.current = true;
        shell.startRound();
      }
      delayRef.current = engine.begin() ?? 0;
      setState(engine.state);
      return;
    }
    const outcome = engine.tap(performance.now());
    if (outcome === 'ignored') return;
    setState(engine.state);
    shell.play(outcome === 'early' ? 'failure' : 'click');
    if (engine.state.phase !== 'finished') return;
    const summary = summarize(engine.state.times, engine.state.falseStarts)!;
    void reportProgress('reaction.first-round', 1);
    if (engine.state.falseStarts === 0) {
      void reportProgress('reaction.clean-round', 1);
      if (summary.average <= 300) void reportProgress('reaction.under-300', 1);
    }
    shell.endRound({
      title: 'Five trials complete!',
      score: summary.score,
      won: true,
      mode: 'five-trials',
      details: [
        { label: 'Average reaction', value: `${summary.average} ms` },
        { label: 'Fastest reaction', value: `${summary.fastest} ms` },
        { label: 'False starts', value: String(engine.state.falseStarts) },
      ],
    });
  };

  const summary = summarize(state.times, state.falseStarts);
  const label =
    state.phase === 'idle'
      ? 'START'
      : state.phase === 'waiting'
        ? 'WAIT'
        : state.phase === 'ready'
          ? 'GO!'
          : state.phase === 'finished'
            ? 'COMPLETE'
            : 'NEXT TRIAL';

  return (
    <div className="reaction-game">
      <GameHud
        items={[
          { label: 'Trials', value: `${state.times.length} / ${TRIAL_COUNT}` },
          { label: 'Average', value: summary ? `${summary.average} ms` : '—' },
          { label: 'False starts', value: state.falseStarts },
        ]}
      />
      <button
        className={`reaction-pad reaction-pad--${state.phase}`}
        aria-label={`Reaction pad: ${label}`}
        disabled={shell.paused || state.phase === 'finished'}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          activate();
        }}
        onKeyDown={(event) => {
          if (event.key !== ' ' && event.key !== 'Enter') return;
          event.preventDefault();
          if (!event.repeat) activate();
        }}
        onClick={(event) => {
          if (event.detail === 0) activate();
        }}
      >
        <span className="reaction-pad__symbol" aria-hidden="true">
          {state.phase === 'ready' ? '⚡' : '◷'}
        </span>
        <strong>{label}</strong>
        <span>
          {state.phase === 'waiting' ? 'Hold steady. Watch for GO.' : 'Tap, click, Space or Enter'}
        </span>
      </button>
      <p className="reaction-message" role="status" aria-live="polite">
        {state.message}
      </p>
      <ol className="reaction-trials" aria-label="Reaction times">
        {Array.from({ length: TRIAL_COUNT }, (_, i) => (
          <li key={i}>
            <span>Trial {i + 1}</span>
            <strong>{state.times[i] !== undefined ? `${state.times[i]} ms` : '—'}</strong>
          </li>
        ))}
      </ol>
      <p className="small muted">Five reactions. One average. False starts cost 100 points each.</p>
    </div>
  );
}
