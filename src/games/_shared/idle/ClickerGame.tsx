import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DifficultySetting } from '@/types';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { ResumePrompt } from '../puzzle/PuzzleUI';
import {
  affordable,
  buy,
  buyUpgrade,
  click,
  clickValue,
  earn,
  newClicker,
  prestigeAvailable,
  prestigeReset,
  price,
  producerRate,
  producerVisible,
  rate,
  tick,
  upgradeVisible,
  validClicker,
} from './clicker';
import type { ClickerCfg, ClickerState } from './clicker';
import { formatDuration, formatNumber } from './format';
import { BulkSwitch, ShopItem } from './ShopItem';
import { useIdleLoop } from './useIdleLoop';
import { offlineSeconds, useIdleSave } from './useIdleSave';
import './idle.css';

export interface Bonus {
  icon: string;
  name: string;
  /** Seconds between appearances. */
  every: [number, number];
  /** Seconds it stays on screen. */
  life: number;
  /** Applies the bonus and returns a message. */
  claim: (s: ClickerState, perSecond: number, random: () => number) => string;
}

export interface ClickerTheme {
  gameId: string;
  config: (d: DifficultySetting) => ClickerCfg;
  currency: string;
  currencyIcon: string;
  clickIcon: ReactNode;
  clickLabel: string;
  goalText: (goal: string) => string;
  prestigeName?: string;
  bonus?: Bonus;
  /** Achievement milestones for lifetime earnings: [achievement key, amount]. */
  milestones: [string, number][];
  /** Extra achievement checks on every save. */
  report?: (s: ClickerState) => void;
}

const OFFLINE_CAP: Record<DifficultySetting, number> = {
  easy: 4 * 3600,
  normal: 2 * 3600,
  hard: 3600,
};

interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
}

export function ClickerGame({ theme }: { theme: ClickerTheme }) {
  const shell = useGameShell();
  const cfg = useMemo(() => theme.config(shell.difficulty), [theme, shell.difficulty]);
  const s = useRef<ClickerState>(newClicker(cfg));
  const started = useRef(false);
  const [bulk, setBulk] = useState<1 | 10 | 'max'>(1);
  const [tab, setTab] = useState<'build' | 'upgrade' | 'prestige'>('build');
  const [pops, setPops] = useState<Pop[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState<ClickerState | null>(null);
  const bonus = useRef<{ x: number; y: number; life: number } | null>(null);
  const nextBonus = useRef(theme.bonus ? theme.bonus.every[0] : Infinity);
  const popId = useRef(0);

  const snapshot = useCallback(() => {
    if (!started.current) return null;
    const st = s.current;
    st.savedAt = Date.now();
    return {
      state: { ...st, owned: { ...st.owned }, bought: [...st.bought] },
      meta: {
        percent: Math.min(100, Math.floor((st.total / cfg.goal) * 100)),
        label: `${formatNumber(st.total)} ${theme.currency}`,
      },
    };
  }, [cfg.goal, theme.currency]);
  const save = useIdleSave(theme.gameId, validClicker, snapshot);

  useEffect(() => {
    if (save.saved && !started.current) setPending(save.saved);
  }, [save.saved]);

  const begin = useCallback(() => {
    if (started.current) return;
    started.current = true;
    shell.startRound();
  }, [shell]);

  const restart = useCallback(() => {
    s.current = newClicker(cfg);
    started.current = false;
    setPending(null);
    setBanner(null);
    bonus.current = null;
    save.clear();
  }, [cfg, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const resume = useCallback(() => {
    if (!pending) return;
    const st: ClickerState = {
      ...pending,
      owned: { ...pending.owned },
      bought: [...pending.bought],
      boost: 0,
    };
    s.current = st;
    const away = offlineSeconds(pending.savedAt, Date.now(), OFFLINE_CAP[shell.difficulty]);
    const gained = rate(cfg, st) * away * 0.5;
    if (gained > 0) {
      earn(st, gained);
      setBanner(
        `While you were away (${formatDuration(away)}) you earned ${formatNumber(gained)} ${theme.currency}.`,
      );
    }
    setPending(null);
    save.dismiss();
    begin();
  }, [begin, cfg, pending, save, shell.difficulty, theme.currency]);

  const report = useCallback(() => {
    const st = s.current;
    for (const [key, amount] of theme.milestones)
      if (st.total >= amount) void reportProgress(`${theme.gameId}.${key}`, 1);
    theme.report?.(st);
  }, [theme]);

  useEffect(() => {
    const id = window.setInterval(report, 5000);
    return () => window.clearInterval(id);
  }, [report]);

  const checkGoal = useCallback(() => {
    const st = s.current;
    if (st.won || st.total < cfg.goal) return;
    st.won = true;
    report();
    save.flush();
    shell.play('levelComplete');
    shell.endRound({
      won: true,
      score: Math.max(100, Math.round(200000 / (st.played / 60 + 10))),
      title: theme.goalText(formatNumber(cfg.goal)) + ' — goal reached!',
      details: [
        { label: 'Time played', value: formatDuration(st.played) },
        { label: 'Clicks', value: formatNumber(st.clicks) },
        {
          label: `${theme.currency[0].toUpperCase()}${theme.currency.slice(1)} per second`,
          value: formatNumber(rate(cfg, st)),
        },
      ],
    });
  }, [cfg, report, save, shell, theme]);

  const running = !shell.paused && !pending && started.current;
  useIdleLoop(
    (dt) => {
      tick(cfg, s.current, dt);
      if (theme.bonus) {
        if (bonus.current) {
          bonus.current.life -= dt;
          if (bonus.current.life <= 0) bonus.current = null;
        } else {
          nextBonus.current -= dt;
          if (nextBonus.current <= 0) {
            bonus.current = {
              x: 10 + Math.random() * 70,
              y: 15 + Math.random() * 60,
              life: theme.bonus.life,
            };
            const [a, b] = theme.bonus.every;
            nextBonus.current = a + Math.random() * (b - a);
          }
        }
      }
      checkGoal();
    },
    running || (started.current && !shell.paused && !pending),
  );

  const doClick = useCallback(
    (x = 50, y = 40) => {
      if (shell.paused || pending) return;
      begin();
      const v = click(cfg, s.current);
      const id = ++popId.current;
      setPops((p) => [...p.slice(-8), { id, x, y, text: `+${formatNumber(v)}` }]);
      window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 800);
      shell.play('pop');
      checkGoal();
    },
    [begin, cfg, checkGoal, pending, shell],
  );

  const buyProducer = useCallback(
    (id: string) => {
      begin();
      const n = bulk === 'max' ? affordable(cfg, s.current, id) : bulk;
      if (buy(cfg, s.current, id, n)) shell.play('coin');
    },
    [begin, bulk, cfg, shell],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' && tag !== 'BUTTON') {
        e.preventDefault();
        doClick();
      } else if (/^[1-9]$/.test(e.key)) {
        const p = cfg.producers[Number(e.key) - 1];
        if (p) buyProducer(p.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buyProducer, cfg, doClick]);

  const st = s.current;
  const perSecond = rate(cfg, st);
  const visibleUpgrades = cfg.upgrades
    .filter((u) => upgradeVisible(st, u))
    .sort((a, b) => a.cost - b.cost);
  const prestigeNow = prestigeAvailable(cfg, st);

  return (
    <div className="idle">
      {pending && (
        <div className="idle-wide">
          <ResumePrompt
            label={`${formatNumber(pending.total)} ${theme.currency} · ${formatDuration(pending.played)} played`}
            onContinue={resume}
            onNew={restart}
          />
        </div>
      )}
      <section className="idle-panel" aria-label="Your production" style={{ position: 'relative' }}>
        <div className="idle-total" aria-live="off">
          <strong>
            {theme.currencyIcon} {formatNumber(st.amount)}
          </strong>
          <span>
            {formatNumber(perSecond)} per second
            {st.boost > 0 ? ` · ×${st.boostMult} for ${Math.ceil(st.boost)}s!` : ''}
          </span>
        </div>
        <button
          type="button"
          className="idle-click"
          aria-label={`${theme.clickLabel} (+${formatNumber(clickValue(cfg, st))})`}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = e.clientX ? ((e.clientX - r.left) / r.width) * 100 : 50;
            const y = e.clientY ? ((e.clientY - r.top) / r.height) * 100 : 40;
            doClick(x, y);
          }}
        >
          {theme.clickIcon}
          {pops.map((p) => (
            <span key={p.id} className="idle-pop" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              {p.text}
            </span>
          ))}
        </button>
        {theme.bonus && bonus.current && (
          <button
            type="button"
            className="btn"
            style={{
              position: 'absolute',
              left: `${bonus.current.x}%`,
              top: `${bonus.current.y}%`,
              fontSize: '2rem',
              padding: 6,
              borderRadius: '50%',
            }}
            aria-label={`Claim ${theme.bonus.name}`}
            onClick={() => {
              const msg = theme.bonus!.claim(s.current, rate(cfg, s.current), Math.random);
              bonus.current = null;
              setBanner(msg);
              shell.play('powerup');
            }}
          >
            {theme.bonus.icon}
          </button>
        )}
        <div>
          <div className="small muted">{theme.goalText(formatNumber(cfg.goal))}</div>
          <div
            className="idle-progress"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.floor((st.total / cfg.goal) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${Math.min(100, (st.total / cfg.goal) * 100)}%` }} />
          </div>
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
      <section className="idle-panel" aria-label="Shop">
        <div className="idle-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'build'}
            className={`btn btn-sm ${tab === 'build' ? 'btn-primary' : ''}`}
            onClick={() => setTab('build')}
          >
            Buildings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'upgrade'}
            className={`btn btn-sm ${tab === 'upgrade' ? 'btn-primary' : ''}`}
            onClick={() => setTab('upgrade')}
          >
            Upgrades ({visibleUpgrades.filter((u) => u.cost <= st.amount).length})
          </button>
          {cfg.prestige && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'prestige'}
              className={`btn btn-sm ${tab === 'prestige' ? 'btn-primary' : ''}`}
              onClick={() => setTab('prestige')}
            >
              {theme.prestigeName} ({st.prestige})
            </button>
          )}
        </div>
        {tab === 'build' && (
          <>
            <BulkSwitch value={bulk} onChange={setBulk} />
            <div className="idle-shop">
              {cfg.producers.map((p, i) =>
                !producerVisible(cfg, st, i) &&
                i > 0 &&
                !producerVisible(cfg, st, i - 1) ? null : producerVisible(cfg, st, i) ? (
                  <ShopItem
                    key={p.id}
                    icon={p.icon}
                    name={p.name}
                    detail={`${p.desc} · ${formatNumber(producerRate(cfg, st, p))}/s`}
                    count={st.owned[p.id] ?? 0}
                    cost={`${theme.currencyIcon} ${formatNumber(price(cfg, st, p.id, bulk === 'max' ? Math.max(1, affordable(cfg, st, p.id)) : bulk))}${bulk === 'max' ? ` (×${affordable(cfg, st, p.id)})` : ''}`}
                    affordable={
                      bulk === 'max'
                        ? affordable(cfg, st, p.id) > 0
                        : price(cfg, st, p.id, bulk) <= st.amount
                    }
                    onBuy={() => buyProducer(p.id)}
                    label={`Buy ${p.name} (key ${i + 1})`}
                  />
                ) : (
                  <ShopItem
                    key={p.id}
                    icon="❔"
                    name="???"
                    detail="Keep growing to discover"
                    affordable={false}
                  />
                ),
              )}
            </div>
          </>
        )}
        {tab === 'upgrade' && (
          <div className="idle-shop">
            {visibleUpgrades.length === 0 && (
              <p className="small muted">No upgrades yet — buy more buildings to unlock them.</p>
            )}
            {visibleUpgrades.map((u) => (
              <ShopItem
                key={u.id}
                icon={u.icon}
                name={u.name}
                detail={u.desc}
                cost={`${theme.currencyIcon} ${formatNumber(u.cost)}`}
                affordable={u.cost <= st.amount}
                onBuy={() => {
                  if (buyUpgrade(cfg, s.current, u.id)) shell.play('success');
                }}
              />
            ))}
          </div>
        )}
        {tab === 'prestige' && cfg.prestige && (
          <div className="idle-shop">
            <p className="small">
              Each {theme.prestigeName?.toLowerCase().replace(/s$/, '')} adds{' '}
              {Math.round(cfg.prestige.bonus * 100)}% to everything you earn, forever. Starting over
              keeps them but resets your buildings, upgrades and {theme.currency}.
            </p>
            <p>
              You hold <strong>{st.prestige}</strong>. Starting over now would give you{' '}
              <strong>{prestigeNow}</strong> in total.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={prestigeNow <= st.prestige}
              onClick={() => {
                if (prestigeReset(cfg, s.current)) {
                  shell.play('levelComplete');
                  setBanner(
                    `A new beginning — you now hold ${s.current.prestige} ${theme.prestigeName?.toLowerCase()}.`,
                  );
                }
              }}
            >
              Start over for {Math.max(0, prestigeNow - st.prestige)} more
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
