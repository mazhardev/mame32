import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  CAPACITY,
  COST,
  JOBS,
  POWER_RANGE,
  TUNING,
  UPGRADE,
  build,
  costOf,
  finalScore,
  jobs,
  newCity,
  nextMonth,
  population,
  problem,
  validCity,
  xy,
} from './engine';
import type { City, Tile, Tool } from './engine';
import './city.css';

const TOOLS: { id: Tool; icon: string; name: string; help: string }[] = [
  { id: 'road', icon: '🛣️', name: 'Road', help: 'Every building must touch a road.' },
  {
    id: 'house',
    icon: '🏠',
    name: 'House',
    help: 'Homes fill up while there are jobs, and grow taller when happy.',
  },
  { id: 'shop', icon: '🏪', name: 'Shop', help: '10 jobs. Makes homes within 3 tiles happier.' },
  {
    id: 'factory',
    icon: '🏭',
    name: 'Factory',
    help: '25 jobs, but smoke upsets homes within 2 tiles.',
  },
  { id: 'park', icon: '⛲', name: 'Park', help: 'Makes homes within 2 tiles happier.' },
  {
    id: 'power',
    icon: '⚡',
    name: 'Power',
    help: `Powers everything within ${POWER_RANGE} tiles.`,
  },
  { id: 'upgrade', icon: '⬆️', name: 'Upgrade', help: 'Enlarge a shop or factory for more jobs.' },
  { id: 'bulldoze', icon: '🚜', name: 'Clear', help: 'Demolish a building or clear trees.' },
];

const HOUSE_ICON = ['', '🏠', '🏘️', '🏢'];

function tileIcon(t: Tile) {
  switch (t.kind) {
    case 'tree':
      return '🌳';
    case 'house':
      return HOUSE_ICON[t.level];
    case 'shop':
      return t.level >= 3 ? '🏬' : '🏪';
    case 'factory':
      return '🏭';
    case 'park':
      return '⛲';
    case 'power':
      return '⚡';
    default:
      return '';
  }
}

function describe(c: City, i: number) {
  const t = c.tiles[i];
  const issue = problem(c, i);
  const base =
    t.kind === 'house'
      ? `Home (level ${t.level}): ${t.pop}/${CAPACITY[t.level]} residents, happiness ${t.happy}`
      : t.kind === 'shop' || t.kind === 'factory'
        ? `${t.kind === 'shop' ? 'Shop' : 'Factory'} level ${t.level}: ${JOBS[t.kind]?.[t.level]} jobs${
            UPGRADE[t.kind]?.[t.level]
              ? ` · upgrade ${UPGRADE[t.kind]?.[t.level]}c`
              : ' · fully upgraded'
          }`
        : {
            empty: 'Empty land',
            tree: 'Woods',
            water: 'River',
            road: 'Road',
            park: 'Park',
            power: 'Power plant',
          }[t.kind as 'empty'];
  return issue ? `${base} — ${issue}` : base;
}

export default function CityGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const t = TUNING[d];
  const [c, setC] = useState<City>(() => newCity(Math.floor(Math.random() * 1e9), d));
  const [tool, setTool] = useState<Tool>('road');
  const [cursor, setCursor] = useState(44);
  const [msg, setMsg] = useState('Lay a road, build a power plant, then add homes and jobs.');
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('mini-city-builder', validCity);
  const [pending, setPending] = useState<City | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (save.saved && save.saved.month <= t.months) setPending(save.saved);
  }, [save.saved, t.months]);

  const restart = useCallback(() => {
    setC(newCity(Math.floor(Math.random() * 1e9), d));
    setPending(null);
    setDone(false);
    setStarted(false);
    save.clear();
  }, [d, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const begin = useCallback(() => {
    if (started) return;
    setStarted(true);
    shell.startRound();
  }, [shell, started]);

  const persist = useCallback(() => {
    c.savedAt = Date.now();
    save.persist(JSON.parse(JSON.stringify(c)) as City, {
      percent: Math.min(100, Math.round((population(c) / t.goal) * 100)),
      label: `Month ${c.month} · ${population(c)} residents`,
    });
  }, [c, save, t.goal]);

  const tap = useCallback(
    (i: number) => {
      if (done || pending || shell.paused) return;
      setCursor(i);
      const cost = costOf(c, i, tool);
      if (cost === null) {
        setMsg(describe(c, i));
        return;
      }
      begin();
      if (!build(c, i, tool)) {
        setMsg(`Not enough money — that costs ${cost}.`);
        shell.play('failure');
        return;
      }
      shell.play(tool === 'bulldoze' ? 'click' : tool === 'upgrade' ? 'success' : 'pop');
      if (tool === 'upgrade' && c.tiles[i].level === 3)
        void reportProgress('mini-city-builder.upgrade', 1);
      setMsg(describe(c, i));
      persist();
      refresh();
    },
    [begin, c, done, pending, persist, shell, tool],
  );

  const advance = useCallback(() => {
    if (done || pending || shell.paused) return;
    begin();
    const r = nextMonth(c, d);
    const pop = population(c);
    shell.play(r.moved > 0 ? 'coin' : 'select');
    if (pop > 0) void reportProgress('mini-city-builder.first', 1);
    void reportProgress('mini-city-builder.town', pop);
    if (c.tiles.some((x) => x.kind === 'house' && x.level === 3))
      void reportProgress('mini-city-builder.tower', 1);
    const net = r.taxes + r.business - r.upkeep;
    setMsg(
      `Month ${c.month - 1}: ${net >= 0 ? '+' : ''}${net} coins (taxes ${r.taxes}, business ${r.business}, upkeep ${r.upkeep}). ${
        r.moved > 0
          ? `${r.moved} people moved in.`
          : r.moved < 0
            ? `${-r.moved} people moved out.`
            : 'Nobody moved.'
      }`,
    );
    const won = pop >= t.goal;
    if (won || c.month > t.months) {
      setDone(true);
      save.clear();
      if (won) void reportProgress('mini-city-builder.goal', 1);
      if (won && d === 'hard') void reportProgress('mini-city-builder.hard', 1);
      shell.endRound({
        won,
        lost: !won,
        score: finalScore(c, d),
        title: won
          ? `${pop} residents by month ${c.month - 1}!`
          : `Time is up with ${pop} residents`,
        details: [
          { label: 'Population', value: `${pop} / ${t.goal}` },
          { label: 'Months used', value: `${c.month - 1} / ${t.months}` },
          { label: 'Treasury', value: `${c.money} coins` },
        ],
      });
      return;
    }
    persist();
    refresh();
  }, [begin, c, d, done, pending, persist, save, shell, t.goal, t.months]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (k.startsWith('Arrow')) {
        const dx = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0;
        const dy = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0;
        setCursor((i) => {
          const [x, y] = xy(c, i);
          const nx = Math.max(0, Math.min(c.size - 1, x + dx));
          const ny = Math.max(0, Math.min(c.size - 1, y + dy));
          return ny * c.size + nx;
        });
        e.preventDefault();
      } else if ((k === 'Enter' || k === ' ') && tag !== 'BUTTON') {
        e.preventDefault();
        tap(cursor);
      } else if (k === 'n' || k === 'N') advance();
      else if (/^[1-8]$/.test(k)) setTool(TOOLS[Number(k) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, c, cursor, tap]);

  const pop = population(c);
  const j = jobs(c);
  const [cx, cy] = xy(c, cursor);
  const showRange = tool === 'power';

  return (
    <div className="city">
      <GameHud
        items={[
          { label: 'Month', value: `${Math.min(c.month, t.months)}/${t.months}` },
          { label: 'Coins', value: c.money },
          { label: 'People', value: `${pop}/${t.goal}` },
          { label: 'Jobs', value: j },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Month ${pending.month} · ${population(pending)} residents`}
          onContinue={() => {
            setC(pending);
            setPending(null);
            save.dismiss();
            setStarted(true);
            shell.startRound();
          }}
          onNew={restart}
        />
      )}
      <div className="city-msg" aria-live="polite">
        {msg}
      </div>
      <div
        className="city-grid"
        style={{ gridTemplateColumns: `repeat(${c.size}, minmax(0, 1fr))` }}
      >
        {c.tiles.map((tile, i) => {
          const [x, y] = xy(c, i);
          const issue = problem(c, i);
          const inRange = showRange && Math.max(Math.abs(x - cx), Math.abs(y - cy)) <= POWER_RANGE;
          return (
            <button
              key={i}
              type="button"
              className={`city-tile k-${tile.kind}${cursor === i ? ' cursor' : ''}${inRange ? ' range' : ''}`}
              aria-label={`${describe(c, i)}. Row ${y + 1}, column ${x + 1}`}
              onClick={() => tap(i)}
              onPointerEnter={() => setCursor(i)}
            >
              <span aria-hidden="true">{tileIcon(tile)}</span>
              {issue && (
                <span className="city-warn" aria-hidden="true">
                  {issue.includes('road') ? '🚧' : '🔌'}
                </span>
              )}
              {tile.kind === 'house' && tile.pop > 0 && (
                <span className="city-pop">{tile.pop}</span>
              )}
              {(tile.kind === 'shop' || tile.kind === 'factory') && tile.level > 1 && (
                <span className="city-pop">★{tile.level}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="city-tools" role="radiogroup" aria-label="Build tool">
        {TOOLS.map((x, k) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={tool === x.id}
            className={`city-tool${tool === x.id ? ' on' : ''}`}
            onClick={() => setTool(x.id)}
            title={x.help}
          >
            <span className="city-tool-icon">{x.icon}</span>
            <span>
              {x.name} <span className="muted small">{k + 1}</span>
            </span>
            <span className="small muted">
              {x.id === 'upgrade'
                ? 'varies'
                : x.id === 'bulldoze'
                  ? `${COST.bulldoze}c`
                  : `${COST[x.id]}c`}
            </span>
          </button>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>
        {TOOLS.find((x) => x.id === tool)?.help}
      </p>
      <div className="city-actions">
        <button type="button" className="btn btn-primary" onClick={advance} disabled={done}>
          📅 Next month (N)
        </button>
      </div>
    </div>
  );
}
