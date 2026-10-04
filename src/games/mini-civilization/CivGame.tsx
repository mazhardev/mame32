import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  BUILDINGS,
  MAX_TURNS,
  TECHS,
  TECH_IDS,
  TERRAIN,
  UNITS,
  aiTurn,
  attack,
  attackTargets,
  availableTechs,
  buildCost,
  buildOptions,
  canFound,
  cityAt,
  cityYield,
  endTurn,
  growthNeeded,
  idx,
  moveUnit,
  newGame,
  reachable,
  score,
  setResearch,
  settle,
  techCost,
  validGame,
  winChance,
} from './engine';
import type { Build, City, Game, Unit } from './engine';
import './civ.css';

const AGGRESSION = { easy: 0.3, normal: 0.5, hard: 0.75 } as const;
const buildLabel = (b: Build) =>
  b.type === 'unit'
    ? `${UNITS[b.id].icon} ${UNITS[b.id].name}`
    : `${BUILDINGS[b.id].icon} ${BUILDINGS[b.id].name}`;

export default function CivGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const [g, setG] = useState<Game>(() => newGame(Math.floor(Math.random() * 1e9)));
  const [selUnit, setSelUnit] = useState<number | null>(null);
  const [selCity, setSelCity] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('mini-civilization', validGame);
  const [pending, setPending] = useState<Game | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (save.saved) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    setG(newGame(Math.floor(Math.random() * 1e9)));
    setSelUnit(null);
    setSelCity(null);
    setPending(null);
    setStarted(false);
    setBusy(false);
    done.current = false;
    save.clear();
  }, [save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const begin = () => {
    if (started) return;
    setStarted(true);
    shell.startRound();
  };

  const checkEnd = useCallback(() => {
    if (g.winner === null || done.current) return false;
    done.current = true;
    save.clear();
    const won = g.winner === 0;
    if (won && g.how === 'science') void reportProgress('mini-civilization.science', 1);
    if (won && g.how === 'conquest') void reportProgress('mini-civilization.conquest', 1);
    if (won && d === 'hard') void reportProgress('mini-civilization.hard', 1);
    shell.endRound({
      won,
      lost: !won,
      score: score(g, 0) + (won ? 500 + Math.max(0, MAX_TURNS - g.turn) * 5 : 0),
      title: won
        ? g.how === 'science'
          ? 'Victory! Your Grand Observatory reaches for the stars'
          : g.how === 'conquest'
            ? 'Victory! The rival capital is yours'
            : 'Victory on points!'
        : g.how === 'science'
          ? 'The rival completed the Grand Observatory'
          : g.how === 'conquest'
            ? 'Your capital has fallen'
            : 'The rival wins on points',
      details: [
        { label: 'Turn', value: String(g.turn) },
        { label: 'Your cities', value: String(g.cities.filter((c) => c.owner === 0).length) },
        { label: 'Technologies', value: `${g.civs[0].techs.length}/${TECH_IDS.length}` },
      ],
    });
    return true;
  }, [d, g, save, shell]);

  const myTurnEnd = () => {
    if (busy || pending || g.winner !== null || shell.paused) return;
    begin();
    setBusy(true);
    setSelUnit(null);
    const citiesBefore = g.cities.filter((c) => c.owner === 0).length;
    endTurn(g, 0, d);
    if (checkEnd()) return setBusy(false);
    refresh();
    window.setTimeout(() => {
      aiTurn(g, 1, d, Math.random, AGGRESSION[d]);
      setBusy(false);
      const mine = g.cities.filter((c) => c.owner === 0);
      void reportProgress('mini-civilization.cities', mine.length);
      void reportProgress('mini-civilization.techs', g.civs[0].techs.length);
      if (mine.length < citiesBefore) shell.play('failure');
      else shell.play('select');
      if (!checkEnd()) {
        save.persist(JSON.parse(JSON.stringify(g)) as Game, {
          percent: Math.round((g.civs[0].techs.length / TECH_IDS.length) * 100),
          label: `Turn ${g.turn} · ${mine.length} cities · ${g.civs[0].techs.length} techs`,
        });
      }
      refresh();
    }, 250);
  };

  const unit =
    selUnit !== null ? (g.units.find((u) => u.id === selUnit && u.owner === 0) ?? null) : null;
  const city =
    selCity !== null ? (g.cities.find((c) => c.id === selCity && c.owner === 0) ?? null) : null;
  const reach = unit && unit.moves > 0 && UNITS[unit.kind] ? reachable(g, unit) : null;
  const targets = unit ? attackTargets(g, unit) : [];

  const tap = (x: number, y: number) => {
    if (busy || pending || g.winner !== null || shell.paused) return;
    begin();
    if (unit) {
      if (targets.some(([tx, ty]) => tx === x && ty === y)) {
        const res = attack(g, unit, x, y, Math.random);
        if (res) {
          shell.play(res.won ? 'explosion' : 'failure');
          if (res.won) void incrementProgress('mini-civilization.battles', 1);
          if (res.captured) shell.play('success');
          setSelUnit(null);
          checkEnd();
          refresh();
          return;
        }
      }
      if (reach?.has(idx(g, x, y))) {
        moveUnit(g, unit, x, y);
        shell.play('blip');
        if (unit.moves <= 0 && !attackTargets(g, unit).length) setSelUnit(null);
        refresh();
        return;
      }
    }
    const mine = g.units.filter((u) => u.x === x && u.y === y && u.owner === 0);
    const c = cityAt(g, x, y);
    // Cycle: units with moves first, then the city.
    const ready = mine.filter((u) => u.moves > 0);
    if (
      ready.length &&
      !(unit && unit.x === x && unit.y === y && ready.indexOf(unit) === ready.length - 1)
    ) {
      const next = unit && ready.includes(unit) ? ready[ready.indexOf(unit) + 1] : ready[0];
      setSelUnit(next.id);
      setSelCity(c && c.owner === 0 ? c.id : null);
      shell.play('click');
      return;
    }
    setSelUnit(null);
    setSelCity(c && c.owner === 0 ? c.id : null);
  };

  const nextUnit = () => {
    const ready = g.units.filter((u) => u.owner === 0 && u.moves > 0 && !u.fortified);
    if (!ready.length) return;
    const i = unit ? (ready.indexOf(unit) + 1) % ready.length : 0;
    setSelUnit(ready[i].id);
    setSelCity(null);
  };

  const civ = g.civs[0];
  const myCities = g.cities.filter((c) => c.owner === 0);

  const cityPanel = (c: City) => {
    const y = cityYield(g, c);
    return (
      <div className="civ-panel">
        <strong>
          {c.capital ? '👑 ' : ''}
          {c.name} · pop {c.pop}
        </strong>
        <span className="small">
          🍞 {c.food}/{growthNeeded(c)} ({y.surplus >= 0 ? '+' : ''}
          {y.surplus}) · ⚒️ {c.prod}/{buildCost(c.build)} (+{y.prod}) · 🔬 +{y.science}
        </span>
        {c.buildings.length > 0 && (
          <span className="small muted">
            Built: {c.buildings.map((b) => BUILDINGS[b].icon).join(' ')}
          </span>
        )}
        <span className="small">Producing:</span>
        <div className="civ-builds">
          {buildOptions(g, c).map((b) => {
            const on = c.build.type === b.type && c.build.id === b.id;
            return (
              <button
                key={`${b.type}-${b.id}`}
                type="button"
                className={`btn btn-sm${on ? ' btn-primary' : ''}`}
                onClick={() => {
                  c.build = b;
                  refresh();
                }}
                title={
                  b.type === 'building'
                    ? BUILDINGS[b.id].desc
                    : `Attack ${UNITS[b.id].atk}, defence ${UNITS[b.id].def}, moves ${UNITS[b.id].move}`
                }
              >
                {buildLabel(b)} <span className="muted">{buildCost(b)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const unitPanel = (u: Unit) => (
    <div className="civ-panel">
      <strong>
        {UNITS[u.kind].icon} {UNITS[u.kind].name}
      </strong>
      <span className="small">
        Attack {UNITS[u.kind].atk} · defence {UNITS[u.kind].def} · moves {u.moves}/
        {UNITS[u.kind].move}
        {u.fortified ? ' · fortified' : ''}
      </span>
      {targets.length > 0 && (
        <span className="small">
          Red tiles can be attacked:{' '}
          {targets.map(([x, y]) => `${Math.round(winChance(g, u, x, y) * 100)}%`).join(', ')} chance
          to win
        </span>
      )}
      <div className="civ-builds">
        {u.kind === 'settler' && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={!canFound(g, u.x, u.y) || u.moves <= 0}
            onClick={() => {
              const c = settle(g, u);
              if (c) {
                shell.play('success');
                setSelUnit(null);
                setSelCity(c.id);
                void reportProgress(
                  'mini-civilization.cities',
                  g.cities.filter((x) => x.owner === 0).length,
                );
              }
            }}
          >
            🏙️ Found city here
          </button>
        )}
        {UNITS[u.kind].atk > 0 && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              u.fortified = true;
              u.moves = 0;
              setSelUnit(null);
            }}
          >
            🛡️ Fortify
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            u.moves = 0;
            setSelUnit(null);
            nextUnit();
          }}
        >
          ⏭️ Skip
        </button>
      </div>
      {u.kind === 'settler' && !canFound(g, u.x, u.y) && (
        <span className="small muted">
          Cities must be at least 3 tiles from any other city, on dry land.
        </span>
      )}
    </div>
  );

  return (
    <div className="civ">
      <GameHud
        items={[
          { label: 'Turn', value: `${g.turn}/${MAX_TURNS}` },
          { label: 'Cities', value: `${myCities.length} vs ${g.cities.length - myCities.length}` },
          { label: 'Techs', value: `${civ.techs.length} vs ${g.civs[1].techs.length}` },
          { label: 'Score', value: `${score(g, 0)} vs ${score(g, 1)}` },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Turn ${pending.turn} · ${pending.cities.filter((c) => c.owner === 0).length} cities`}
          onContinue={() => {
            setG(pending);
            setPending(null);
            save.dismiss();
            setStarted(true);
            shell.startRound();
          }}
          onNew={restart}
        />
      )}
      <div className="civ-log small" aria-live="polite">
        {g.log[0]}
      </div>
      <div
        className="civ-map"
        style={{ gridTemplateColumns: `repeat(${g.w}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="World map"
      >
        {g.map.map((tile, k) => {
          const x = k % g.w;
          const y = Math.floor(k / g.w);
          const c = cityAt(g, x, y);
          const us = g.units.filter((u) => u.x === x && u.y === y);
          const top =
            us.find((u) => u.id === selUnit) ?? us.find((u) => UNITS[u.kind].atk > 0) ?? us[0];
          const canMove = reach?.has(k);
          const canHit = targets.some(([tx, ty]) => tx === x && ty === y);
          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              className={`civ-tile t-${tile.t}${canMove ? ' move' : ''}${canHit ? ' hit' : ''}${(top && top.id === selUnit) || (c && c.id === selCity && !unit) ? ' sel' : ''}`}
              onClick={() => tap(x, y)}
              aria-label={`${TERRAIN[tile.t].name}${tile.bonus ? ` with ${tile.bonus}` : ''}${c ? `, ${c.owner === 0 ? 'your' : 'rival'} city ${c.name} (pop ${c.pop})` : ''}${us.length ? `, ${us.map((u) => `${u.owner === 0 ? 'your' : 'rival'} ${UNITS[u.kind].name}`).join(', ')}` : ''}${canHit && unit ? `, attack: ${Math.round(winChance(g, unit, x, y) * 100)}% to win` : ''}`}
            >
              {tile.bonus && (
                <span className="civ-bonus">{tile.bonus === 'wheat' ? '🌾' : '💎'}</span>
              )}
              {tile.t === 'forest' && !c && !top && <span className="civ-deco">🌲</span>}
              {tile.t === 'mountain' && <span className="civ-deco">⛰️</span>}
              {c && (
                <span className={`civ-city o${c.owner}`}>
                  <span>{c.capital ? '🏰' : '🏘️'}</span>
                  <span className="civ-pop">{c.pop}</span>
                </span>
              )}
              {top && (
                <span
                  className={`civ-unit o${top.owner}${top.owner === 0 && top.moves <= 0 ? ' spent' : ''}`}
                >
                  {UNITS[top.kind].icon}
                  {us.length > 1 && <span className="civ-stack">{us.length}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="civ-side">
        {unit ? (
          unitPanel(unit)
        ) : city ? (
          cityPanel(city)
        ) : (
          <div className="civ-panel small muted">
            Tap one of your units (blue) to move it, or a city to choose what it builds.
          </div>
        )}
        <div className="civ-panel">
          <strong>
            🔬 Research:{' '}
            {civ.research ? `${TECHS[civ.research].icon} ${TECHS[civ.research].name}` : 'all done'}
          </strong>
          {civ.research && (
            <span className="small">
              {civ.science}/{techCost(civ)} science
            </span>
          )}
          <div className="civ-builds">
            {availableTechs(civ).map((t) => (
              <button
                key={t}
                type="button"
                className={`btn btn-sm${civ.research === t ? ' btn-primary' : ''}`}
                onClick={() => {
                  setResearch(g, 0, t);
                  refresh();
                }}
              >
                {TECHS[t].icon} {TECHS[t].name}
              </button>
            ))}
          </div>
          <span className="small muted">
            Known: {civ.techs.map((t) => TECHS[t].icon).join(' ') || 'none'} · Rival knows{' '}
            {g.civs[1].techs.length}
          </span>
        </div>
      </div>
      <div className="civ-actions">
        <button type="button" className="btn" onClick={nextUnit} disabled={busy}>
          Next unit
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={myTurnEnd}
          disabled={busy || g.winner !== null}
        >
          {busy ? 'Rival is moving…' : `End turn ${g.turn}`}
        </button>
      </div>
    </div>
  );
}
