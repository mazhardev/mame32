import { useCallback, useEffect, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import {
  BUILDINGS,
  TAX,
  TRADE,
  TUNING,
  build,
  canBuild,
  choiceAllowed,
  choose,
  defence,
  endSeason,
  housing,
  newKingdom,
  score,
  seasonOf,
  staffed,
  trade,
  validKingdom,
  workersUsed,
  yearOf,
} from './engine';
import type { Kingdom, Res, Tax } from './engine';
import './kingdom.css';

const RES_ICON: Record<Res, string> = { gold: '🪙', food: '🍞', wood: '🪵', stone: '🪨' };
const SEASON_ICON = { Spring: '🌱', Summer: '☀️', Autumn: '🍂', Winter: '❄️' } as const;

export default function KingdomGame() {
  const shell = useGameShell();
  const d = shell.difficulty;
  const t = TUNING[d];
  const [k, setK] = useState<Kingdom>(() => newKingdom(Math.floor(Math.random() * 1e9), d));
  const [started, setStarted] = useState(false);
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const save = useSavedGame('kingdom-builder', validKingdom);
  const [pending, setPending] = useState<Kingdom | null>(null);

  useEffect(() => {
    if (save.saved) setPending(save.saved);
  }, [save.saved]);

  const restart = useCallback(() => {
    setK(newKingdom(Math.floor(Math.random() * 1e9), d));
    setPending(null);
    setStarted(false);
    save.clear();
  }, [d, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const persist = useCallback(() => {
    if (k.over) return;
    k.savedAt = Date.now();
    save.persist(JSON.parse(JSON.stringify(k)) as Kingdom, {
      percent: Math.round(((k.turn - 1) / (t.years * 4)) * 100),
      label: `Year ${yearOf(k.turn)}, ${seasonOf(k.turn)} · ${k.people} people`,
    });
  }, [k, save, t.years]);

  const finish = useCallback(() => {
    const won = k.over === 'won';
    save.clear();
    if (won) void reportProgress('kingdom-builder.castle', 1);
    if (won && d === 'hard') void reportProgress('kingdom-builder.hard', 1);
    void reportProgress('kingdom-builder.people', k.people);
    shell.endRound({
      won,
      lost: !won,
      score: score(k, d),
      title:
        k.over === 'won'
          ? `The castle stands! Year ${yearOf(k.turn)}`
          : k.over === 'revolt'
            ? 'The people revolted'
            : k.over === 'starved'
              ? 'The kingdom starved'
              : 'Your reign ended before the castle was finished',
      details: [
        { label: 'People', value: String(k.people) },
        { label: 'Raids repelled', value: String(k.raidsWon) },
        { label: 'Seasons', value: String(k.turn - 1) },
      ],
    });
  }, [d, k, save, shell]);

  const act = (fn: () => unknown, sound: 'click' | 'success' | 'coin' = 'click') => {
    if (k.over || pending || shell.paused) return;
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const ok = fn();
    shell.play(ok === false ? 'failure' : sound);
    if (k.over) finish();
    else persist();
    refresh();
  };

  const s = staffed(k);
  const season = seasonOf(k.turn);
  const idle = k.people - workersUsed(k);
  const farmYield = { Spring: 5, Summer: 7, Autumn: 10, Winter: 1 }[season];
  const forecast: Record<Res, number> = {
    food: s.farm * farmYield - Math.ceil(k.people + k.soldiers * 0.5),
    wood: s.lumber * (season === 'Winter' ? 3 : 5),
    stone: s.quarry * 4,
    gold: Math.round(k.people * TAX[k.tax].gold * 0.5) + s.market * 6,
  };
  const castle = BUILDINGS.find((b) => b.id === 'castle')!;

  return (
    <div className="kb">
      <GameHud
        items={[
          { label: 'Year', value: `${yearOf(k.turn)}/${t.years}` },
          { label: 'Season', value: `${SEASON_ICON[season]} ${season}` },
          { label: 'People', value: `${k.people}/${housing(k)}` },
          { label: 'Joy', value: `${k.happiness}%` },
          { label: 'Defence', value: defence(k) },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`Year ${yearOf(pending.turn)}, ${seasonOf(pending.turn)} · ${pending.people} people`}
          onContinue={() => {
            setK(pending);
            setPending(null);
            save.dismiss();
          }}
          onNew={restart}
        />
      )}
      <div className="kb-res" aria-label="Resources">
        {(Object.keys(RES_ICON) as Res[]).map((r) => (
          <div key={r} className="kb-res-item">
            <span>{RES_ICON[r]}</span>
            <strong>{k.res[r]}</strong>
            <span className={`small ${forecast[r] < 0 ? 'kb-neg' : 'muted'}`}>
              {forecast[r] >= 0 ? '+' : ''}
              {forecast[r]}
            </span>
          </div>
        ))}
      </div>
      <div className="kb-castle small">
        🏰 Castle:{' '}
        {(Object.entries(castle.cost) as [Res, number][])
          .map(([r, n]) => `${RES_ICON[r]} ${Math.min(k.res[r], n)}/${n}`)
          .join(' · ')}
      </div>

      {k.event ? (
        <section className="kb-event card" aria-live="polite">
          <div className="kb-event-icon">{k.event.icon}</div>
          <h3 style={{ margin: 0 }}>{k.event.title}</h3>
          <p style={{ margin: 0 }} className="muted">
            {k.event.text}
            {k.event.id === 'raiders' && ` Your defence: ${defence(k)}.`}
          </p>
          <div className="kb-choices">
            {k.event.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                className="btn"
                disabled={!choiceAllowed(k, c) || !!pending}
                onClick={() =>
                  act(() => {
                    const msg = choose(k, i);
                    if (msg?.startsWith('⚔️')) {
                      shell.play('success');
                      void incrementProgress('kingdom-builder.raids', 1);
                    } else if (msg?.startsWith('🔥')) shell.play('explosion');
                    return msg !== null;
                  })
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="kb-log small" aria-live="polite">
            {k.log[0]}
          </div>
          <section className="kb-build" aria-label="Buildings">
            {BUILDINGS.map((b) => (
              <div key={b.id} className={`kb-b${b.id === 'castle' ? ' castle' : ''}`}>
                <div className="kb-b-head">
                  <span className="kb-b-icon">{b.icon}</span>
                  <strong>{b.name}</strong>
                  <span className="kb-count" title="staffed / built">
                    {b.workers ? `${s[b.id]}/${k.built[b.id]}` : k.built[b.id]}
                  </span>
                </div>
                <span className="small muted">{b.desc}</span>
                <span className="small">
                  {(Object.entries(b.cost) as [Res, number][])
                    .map(([r, n]) => `${RES_ICON[r]}${n}`)
                    .join(' ')}
                  {b.workers ? ` · 👷${b.workers}` : ''}
                </span>
                <button
                  type="button"
                  className={`btn btn-sm${b.id === 'castle' ? ' btn-primary' : ''}`}
                  disabled={!canBuild(k, b.id)}
                  onClick={() =>
                    act(() => {
                      const ok = build(k, b.id);
                      if (ok) void incrementProgress('kingdom-builder.builds', 1);
                      return ok;
                    }, 'success')
                  }
                  aria-label={`Build ${b.name}`}
                >
                  Build
                </button>
              </div>
            ))}
          </section>
          <section className="kb-row" aria-label="Taxes and trade">
            <div className="kb-tax" role="radiogroup" aria-label="Tax rate">
              <span className="small">Taxes:</span>
              {(Object.keys(TAX) as Tax[]).map((x) => (
                <button
                  key={x}
                  type="button"
                  role="radio"
                  aria-checked={k.tax === x}
                  className={`btn btn-sm${k.tax === x ? ' btn-primary' : ''}`}
                  onClick={() => act(() => (k.tax = x))}
                >
                  {TAX[x].label}
                </button>
              ))}
            </div>
            {k.built.market > 0 && (
              <div className="kb-tax">
                <span className="small">Market:</span>
                {(['wood', 'stone'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="btn btn-sm"
                    disabled={k.res.gold < TRADE[r]}
                    onClick={() => act(() => trade(k, r), 'coin')}
                  >
                    {RES_ICON[r]}+10 for 🪙{TRADE[r]}
                  </button>
                ))}
              </div>
            )}
          </section>
          <div className="kb-row">
            <span className="small muted">
              👷 {idle} idle · ⚔️ {k.soldiers} soldiers · tax {TAX[k.tax].joy >= 0 ? '+' : ''}
              {TAX[k.tax].joy} joy/season
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                act(() => {
                  endSeason(k, d);
                  if (k.happiness >= 90) void reportProgress('kingdom-builder.joy', 1);
                  void reportProgress('kingdom-builder.people', k.people);
                }, 'coin')
              }
            >
              ⏳ End {season.toLowerCase()}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
