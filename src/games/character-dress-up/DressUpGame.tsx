import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { GameHud } from '@/components/game/GameHud';
import { Figure } from './Figure';
import {
  COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKINS,
  THEMES,
  TUNING,
  defaultLook,
  itemsFor,
  makeRequests,
  randomLook,
  rateLook,
} from './wardrobe';
import type { ColorId, Look, Rating, Request, Slot } from './wardrobe';
import '../_shared/casual/casual.css';
import './dressup.css';

type Tab = Slot | 'body';
const TABS: { id: Tab; label: string }[] = [
  { id: 'hat', label: 'Hat' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'extra', label: 'Extra' },
  { id: 'body', label: 'Hair & skin' },
];

type Mode = 'menu' | 'challenge' | 'free';

export default function DressUpGame() {
  const shell = useGameShell();
  const t = TUNING[shell.difficulty];
  const [mode, setMode] = useState<Mode>('menu');
  const [look, setLook] = useState<Look>(defaultLook);
  const [tab, setTab] = useState<Tab>('top');
  const [requests, setRequests] = useState<Request[]>([]);
  const [round, setRound] = useState(0);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [shown, setShown] = useState<Rating | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const tried = useRef(new Set<string>());
  const req = requests[round] as Request | undefined;
  const total = ratings.reduce((a, r) => a + r.score, 0);

  const restart = useCallback(() => {
    setMode('menu');
    setLook(defaultLook());
    setRatings([]);
    setShown(null);
    setRound(0);
    setTimeLeft(null);
  }, []);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const startChallenge = () => {
    setRequests(makeRequests(shell.difficulty, Math.random));
    setRound(0);
    setRatings([]);
    setShown(null);
    setLook(defaultLook());
    setTimeLeft(t.seconds);
    setMode('challenge');
    shell.startRound();
  };

  const wear = (slot: Slot, id: string) => {
    setLook((l) => ({ ...l, items: { ...l.items, [slot]: id } }));
    shell.play('click');
    tried.current.add(id);
    void reportProgress('character-dress-up.wardrobe', tried.current.size);
  };
  const paint = (slot: Slot, color: ColorId) =>
    setLook((l) => ({ ...l, colors: { ...l.colors, [slot]: color } }));

  const submit = useCallback(() => {
    if (!req || shown) return;
    const r = rateLook(look, req);
    setShown(r);
    setRatings((rs) => [...rs, r]);
    shell.play(r.stars >= 2 ? 'success' : r.stars === 1 ? 'coin' : 'failure');
    void reportProgress('character-dress-up.first', 1);
    void incrementProgress('character-dress-up.looks', 1);
    if (r.score >= 100) void reportProgress('character-dress-up.perfect', 1);
  }, [look, req, shell, shown]);

  const nextClient = () => {
    if (round + 1 >= requests.length) {
      const all = ratings;
      const sum = all.reduce((a, r) => a + r.score, 0);
      const threeStars = all.filter((r) => r.stars === 3).length;
      if (threeStars === all.length) void reportProgress('character-dress-up.icon', 1);
      if (shell.difficulty === 'hard' && sum >= 400)
        void reportProgress('character-dress-up.hard', 1);
      shell.endRound({
        won: sum >= all.length * 70,
        score: sum,
        title: `${threeStars} of ${all.length} clients thrilled`,
        details: all.map((r, i) => ({
          label: THEMES[requests[i].theme].name,
          value: `${r.score} ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}`,
        })),
      });
      return;
    }
    setRound((n) => n + 1);
    setShown(null);
    setTimeLeft(t.seconds);
  };

  // Hard mode: a countdown per client that submits the look when it runs out.
  useEffect(() => {
    if (mode !== 'challenge' || shown || timeLeft === null || shell.paused) return;
    if (timeLeft <= 0) {
      submit();
      return;
    }
    const id = window.setTimeout(() => {
      if (!document.hidden) setTimeLeft((s) => (s === null ? s : s - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [mode, shell.paused, shown, submit, timeLeft]);

  if (mode === 'menu') {
    return (
      <div className="cz">
        <div className="cz-panel">
          <Figure look={look} theme={null} label="A character waiting to be dressed" />
          <p style={{ margin: 0 }}>
            Five clients each need an outfit for a different occasion. Pick the right hat, top,
            bottom, shoes and extra{t.wish ? ' — and remember the colour they asked for' : ''}.
          </p>
          <div className="cz-choices" style={{ ['--cz-cols' as string]: 2, width: '100%' }}>
            <button type="button" className="cz-choice" onClick={startChallenge}>
              <span className="cz-emoji">🧑‍🎤</span>Style challenge
            </button>
            <button
              type="button"
              className="cz-choice"
              onClick={() => {
                setMode('free');
                setTimeLeft(null);
              }}
            >
              <span className="cz-emoji">🎨</span>Free play
            </button>
          </div>
        </div>
      </div>
    );
  }

  const slot = tab === 'body' ? null : tab;
  const theme = mode === 'challenge' && req ? req.theme : null;

  return (
    <div className="du">
      {mode === 'challenge' && req && (
        <GameHud
          items={[
            { label: 'Client', value: `${round + 1}/${requests.length}` },
            { label: 'Score', value: total },
            ...(timeLeft !== null ? [{ label: 'Time', value: `${Math.max(0, timeLeft)}s` }] : []),
          ]}
        />
      )}
      <div className="du-main">
        <div className="du-stage">
          {mode === 'challenge' && req && (
            <div className="du-request" aria-live="polite">
              <span className="du-request-emoji">{THEMES[req.theme].emoji}</span>
              <div>
                <strong>{THEMES[req.theme].name}</strong>
                {req.color && (
                  <div>
                    …and I’d love something{' '}
                    <span
                      className="du-dot"
                      style={{ background: COLORS.find((c) => c.id === req.color)?.hex }}
                    />{' '}
                    {req.color}!
                  </div>
                )}
              </div>
            </div>
          )}
          <Figure
            look={look}
            theme={theme}
            label={`Character wearing ${Object.values(look.items).join(', ')}`}
          />
          {shown && req && (
            <div className="du-rating" role="status">
              <div className="du-stars" aria-label={`${shown.stars} stars`}>
                {'★'.repeat(shown.stars)}
                <span style={{ opacity: 0.3 }}>{'★'.repeat(3 - shown.stars)}</span>
              </div>
              <div>
                <strong>{shown.score}</strong> points
              </div>
              <ul className="du-breakdown">
                {(Object.keys(shown.slots) as Slot[]).map((s) => (
                  <li key={s} className={shown.slots[s]}>
                    {TABS.find((x) => x.id === s)?.label}:{' '}
                    {shown.slots[s] === 'match'
                      ? 'perfect'
                      : shown.slots[s] === 'plain'
                        ? 'plain'
                        : 'wrong occasion'}
                  </li>
                ))}
                {shown.wish !== null && (
                  <li className={shown.wish ? 'match' : 'clash'}>
                    {req.color}: {shown.wish ? 'yes!' : 'missing'}
                  </li>
                )}
              </ul>
              <button type="button" className="btn btn-primary" onClick={nextClient}>
                {round + 1 >= requests.length ? 'Finish' : 'Next client'}
              </button>
            </div>
          )}
        </div>
        <div className="du-wardrobe">
          <div className="du-tabs" role="tablist" aria-label="Wardrobe">
            {TABS.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={tab === x.id}
                className={tab === x.id ? 'active' : ''}
                onClick={() => setTab(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
          {slot ? (
            <>
              <div className="du-items" role="tabpanel">
                {itemsFor(slot).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={look.items[slot] === item.id}
                    className={look.items[slot] === item.id ? 'du-item on' : 'du-item'}
                    onClick={() => wear(slot, item.id)}
                    disabled={!!shown}
                  >
                    <span className="du-item-icon">{item.icon}</span>
                    <span>{item.name}</span>
                    {(t.hints || mode === 'free') && item.themes.length > 0 && (
                      <span className="du-tags" aria-label={`Suits ${item.themes.join(' and ')}`}>
                        {item.themes.map((th) => THEMES[th].emoji).join('')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {!look.items[slot].endsWith('-none') && (
                <div className="du-swatches" aria-label="Colour">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={c.name}
                      aria-pressed={look.colors[slot] === c.id}
                      className={look.colors[slot] === c.id ? 'on' : ''}
                      style={{ background: c.hex }}
                      onClick={() => paint(slot, c.id)}
                      disabled={!!shown}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="du-body" role="tabpanel">
              <div className="du-items">
                {HAIR_STYLES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={look.hair === h}
                    className={look.hair === h ? 'du-item on' : 'du-item'}
                    onClick={() => setLook((l) => ({ ...l, hair: h }))}
                    disabled={!!shown}
                  >
                    <span className="du-item-icon">💇</span>
                    <span style={{ textTransform: 'capitalize' }}>{h}</span>
                  </button>
                ))}
              </div>
              <div className="du-swatches" aria-label="Hair colour">
                {HAIR_COLORS.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Hair colour ${i + 1}`}
                    className={look.hairColor === i ? 'on' : ''}
                    style={{ background: c }}
                    onClick={() => setLook((l) => ({ ...l, hairColor: i }))}
                    disabled={!!shown}
                  />
                ))}
              </div>
              <div className="du-swatches" aria-label="Skin tone">
                {SKINS.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Skin tone ${i + 1}`}
                    className={look.skin === i ? 'on' : ''}
                    style={{ background: c }}
                    onClick={() => setLook((l) => ({ ...l, skin: i }))}
                    disabled={!!shown}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="du-actions">
            {mode === 'challenge' ? (
              <button type="button" className="btn btn-primary" onClick={submit} disabled={!!shown}>
                Show the look
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setLook(randomLook(Math.random))}
                >
                  🎲 Surprise me
                </button>
                <button type="button" className="btn" onClick={() => setLook(defaultLook())}>
                  Reset
                </button>
                <button type="button" className="btn btn-primary" onClick={startChallenge}>
                  Style challenge
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
