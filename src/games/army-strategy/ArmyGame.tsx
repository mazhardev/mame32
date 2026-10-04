'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import {
  highestUnlocked,
  levelKey,
  solvedInPack,
  useLevelProgress,
} from '../_shared/puzzle/levels';
import {
  MAX_ROUNDS,
  MISSIONS,
  TERRAIN,
  UNITS,
  aiPlan,
  at,
  attack,
  damage,
  endTurn,
  move,
  newBattle,
  onEnemyBanner,
  reachable,
  targets,
  validBattle,
} from './engine';
import type { Battle } from './engine';
import './army.css';

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export default function ArmyGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const lp = useLevelProgress<Battle>('army-strategy', validBattle, { better: (a, b) => a < b });
  const [b, setB] = useState<Battle | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const alive = useRef(true);
  const pausedRef = useRef(shell.paused);
  pausedRef.current = shell.paused;
  const startUnits = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const restart = useCallback(() => {
    setB(null);
    setSel(null);
    setAiBusy(false);
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const start = (mission: number, saved?: Battle) => {
    const battle = saved ?? newBattle(mission, d);
    startUnits.current = battle.units.filter((u) => u.side === 0).length;
    setB(battle);
    setSel(null);
    shell.startRound();
    shell.play('select');
  };

  const finish = useCallback(
    (battle: Battle) => {
      const won = battle.winner === 0;
      const survivors = battle.units.filter((u) => u.side === 0).length;
      const score = won
        ? Math.max(100, 1000 - battle.round * 30 + survivors * 60)
        : battle.kills[0] * 40;
      void incrementProgress('army-strategy.kills', battle.kills[0]);
      if (won) {
        const key = levelKey(d, battle.mission);
        lp.recordSolve(key, battle.round);
        const solved = { ...lp.progress.solved, [key]: battle.round };
        void reportProgress('army-strategy.win', 1);
        void reportProgress('army-strategy.campaign', solvedInPack(solved, d));
        if (d === 'hard') void reportProgress('army-strategy.hard', solvedInPack(solved, 'hard'));
        if (survivors === startUnits.current) void reportProgress('army-strategy.flawless', 1);
        if (battle.units.some((u) => u.side === 1)) void reportProgress('army-strategy.banner', 1);
      } else lp.clearCurrent();
      const next = battle.mission + 1 < MISSIONS.length && won;
      shell.endRound({
        won,
        lost: !won,
        score,
        title: won
          ? `Victory: ${MISSIONS[battle.mission].name}`
          : battle.round > MAX_ROUNDS
            ? 'Out of time — the enemy holds'
            : 'Defeat',
        details: [
          { label: 'Rounds', value: String(Math.min(battle.round, MAX_ROUNDS)) },
          { label: 'Enemies defeated', value: String(battle.kills[0]) },
          { label: 'Units lost', value: String(battle.kills[1]) },
        ],
        next: next
          ? {
              label: `Next mission: ${MISSIONS[battle.mission + 1].name}`,
              action: () => start(battle.mission + 1),
            }
          : undefined,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d, lp, shell],
  );

  const runAi = useCallback(
    async (battle: Battle) => {
      setAiBusy(true);
      const order = battle.units
        .filter((u) => u.side === 1)
        .sort((a, c) => UNITS[c.kind].min - UNITS[a.kind].min);
      for (const unit of order) {
        while (pausedRef.current || document.hidden) {
          await wait(200);
          if (!alive.current) return;
        }
        if (!alive.current || battle.winner !== null || unit.hp <= 0) break;
        const plan = aiPlan(battle, unit, d, Math.random);
        if (plan.to[0] !== unit.x || plan.to[1] !== unit.y) {
          move(battle, unit, plan.to[0], plan.to[1]);
          refresh();
          await wait(320);
        }
        const target = plan.target !== null ? battle.units.find((x) => x.id === plan.target) : null;
        if (target && battle.winner === null) {
          const res = attack(battle, unit, target);
          shell.play(res?.killed ? 'explosion' : 'hit');
          refresh();
          await wait(380);
        }
      }
      if (!alive.current) return;
      endTurn(battle);
      setAiBusy(false);
      refresh();
      if (battle.winner !== null) finish(battle);
      else {
        lp.saveCurrent(levelKey(d, battle.mission), JSON.parse(JSON.stringify(battle)) as Battle);
        if (onEnemyBanner(battle, 1))
          battle.log = [
            '⚠️ The enemy is on your banner — drive them off this turn!',
            ...battle.log,
          ];
      }
    },
    [d, finish, lp, shell],
  );

  const endPlayerTurn = () => {
    if (!b || b.turn !== 0 || aiBusy || b.winner !== null || shell.paused) return;
    setSel(null);
    endTurn(b);
    refresh();
    if (b.winner !== null) return finish(b);
    void runAi(b);
  };

  const tap = (x: number, y: number) => {
    if (!b || b.turn !== 0 || aiBusy || b.winner !== null || shell.paused) return;
    const unit = at(b, x, y);
    const me = sel !== null ? (b.units.find((u) => u.id === sel) ?? null) : null;
    if (me && unit && unit.side === 1) {
      const res = attack(b, me, unit);
      if (res) {
        shell.play(res.killed ? 'explosion' : 'hit');
        setSel(null);
        refresh();
        if (b.winner !== null) finish(b);
        return;
      }
    }
    if (unit && unit.side === 0) {
      setSel(unit.acted ? null : unit.id === sel ? null : unit.id);
      shell.play('click');
      return;
    }
    if (me && !unit && move(b, me, x, y)) {
      shell.play('blip');
      if (!targets(b, me).length) setSel(null);
      refresh();
      return;
    }
    setSel(null);
  };

  if (!b) {
    const unlocked = highestUnlocked(lp.progress.solved, d, MISSIONS.length);
    const cur = lp.progress.current;
    const resume = cur && cur.key.startsWith(`${d}:`) ? cur.state : null;
    return (
      <div className="army">
        <div className="army-menu card">
          <h3 style={{ margin: 0 }}>Choose a mission</h3>
          <p className="muted small" style={{ margin: 0 }}>
            Missions unlock in order on each difficulty. Defeat every enemy, or hold their banner 🏴
            for a full turn.
          </p>
          {resume && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => start(resume.mission, resume)}
              disabled={lp.loading}
            >
              Continue {MISSIONS[resume.mission].name} (round {resume.round})
            </button>
          )}
          {MISSIONS.map((m, i) => {
            const best = lp.progress.solved[levelKey(d, i)];
            return (
              <button
                key={m.name}
                type="button"
                className="army-mission"
                disabled={i > unlocked || lp.loading}
                onClick={() => start(i)}
              >
                <strong>
                  {i > unlocked ? '🔒' : best !== undefined ? '⭐' : '⚔️'} {i + 1}. {m.name}
                </strong>
                <span className="small muted">{m.brief}</span>
                {best !== undefined && <span className="small">Won in {best} rounds</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const me = sel !== null ? (b.units.find((u) => u.id === sel) ?? null) : null;
  const reach = me && !me.moved ? reachable(b, me) : null;
  const hits = me ? new Set(targets(b, me).map((t) => t.id)) : new Set<number>();
  const ready = b.units.filter((u) => u.side === 0 && !u.acted).length;

  return (
    <div className="army">
      <GameHud
        items={[
          { label: 'Round', value: `${b.round}/${MAX_ROUNDS}` },
          { label: 'Turn', value: b.turn === 0 ? 'Yours' : 'Enemy' },
          { label: 'Your units', value: b.units.filter((u) => u.side === 0).length },
          { label: 'Enemies', value: b.units.filter((u) => u.side === 1).length },
        ]}
      />
      <div className="army-info small" aria-live="polite">
        {me ? (
          <>
            <strong>
              {UNITS[me.kind].icon} {UNITS[me.kind].name}
            </strong>{' '}
            {me.hp}/{UNITS[me.kind].hp} HP · move {UNITS[me.kind].move} · range {UNITS[me.kind].min}
            {UNITS[me.kind].max > UNITS[me.kind].min ? `–${UNITS[me.kind].max}` : ''}
            {me.kind === 'catapult' && ' · cannot fire after moving'}
            {hits.size > 0 && ' · tap a red enemy to attack'}
          </>
        ) : (
          b.log[0]
        )}
      </div>
      <div
        className="army-grid"
        style={{ gridTemplateColumns: `repeat(${b.w}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="Battlefield"
      >
        {b.map.map((t, k) => {
          const x = k % b.w;
          const y = Math.floor(k / b.w);
          const unit = at(b, x, y);
          const canMove = reach?.has(k) && !unit;
          const canHit = unit && hits.has(unit.id);
          const preview = canHit && me ? `≈${damage(b, me, unit)} dmg` : '';
          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              className={`army-tile t-${t}${canMove ? ' move' : ''}${canHit ? ' hit' : ''}${unit && unit.id === sel ? ' sel' : ''}`}
              onClick={() => tap(x, y)}
              aria-label={`${TERRAIN[t].name}${unit ? `, ${unit.side === 0 ? 'your' : 'enemy'} ${UNITS[unit.kind].name} ${unit.hp} HP${unit.acted && unit.side === 0 ? ', done' : ''}` : ''}${canMove ? ', can move here' : ''}${canHit ? `, can attack (${preview})` : ''}`}
            >
              {TERRAIN[t].icon && <span className="army-terrain">{TERRAIN[t].icon}</span>}
              {unit && (
                <span
                  className={`army-unit s${unit.side}${unit.acted && unit.side === b.turn ? ' done' : ''}`}
                >
                  <span className="army-unit-icon">{UNITS[unit.kind].icon}</span>
                  <span className="army-hp">
                    <span style={{ width: `${(unit.hp / UNITS[unit.kind].hp) * 100}%` }} />
                  </span>
                </span>
              )}
              {preview && <span className="army-preview">{preview}</span>}
            </button>
          );
        })}
      </div>
      <div className="army-actions">
        {me && !me.acted && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              me.moved = true;
              me.acted = true;
              setSel(null);
            }}
          >
            ✋ Hold position
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={endPlayerTurn}
          disabled={b.turn !== 0 || aiBusy || b.winner !== null}
        >
          {aiBusy
            ? 'Enemy is moving…'
            : `End turn${ready ? ` (${ready} unit${ready > 1 ? 's' : ''} ready)` : ''}`}
        </button>
      </div>
      <details className="army-help small">
        <summary>Unit guide</summary>
        <ul>
          {Object.values(UNITS).map((s) => (
            <li key={s.name}>
              {s.icon} <strong>{s.name}</strong>: {s.hp} HP, attack {s.atk}, move {s.move}, range{' '}
              {s.min}
              {s.max > s.min ? `–${s.max}` : ''}
            </li>
          ))}
          <li>Spearmen beat riders · riders beat archers and catapults · archers beat spearmen.</li>
          <li>🌲 Forest: 30% cover · ⛰️ Hill: 20% cover · both cost 2 movement.</li>
        </ul>
      </details>
    </div>
  );
}
