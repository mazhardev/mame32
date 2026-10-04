import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { formatDuration, formatNumber } from '../_shared/idle/format';
import { useIdleLoop } from '../_shared/idle/useIdleLoop';
import { offlineSeconds, useIdleSave } from '../_shared/idle/useIdleSave';
import {
  COST,
  GOALS,
  MAX_SHAFTS,
  bottleneck,
  digShaft,
  elevatorCost,
  elevatorRate,
  income,
  newMine,
  newShaftCost,
  production,
  shaftCost,
  shaftRate,
  tick,
  upgradeElevator,
  upgradeShaft,
  upgradeWarehouse,
  validMine,
  warehouseCost,
  warehouseRate,
} from './engine';
import type { Mine } from './engine';
import '../_shared/idle/idle.css';
import './miner.css';

const OFFLINE_CAP = { easy: 4 * 3600, normal: 2 * 3600, hard: 3600 } as const;
const ORES = ['🪨', '🟤', '⚪', '🟡', '🟢', '🔵', '🟣', '💎'];
const ORE_NAMES = [
  'Stone',
  'Copper',
  'Silver',
  'Gold',
  'Emerald',
  'Sapphire',
  'Amethyst',
  'Diamond',
];

export default function IdleMinerGame() {
  const shell = useGameShell();
  const goal = GOALS[shell.difficulty];
  const k = COST[shell.difficulty];
  const m = useRef<Mine>(newMine());
  const started = useRef(false);
  const [pending, setPending] = useState<Mine | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const snapshot = useCallback(() => {
    if (!started.current) return null;
    const s = m.current;
    s.savedAt = Date.now();
    return {
      state: JSON.parse(JSON.stringify(s)) as Mine,
      meta: {
        percent: Math.min(100, Math.floor((s.total / goal) * 100)),
        label: `${s.shafts.length} shafts · $${formatNumber(s.total)}`,
      },
    };
  }, [goal]);
  const save = useIdleSave('idle-miner', validMine, snapshot);
  useEffect(() => {
    if (save.saved && !started.current) setPending(save.saved);
  }, [save.saved]);

  const begin = useCallback(() => {
    if (started.current) return;
    started.current = true;
    shell.startRound();
  }, [shell]);

  const restart = useCallback(() => {
    m.current = newMine();
    started.current = false;
    setPending(null);
    setBanner(null);
    save.clear();
  }, [save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);
  // Machines work on their own, so a fresh game starts as soon as it opens.
  useEffect(() => {
    if (!save.loading && !save.saved && !started.current) begin();
  }, [begin, save.loading, save.saved]);

  const resume = useCallback(() => {
    if (!pending) return;
    const s = JSON.parse(JSON.stringify(pending)) as Mine;
    m.current = s;
    const away = offlineSeconds(pending.savedAt, Date.now(), OFFLINE_CAP[shell.difficulty]);
    const before = s.total;
    tick(s, away * 0.5);
    if (s.total > before)
      setBanner(
        `The mine kept working while you were away (${formatDuration(away)}): +$${formatNumber(s.total - before)}.`,
      );
    setPending(null);
    save.dismiss();
    begin();
  }, [begin, pending, save, shell.difficulty]);

  const report = useCallback(() => {
    const s = m.current;
    void reportProgress('idle-miner.shafts', s.shafts.length);
    void reportProgress('idle-miner.elevator', s.elevator);
    if (s.shafts.length >= MAX_SHAFTS) void reportProgress('idle-miner.diamond', 1);
    if (s.total >= 1e6) void reportProgress('idle-miner.million', 1);
  }, []);
  useEffect(() => {
    const id = window.setInterval(report, 4000);
    return () => window.clearInterval(id);
  }, [report]);

  useIdleLoop(
    (dt) => {
      const s = m.current;
      tick(s, dt);
      if (!s.won && s.total >= goal) {
        s.won = true;
        report();
        save.flush();
        shell.play('levelComplete');
        shell.endRound({
          won: true,
          score: Math.max(100, Math.round(200000 / (s.played / 60 + 10))),
          title: `$${formatNumber(goal)} of ore sold!`,
          details: [
            { label: 'Time played', value: formatDuration(s.played) },
            { label: 'Shafts', value: String(s.shafts.length) },
            { label: 'Income', value: `$${formatNumber(income(s))}/s` },
          ],
        });
      }
    },
    started.current && !shell.paused && !pending,
  );

  const act = useCallback(
    (fn: (s: Mine) => boolean) => {
      if (shell.paused || pending) return;
      begin();
      if (fn(m.current)) shell.play('coin');
    },
    [begin, pending, shell],
  );

  const s = m.current;
  const limit = bottleneck(s);
  const p = production(s);
  const e = elevatorRate(s.elevator, s.shafts.length);
  const w = warehouseRate(s.warehouse);
  return (
    <div className="idle" style={{ gridTemplateColumns: 'minmax(0,1fr)', maxWidth: 680 }}>
      {pending && (
        <ResumePrompt
          label={`${pending.shafts.length} shafts · $${formatNumber(pending.total)} sold`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <section className="idle-panel">
        <div className="idle-total">
          <strong>${formatNumber(s.money)}</strong>
          <span>
            ${formatNumber(income(s))}/s · {limit === 'shafts' ? 'the shafts' : `the ${limit}`} is
            your bottleneck
          </span>
        </div>
        <div
          className="idle-progress"
          role="progressbar"
          aria-valuenow={Math.floor((s.total / goal) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div style={{ width: `${Math.min(100, (s.total / goal) * 100)}%` }} />
        </div>
        <div className="small muted" style={{ textAlign: 'center' }}>
          Goal: sell ${formatNumber(goal)} of ore
        </div>
        {banner && (
          <div className="idle-banner" role="status">
            {banner}{' '}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setBanner(null)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
      </section>
      <section className="idle-panel mine" aria-label="Your mine">
        <div className={`mine-row surface${limit === 'warehouse' ? ' limit' : ''}`}>
          <span className="mine-icon" aria-hidden="true">
            🚚
          </span>
          <span>
            <strong>Warehouse · level {s.warehouse}</strong>
            <small>
              Sells ${formatNumber(w)}/s · waiting at the surface:{' '}
              <span className="mine-stash">${formatNumber(s.surface)}</span>
            </small>
          </span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={warehouseCost(s.warehouse, k) > s.money}
            onClick={() => act((x) => upgradeWarehouse(x, k))}
          >
            Upgrade ${formatNumber(warehouseCost(s.warehouse, k))}
          </button>
        </div>
        <div className={`mine-row surface${limit === 'elevator' ? ' limit' : ''}`}>
          <span className="mine-icon" aria-hidden="true">
            🛗
          </span>
          <span>
            <strong>Elevator · level {s.elevator}</strong>
            <small>Lifts ${formatNumber(e)}/s — deeper mines mean longer trips</small>
          </span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={elevatorCost(s.elevator, k) > s.money}
            onClick={() => act((x) => upgradeElevator(x, k))}
          >
            Upgrade ${formatNumber(elevatorCost(s.elevator, k))}
          </button>
        </div>
        {s.shafts.map((level, i) => (
          <div className={`mine-row${limit === 'shafts' ? ' limit' : ''}`} key={i}>
            <span className="mine-icon" aria-hidden="true">
              {ORES[i]}
            </span>
            <span>
              <strong>
                Shaft {i + 1}: {ORE_NAMES[i]} · level {level}
              </strong>
              <small>
                Digs ${formatNumber(shaftRate(i, level))}/s · stockpile{' '}
                <span className="mine-stash">${formatNumber(s.stash[i])}</span>
              </small>
            </span>
            <button
              type="button"
              className="btn btn-sm"
              disabled={shaftCost(i, level, k) > s.money}
              onClick={() => act((x) => upgradeShaft(x, i, k))}
            >
              Level up ${formatNumber(shaftCost(i, level, k))}
            </button>
          </div>
        ))}
        {s.shafts.length < MAX_SHAFTS && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={newShaftCost(s.shafts.length, k) > s.money}
            onClick={() => act((x) => digShaft(x, k))}
          >
            ⛏️ Dig shaft {s.shafts.length + 1} ({ORE_NAMES[s.shafts.length]}) · $
            {formatNumber(newShaftCost(s.shafts.length, k))}
          </button>
        )}
        <p className="small muted" style={{ margin: 0 }}>
          Digging ${formatNumber(p)}/s · lifting ${formatNumber(e)}/s · selling ${formatNumber(w)}
          /s. The slowest of the three (outlined in red) sets your income.
        </p>
      </section>
    </div>
  );
}
