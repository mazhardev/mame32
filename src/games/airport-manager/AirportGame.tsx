import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { useIdleLoop } from '../_shared/idle/useIdleLoop';
import {
  DAYS,
  DAY_LENGTH,
  GRACE,
  RUNWAY_TIME,
  SIZE,
  TUNING,
  UPGRADES,
  autoGate,
  autoRunway,
  buy,
  byId,
  dayOver,
  fits,
  newAirport,
  serviceTime,
  setupDay,
  tick,
  assignGate,
  assignRunway,
  validAirport,
} from './engine';
import type { Airport, Plane } from './engine';
import './airport.css';

type Phase = 'shift' | 'briefing';
const RUNWAY_KEYS = ['r', 't'];

function PlaneTag({ p, selected, onClick }: { p: Plane; selected: boolean; onClick: () => void }) {
  const fuelPct = p.stage === 'holding' ? Math.max(0, p.fuel / TUNING.easy.fuel) : 0;
  const late = p.waited > GRACE;
  return (
    <button
      type="button"
      className={`ap-plane${selected ? ' on' : ''}${late ? ' late' : ''}${p.stage === 'holding' && p.fuel < 10 ? ' low' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${SIZE[p.size].label} ${p.code}, ${
        p.stage === 'holding'
          ? `holding, ${Math.ceil(p.fuel)} seconds of fuel`
          : p.stage === 'taxi'
            ? 'waiting for a gate'
            : 'ready to take off'
      }`}
    >
      <span className="ap-plane-icon">{SIZE[p.size].icon}</span>
      <span className="ap-code">{p.code}</span>
      {p.stage === 'holding' ? (
        <span className="ap-bar" aria-hidden="true">
          <span
            style={{
              width: `${Math.min(100, fuelPct * 100)}%`,
              background: p.fuel < 10 ? '#ef4444' : p.fuel < 20 ? '#f59e0b' : '#22c55e',
            }}
          />
        </span>
      ) : (
        <span className="small">{late ? `late ${Math.round(p.waited - GRACE)}s` : 'on time'}</span>
      )}
    </button>
  );
}

export default function AirportGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const t = TUNING[d];
  const ap = useRef<Airport>(newAirport(Math.floor(Math.random() * 2 ** 31)));
  const [phase, setPhase] = useState<Phase>('briefing');
  const [selected, setSelected] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('airport-manager', validAirport);
  const [pending, setPending] = useState<Airport | null>(null);

  useEffect(() => {
    if (save.saved) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    ap.current = newAirport(Math.floor(Math.random() * 2 ** 31));
    setPhase('briefing');
    setSelected(null);
    setStarted(false);
    setDone(false);
    setPending(null);
    save.clear();
  }, [save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const finish = useCallback(
    (won: boolean) => {
      const a = ap.current;
      setDone(true);
      save.clear();
      if (won) void reportProgress('airport-manager.win', 1);
      if (won && d === 'hard') void reportProgress('airport-manager.hard', 1);
      shell.endRound({
        won,
        lost: !won,
        score: Math.max(0, a.total),
        title: won ? 'Five smooth days at the airport!' : `The airport closes after day ${a.day}`,
        details: [
          { label: 'Flights handled', value: String(a.flights) },
          { label: 'Total earnings', value: `${a.total} coins` },
        ],
      });
    },
    [d, save, shell],
  );

  useIdleLoop(
    (dt) => {
      const a = ap.current;
      const ev = tick(a, dt, d);
      if (ev.includes('diverted')) shell.play('failure');
      else if (ev.includes('departed')) shell.play('coin');
      else if (ev.includes('serviced')) shell.play('blip');
      else if (ev.includes('arrive')) shell.play('pop');
      if (selected !== null && !byId(a, selected)) setSelected(null);
      if (dayOver(a)) {
        const goal = t.goals[a.day - 1];
        void incrementProgress('airport-manager.flights', a.flightsToday);
        if (a.flightsToday > 0) void reportProgress('airport-manager.first', 1);
        if (a.divertedToday === 0 && a.earnedToday >= goal)
          void reportProgress('airport-manager.safe', 1);
        void reportProgress('airport-manager.busy', a.flightsToday);
        if (a.earnedToday < goal) return finish(false);
        if (a.day >= DAYS) return finish(true);
        a.day += 1;
        save.persist(JSON.parse(JSON.stringify(a)) as Airport, {
          level: a.day,
          percent: Math.round(((a.day - 1) / DAYS) * 100),
          label: `Day ${a.day} of ${DAYS} · ${a.total} coins`,
        });
        setPhase('briefing');
        setSelected(null);
        shell.play('levelComplete');
      }
    },
    phase === 'shift' && !shell.paused && !done,
  );

  const startShift = () => {
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    setupDay(ap.current);
    ap.current.log = `Day ${ap.current.day}: the tower is open.`;
    setPhase('shift');
    shell.play('select');
  };

  const runway = useCallback(
    (r: number) => {
      const a = ap.current;
      if (phase !== 'shift' || shell.paused || a.runways[r] !== null) return;
      const p = selected !== null ? byId(a, selected) : null;
      const ok =
        p && (p.stage === 'holding' || p.stage === 'ready')
          ? assignRunway(a, p.id, r)
          : autoRunway(a, r);
      shell.play(ok ? 'click' : 'failure');
      if (ok) setSelected(null);
      refresh();
    },
    [phase, selected, shell],
  );

  const gate = useCallback(
    (g: number) => {
      const a = ap.current;
      if (phase !== 'shift' || shell.paused) return;
      const occupant = a.gates[g].plane !== null ? byId(a, a.gates[g].plane!) : null;
      if (occupant) {
        if (occupant.stage === 'ready') setSelected(occupant.id === selected ? null : occupant.id);
        return;
      }
      const p = selected !== null ? byId(a, selected) : null;
      const ok = p && p.stage === 'taxi' ? assignGate(a, p.id, g) : autoGate(a, g);
      shell.play(ok ? 'click' : 'failure');
      if (ok) setSelected(null);
      refresh();
    },
    [phase, selected, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (RUNWAY_KEYS.includes(k)) runway(RUNWAY_KEYS.indexOf(k));
      else if (/^[1-5]$/.test(k)) gate(Number(k) - 1);
      else if (k === 'escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gate, runway]);

  const a = ap.current;
  const sel = selected !== null ? byId(a, selected) : null;
  const holding = a.planes.filter((p) => p.stage === 'holding').sort((x, y) => x.fuel - y.fuel);
  const taxi = a.planes.filter((p) => p.stage === 'taxi');
  const goal = t.goals[a.day - 1];
  const pick = (p: Plane) => setSelected(selected === p.id ? null : p.id);

  return (
    <div className="ap">
      <GameHud
        items={[
          { label: 'Day', value: `${a.day}/${DAYS}` },
          {
            label: 'Time',
            value:
              phase === 'shift'
                ? a.closing
                  ? 'Closing'
                  : `${Math.ceil(DAY_LENGTH - a.time)}s`
                : '–',
          },
          { label: 'Today', value: `${a.earnedToday}/${goal}` },
          { label: 'Cash', value: a.cash },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Day ${pending.day} of ${DAYS} · ${pending.total} coins`}
          onContinue={() => {
            ap.current = pending;
            setPending(null);
            save.dismiss();
            refresh();
          }}
          onNew={restart}
        />
      )}
      {phase === 'briefing' ? (
        <div className="ap-brief card">
          <h3 style={{ margin: 0 }}>
            {a.day === 1 && a.total === 0
              ? 'Welcome to the control tower'
              : `Day ${a.day - 1} complete`}
          </h3>
          {a.day === 1 && a.total === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Clear circling planes to land, send them to a gate, then clear them for take-off. Tap
              a plane and then a runway or gate — or just tap a free runway or gate to handle the
              most urgent plane.
            </p>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Earned {a.earnedToday} · {a.flightsToday} flights · {a.divertedToday} diverted
            </p>
          )}
          <p style={{ margin: 0 }}>
            <strong>Day {a.day}</strong> target: {goal} coins
          </p>
          <div className="ap-upgrades">
            {UPGRADES.map((u) => {
              const owned = a.upgrades.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`ap-upgrade${owned ? ' owned' : ''}`}
                  disabled={owned || a.cash < u.cost || done}
                  onClick={() => {
                    if (buy(a, u.id)) {
                      shell.play('coin');
                      void reportProgress('airport-manager.upgrades', a.upgrades.length);
                      refresh();
                    }
                  }}
                >
                  <span className="ap-upgrade-icon">{u.icon}</span>
                  <strong>{u.name}</strong>
                  <span className="small muted">{u.desc}</span>
                  <span className="small">{owned ? 'Built' : `${u.cost} coins`}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={startShift}
            disabled={done || !!pending}
          >
            Open the tower for day {a.day}
          </button>
        </div>
      ) : (
        <>
          <div className="ap-log small muted" aria-live="polite">
            {sel
              ? `${sel.code} selected — tap a ${sel.stage === 'taxi' ? 'free gate' : 'free runway'}`
              : a.log}
          </div>
          <section className="ap-sky" aria-label="Planes circling">
            <span className="ap-label">☁️ Holding ({holding.length})</span>
            <div className="ap-row">
              {holding.length === 0 && <span className="muted small">Clear skies</span>}
              {holding.map((p) => (
                <PlaneTag key={p.id} p={p} selected={selected === p.id} onClick={() => pick(p)} />
              ))}
            </div>
          </section>
          <section className="ap-runways" aria-label="Runways">
            {a.runways.map((id, r) => {
              const p = id !== null ? byId(a, id) : null;
              const canUse = !p && (!sel || sel.stage === 'holding' || sel.stage === 'ready');
              return (
                <button
                  key={r}
                  type="button"
                  className={`ap-runway${canUse && sel ? ' target' : ''}`}
                  onClick={() => runway(r)}
                  aria-label={`Runway ${r + 1}${p ? `: ${p.code} ${p.stage === 'landing' ? 'landing' : 'taking off'}` : ': free'}`}
                >
                  <span className="ap-key">{RUNWAY_KEYS[r].toUpperCase()}</span>
                  <span className="ap-strip" aria-hidden="true">
                    {p && (
                      <span
                        className="ap-mover"
                        style={{
                          left: `${(1 - p.t / RUNWAY_TIME) * 85}%`,
                          transform: p.stage === 'takeoff' ? 'rotate(-20deg)' : undefined,
                        }}
                      >
                        {SIZE[p.size].icon}
                      </span>
                    )}
                  </span>
                  <span className="small">
                    {p
                      ? `${p.code} ${p.stage === 'landing' ? 'landing' : 'departing'}`
                      : `Runway ${r + 1} free`}
                  </span>
                </button>
              );
            })}
          </section>
          <section className="ap-apron" aria-label="Waiting for a gate">
            <span className="ap-label">🚖 Taxiing ({taxi.length})</span>
            <div className="ap-row">
              {taxi.length === 0 && <span className="muted small">Nobody waiting</span>}
              {taxi.map((p) => (
                <PlaneTag key={p.id} p={p} selected={selected === p.id} onClick={() => pick(p)} />
              ))}
            </div>
          </section>
          <section className="ap-gates" aria-label="Gates">
            {a.gates.map((g, i) => {
              const p = g.plane !== null ? byId(a, g.plane) : null;
              const target = !p && sel?.stage === 'taxi' && fits(g, sel);
              return (
                <button
                  key={i}
                  type="button"
                  className={`ap-gate${g.large ? ' big' : ''}${target ? ' target' : ''}${p?.stage === 'ready' ? ' ready' : ''}${p && selected === p.id ? ' on' : ''}`}
                  onClick={() => gate(i)}
                  aria-label={`Gate ${i + 1}${g.large ? ' (jumbo)' : ''}: ${
                    p
                      ? `${p.code} ${p.stage === 'ready' ? 'ready to depart' : 'turning around'}`
                      : 'empty'
                  }`}
                >
                  <span className="ap-key">{i + 1}</span>
                  <span className="small muted">{g.large ? 'JUMBO' : 'Gate'}</span>
                  <span className="ap-plane-icon">{p ? SIZE[p.size].icon : '🅿️'}</span>
                  {p ? (
                    <>
                      <span className="ap-code">{p.code}</span>
                      <span className="ap-bar" aria-hidden="true">
                        <span
                          style={{
                            width: `${p.stage === 'ready' ? 100 : (1 - p.t / serviceTime(a, p)) * 100}%`,
                            background: p.stage === 'ready' ? '#22c55e' : '#3b82f6',
                          }}
                        />
                      </span>
                      <span className="small">{p.stage === 'ready' ? 'Ready ✈' : 'Boarding…'}</span>
                    </>
                  ) : (
                    <span className="small muted">free</span>
                  )}
                </button>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
