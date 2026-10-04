'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  MARKETING,
  QUARTERS,
  SALARY,
  TIERS,
  TUNING,
  borrow,
  canLaunch,
  devPoints,
  endQuarter,
  hire,
  launch,
  newCompany,
  payroll,
  projectQuality,
  repay,
  retire,
  rivalQuality,
  setTier,
  validCompany,
  valuation,
} from './engine';
import type { Company, Dept, Tier } from './engine';
import './business.css';

const DEPTS: { id: Dept; icon: string; name: string; effect: string }[] = [
  { id: 'engineers', icon: '🧑‍💻', name: 'Engineers', effect: '+12 R&D points a quarter each' },
  { id: 'sales', icon: '🤝', name: 'Sales', effect: '+12% units sold each' },
  { id: 'support', icon: '🎧', name: 'Support', effect: 'Older products keep selling longer' },
];
const MKT_LABEL = ['None', 'Small', 'Medium', 'Big'];
const qLabel = (q: number) => `Y${Math.ceil(q / 4)} Q${((q - 1) % 4) + 1}`;

function ProfitChart({ c }: { c: Company }) {
  const h = c.history;
  if (!h.length) return null;
  const max = Math.max(50, ...h.map((r) => Math.abs(r.profit)));
  const w = 100 / QUARTERS;
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="biz-chart"
      role="img"
      aria-label="Profit by quarter"
    >
      <line
        x1={0}
        y1={20}
        x2={100}
        y2={20}
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeWidth={0.3}
      />
      {h.map((r, i) => {
        const bh = (Math.abs(r.profit) / max) * 18;
        return (
          <rect
            key={r.quarter}
            x={i * w + w * 0.15}
            width={w * 0.7}
            y={r.profit >= 0 ? 20 - bh : 20}
            height={Math.max(0.4, bh)}
            fill={r.profit >= 0 ? '#22c55e' : '#ef4444'}
            rx={0.6}
          />
        );
      })}
    </svg>
  );
}

export default function BusinessGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const t = TUNING[d];
  const [c, setC] = useState<Company>(() => newCompany(Math.floor(Math.random() * 1e9), d));
  const [started, setStarted] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('business-simulator', validCompany);
  const [pending, setPending] = useState<Company | null>(null);

  useEffect(() => {
    if (save.saved) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    setC(newCompany(Math.floor(Math.random() * 1e9), d));
    setPending(null);
    setStarted(false);
    save.clear();
  }, [d, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const act = (fn: () => unknown, sound: 'click' | 'success' | 'coin' = 'click') => {
    if (c.over || pending || shell.paused) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const ok = fn();
    shell.play(ok === false || ok === null ? 'failure' : sound);
    refresh();
  };

  const nextQuarter = () =>
    act(() => {
      const r = endQuarter(c, d);
      shell.play(r.profit >= 0 ? 'coin' : 'failure');
      if (r.profit > 0) void reportProgress('business-simulator.profit', 1);
      void reportProgress('business-simulator.revenue', r.revenue >= 1000 ? 1 : 0);
      if (c.over) {
        const won = c.over === 'won';
        save.clear();
        if (won) void reportProgress('business-simulator.goal', 1);
        if (won && d === 'hard') void reportProgress('business-simulator.hard', 1);
        if (won && c.loan === 0) void reportProgress('business-simulator.debtfree', 1);
        shell.endRound({
          won,
          lost: !won,
          score: Math.max(0, valuation(c)),
          title: won
            ? `Your company is worth ${valuation(c).toLocaleString()}k!`
            : c.over === 'bankrupt'
              ? 'Bankrupt — the bank stopped lending'
              : `Valued at ${valuation(c).toLocaleString()}k — short of the target`,
          details: [
            { label: 'Target', value: `${t.goal.toLocaleString()}k` },
            { label: 'Products launched', value: String(c.nextId - 1) },
            { label: 'Cash', value: `${c.cash}k` },
            { label: 'Debt', value: `${c.loan}k` },
          ],
        });
        return;
      }
      c.savedAt = Date.now();
      save.persist(JSON.parse(JSON.stringify(c)) as Company, {
        percent: Math.round(((c.quarter - 1) / QUARTERS) * 100),
        label: `${qLabel(c.quarter)} · worth ${valuation(c)}k`,
      });
    }, 'coin');

  const rival = Math.round(rivalQuality(c.quarter, d));
  const pq = projectQuality(c);
  const last = c.history.at(-1);
  const p = c.project;

  return (
    <div className="biz">
      <GameHud
        items={[
          {
            label: 'Quarter',
            value: `${qLabel(Math.min(c.quarter, QUARTERS))} (${Math.min(c.quarter, QUARTERS)}/${QUARTERS})`,
          },
          { label: 'Cash', value: `${c.cash}k` },
          { label: 'Value', value: `${valuation(c)}k` },
          { label: 'Target', value: `${t.goal}k` },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${qLabel(pending.quarter)} · worth ${valuation(pending)}k`}
          onContinue={() => {
            setC(pending);
            setPending(null);
            save.dismiss();
          }}
          onNew={restart}
        />
      )}
      <div className="biz-news small" aria-live="polite">
        {c.news}
      </div>

      <section className="biz-card" aria-label="Research and development">
        <div className="biz-head">
          <strong>🔬 R&amp;D: {p?.name ?? '—'}</strong>
          <span className="small muted">+{devPoints(c)} points / quarter</span>
        </div>
        {p && (
          <>
            <div className="biz-bar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (p.points / p.needed) * 100)}%` }} />
            </div>
            <div className="small">
              {p.points}/{p.needed} points
              {p.points > p.needed ? ` (+${p.points - p.needed} polish)` : ''} · launch quality{' '}
              <strong className={pq >= rival ? 'biz-pos' : 'biz-neg'}>{pq}</strong> vs best rival{' '}
              <strong>{rival}</strong>
              <span className="muted"> (rivals improve every quarter)</span>
            </div>
            <div className="biz-launch">
              {(Object.keys(TIERS) as Tier[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  className="btn btn-sm"
                  disabled={!canLaunch(c)}
                  onClick={() =>
                    act(() => {
                      const prod = launch(c, tier);
                      if (prod) {
                        void incrementProgress('business-simulator.launches', 1);
                        if (prod.quality >= rival + 20)
                          void reportProgress('business-simulator.hit', 1);
                      }
                      return prod;
                    }, 'success')
                  }
                >
                  🚀 Launch {TIERS[tier].label} ({TIERS[tier].price})
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="biz-card" aria-label="Products">
        <div className="biz-head">
          <strong>📦 Products on sale</strong>
          <span className="small muted">price / unit cost shown per tier</span>
        </div>
        {c.products.length === 0 && (
          <span className="small muted">Nothing on sale yet — launch your first gadget.</span>
        )}
        {c.products.map((prod) => (
          <div key={prod.id} className="biz-prod">
            <span>
              <strong>{prod.name}</strong>{' '}
              <span className={`small ${prod.quality >= rival ? 'biz-pos' : 'biz-neg'}`}>
                Q{prod.quality}
              </span>
              <span className="small muted">
                {' '}
                · {prod.age}q old · {Math.round(prod.sold * 10) / 10}k sold
              </span>
            </span>
            <span className="biz-tiers" role="radiogroup" aria-label={`${prod.name} price`}>
              {(Object.keys(TIERS) as Tier[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  role="radio"
                  aria-checked={prod.tier === tier}
                  className={`btn btn-sm${prod.tier === tier ? ' btn-primary' : ''}`}
                  onClick={() => act(() => setTier(c, prod.id, tier))}
                  title={`${TIERS[tier].price} each, costs ${TIERS[tier].cost} to make`}
                >
                  {TIERS[tier].price}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-sm"
                aria-label={`Retire ${prod.name}`}
                onClick={() => act(() => retire(c, prod.id))}
              >
                ✕
              </button>
            </span>
          </div>
        ))}
      </section>

      <div className="biz-grid">
        <section className="biz-card" aria-label="Team">
          <div className="biz-head">
            <strong>👥 Team</strong>
            <span className="small muted">
              {payroll(c)}k salaries ({SALARY}k each)
            </span>
          </div>
          {DEPTS.map((dp) => (
            <div key={dp.id} className="biz-row">
              <span>
                {dp.icon} {dp.name} <span className="small muted">— {dp.effect}</span>
              </span>
              <span className="biz-step">
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Fewer ${dp.name}`}
                  onClick={() => act(() => hire(c, dp.id, -1))}
                  disabled={c.staff[dp.id] === 0}
                >
                  −
                </button>
                <strong>{c.staff[dp.id]}</strong>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Hire ${dp.name}`}
                  onClick={() =>
                    act(() => {
                      const ok = hire(c, dp.id, 1);
                      if (ok)
                        void reportProgress(
                          'business-simulator.team',
                          c.staff.engineers + c.staff.sales + c.staff.support,
                        );
                      return ok;
                    })
                  }
                >
                  +
                </button>
              </span>
            </div>
          ))}
        </section>
        <section className="biz-card" aria-label="Marketing and finance">
          <div className="biz-head">
            <strong>📣 Marketing</strong>
            <span className="small muted">awareness {Math.round(c.awareness * 100)}%</span>
          </div>
          <div className="biz-tiers" role="radiogroup" aria-label="Marketing budget">
            {MARKETING.map((m, i) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={c.marketing === i}
                className={`btn btn-sm${c.marketing === i ? ' btn-primary' : ''}`}
                onClick={() => act(() => (c.marketing = i))}
              >
                {MKT_LABEL[i]} {m ? `${m}k` : ''}
              </button>
            ))}
          </div>
          <div className="biz-head" style={{ marginTop: 8 }}>
            <strong>🏦 Loan: {c.loan}k</strong>
            <span className="small muted">5% interest a quarter</span>
          </div>
          <div className="biz-tiers">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => act(() => borrow(c, 100), 'coin')}
            >
              Borrow 100k
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => act(() => repay(c, 100))}
              disabled={!c.loan}
            >
              Repay 100k
            </button>
          </div>
        </section>
      </div>

      <section className="biz-card" aria-label="Last quarter">
        <div className="biz-head">
          <strong>📊 {last ? `${qLabel(last.quarter)} results` : 'Results'}</strong>
          {last && (
            <span className="small">
              revenue {last.revenue}k · costs {last.costs}k ·{' '}
              <strong className={last.profit >= 0 ? 'biz-pos' : 'biz-neg'}>
                {last.profit >= 0 ? 'profit' : 'loss'} {Math.abs(last.profit)}k
              </strong>{' '}
              · {last.units}k units
            </span>
          )}
        </div>
        <ProfitChart c={c} />
      </section>

      <div className="biz-actions">
        <button type="button" className="btn btn-primary" onClick={nextQuarter} disabled={!!c.over}>
          📅 End {qLabel(Math.min(c.quarter, QUARTERS))}
        </button>
      </div>
    </div>
  );
}
