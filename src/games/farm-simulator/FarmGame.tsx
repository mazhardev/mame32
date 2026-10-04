'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  CROPS,
  EXPAND_COST,
  FORAGE_PAY,
  LAST_DAY,
  SPRINKLER_COST,
  TUNING,
  act,
  actionFor,
  canFinish,
  cropOf,
  expand,
  forage,
  newFarm,
  placeSprinkler,
  ripe,
  seasonOf,
  sleep,
  sprinklerCover,
  validFarm,
} from './engine';
import type { Farm, Plot } from './engine';
import './farm.css';

const SEASON_ICON = { spring: '🌸', summer: '☀️', autumn: '🍂' } as const;

function plotIcon(p: Plot) {
  if (p.sprinkler) return '⛲';
  if (p.dead) return '🥀';
  const c = cropOf(p.crop);
  if (!c) return '';
  if (ripe(p)) return c.icon;
  const need = p.harvested && c.regrow ? c.regrow : c.days;
  return p.age >= need / 2 ? '🌿' : '🌱';
}

export default function FarmGame() {
  const shell = useGameShell();
  const t = TUNING[shell.difficulty];
  const [f, setF] = useState<Farm>(() => newFarm(Math.floor(Math.random() * 1e9), t));
  const [seed, setSeed] = useState('radish');
  const [placing, setPlacing] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [msg, setMsg] = useState(
    'Tap soil to plant, tap young crops to water, tap ripe crops to harvest.',
  );
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('farm-simulator', validFarm);
  const [pending, setPending] = useState<Farm | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (save.saved && save.saved.day <= LAST_DAY) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    setF(newFarm(Math.floor(Math.random() * 1e9), t));
    setPending(null);
    setDone(false);
    setStarted(false);
    setPlacing(false);
    save.clear();
  }, [save, t]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const begin = useCallback(() => {
    if (started) return;
    setStarted(true);
    shell.startRound();
  }, [shell, started]);

  const persist = useCallback(() => {
    f.savedAt = Date.now();
    save.persist(JSON.parse(JSON.stringify(f)) as Farm, {
      percent: Math.min(100, Math.round((f.coins / t.goal) * 100)),
      label: `Day ${f.day} · ${f.coins} coins`,
    });
  }, [f, save, t.goal]);

  const tap = useCallback(
    (i: number) => {
      if (done || pending || shell.paused) return;
      begin();
      setCursor(i);
      if (placing) {
        if (placeSprinkler(f, i)) {
          shell.play('success');
          void reportProgress('farm-simulator.sprinkler', 1);
          setMsg('Sprinkler placed — it waters the eight plots around it every morning.');
        } else setMsg(`A sprinkler costs ${SPRINKLER_COST} coins and needs an empty plot.`);
        setPlacing(false);
      } else {
        const p = f.plots[i];
        if (f.energy <= 0) setMsg('You are out of energy — sleep to start a new day.');
        else {
          const a = act(f, i, seed);
          if (a === 'harvest') {
            shell.play('coin');
            void reportProgress('farm-simulator.first', 1);
            if (f.best.includes('pumpkin')) void reportProgress('farm-simulator.pumpkin', 1);
          } else if (a === 'plant') shell.play('pop');
          else if (a === 'water') shell.play('blip');
          else if (a === 'clear') shell.play('click');
          else {
            const c = cropOf(seed);
            if (!p.crop && c && !c.seasons.includes(seasonOf(f.day)))
              setMsg(`${c.name} does not grow in ${seasonOf(f.day)}.`);
            else if (!p.crop && c && f.coins < c.seed)
              setMsg(`Not enough coins for ${c.name} seeds.`);
            else if (p.crop && p.watered) setMsg('Already watered today.');
          }
        }
      }
      persist();
      refresh();
    },
    [begin, done, f, pending, persist, placing, seed, shell],
  );

  const endDay = useCallback(() => {
    if (done || pending || shell.paused) return;
    begin();
    if (f.day >= LAST_DAY) {
      const won = f.coins >= t.goal;
      void incrementProgress('farm-simulator.harvests', f.harvested);
      if (won) void reportProgress('farm-simulator.goal', 1);
      if (won && shell.difficulty === 'hard') void reportProgress('farm-simulator.hard', 1);
      save.clear();
      setDone(true);
      shell.endRound({
        won,
        lost: !won,
        score: f.coins,
        title: won ? `A bumper year: ${f.coins} coins!` : `The year ends with ${f.coins} coins`,
        details: [
          { label: 'Crops harvested', value: String(f.harvested) },
          { label: 'Coins earned from crops', value: String(f.earned) },
          { label: 'Goal', value: String(t.goal) },
        ],
      });
      return;
    }
    const season = seasonOf(f.day);
    sleep(f, t);
    shell.play('select');
    setMsg(
      seasonOf(f.day) !== season
        ? `${SEASON_ICON[seasonOf(f.day)]} ${seasonOf(f.day)} has arrived! Crops that cannot grow now have withered.`
        : f.raining
          ? '🌧️ It is raining — every crop is watered today.'
          : 'A new day.',
    );
    const c = cropOf(seed);
    if (c && !c.seasons.includes(seasonOf(f.day))) {
      const next = CROPS.find((x) => x.seasons.includes(seasonOf(f.day)));
      if (next) setSeed(next.id);
    }
    persist();
    refresh();
  }, [begin, done, f, pending, persist, save, seed, shell, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const k = e.key;
      if (k.startsWith('Arrow')) {
        const dc = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0;
        const dr = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0;
        setCursor((c) => {
          const col = Math.min(f.cols - 1, Math.max(0, (c % f.cols) + dc));
          const row = Math.min(f.rows - 1, Math.max(0, Math.floor(c / f.cols) + dr));
          return row * f.cols + col;
        });
        e.preventDefault();
      } else if ((k === 'Enter' || k === ' ') && tag !== 'BUTTON') {
        e.preventDefault();
        tap(cursor);
      } else if (k === 'n') endDay();
      else if (/^[1-8]$/.test(k)) {
        const c = CROPS[Number(k) - 1];
        if (c) setSeed(c.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, endDay, f.cols, f.rows, tap]);

  const season = seasonOf(f.day);
  const cover = sprinklerCover(f);

  return (
    <div className="farm">
      <GameHud
        items={[
          { label: 'Day', value: `${f.day}/${LAST_DAY}` },
          { label: 'Coins', value: f.coins },
          { label: 'Energy', value: `${f.energy}/${t.energy}` },
          { label: 'Goal', value: t.goal },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Day ${pending.day} · ${pending.coins} coins`}
          onContinue={() => {
            setF(pending);
            setPending(null);
            save.dismiss();
            setStarted(true);
            shell.startRound();
          }}
          onNew={restart}
        />
      )}
      <div className="farm-weather" aria-live="polite">
        {SEASON_ICON[season]} {season[0].toUpperCase() + season.slice(1)}, day{' '}
        {((f.day - 1) % 10) + 1} of 10 · {f.raining ? '🌧️ Rain today' : '☀️ Dry today'}
        <div className="small muted">{msg}</div>
      </div>
      <div
        className="farm-grid"
        style={{ gridTemplateColumns: `repeat(${f.cols}, minmax(0, 1fr))` }}
      >
        {f.plots.map((p, i) => {
          const c = cropOf(p.crop);
          const a = actionFor(p);
          const wet = !!p.crop && !p.dead && (p.watered || f.raining || cover.has(i));
          const label = p.sprinkler
            ? 'Sprinkler'
            : p.dead
              ? 'Withered crop — tap to clear'
              : c
                ? `${c.name}, ${ripe(p) ? 'ready to harvest' : `${p.age} of ${p.harvested && c.regrow ? c.regrow : c.days} days`}${wet ? ', watered' : ', needs water'}`
                : `Empty soil — tap to plant ${cropOf(seed)?.name ?? ''}`;
          return (
            <button
              key={i}
              type="button"
              className={`farm-plot${wet ? ' wet' : ''}${ripe(p) ? ' ripe' : ''}${cursor === i ? ' cursor' : ''}`}
              aria-label={label}
              onClick={() => tap(i)}
              data-action={a ?? ''}
            >
              {plotIcon(p)}
              {c && !p.dead && !ripe(p) && <span className="farm-age">{p.age}</span>}
            </button>
          );
        })}
      </div>
      <div className="farm-seeds" role="radiogroup" aria-label="Seeds">
        {CROPS.map((c, i) => {
          const ok = c.seasons.includes(season);
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              className="farm-seed"
              aria-checked={seed === c.id}
              aria-pressed={seed === c.id}
              disabled={!ok}
              onClick={() => {
                setSeed(c.id);
                setPlacing(false);
              }}
              title={canFinish(c, f.day) ? '' : 'Will not be ready before it withers'}
            >
              <strong>
                {c.icon} {c.name} <span className="muted small">{i + 1}</span>
              </strong>
              {c.seed}c seed · {c.days}d{c.regrow ? ` (+${c.regrow}d regrow)` : ''}
              <br />
              sells {f.prices[c.id]}c{!canFinish(c, f.day) && ok ? ' · too late' : ''}
            </button>
          );
        })}
      </div>
      <div className="farm-tools">
        <button
          type="button"
          className={`btn ${placing ? 'btn-primary' : ''}`}
          onClick={() => setPlacing((x) => !x)}
          disabled={done || f.coins < SPRINKLER_COST}
        >
          ⛲ Sprinkler ({SPRINKLER_COST}c)
        </button>
        <button
          type="button"
          className="btn"
          disabled={done || f.cols >= 8 || f.coins < EXPAND_COST(f.cols)}
          onClick={() => {
            begin();
            if (expand(f)) {
              shell.play('success');
              persist();
              refresh();
            }
          }}
        >
          🧱 Expand farm ({EXPAND_COST(f.cols)}c)
        </button>
        <button
          type="button"
          className="btn"
          disabled={done || f.energy === 0}
          onClick={() => {
            begin();
            const got = forage(f, f.energy);
            setMsg(
              `You spend the rest of the day foraging and find ${got} coins' worth of berries.`,
            );
            shell.play('coin');
            persist();
            refresh();
          }}
        >
          🫐 Forage ({FORAGE_PAY}c per energy)
        </button>
        <button type="button" className="btn btn-primary" onClick={endDay} disabled={done}>
          🌙 {f.day >= LAST_DAY ? 'End the year' : 'Sleep (N)'}
        </button>
      </div>
    </div>
  );
}
