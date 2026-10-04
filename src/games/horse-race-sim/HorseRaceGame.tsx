'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { DISTANCE, RACES, START_POINTS, TUNING, makeRace, payout, simulate } from './engine';
import type { BetKind, Race, RaceRun } from './engine';
import './horse.css';

/** Frames of the simulation shown per second of animation. */
const PLAYBACK = 95;

function Horse({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 46 30" className="hr-horse-svg" aria-hidden="true" width="46" height="30">
      <ellipse cx="20" cy="16" rx="13" ry="6.5" fill="#7c4a21" />
      <path d="M30 13 L38 5 L43 8 L37 15 Z" fill="#7c4a21" />
      <path d="M8 14 Q2 12 3 20" stroke="#3b2412" strokeWidth="2.5" fill="none" />
      <path
        d="M11 20 L9 29 M16 21 L17 29 M25 21 L23 29 M29 20 L31 29"
        stroke="#5b3416"
        strokeWidth="2.4"
      />
      <rect x="15" y="4" width="9" height="8" rx="2" fill={color} />
      <circle cx="20" cy="3.5" r="3" fill={color} stroke="#fff" strokeWidth="0.8" />
    </svg>
  );
}

/** Track position in %, with the gaps between runners exaggerated so the race is easy to follow. */
function laneX(positions: number[], i: number) {
  const mean = positions.reduce((a, p) => a + p, 0) / positions.length;
  const p = Math.max(0, Math.min(1, (positions[i] + (positions[i] - mean) * 2.5) / DISTANCE));
  return 8 + p * 88;
}

interface Settled {
  order: number[];
  returned: number;
  stake: number;
  pick: number;
}

export default function HorseRaceGame() {
  const shell = useGameShell();
  const tuning = TUNING[shell.difficulty];
  const [raceNo, setRaceNo] = useState(1);
  const [race, setRace] = useState<Race>(() => makeRace(tuning, Math.random));
  const [points, setPoints] = useState(START_POINTS);
  const [pick, setPick] = useState(0);
  const [kind, setKind] = useState<BetKind>('win');
  const [stake, setStake] = useState(10);
  const [running, setRunning] = useState(false);
  const [positions, setPositions] = useState<number[]>(() => new Array(6).fill(0));
  const [settled, setSettled] = useState<Settled | null>(null);
  const stats = useRef({ wins: 0, streak: 0, bestStreak: 0, longshot: false, started: false });
  const run = useRef<RaceRun | null>(null);
  const frame = useRef(0);
  const raf = useRef(0);
  const last = useRef(0);
  const pausedRef = useRef(shell.paused);
  pausedRef.current = shell.paused;

  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setRaceNo(1);
    setRace(makeRace(TUNING[shell.difficulty], Math.random));
    setPoints(START_POINTS);
    setPick(0);
    setKind('win');
    setStake(10);
    setRunning(false);
    setPositions(new Array(6).fill(0));
    setSettled(null);
    stats.current = { wins: 0, streak: 0, bestStreak: 0, longshot: false, started: false };
  }, [shell.difficulty]);
  useEffect(() => shell.registerRestart(reset), [shell, reset]);
  useEffect(() => reset(), [reset]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const finishMeeting = useCallback(
    (final: number) => {
      const st = stats.current;
      if (st.wins > 0) void reportProgress('horse-race-sim.winner', 1);
      if (st.longshot) void reportProgress('horse-race-sim.longshot', 1);
      void reportProgress('horse-race-sim.streak', st.bestStreak);
      void reportProgress('horse-race-sim.double', final >= START_POINTS * 2 ? 1 : 0);
      void incrementProgress('horse-race-sim.meetings', 1);
      if (shell.difficulty === 'hard' && final >= 150)
        void reportProgress('horse-race-sim.hard', 1);
      shell.endRound({
        score: final,
        won: final > START_POINTS,
        lost: final < START_POINTS,
        title:
          final > START_POINTS
            ? `You finished the meeting up: ${final} points`
            : final > 0
              ? `You finished with ${final} points`
              : 'Out of points',
        details: [
          { label: 'Races', value: String(Math.min(RACES, raceNo)) },
          { label: 'Winning bets', value: String(st.wins) },
          { label: 'Final points', value: `${final} (started with ${START_POINTS})` },
        ],
      });
    },
    [raceNo, shell],
  );

  const settle = useCallback(() => {
    const r = run.current;
    if (!r) return;
    const finish = r.order.indexOf(pick) + 1;
    const odds = race.runners[pick].odds;
    const returned = stake > 0 ? payout(kind, odds, stake, finish) : 0;
    const next = points - stake + returned;
    const st = stats.current;
    if (stake > 0 && returned > 0) {
      st.wins += 1;
      st.streak += 1;
      st.bestStreak = Math.max(st.bestStreak, st.streak);
      if (kind === 'win' && odds >= 8) st.longshot = true;
      shell.play('success');
    } else if (stake > 0) {
      st.streak = 0;
      shell.play('failure');
    }
    setPoints(next);
    setSettled({ order: r.order, returned, stake, pick });
    setRunning(false);
    if (raceNo >= RACES || next < 5) finishMeeting(next);
  }, [finishMeeting, kind, pick, points, race, raceNo, shell, stake]);

  const tick = useCallback(
    (now: number) => {
      const r = run.current;
      if (!r) return;
      const dt = last.current ? Math.min(0.1, (now - last.current) / 1000) : 0;
      last.current = now;
      if (!pausedRef.current && !document.hidden) frame.current += dt * PLAYBACK;
      const i = Math.min(r.frames.length - 1, Math.floor(frame.current));
      setPositions(r.frames[i]);
      if (i >= r.frames.length - 1) {
        settle();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    },
    [settle],
  );

  const start = useCallback(() => {
    if (running || settled || shell.paused) return;
    if (!stats.current.started) {
      stats.current.started = true;
      shell.startRound();
    }
    run.current = simulate(race, tuning, Math.random, true);
    frame.current = 0;
    last.current = 0;
    setRunning(true);
    shell.play('whoosh');
    raf.current = requestAnimationFrame(tick);
  }, [race, running, settled, shell, tick, tuning]);

  const nextRace = useCallback(() => {
    if (!settled || raceNo >= RACES || points < 5) return;
    setRaceNo((n) => n + 1);
    setRace(makeRace(tuning, Math.random));
    setSettled(null);
    setPositions(new Array(6).fill(0));
    setStake((s) => Math.min(s, points));
    setPick(0);
  }, [points, raceNo, settled, tuning]);

  const changeStake = useCallback(
    (d: number) => setStake((s) => Math.max(0, Math.min(points, s + d))),
    [points],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      if (e.key >= '1' && e.key <= '6' && !running && !settled) setPick(Number(e.key) - 1);
      else if (e.key.toLowerCase() === 'w' && !running) setKind('win');
      else if (e.key.toLowerCase() === 'p' && !running) setKind('place');
      else if (e.key === 'ArrowLeft' || e.key === '-') changeStake(-5);
      else if (e.key === 'ArrowRight' || e.key === '+') changeStake(5);
      else if (e.key === 'Enter') (settled ? nextRace : start)();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeStake, nextRace, running, settled, start]);

  const place = useMemo(() => (settled ? settled.order.indexOf(settled.pick) + 1 : 0), [settled]);
  const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

  return (
    <div className="hr">
      <GameHud
        items={[
          { label: 'Points', value: points },
          { label: 'Race', value: `${raceNo}/${RACES}` },
          { label: 'Stake', value: stake },
        ]}
      />
      <p className="hr-note">
        A racing simulation with virtual points only — there is no real money and nothing to buy.
      </p>
      <div className="hr-track" aria-label="Race track">
        <div className="hr-finish" />
        {race.runners.map((r, i) => (
          <div className="hr-lane" key={r.name}>
            <div
              className="hr-horse"
              style={{ left: `${laneX(positions, i)}%` }}
              title={r.name}
            >
              <Horse color={r.silk} />
            </div>
          </div>
        ))}
      </div>
      <div className="hr-card" role="radiogroup" aria-label="Choose a horse">
        {race.runners.map((r, i) => (
          <button
            key={r.name}
            type="button"
            className="hr-runner"
            role="radio"
            aria-checked={pick === i}
            disabled={running || !!settled}
            onClick={() => setPick(i)}
          >
            <span className="hr-silk" style={{ background: r.silk }}>
              {i + 1}
            </span>
            <span>
              <strong>{r.name}</strong>
              {settled && <span className="muted"> — {ord(settled.order.indexOf(i) + 1)}</span>}
            </span>
            <span className="hr-form" title="Last three finishes">
              form {r.form.join('-')}
            </span>
            <span className="hr-odds">{r.odds.toFixed(1)}×</span>
          </button>
        ))}
      </div>
      <div className="hr-controls">
        <div role="group" aria-label="Bet type" className="hr-controls">
          <button
            type="button"
            className={`btn btn-sm ${kind === 'win' ? 'btn-primary' : ''}`}
            disabled={running || !!settled}
            onClick={() => setKind('win')}
          >
            Win
          </button>
          <button
            type="button"
            className={`btn btn-sm ${kind === 'place' ? 'btn-primary' : ''}`}
            disabled={running || !!settled}
            onClick={() => setKind('place')}
          >
            Place (top 3)
          </button>
        </div>
        <div className="hr-controls" aria-label="Stake">
          <button
            type="button"
            className="btn btn-sm"
            disabled={running || !!settled}
            onClick={() => changeStake(-5)}
            aria-label="Lower stake"
          >
            −5
          </button>
          <span className="hr-stake">{stake} pts</span>
          <button
            type="button"
            className="btn btn-sm"
            disabled={running || !!settled}
            onClick={() => changeStake(5)}
            aria-label="Raise stake"
          >
            +5
          </button>
        </div>
        {settled ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={nextRace}
            disabled={raceNo >= RACES || points < 5}
          >
            Next race
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={start} disabled={running}>
            {running
              ? 'They’re off!'
              : stake > 0
                ? `Back ${race.runners[pick].name}`
                : 'Watch the race'}
          </button>
        )}
      </div>
      <div className="cz-status" aria-live="polite" style={{ textAlign: 'center' }}>
        {settled
          ? settled.stake === 0
            ? `${race.runners[settled.order[0]].name} wins.`
            : settled.returned > 0
              ? `${race.runners[settled.pick].name} finished ${ord(place)} — you collect ${settled.returned} points!`
              : `${race.runners[settled.pick].name} finished ${ord(place)}. Better luck next race.`
          : running
            ? 'And they’re racing…'
            : `Pick a horse (1–6), choose Win or Place, set your stake and press Enter.`}
      </div>
    </div>
  );
}
