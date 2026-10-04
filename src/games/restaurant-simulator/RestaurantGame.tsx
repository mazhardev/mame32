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
  DISH,
  HANDS,
  TUNING,
  UPGRADES,
  buy,
  cookTime,
  dayOver,
  menu,
  missing,
  newKitchen,
  ready,
  serve,
  setupDay,
  tapStation,
  tick,
  trash,
  validKitchen,
} from './engine';
import type { Kitchen } from './engine';
import './restaurant.css';

const TABLE_KEYS = ['a', 's', 'd', 'f', 'g'];
type Phase = 'service' | 'summary';

export default function RestaurantGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const t = TUNING[d];
  const k = useRef<Kitchen>(newKitchen(d));
  const [phase, setPhase] = useState<Phase>('summary');
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('restaurant-simulator', validKitchen);
  const [pending, setPending] = useState<Kitchen | null>(null);
  const perfectDays = useRef(0);

  useEffect(() => {
    if (save.saved) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    k.current = newKitchen(d);
    setPhase('summary');
    setStarted(false);
    setDone(false);
    setPending(null);
    perfectDays.current = 0;
    save.clear();
  }, [d, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const openDay = () => {
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    setupDay(k.current, d);
    k.current.log = `Day ${k.current.day}: doors open!`;
    setPhase('service');
    shell.play('select');
  };

  const finish = useCallback(
    (won: boolean) => {
      const kit = k.current;
      setDone(true);
      save.clear();
      if (won) void reportProgress('restaurant-simulator.win', 1);
      if (won && d === 'hard') void reportProgress('restaurant-simulator.hard', 1);
      shell.endRound({
        won,
        lost: !won,
        score: kit.total,
        title: won ? 'Five-star week! The restaurant is a hit' : `Closed after day ${kit.day}`,
        details: [
          { label: 'Total takings', value: `${kit.total} coins` },
          { label: 'Customers served', value: String(kit.servedTotal) },
          { label: 'Biggest tip', value: `${kit.bestTip} coins` },
        ],
      });
    },
    [d, save, shell],
  );

  useIdleLoop(
    (dt) => {
      const kit = k.current;
      const ev = tick(kit, dt, d, Math.random);
      if (ev.includes('pay')) shell.play('coin');
      else if (ev.includes('leave')) shell.play('failure');
      else if (ev.includes('burn')) shell.play('hit');
      else if (ev.includes('ding')) shell.play('blip');
      else if (ev.includes('arrive')) shell.play('pop');
      if (kit.bestTip >= 10) void reportProgress('restaurant-simulator.tip', 1);
      if (dayOver(kit)) {
        const goal = t.goals[kit.day - 1];
        void incrementProgress('restaurant-simulator.served', kit.servedToday);
        if (kit.servedToday > 0) void reportProgress('restaurant-simulator.first', 1);
        if (kit.lostToday === 0 && kit.earnedToday >= goal)
          void reportProgress('restaurant-simulator.perfect', 1);
        if (kit.earnedToday < goal) return finish(false);
        if (kit.day >= DAYS) return finish(true);
        kit.day += 1;
        save.persist(JSON.parse(JSON.stringify(kit)) as Kitchen, {
          level: kit.day,
          percent: Math.round(((kit.day - 1) / DAYS) * 100),
          label: `Day ${kit.day} of ${DAYS} · ${kit.total} coins`,
        });
        setPhase('summary');
        shell.play('levelComplete');
      }
    },
    phase === 'service' && !shell.paused && !done,
  );

  const onStation = useCallback(
    (i: number) => {
      if (phase !== 'service' || shell.paused) return;
      const r = tapStation(k.current, i);
      shell.play(
        r === 'pick' ? 'select' : r === 'start' ? 'click' : r === 'trash' ? 'pop' : 'failure',
      );
      refresh();
    },
    [phase, shell],
  );
  const onTable = useCallback(
    (i: number) => {
      if (phase !== 'service' || shell.paused) return;
      const n = serve(k.current, i);
      shell.play(n ? 'success' : 'failure');
      refresh();
    },
    [phase, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (/^[1-6]$/.test(key)) onStation(Number(key) - 1);
      else if (TABLE_KEYS.includes(key)) onTable(TABLE_KEYS.indexOf(key));
      else if (key === 'x' && phase === 'service') {
        trash(k.current);
        refresh();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStation, onTable, phase]);

  const kit = k.current;
  const goal = t.goals[kit.day - 1];
  const left = Math.max(0, Math.ceil(DAY_LENGTH - kit.time));

  return (
    <div className="rs">
      <GameHud
        items={[
          { label: 'Day', value: `${kit.day}/${DAYS}` },
          {
            label: 'Time',
            value: phase === 'service' ? (kit.closing ? 'Closing' : `${left}s`) : '–',
          },
          { label: 'Today', value: `${kit.earnedToday}/${goal}` },
          { label: 'Cash', value: kit.cash },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Day ${pending.day} of ${DAYS} · ${pending.total} coins`}
          onContinue={() => {
            k.current = pending;
            setPending(null);
            save.dismiss();
            refresh();
          }}
          onNew={restart}
        />
      )}
      {phase === 'summary' ? (
        <div className="rs-summary card">
          {kit.day > 1 || kit.total > 0 ? (
            <>
              <h3 style={{ margin: 0 }}>Day {kit.day - 1} done!</h3>
              <p className="muted" style={{ margin: 0 }}>
                Earned {kit.earnedToday} (goal {t.goals[kit.day - 2]}) · served {kit.servedToday} ·
                lost {kit.lostToday}
              </p>
            </>
          ) : (
            <>
              <h3 style={{ margin: 0 }}>Welcome to your restaurant</h3>
              <p className="muted" style={{ margin: 0 }}>
                Cook at the stations, pick up dishes (two at a time), and serve them before
                customers lose patience. Earn the daily goal to stay open for five days.
              </p>
            </>
          )}
          <p style={{ margin: 0 }}>
            <strong>Day {kit.day}</strong> goal: {goal} coins · menu:{' '}
            {menu(kit.day)
              .map((m) => m.icon)
              .join(' ')}
            {menu(kit.day).length > menu(kit.day - 1).length && kit.day > 1 && (
              <> · new: {menu(kit.day).at(-1)?.name}!</>
            )}
          </p>
          <div className="rs-upgrades">
            {UPGRADES.map((u) => {
              const owned = kit.upgrades.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`rs-upgrade${owned ? ' owned' : ''}`}
                  disabled={owned || kit.cash < u.cost || done}
                  onClick={() => {
                    if (buy(kit, u.id)) {
                      shell.play('coin');
                      void reportProgress('restaurant-simulator.upgrades', kit.upgrades.length);
                      refresh();
                    }
                  }}
                >
                  <span className="rs-upgrade-icon">{u.icon}</span>
                  <strong>{u.name}</strong>
                  <span className="small muted">{u.desc}</span>
                  <span className="small">{owned ? 'Owned' : `${u.cost} coins`}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openDay}
            disabled={done || !!pending}
          >
            Open for day {kit.day}
          </button>
        </div>
      ) : (
        <>
          <div className="rs-log small muted" aria-live="polite">
            {kit.log}
          </div>
          <div
            className="rs-tables"
            style={{ gridTemplateColumns: `repeat(${kit.customers.length}, minmax(0, 1fr))` }}
          >
            {kit.customers.map((c, i) => {
              const need = c ? missing(c) : [];
              const p = c ? c.patience / c.max : 0;
              return (
                <button
                  key={i}
                  type="button"
                  className={`rs-table${c && c.eating === null && kit.hands.some((h) => need.includes(h as never)) ? ' can' : ''}`}
                  onClick={() => onTable(i)}
                  aria-label={
                    c
                      ? `Table ${i + 1}: ${c.eating !== null ? 'eating' : `wants ${need.map((x) => DISH[x].name).join(', ')}`}`
                      : `Table ${i + 1}: empty`
                  }
                >
                  <span className="rs-key">{TABLE_KEYS[i].toUpperCase()}</span>
                  {c ? (
                    <>
                      <span className="rs-face">{c.face}</span>
                      <span className="rs-order">
                        {c.order.map((o, j) => (
                          <span key={j} className={j < c.order.length - need.length ? 'got' : ''}>
                            {DISH[o].icon}
                          </span>
                        ))}
                      </span>
                      {c.eating !== null ? (
                        <span className="small">😋 eating…</span>
                      ) : (
                        <span className="rs-bar" aria-hidden="true">
                          <span
                            style={{
                              width: `${p * 100}%`,
                              background: p > 0.5 ? '#22c55e' : p > 0.25 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="rs-empty">🪑</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="rs-hands" aria-label="Your hands">
            {Array.from({ length: HANDS }, (_, i) => (
              <span key={i} className="rs-hand">
                {kit.hands[i]
                  ? kit.hands[i] === 'burnt'
                    ? '🔥'
                    : DISH[kit.hands[i] as keyof typeof DISH].icon
                  : '✋'}
              </span>
            ))}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                trash(kit);
                refresh();
              }}
              disabled={!kit.hands.length}
            >
              🗑️ Bin (X)
            </button>
          </div>
          <div className="rs-stations">
            {kit.stations.map((s, i) => {
              const dish = DISH[s.dish];
              const total = cookTime(kit, s.dish);
              const isReady = ready(kit, s);
              const over = s.t !== null && isReady && dish.burn ? (s.t - total) / dish.burn : 0;
              return (
                <button
                  key={i}
                  type="button"
                  className={`rs-station${isReady ? ' ready' : ''}${s.burnt ? ' burnt' : ''}`}
                  onClick={() => onStation(i)}
                  aria-label={`${dish.station}: ${s.burnt ? 'burnt, tap to clear' : isReady ? `${dish.name} ready` : s.t !== null ? 'cooking' : `tap to make ${dish.name}`}`}
                >
                  <span className="rs-key">{i + 1}</span>
                  <span className="rs-station-icon">{s.burnt ? '🔥' : dish.icon}</span>
                  <span className="small">{dish.station}</span>
                  <span className="rs-bar" aria-hidden="true">
                    <span
                      style={{
                        width: `${s.t === null ? 0 : isReady ? (dish.burn ? (1 - over) * 100 : 100) : (s.t / total) * 100}%`,
                        background: s.burnt
                          ? '#7f1d1d'
                          : isReady
                            ? over > 0.6
                              ? '#ef4444'
                              : '#22c55e'
                            : '#3b82f6',
                      }}
                    />
                  </span>
                  <span className="small muted">
                    {s.burnt
                      ? 'Burnt! Tap to clear'
                      : isReady
                        ? 'Ready — tap to pick up'
                        : s.t !== null
                          ? 'Cooking…'
                          : 'Tap to cook'}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
