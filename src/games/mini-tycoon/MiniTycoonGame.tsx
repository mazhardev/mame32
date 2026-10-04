import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { formatDuration, formatNumber } from '../_shared/idle/format';
import { BulkSwitch } from '../_shared/idle/ShopItem';
import { useIdleLoop } from '../_shared/idle/useIdleLoop';
import { offlineSeconds, useIdleSave } from '../_shared/idle/useIdleSave';
import {
  BUSINESSES,
  GOALS,
  MILESTONES,
  PRICE,
  affordableCount,
  buyBusiness,
  cost,
  cycleTime,
  hireManager,
  incomeRate,
  newTycoon,
  run,
  tick,
  validTycoon,
} from './engine';
import type { Tycoon } from './engine';
import '../_shared/idle/idle.css';
import './tycoon.css';

const OFFLINE_CAP = { easy: 4 * 3600, normal: 2 * 3600, hard: 3600 } as const;

export default function MiniTycoonGame() {
  const shell = useGameShell();
  const price = PRICE[shell.difficulty];
  const goal = GOALS[shell.difficulty];
  const t = useRef<Tycoon>(newTycoon());
  const started = useRef(false);
  const [bulk, setBulk] = useState<1 | 10 | 'max'>(1);
  const [pending, setPending] = useState<Tycoon | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const snapshot = useCallback(() => {
    if (!started.current) return null;
    const s = t.current;
    s.savedAt = Date.now();
    return {
      state: JSON.parse(JSON.stringify(s)) as Tycoon,
      meta: {
        percent: Math.min(100, Math.floor((s.total / goal) * 100)),
        label: `$${formatNumber(s.total)} earned`,
      },
    };
  }, [goal]);
  const save = useIdleSave('mini-tycoon', validTycoon, snapshot);

  useEffect(() => {
    if (save.saved && !started.current) setPending(save.saved);
  }, [save.saved]);

  const begin = useCallback(() => {
    if (started.current) return;
    started.current = true;
    shell.startRound();
  }, [shell]);

  const restart = useCallback(() => {
    t.current = newTycoon();
    started.current = false;
    setPending(null);
    setBanner(null);
    save.clear();
  }, [save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const resume = useCallback(() => {
    if (!pending) return;
    const s = JSON.parse(JSON.stringify(pending)) as Tycoon;
    t.current = s;
    // Only managed businesses work while you are away.
    const away = offlineSeconds(pending.savedAt, Date.now(), OFFLINE_CAP[shell.difficulty]);
    const before = s.total;
    for (let k = 0; k < Math.min(away, 7200); k += 1) tick(s, 1);
    if (s.total > before)
      setBanner(
        `Your managers earned $${formatNumber(s.total - before)} while you were away (${formatDuration(away)}).`,
      );
    setPending(null);
    save.dismiss();
    begin();
  }, [begin, pending, save, shell.difficulty]);

  const report = useCallback(() => {
    const s = t.current;
    if (s.managers.length) void reportProgress('mini-tycoon.manager', 1);
    void reportProgress('mini-tycoon.managers', s.managers.length);
    void reportProgress('mini-tycoon.carts', s.owned.lemon ?? 0);
    if (s.total >= 1e6) void reportProgress('mini-tycoon.million', 1);
    if ((s.owned.park ?? 0) > 0) void reportProgress('mini-tycoon.park', 1);
  }, []);
  useEffect(() => {
    const id = window.setInterval(report, 5000);
    return () => window.clearInterval(id);
  }, [report]);

  useIdleLoop(
    (dt) => {
      const s = t.current;
      tick(s, dt);
      if (!s.won && s.total >= goal) {
        s.won = true;
        report();
        save.flush();
        shell.play('levelComplete');
        shell.endRound({
          won: true,
          score: Math.max(100, Math.round(200000 / (s.played / 60 + 10))),
          title: `$${formatNumber(goal)} earned — tycoon status!`,
          details: [
            { label: 'Time played', value: formatDuration(s.played) },
            { label: 'Managers hired', value: String(s.managers.length) },
            { label: 'Income', value: `$${formatNumber(incomeRate(s))}/s` },
          ],
        });
      }
    },
    started.current && !shell.paused && !pending,
  );

  const runBiz = useCallback(
    (id: string) => {
      if (shell.paused || pending) return;
      begin();
      if (run(t.current, id)) shell.play('click');
    },
    [begin, pending, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < BUSINESSES.length) runBiz(BUSINESSES[i].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runBiz]);

  const s = t.current;
  return (
    <div className="idle" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
      {pending && (
        <ResumePrompt
          label={`$${formatNumber(pending.total)} earned · ${formatDuration(pending.played)}`}
          onContinue={resume}
          onNew={restart}
        />
      )}
      <section className="idle-panel">
        <div className="idle-total">
          <strong>${formatNumber(s.money)}</strong>
          <span>
            up to ${formatNumber(incomeRate(s))}/s when everything runs · goal ${formatNumber(goal)}{' '}
            earned
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
        <BulkSwitch value={bulk} onChange={setBulk} />
      </section>
      {BUSINESSES.map((b, i) => {
        const n = s.owned[b.id] ?? 0;
        const visible = i === 0 || (s.owned[BUSINESSES[i - 1].id] ?? 0) > 0;
        if (!visible) return null;
        const count = bulk === 'max' ? Math.max(1, affordableCount(b, s, price)) : bulk;
        const c = cost(b, n, count, price);
        const managed = s.managers.includes(b.id);
        const ct = cycleTime(b, Math.max(1, n));
        const nextMilestone = MILESTONES.find((m) => m > n);
        return (
          <div className="tyc-row" key={b.id}>
            <button
              type="button"
              className="tyc-run"
              disabled={n === 0 || managed || s.running[b.id]}
              onClick={() => runBiz(b.id)}
              aria-label={`Run ${b.name} (key ${i + 1})`}
            >
              {b.icon}
              <span className="tyc-n">{n}</span>
            </button>
            <div className="tyc-body">
              <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <strong>{b.name}</strong>
                <span className="small muted">
                  {ct < 1 ? `${ct.toFixed(2)}s` : formatDuration(ct)} per cycle
                  {nextMilestone ? ` · ×2 speed at ${nextMilestone}` : ''}
                </span>
              </div>
              <div className="tyc-bar">
                <div style={{ width: `${(n ? s.progress[b.id] : 0) * 100}%` }} />
                <span>${formatNumber(b.profit * Math.max(1, n))}</span>
              </div>
              <div className="tyc-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={c > s.money || (bulk === 'max' && affordableCount(b, s, price) === 0)}
                  onClick={() => {
                    begin();
                    if (buyBusiness(t.current, b.id, count, price)) shell.play('coin');
                  }}
                >
                  Buy ×{count} · ${formatNumber(c)}
                </button>
                {!managed && n > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={s.money < b.manager * price}
                    onClick={() => {
                      if (hireManager(t.current, b.id, price)) shell.play('success');
                    }}
                  >
                    Hire manager · ${formatNumber(b.manager * price)}
                  </button>
                )}
                {managed && <span className="small muted">👔 Managed</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
