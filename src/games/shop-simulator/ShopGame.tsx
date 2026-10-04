'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  DAYS,
  PRODUCT,
  TUNING,
  UPGRADES,
  WEATHER,
  available,
  buyUpgrade,
  capacity,
  demandHint,
  expectedCustomers,
  lifeOf,
  newShop,
  onShelf,
  restock,
  runDay,
  setPrice,
  validShop,
} from './engine';
import type { DayResult, ProductId, Shop } from './engine';
import './shop.css';

type Phase = 'morning' | 'day' | 'evening';

function priceTag(price: number, fair: number) {
  const r = price / fair;
  if (r < 0.95) return { label: 'bargain', cls: 'cheap' };
  if (r <= 1.05) return { label: 'fair', cls: 'fair' };
  if (r <= 1.25) return { label: 'a bit high', cls: 'high' };
  return { label: 'pricey', cls: 'pricey' };
}

export default function ShopGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const t = TUNING[d];
  const [s, setS] = useState<Shop>(() => newShop(Math.floor(Math.random() * 1e9), d));
  const [phase, setPhase] = useState<Phase>('morning');
  const [result, setResult] = useState<DayResult | null>(null);
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('shop-simulator', validShop);
  const [pending, setPending] = useState<Shop | null>(null);

  useEffect(() => {
    if (save.saved && save.saved.day <= DAYS) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    setS(newShop(Math.floor(Math.random() * 1e9), d));
    setPhase('morning');
    setResult(null);
    setPending(null);
    setStarted(false);
    setDone(false);
    save.clear();
  }, [d, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const begin = () => {
    if (started) return;
    setStarted(true);
    shell.startRound();
  };

  const persist = useCallback(
    (shop: Shop) => {
      shop.savedAt = Date.now();
      save.persist(JSON.parse(JSON.stringify(shop)) as Shop, {
        percent: Math.round(((shop.day - 1) / DAYS) * 100),
        label: `Day ${shop.day} of ${DAYS} · ${shop.cash} coins`,
      });
    },
    [save],
  );

  const open = () => {
    if (done || pending) return;
    begin();
    const r = runDay(s, d);
    setResult(r);
    setShown(0);
    setPhase('day');
    shell.play('select');
    void incrementProgress(
      'shop-simulator.customers',
      r.visits.reduce((a, v) => a + (v.bought.length ? 1 : 0), 0),
    );
    if (r.revenue >= 300) void reportProgress('shop-simulator.bumper', 1);
    if (r.visits.length && r.visits.every((v) => v.mood !== 'sad'))
      void reportProgress('shop-simulator.happy', 1);
  };

  // Customers walk in one at a time.
  useEffect(() => {
    if (phase !== 'day' || !result || shell.paused) return;
    if (shown >= result.visits.length) {
      setPhase('evening');
      shell.play(result.revenue > 0 ? 'coin' : 'failure');
      return;
    }
    const id = window.setTimeout(() => {
      if (!document.hidden) setShown((n) => n + 1);
    }, 220);
    return () => window.clearTimeout(id);
  }, [phase, result, shell, shown]);

  const nextMorning = () => {
    if (s.day > DAYS) {
      const won = s.cash >= t.goal;
      setDone(true);
      save.clear();
      if (won) void reportProgress('shop-simulator.goal', 1);
      if (won && d === 'hard') void reportProgress('shop-simulator.hard', 1);
      shell.endRound({
        won,
        lost: !won,
        score: s.cash,
        title: won
          ? `Two great weeks: ${s.cash} coins!`
          : `The fortnight ends with ${s.cash} coins`,
        details: [
          { label: 'Goal', value: `${t.goal} coins` },
          { label: 'Items sold', value: String(s.sold) },
          { label: 'Items spoiled', value: String(s.spoiled) },
          { label: 'Reputation', value: `${Math.round(s.reputation)}%` },
        ],
      });
      return;
    }
    setPhase('morning');
    persist(s);
  };

  const change = (fn: () => void) => {
    if (done || pending || phase !== 'morning') return;
    begin();
    fn();
    refresh();
  };

  const w = WEATHER[s.weather];
  const visits = result?.visits.slice(0, shown) ?? [];

  return (
    <div className="shop">
      <GameHud
        items={[
          { label: 'Day', value: `${Math.min(s.day, DAYS)}/${DAYS}` },
          { label: 'Cash', value: s.cash },
          { label: 'Goal', value: t.goal },
          { label: 'Reputation', value: `${Math.round(s.reputation)}%` },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Day ${pending.day} of ${DAYS} · ${pending.cash} coins`}
          onContinue={() => {
            setS(pending);
            setPending(null);
            save.dismiss();
          }}
          onNew={restart}
        />
      )}
      {phase === 'morning' ? (
        <>
          <div className="shop-weather">
            <span>
              Today: {w.icon} {w.label}
              {s.day % 7 === 6 || s.day % 7 === 0 ? ' · weekend' : ''} · about{' '}
              {expectedCustomers(s, d)} customers
            </span>
            <span className="muted small">
              Tomorrow: {WEATHER[s.forecast].icon} {WEATHER[s.forecast].label}
            </span>
          </div>
          <div className="shop-list" role="table" aria-label="Stock and prices">
            {available(s).map((p) => {
              const n = onShelf(s, p.id);
              const hint = demandHint(s, p.id, d);
              const life = lifeOf(s, p);
              const old = life
                ? s.stock[p.id].filter((b) => b.age === life - 1).reduce((a, b) => a + b.qty, 0)
                : 0;
              const tag = priceTag(s.prices[p.id], p.fair);
              return (
                <div key={p.id} className="shop-row" role="row">
                  <div className="shop-name" role="cell">
                    <span className="shop-icon">{p.icon}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <div className="small muted">
                        cost {p.cost} · {life ? `keeps ${life}d` : 'long life'}
                      </div>
                    </div>
                  </div>
                  <div className="shop-stock" role="cell">
                    <strong>
                      {n}/{capacity(s)}
                    </strong>
                    <div className="small muted">
                      need ~{hint}
                      {old > 0 && <span className="shop-warn"> · {old} spoil tonight</span>}
                    </div>
                    <div className="shop-btns">
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-label={`Buy 5 ${p.name}`}
                        onClick={() => change(() => restock(s, p.id, 5))}
                        disabled={n >= capacity(s) || s.cash < p.cost}
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-label={`Restock ${p.name} to about ${hint}`}
                        onClick={() => change(() => restock(s, p.id, Math.max(1, hint - n)))}
                        disabled={n >= capacity(s) || s.cash < p.cost}
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                  <div className="shop-price" role="cell">
                    <div className="shop-btns">
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-label={`Lower ${p.name} price`}
                        onClick={() => change(() => setPrice(s, p.id, s.prices[p.id] - 1))}
                      >
                        −
                      </button>
                      <strong className="shop-tag-price">{s.prices[p.id]}</strong>
                      <button
                        type="button"
                        className="btn btn-sm"
                        aria-label={`Raise ${p.name} price`}
                        onClick={() => change(() => setPrice(s, p.id, s.prices[p.id] + 1))}
                      >
                        +
                      </button>
                    </div>
                    <span className={`shop-tag ${tag.cls}`}>{tag.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="shop-upgrades">
            {UPGRADES.map((u) => {
              const owned = s.upgrades.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`shop-upgrade${owned ? ' owned' : ''}`}
                  disabled={owned || s.cash < u.cost || done}
                  onClick={() =>
                    change(() => {
                      if (buyUpgrade(s, u.id)) {
                        shell.play('success');
                        void reportProgress('shop-simulator.upgrades', s.upgrades.length);
                      }
                    })
                  }
                  title={u.desc}
                >
                  <span>{u.icon}</span>
                  <strong>{u.name}</strong>
                  <span className="small muted">{owned ? 'Owned' : `${u.cost}c · ${u.desc}`}</span>
                </button>
              );
            })}
          </div>
          <div className="shop-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={open}
              disabled={done || !!pending}
            >
              🏪 Open the shop
            </button>
          </div>
        </>
      ) : (
        <div className="shop-day">
          <div className="shop-feed" aria-live="polite">
            {visits.map((v, i) => (
              <div key={i} className={`shop-visit ${v.mood}`}>
                <span className="shop-face">{v.face}</span>
                <span className="shop-wants">
                  {v.wants.map((id: ProductId) => (
                    <span key={id} className={v.bought.includes(id) ? '' : 'miss'}>
                      {PRODUCT[id].icon}
                    </span>
                  ))}
                </span>
                <span className="shop-say">“{v.say}”</span>
              </div>
            ))}
          </div>
          {phase === 'day' && result ? (
            <div className="shop-actions">
              <span className="muted small">
                Customer {shown} of {result.visits.length}
              </span>
              <button type="button" className="btn" onClick={() => setShown(result.visits.length)}>
                Skip to closing
              </button>
            </div>
          ) : (
            result && (
              <div className="shop-summary card">
                <strong>
                  Day {s.day - 1} takings: {result.revenue} coins
                </strong>
                <span className="small muted">
                  {result.visits.filter((v) => v.bought.length).length} of {result.visits.length}{' '}
                  customers bought something · {result.spoiled} items spoiled · reputation{' '}
                  {Math.round(result.repBefore)}% → {Math.round(result.repAfter)}%
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={nextMorning}
                  disabled={done}
                >
                  {s.day > DAYS ? 'Count the money' : `Start day ${s.day}`}
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
