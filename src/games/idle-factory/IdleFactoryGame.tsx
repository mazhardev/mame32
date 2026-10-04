import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { formatDuration, formatNumber } from '../_shared/idle/format';
import { ShopItem } from '../_shared/idle/ShopItem';
import { useIdleLoop } from '../_shared/idle/useIdleLoop';
import { offlineSeconds, useIdleSave } from '../_shared/idle/useIdleSave';
import {
  GOALS,
  GROWTH,
  ICONS,
  MACHINES,
  UPGRADES,
  buyMachine,
  buyUpgrade,
  flow,
  machineCost,
  newFactory,
  tick,
  unlocked,
  validFactory,
} from './engine';
import type { Factory } from './engine';
import '../_shared/idle/idle.css';

const OFFLINE_CAP = { easy: 4 * 3600, normal: 2 * 3600, hard: 3600 } as const;

export default function IdleFactoryGame() {
  const shell = useGameShell();
  const goal = GOALS[shell.difficulty];
  const growth = GROWTH[shell.difficulty];
  const f = useRef<Factory>(newFactory());
  const started = useRef(false);
  const [pending, setPending] = useState<Factory | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const snapshot = useCallback(() => {
    if (!started.current) return null;
    const s = f.current;
    s.savedAt = Date.now();
    return {
      state: JSON.parse(JSON.stringify(s)) as Factory,
      meta: {
        percent: Math.min(100, Math.floor((s.made.robot / goal) * 100)),
        label: `${Math.floor(s.made.robot)} of ${goal} robots`,
      },
    };
  }, [goal]);
  const save = useIdleSave('idle-factory', validFactory, snapshot);
  useEffect(() => {
    if (save.saved && !started.current) setPending(save.saved);
  }, [save.saved]);

  const begin = useCallback(() => {
    if (started.current) return;
    started.current = true;
    shell.startRound();
  }, [shell]);

  const restart = useCallback(() => {
    f.current = newFactory();
    started.current = false;
    setPending(null);
    setBanner(null);
    save.clear();
  }, [save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const resume = useCallback(() => {
    if (!pending) return;
    const s = JSON.parse(JSON.stringify(pending)) as Factory;
    f.current = s;
    const away = offlineSeconds(pending.savedAt, Date.now(), OFFLINE_CAP[shell.difficulty]);
    const before = s.money;
    tick(s, away * 0.5);
    if (s.money > before)
      setBanner(
        `Your factory ran at half speed while you were away (${formatDuration(away)}): +$${formatNumber(s.money - before)}.`,
      );
    setPending(null);
    save.dismiss();
    begin();
  }, [begin, pending, save, shell.difficulty]);

  const report = useCallback(() => {
    const s = f.current;
    if (s.made.gear >= 1) void reportProgress('idle-factory.gear', 1);
    if (s.made.robot >= 1) void reportProgress('idle-factory.robot', 1);
    void reportProgress('idle-factory.drills', s.machines.drill ?? 0);
    if (s.upgrades.length === UPGRADES.length) void reportProgress('idle-factory.upgrades', 1);
    const fl = flow(s);
    const stages = MACHINES.filter((m) => (s.machines[m.id] ?? 0) > 0);
    if (stages.length === MACHINES.length && stages.every((m) => fl.busy[m.id] > 0.95))
      void reportProgress('idle-factory.balanced', 1);
  }, []);
  useEffect(() => {
    const id = window.setInterval(report, 4000);
    return () => window.clearInterval(id);
  }, [report]);

  useIdleLoop(
    (dt) => {
      const s = f.current;
      tick(s, dt);
      if (!s.won && s.made.robot >= goal) {
        s.won = true;
        report();
        save.flush();
        shell.play('levelComplete');
        shell.endRound({
          won: true,
          score: Math.max(100, Math.round(200000 / (s.played / 60 + 10))),
          title: `${goal} robots built — the factory is complete!`,
          details: [
            { label: 'Time played', value: formatDuration(s.played) },
            { label: 'Income', value: `$${formatNumber(flow(s).income)}/s` },
            {
              label: 'Machines',
              value: String(Object.values(s.machines).reduce((a, b) => a + b, 0)),
            },
          ],
        });
      }
    },
    started.current && !shell.paused && !pending,
  );

  const buy = useCallback(
    (id: string) => {
      if (shell.paused || pending) return;
      begin();
      if (buyMachine(f.current, id, growth)) shell.play('coin');
    },
    [begin, growth, pending, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < MACHINES.length && unlocked(f.current, i)) buy(MACHINES[i].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buy]);

  const s = f.current;
  const fl = flow(s);
  return (
    <div className="idle">
      {pending && (
        <div className="idle-wide">
          <ResumePrompt
            label={`${Math.floor(pending.made.robot)} robots · ${formatDuration(pending.played)}`}
            onContinue={resume}
            onNew={restart}
          />
        </div>
      )}
      <section className="idle-panel idle-wide">
        <div className="idle-total">
          <strong>${formatNumber(s.money)}</strong>
          <span>
            +${formatNumber(fl.income)}/s · {Math.floor(s.made.robot)} / {goal} robots built
          </span>
        </div>
        <div
          className="idle-progress"
          role="progressbar"
          aria-valuenow={Math.floor((s.made.robot / goal) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div style={{ width: `${Math.min(100, (s.made.robot / goal) * 100)}%` }} />
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
      <section className="idle-panel" aria-label="Production line">
        <strong>Production line</strong>
        <div className="idle-shop">
          {MACHINES.map((m, i) => {
            if (!unlocked(s, i)) return null;
            const n = s.machines[m.id] ?? 0;
            const busy = fl.busy[m.id] ?? 0;
            const inputs = Object.entries(m.inputs)
              .map(([r, q]) => `${q} ${ICONS[r as keyof typeof ICONS]}`)
              .join(' + ');
            return (
              <div key={m.id}>
                <ShopItem
                  icon={m.icon}
                  name={`${m.name} (key ${i + 1})`}
                  detail={
                    <>
                      {inputs ? `${inputs} → ` : ''}1 {ICONS[m.output]} · makes{' '}
                      {formatNumber(fl.made[m.output])}/s, sells {formatNumber(fl.sold[m.output])}/s
                    </>
                  }
                  count={n}
                  cost={`$${formatNumber(machineCost(s, m.id, growth))}`}
                  affordable={machineCost(s, m.id, growth) <= s.money}
                  onBuy={() => buy(m.id)}
                />
                {n > 0 && i > 0 && (
                  <div
                    className="small"
                    style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 10px' }}
                  >
                    <span className="muted">Busy</span>
                    <div className="idle-progress" style={{ flex: 1, height: 6 }}>
                      <div
                        style={{
                          width: `${busy * 100}%`,
                          background: busy < 0.6 ? '#ef4444' : busy < 0.95 ? '#f59e0b' : '#22c55e',
                        }}
                      />
                    </div>
                    <span className="muted">{busy < 0.95 ? 'needs more input' : 'running'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className="idle-panel" aria-label="Upgrades">
        <strong>Upgrades</strong>
        <div className="idle-shop">
          {UPGRADES.filter(
            (u) => !s.upgrades.includes(u.id) && (!u.machine || (s.machines[u.machine] ?? 0) > 0),
          ).map((u) => (
            <ShopItem
              key={u.id}
              icon={u.icon}
              name={u.name}
              detail={u.desc}
              cost={`$${formatNumber(u.cost)}`}
              affordable={u.cost <= s.money}
              onBuy={() => {
                begin();
                if (buyUpgrade(f.current, u.id)) shell.play('success');
              }}
            />
          ))}
          {s.upgrades.length > 0 && (
            <p className="small muted">
              Owned: {s.upgrades.map((id) => UPGRADES.find((u) => u.id === id)?.name).join(', ')}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
