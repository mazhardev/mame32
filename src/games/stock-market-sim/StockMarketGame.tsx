import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { GameHud } from '@/components/game/GameHud';
import {
  COMPANIES,
  START_CASH,
  TUNING,
  buy,
  fee,
  maxBuy,
  netWorth,
  newMarket,
  nextDay,
  price,
  sell,
  validMarket,
} from './engine';
import type { Market } from './engine';
import './stocks.css';

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;

function Chart({
  values,
  className,
  color,
}: {
  values: number[];
  className: string;
  color?: string;
}) {
  const w = 300;
  const h = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map(
      (v, i) =>
        `${(i / Math.max(1, values.length - 1)) * w},${h - ((v - min) / span) * (h - 8) - 4}`,
    )
    .join(' ');
  const up = values[values.length - 1] >= values[0];
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color ?? (up ? '#16a34a' : '#dc2626')}
        strokeWidth={className === 'sm-chart' ? 2 : 3}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function StockMarketGame() {
  const shell = useGameShell();
  const t = TUNING[shell.difficulty];
  const [m, setM] = useState<Market>(() => newMarket(Math.floor(Math.random() * 1e9)));
  const [sel, setSel] = useState(COMPANIES[0].sym);
  const [qty, setQty] = useState(10);
  const [, force] = useState(0);
  const save = useSavedGame('stock-market-sim', validMarket);
  const [pending, setPending] = useState<Market | null>(null);
  const [done, setDone] = useState(false);
  const refresh = () => force((x) => x + 1);

  useEffect(() => {
    if (save.saved && save.saved.day > 0 && save.saved.day < t.days) setPending(save.saved);
  }, [save.saved, t.days]);

  const restart = useCallback(() => {
    setM(newMarket(Math.floor(Math.random() * 1e9)));
    setPending(null);
    setDone(false);
    save.clear();
  }, [save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const persist = useCallback(
    (mk: Market) => {
      mk.savedAt = Date.now();
      save.persist(JSON.parse(JSON.stringify(mk)) as Market, {
        percent: Math.round((mk.day / t.days) * 100),
        label: `Day ${mk.day}/${t.days} · ${money(netWorth(mk))}`,
      });
    },
    [save, t.days],
  );

  const finish = useCallback(
    (mk: Market) => {
      const worth = netWorth(mk);
      const ret = worth / START_CASH - 1;
      const won = ret >= t.target;
      if (ret > 0) void reportProgress('stock-market-sim.profit', 1);
      if (won) void reportProgress('stock-market-sim.target', 1);
      if (ret >= 0.5) void reportProgress('stock-market-sim.fifty', 1);
      if (won && shell.difficulty === 'hard') void reportProgress('stock-market-sim.hard', 1);
      void incrementProgress('stock-market-sim.trades', mk.trades);
      save.clear();
      setDone(true);
      shell.endRound({
        won,
        lost: !won,
        score: Math.max(0, Math.round(worth)),
        title: won
          ? `Target beaten: ${pct(ret)}!`
          : `Finished at ${pct(ret)} (target ${pct(t.target)})`,
        details: [
          { label: 'Final net worth', value: money(worth) },
          { label: 'Return', value: pct(ret) },
          { label: 'Trades', value: String(mk.trades) },
        ],
      });
    },
    [save, shell, t.target],
  );

  const advance = useCallback(() => {
    if (done || pending || shell.paused) return;
    if (m.day === 0) shell.startRound();
    nextDay(m, t);
    shell.play('tick');
    const held = COMPANIES.filter((c) => m.holdings[c.sym].shares > 0).length;
    if (held >= 5) void reportProgress('stock-market-sim.diversified', 1);
    if (m.day >= t.days) finish(m);
    else persist(m);
    refresh();
  }, [done, finish, m, pending, persist, shell, t]);

  const trade = useCallback(
    (side: 'buy' | 'sell', n: number) => {
      if (done || pending) return;
      if (m.day === 0 && side === 'buy') shell.startRound();
      const ok = side === 'buy' ? buy(m, sel, n) : sell(m, sel, n);
      shell.play(ok ? 'coin' : 'failure');
      if (ok) persist(m);
      refresh();
    },
    [done, m, pending, persist, sel, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT') return;
      if (e.key === 'Enter' && tag !== 'BUTTON') advance();
      else if (e.key === 'b') trade('buy', qty);
      else if (e.key === 's') trade('sell', qty);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const i = COMPANIES.findIndex((c) => c.sym === sel);
        const j = (i + (e.key === 'ArrowDown' ? 1 : COMPANIES.length - 1)) % COMPANIES.length;
        setSel(COMPANIES[j].sym);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, qty, sel, trade]);

  const worth = netWorth(m);
  const company = COMPANIES.find((c) => c.sym === sel) ?? COMPANIES[0];
  const hist = m.prices[sel];
  const p = price(m, sel);
  const hold = m.holdings[sel];
  const change = (sym: string) => {
    const h = m.prices[sym];
    return h.length > 1 ? h[h.length - 1] / h[h.length - 2] - 1 : 0;
  };
  const tradeValue = qty * p;
  const holdingsList = COMPANIES.filter((c) => m.holdings[c.sym].shares > 0);

  return (
    <div className="sm">
      <div className="sm-wide">
        <GameHud
          items={[
            { label: 'Day', value: `${m.day}/${t.days}` },
            { label: 'Net worth', value: money(worth) },
            { label: 'Return', value: pct(worth / START_CASH - 1) },
            { label: 'Target', value: pct(t.target) },
          ]}
        />
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          A simulation with invented companies and generated prices — not real market data, and not
          financial advice.
        </p>
      </div>
      {pending && (
        <div className="sm-wide">
          <ResumePrompt
            label={`Day ${pending.day}/${t.days} · ${money(netWorth(pending))}`}
            onContinue={() => {
              setM(pending);
              setPending(null);
              save.dismiss();
              shell.startRound();
            }}
            onNew={restart}
          />
        </div>
      )}
      <section className="sm-panel" aria-label="Market">
        <div className="sm-list" role="list">
          {COMPANIES.map((c) => {
            const ch = change(c.sym);
            return (
              <button
                key={c.sym}
                type="button"
                className="sm-row"
                aria-pressed={sel === c.sym}
                onClick={() => setSel(c.sym)}
              >
                <span style={{ minWidth: 0 }}>
                  <strong>{c.sym}</strong>
                  <small>
                    {c.name} · {c.sector}
                  </small>
                </span>
                <span className="sm-spark" style={{ height: 22 }}>
                  <Chart values={m.prices[c.sym].slice(-20)} className="sm-spark" />
                </span>
                <span className="sm-num">{price(m, c.sym).toFixed(2)}</span>
                <span className={`sm-num ${ch >= 0 ? 'sm-up' : 'sm-down'}`}>{pct(ch)}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={advance}
          disabled={done || !!pending}
        >
          {m.day >= t.days ? 'Market closed' : `Next day ▶ (${t.days - m.day} left)`}
        </button>
      </section>
      <section className="sm-panel" aria-label={`${company.name} details`}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <strong>
            {company.name} ({company.sym})
          </strong>
          <span className="sm-num">{money(p)}</span>
        </div>
        <Chart values={hist} className="sm-chart" />
        <div className="small muted">
          You own {hold.shares} share{hold.shares === 1 ? '' : 's'}
          {hold.shares > 0 &&
            ` · avg cost ${money(hold.cost / hold.shares)} · P/L ${money(hold.shares * p - hold.cost)}`}
        </div>
        <div className="sm-trade">
          <label className="small">
            Shares{' '}
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              aria-label="Number of shares"
            />
          </label>
          {[10, 100].map((n) => (
            <button key={n} type="button" className="btn btn-sm" onClick={() => setQty(n)}>
              {n}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setQty(Math.max(1, maxBuy(m, sel)))}
          >
            Max
          </button>
        </div>
        <div className="sm-trade">
          <button
            type="button"
            className="btn btn-primary"
            disabled={done || qty * p + fee(qty * p) > m.cash}
            onClick={() => trade('buy', qty)}
          >
            Buy {qty} (B)
          </button>
          <button
            type="button"
            className="btn"
            disabled={done || qty > hold.shares}
            onClick={() => trade('sell', qty)}
          >
            Sell {qty} (S)
          </button>
          <span className="small muted">
            ≈ {money(tradeValue)} + fee {money(fee(tradeValue))} · cash {money(m.cash)}
          </span>
        </div>
        <strong className="small">News</strong>
        <ul className="sm-news" aria-live="polite">
          {m.log.length === 0 && (
            <li className="muted">No news yet — press Next day to open the market.</li>
          )}
          {m.log.slice(0, 6).map((h, i) => (
            <li key={`${h.day}-${i}`}>
              <span className={h.good ? 'sm-up' : 'sm-down'}>{h.good ? '▲' : '▼'}</span> Day {h.day}
              : {h.text}
            </li>
          ))}
        </ul>
        {holdingsList.length > 0 && (
          <>
            <strong className="small">Portfolio</strong>
            <div className="small">
              {holdingsList.map((c) => (
                <div key={c.sym} className="row" style={{ justifyContent: 'space-between' }}>
                  <span>
                    {c.sym} × {m.holdings[c.sym].shares}
                  </span>
                  <span className="sm-num">
                    {money(m.holdings[c.sym].shares * price(m, c.sym))}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="sm-panel sm-wide" aria-label="Net worth over time">
        <strong className="small">Net worth</strong>
        <Chart
          values={m.worth.length > 1 ? m.worth : [START_CASH, START_CASH]}
          className="sm-chart"
          color="#4f46e5"
        />
      </section>
    </div>
  );
}
