import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  GOODS,
  GOOD_INFO,
  HOLD_UPGRADE,
  PORTS,
  TUNING,
  buy,
  cargoUsed,
  cargoValue,
  distance,
  newTrader,
  priceOf,
  sail,
  see,
  sell,
  sellPrice,
  upgradeHold,
  validTrader,
} from './engine';
import type { Good, Trader } from './engine';
import './trade.css';

const gold = (n: number) => `${Math.round(n).toLocaleString('en-US')}g`;

export default function TradingGame() {
  const shell = useGameShell();
  const tune = TUNING[shell.difficulty];
  const fresh = useCallback(() => {
    const t = newTrader(Math.floor(Math.random() * 1e9));
    see(t);
    return t;
  }, []);
  const [t, setT] = useState<Trader>(fresh);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('trading-simulator', validTrader);
  const [pending, setPending] = useState<Trader | null>(null);
  const [done, setDone] = useState(false);
  const started = t.day > 1 || cargoUsed(t) > 0;
  const liveEverywhere = shell.difficulty === 'easy';

  useEffect(() => {
    if (save.saved && save.saved.day < tune.days) setPending(save.saved);
  }, [save.saved, tune.days]);

  const restart = useCallback(() => {
    setT(fresh());
    setPending(null);
    setDone(false);
    save.clear();
  }, [fresh, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const persist = useCallback(() => {
    t.savedAt = Date.now();
    save.persist(JSON.parse(JSON.stringify(t)) as Trader, {
      percent: Math.min(100, Math.round((t.gold / tune.goal) * 100)),
      label: `Day ${t.day}/${tune.days} · ${gold(t.gold)}`,
    });
  }, [save, t, tune.days, tune.goal]);

  const finish = useCallback(() => {
    const total = t.gold + cargoValue(t);
    const won = total >= tune.goal;
    save.clear();
    setDone(true);
    void incrementProgress('trading-simulator.voyages', 1);
    if (won) void reportProgress('trading-simulator.goal', 1);
    if (won && shell.difficulty === 'hard') void reportProgress('trading-simulator.hard', 1);
    if (total >= tune.goal * 2) void reportProgress('trading-simulator.double', 1);
    shell.endRound({
      won,
      lost: !won,
      score: Math.round(total),
      title: won ? `A merchant prince: ${gold(total)}!` : `The season ends with ${gold(total)}`,
      details: [
        { label: 'Gold', value: gold(t.gold) },
        { label: 'Unsold cargo (valued at 80%)', value: gold(cargoValue(t)) },
        { label: 'Goal', value: gold(tune.goal) },
      ],
    });
  }, [save, shell, t, tune.goal]);

  const begin = useCallback(() => {
    if (!started) shell.startRound();
  }, [shell, started]);

  const trade = useCallback(
    (side: 'buy' | 'sell', g: Good, n: number) => {
      if (done || pending || shell.paused) return;
      begin();
      const res = side === 'buy' ? buy(t, g, n, tune) : sell(t, g, n, tune);
      if (side === 'sell' && res > 0) {
        void reportProgress('trading-simulator.sale', Math.round(res));
      }
      shell.play(res > 0 ? 'coin' : 'failure');
      see(t);
      persist();
      refresh();
    },
    [begin, done, pending, persist, shell, t, tune],
  );

  const voyage = useCallback(
    (to: string) => {
      if (done || pending || shell.paused || to === t.port) return;
      begin();
      if (t.day + distance(t.port, to) > tune.days + 3) return;
      sail(t, to, tune);
      shell.play('whoosh');
      if (t.capacity >= 150) void reportProgress('trading-simulator.hold', 1);
      if (t.day >= tune.days) finish();
      else persist();
      refresh();
    },
    [begin, done, finish, pending, persist, shell, t, tune],
  );

  const port = PORTS.find((p) => p.id === t.port)!;
  const used = cargoUsed(t);
  const upgradeCost = HOLD_UPGRADE.cost(t.capacity);

  return (
    <div className="ts">
      <div className="ts-wide">
        <GameHud
          items={[
            { label: 'Day', value: `${Math.min(t.day, tune.days)}/${tune.days}` },
            { label: 'Gold', value: gold(t.gold) },
            { label: 'Hold', value: `${used}/${t.capacity}` },
            { label: 'Goal', value: gold(tune.goal) },
          ]}
        />
      </div>
      {pending && (
        <div className="ts-wide">
          <ResumePrompt
            label={`Day ${pending.day}/${tune.days} · ${gold(pending.gold)}`}
            onContinue={() => {
              setT(pending);
              setPending(null);
              save.dismiss();
              shell.startRound();
            }}
            onNew={restart}
          />
        </div>
      )}
      <section className="ts-panel" aria-label="Sea chart">
        <svg
          className="ts-map"
          viewBox="0 0 100 90"
          role="group"
          aria-label="Ports — choose one to sail there"
        >
          <rect x="0" y="0" width="100" height="90" fill="#bfdbfe" />
          <path
            d="M0 50 Q12 40 6 20 L0 10 Z M100 52 Q90 60 95 85 L100 90 Z M38 90 Q48 70 60 90 Z"
            fill="#d9f99d"
          />
          {PORTS.filter((p) => p.id !== t.port).map((p) => (
            <g key={`r-${p.id}`}>
              <line
                x1={port.x}
                y1={port.y}
                x2={p.x}
                y2={p.y}
                stroke="#60a5fa"
                strokeWidth="0.6"
                strokeDasharray="2 1.5"
              />
              <text
                x={(port.x + p.x) / 2}
                y={(port.y + p.y) / 2 - 1}
                fontSize="3.2"
                textAnchor="middle"
                fill="#1e3a8a"
              >
                {distance(t.port, p.id)}d
              </text>
            </g>
          ))}
          {PORTS.map((p) => {
            const here = p.id === t.port;
            return (
              <g
                key={p.id}
                className="ts-port"
                style={{ outline: 'none' }}
                role="button"
                tabIndex={0}
                aria-label={
                  here
                    ? `${p.name} (you are here)`
                    : `Sail to ${p.name}, ${distance(t.port, p.id)} days`
                }
                onClick={() => voyage(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    voyage(p.id);
                  }
                }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={here ? 4 : 3}
                  fill={here ? '#f59e0b' : '#1e40af'}
                  stroke="#fff"
                  strokeWidth="0.6"
                />
                <text
                  x={p.x}
                  y={p.y + (p.y > 60 ? 8 : -6)}
                  fontSize="4"
                  textAnchor="middle"
                  fill="#0f172a"
                  fontWeight="700"
                >
                  {p.name}
                </text>
                {here && (
                  <text x={p.x} y={p.y + 1.6} fontSize="4" textAnchor="middle">
                    ⛵
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="small muted" style={{ margin: 0 }}>
          Click a port to sail there. Every day at sea or in port costs {8}g in wages.
        </p>
        <ul className="ts-log" aria-live="polite">
          {t.log.slice(0, 5).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
      <section className="ts-panel" aria-label={`${port.name} market`}>
        <strong>{port.name} market</strong>
        <table className="ts-table">
          <thead>
            <tr>
              <th>Good</th>
              <th>Buy</th>
              <th>Sell</th>
              <th>Hold</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {GOODS.map((g) => {
              const info = GOOD_INFO[g];
              const p = priceOf(t, t.port, g);
              const cheap = p < info.base * 0.85;
              const dear = p > info.base * 1.2;
              return (
                <tr key={g}>
                  <td>
                    {info.icon} {info.name}
                  </td>
                  <td className={cheap ? 'ts-good' : ''}>{p.toFixed(1)}</td>
                  <td className={dear ? 'ts-good' : ''}>{sellPrice(t, t.port, g).toFixed(1)}</td>
                  <td>{t.cargo[g] || ''}</td>
                  <td>
                    <div className="ts-btns">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => trade('buy', g, 1)}
                        disabled={done || p > t.gold || used >= t.capacity}
                        aria-label={`Buy 1 ${info.name}`}
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => trade('buy', g, 10)}
                        disabled={done || p > t.gold || used >= t.capacity}
                        aria-label={`Buy 10 ${info.name}`}
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => trade('sell', g, 999)}
                        disabled={done || t.cargo[g] === 0}
                        aria-label={`Sell all ${info.name}`}
                      >
                        All
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            if (upgradeHold(t)) {
              shell.play('success');
              persist();
              refresh();
            }
          }}
          disabled={done || t.gold < upgradeCost}
        >
          Enlarge the hold +{HOLD_UPGRADE.size} ({gold(upgradeCost)})
        </button>
        <strong className="small">
          {liveEverywhere ? 'Prices across the sea (live)' : 'Prices you have seen elsewhere'}
        </strong>
        <table className="ts-table small">
          <thead>
            <tr>
              <th>Port</th>
              {GOODS.map((g) => (
                <th key={g} title={GOOD_INFO[g].name}>
                  {GOOD_INFO[g].icon}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PORTS.filter((p) => p.id !== t.port).map((p) => {
              const k = t.known[p.id];
              return (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    {!liveEverywhere && k ? <span className="muted"> d{k.day}</span> : ''}
                  </td>
                  {GOODS.map((g) => (
                    <td key={g}>
                      {liveEverywhere
                        ? sellPrice(t, p.id, g).toFixed(0)
                        : k
                          ? k.sell[g].toFixed(0)
                          : '?'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="small muted" style={{ margin: 0 }}>
          Sell prices shown. Buying pushes prices up and selling pushes them down; markets settle
          again over a few days.
        </p>
        {t.day >= tune.days - 3 && !done && (
          <button type="button" className="btn btn-primary" onClick={finish}>
            End the season now
          </button>
        )}
      </section>
    </div>
  );
}
