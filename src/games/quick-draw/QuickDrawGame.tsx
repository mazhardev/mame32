'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { ModePicker } from '../_shared/board/BoardUI';
import type { PlayMode } from '../_shared/board/BoardUI';
import { WIN_ROUNDS, computerReaction, resolve, signalDelay } from './engine';
import type { Round, Side } from './engine';
import '../_shared/casual/casual.css';
import './quick-draw.css';

type Phase = 'idle' | 'steady' | 'draw' | 'result' | 'done';

export default function QuickDrawGame() {
  const shell = useGameShell();
  const [mode, setMode] = useState<PlayMode>('ai');
  const [phase, setPhase] = useState<Phase>('idle');
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const [last, setLast] = useState<Round | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const signalAt = useRef(0);
  const timers = useRef<number[]>([]);
  const fired = useRef<{ 1: number | null; 2: number | null }>({ 1: null, 2: null });
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const winsRef = useRef(wins);
  winsRef.current = wins;

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const restart = useCallback(() => {
    clear();
    setPhase('idle');
    setWins([0, 0]);
    setLast(null);
    setBest(null);
    setStarted(false);
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  useEffect(() => restart(), [restart, mode]);
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (shell.paused && (phase === 'steady' || phase === 'draw')) {
      clear();
      setPhase('idle');
    }
  }, [shell.paused, phase]);

  const name = (side: Side) => (mode === 'ai' ? (side === 1 ? 'You' : 'Computer') : `Player ${side}`);

  const finishRound = useCallback(
    (r: Round) => {
      clear();
      setLast(r);
      const w: [number, number] = [...winsRef.current];
      w[r.winner - 1] += 1;
      setWins(w);
      if (r.winner === 1 && r.ms !== null) setBest((b) => (b === null ? r.ms : Math.min(b, r.ms as number)));
      shell.play(r.winner === 1 || mode === 'local' ? 'shoot' : 'failure');
      if (w[0] >= WIN_ROUNDS || w[1] >= WIN_ROUNDS) {
        setPhase('done');
        const youWon = w[0] >= WIN_ROUNDS;
        if (mode === 'ai' && youWon) {
          void reportProgress('quick-draw.win', 1);
          if (w[1] === 0) void reportProgress('quick-draw.flawless', 1);
          if (shell.difficulty === 'hard') void reportProgress('quick-draw.hard', 1);
          void incrementProgress('quick-draw.duels', 1);
        }
        shell.endRound({
          won: mode === 'ai' ? youWon : undefined,
          lost: mode === 'ai' ? !youWon : undefined,
          score: mode === 'ai' && youWon ? 100 + (WIN_ROUNDS - w[1]) * 50 + (best !== null ? Math.max(0, 400 - best) : 0) : 0,
          title: `${name(youWon ? 1 : 2)} ${mode === 'ai' && youWon ? 'win' : 'wins'} the duel!`,
          details: [
            { label: 'Rounds', value: `${w[0]} – ${w[1]}` },
            { label: 'Fastest draw', value: best !== null ? `${best} ms` : r.winner === 1 && r.ms !== null ? `${r.ms} ms` : '–' },
          ],
        });
      } else setPhase('result');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [best, mode, shell],
  );

  const startRound = () => {
    if (shell.paused || phase === 'steady' || phase === 'draw' || phase === 'done') return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    clear();
    fired.current = { 1: null, 2: null };
    setLast(null);
    setPhase('steady');
    const delay = signalDelay(Math.random);
    timers.current.push(
      window.setTimeout(() => {
        setPhase('draw');
        signalAt.current = performance.now();
        shell.play('blip');
        if (mode === 'ai') {
          const round = winsRef.current[0] + winsRef.current[1];
          timers.current.push(window.setTimeout(() => fire(2), computerReaction(shell.difficulty, round, Math.random)));
        }
      }, delay),
    );
  };

  const fire = (side: Side) => {
    const ph = phaseRef.current;
    if (ph !== 'steady' && ph !== 'draw') return;
    if (fired.current[side] !== null) return;
    const t = ph === 'steady' ? -1 : Math.round(performance.now() - signalAt.current);
    fired.current[side] = t;
    // A foul ends the round at once; otherwise the first shot wins.
    finishRound(resolve(side === 1 ? t : null, side === 2 ? t : null));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (phaseRef.current === 'idle' || phaseRef.current === 'result') {
        if (k === 'enter' || k === ' ') {
          e.preventDefault();
          startRound();
        }
        return;
      }
      if (k === 'a' || (mode === 'ai' && (k === ' ' || k === 'enter'))) {
        e.preventDefault();
        fire(1);
      } else if (mode === 'local' && k === 'l') {
        e.preventDefault();
        fire(2);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const banner = phase === 'steady' ? 'Steady…' : phase === 'draw' ? 'DRAW!' : phase === 'done' ? 'Duel over' : last ? (last.reason === 'foul' ? `${name(last.winner === 1 ? 2 : 1)} drew too early!` : `${name(last.winner)} ${mode === 'ai' && last.winner === 1 ? 'were' : 'was'} faster — ${last.ms} ms`) : 'Press Ready';

  return (
    <div className="cz">
      <GameHud
        items={[
          { label: name(1), value: wins[0] },
          { label: name(2), value: wins[1] },
          { label: 'First to', value: WIN_ROUNDS },
        ]}
      />
      <ModePicker mode={mode} onChange={setMode} disabled={started && phase !== 'done'} />
      <div className={`qd-stage ${phase}`}>
        <button type="button" className="qd-side left" onPointerDown={(e) => { e.preventDefault(); if (phase === 'steady' || phase === 'draw') fire(1); }} aria-label={`${name(1)}: fire`}>
          <span className="qd-cowboy" aria-hidden="true">🤠</span>
          <span className="small">{mode === 'local' ? 'Player 1 · A' : 'You · Space'}</span>
        </button>
        <div className="qd-banner" aria-live="assertive">
          {banner}
        </div>
        <button type="button" className="qd-side right" onPointerDown={(e) => { e.preventDefault(); if (mode === 'local' && (phase === 'steady' || phase === 'draw')) fire(2); }} aria-label={`${name(2)}${mode === 'local' ? ': fire' : ''}`} disabled={mode === 'ai'}>
          <span className="qd-cowboy" aria-hidden="true">{mode === 'ai' ? '🤖' : '🤠'}</span>
          <span className="small">{mode === 'local' ? 'Player 2 · L' : 'Computer'}</span>
        </button>
      </div>
      {(phase === 'idle' || phase === 'result') && (
        <button type="button" className="btn btn-primary btn-lg" onClick={startRound} disabled={shell.paused}>
          {phase === 'idle' ? 'Ready' : 'Next round'}
        </button>
      )}
    </div>
  );
}
