import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameHud } from '@/components/game/GameHud';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { todayKey } from '@/utils/random';
import { ResumePrompt } from '../_shared/puzzle/PuzzleUI';
import { useSavedGame } from '../_shared/puzzle/useSavedGame';
import { WordLayout, WordToast } from '../_shared/words/WordUI';
import { MESSAGES, RANKS, check, hiveForSeed, rankIndex, scoreOf } from './engine';
import './hive.css';

const ID = 'hive-words';

interface Saved {
  seed: string;
  daily: boolean;
  found: string[];
  order: number[];
}

function validSaved(v: unknown): v is Saved {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.seed === 'string' &&
    typeof s.daily === 'boolean' &&
    Array.isArray(s.found) &&
    s.found.every((w) => typeof w === 'string' && /^[a-z]{4,8}$/.test(w)) &&
    Array.isArray(s.order) &&
    s.order.length === 6 &&
    s.order.every((i) => Number.isInteger(i) && i >= 0 && i < 6)
  );
}

/** Hexagon corner points for a cell of radius r centred at (x, y). */
const hexPoints = (x: number, y: number, r: number) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k;
    return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

// Outer cells around the centre (flat-topped hexagons).
const R = 30;
const SPOTS = [0, 1, 2, 3, 4, 5].map((k) => {
  const a = -Math.PI / 2 + (Math.PI / 3) * k;
  return { x: 100 + Math.cos(a) * R * 1.78, y: 100 + Math.sin(a) * R * 1.78 };
});

export default function HiveWordsGame() {
  const shell = useGameShell();
  const save = useSavedGame(ID, validSaved);
  const [seed, setSeed] = useState(() => todayKey());
  const [daily, setDaily] = useState(true);
  const hive = useMemo(() => hiveForSeed(seed), [seed]);
  const [found, setFound] = useState<string[]>([]);
  const [order, setOrder] = useState([0, 1, 2, 3, 4, 5]);
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showList, setShowList] = useState(false);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const toastTimer = useRef<number | undefined>();
  const today = todayKey();
  const pending = save.saved && (!save.saved.daily || save.saved.seed === today) && save.saved.found.length ? save.saved : null;
  const locked = shell.paused || done || !!pending;

  const score = scoreOf(hive, found);
  const rank = rankIndex(score, hive.max);

  const say = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1500);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const fresh = useCallback(
    (nextSeed: string, isDaily: boolean) => {
      setSeed(nextSeed);
      setDaily(isDaily);
      setFound([]);
      setOrder([0, 1, 2, 3, 4, 5]);
      setTyped('');
      setStarted(false);
      setDone(false);
      setShowList(false);
    },
    [],
  );

  const restart = useCallback(() => {
    save.clear();
    fresh(daily ? todayKey() : `r${Date.now()}`, daily);
  }, [daily, fresh, save]);
  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  const resume = () => {
    if (!pending) return;
    setSeed(pending.seed);
    setDaily(pending.daily);
    setFound(pending.found);
    setOrder(pending.order);
    setStarted(true);
    shell.startRound();
    save.dismiss();
  };

  const finish = useCallback(
    (list: string[]) => {
      setDone(true);
      const s = scoreOf(hive, list);
      const r = rankIndex(s, hive.max);
      save.clear();
      shell.play(r >= 6 ? 'levelComplete' : 'success');
      shell.endRound({
        won: r >= 6,
        score: s * 10,
        title: `${RANKS[r][1]}!`,
        message: `You found ${list.length} word${list.length === 1 ? '' : 's'}. The hive held ${hive.answers.length}, including ${hive.pangrams.length} full-hive word${hive.pangrams.length === 1 ? '' : 's'}: ${hive.pangrams.join(', ')}.`,
        details: [
          { label: 'Rank', value: RANKS[r][1] },
          { label: 'Points', value: `${s} / ${hive.max}` },
          { label: 'Words', value: `${list.length} / ${hive.answers.length}` },
        ],
      });
    },
    [hive, save, shell],
  );

  const submit = () => {
    if (locked || !typed) return;
    const res = check(hive, typed, found);
    if (!res.ok) {
      say(MESSAGES[res.reason]);
      setShake(true);
      window.setTimeout(() => setShake(false), 360);
      shell.play('failure');
      setTyped('');
      return;
    }
    if (!started) {
      setStarted(true);
      shell.startRound();
    }
    const list = [...found, typed.toLowerCase()];
    setFound(list);
    setTyped('');
    const before = rankIndex(scoreOf(hive, found), hive.max);
    const after = rankIndex(scoreOf(hive, list), hive.max);
    if (res.pangram) {
      say(`Full hive! +${res.points}`);
      shell.play('powerup');
      void reportProgress(`${ID}.pangram`, 1);
    } else {
      say(res.bonus ? `Bonus word! +${res.points}` : res.points >= 6 ? `Superb! +${res.points}` : res.points > 1 ? `Nice! +${res.points}` : 'Good! +1');
      shell.play(after > before ? 'coin' : 'success');
    }
    void incrementProgress(`${ID}.words`);
    if (after >= 6) void reportProgress(`${ID}.great`, 1);
    if (after >= 8) void reportProgress(`${ID}.genius`, 1);
    if (after > before) say(`${RANKS[after][1]}!`);
    if (after === RANKS.length - 1) {
      void reportProgress(`${ID}.master`, 1);
      finish(list);
      return;
    }
    save.persist({ seed, daily, found: list, order }, { percent: Math.round((scoreOf(hive, list) / hive.max) * 100), label: `${RANKS[after][1]} · ${list.length} words` });
  };

  const type = (ch: string) => {
    if (locked || typed.length >= 12) return;
    setTyped(typed + ch);
    shell.play('tick');
  };

  const shuffle = () => {
    const next = order.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    shell.play('whoosh');
  };

  // Physical keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setTyped((s) => s.slice(0, -1));
      } else if (e.key === ' ') {
        e.preventDefault();
        shuffle();
      } else if (/^[a-zA-Z]$/.test(e.key) && hive.letters.includes(e.key.toLowerCase())) {
        type(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const outer = hive.letters.slice(0, 6);
  const progress = Math.min(1, score / Math.max(1, Math.round(RANKS[8][0] * hive.max)));

  return (
    <WordLayout>
      <GameHud
        items={[
          { label: daily ? 'Today' : 'Random', value: daily ? today.slice(5) : '🔀' },
          { label: 'Rank', value: RANKS[rank][1] },
          { label: 'Points', value: score },
          { label: 'Words', value: `${found.length}/${hive.answers.length}` },
        ]}
      />
      {pending && (
        <ResumePrompt
          label={`${pending.daily ? 'Today’s hive' : 'Your hive'} · ${pending.found.length} words found`}
          onContinue={resume}
          onNew={() => {
            save.clear();
            fresh(today, true);
          }}
        />
      )}
      <div className="hv-rank" aria-label={`Rank ${RANKS[rank][1]}, ${score} points`}>
        <span className="hv-rank-name">{RANKS[rank][1]}</span>
        <div className="hv-rank-bar">
          <div className="hv-rank-fill" style={{ width: `${progress * 100}%` }} />
          {RANKS.slice(0, 9).map(([f], i) => (
            <span key={i} className={i <= rank ? 'hv-dot on' : 'hv-dot'} style={{ left: `${(f / RANKS[8][0]) * 100}%` }} />
          ))}
        </div>
      </div>
      <button type="button" className="hv-found" onClick={() => setShowList(!showList)} aria-expanded={showList}>
        {found.length ? `${found.length} word${found.length === 1 ? '' : 's'}: ${found.slice(-4).reverse().join(' · ')}${found.length > 4 ? ' …' : ''}` : 'Your words will appear here'}
        <span aria-hidden="true">{showList ? '▲' : '▼'}</span>
      </button>
      {showList && (
        <ul className="hv-list">
          {[...found].sort().map((w) => (
            <li key={w} className={new Set(w).size === 7 ? 'pangram' : undefined}>
              {w}
            </li>
          ))}
        </ul>
      )}
      <div className={`hv-typed${shake ? ' shake' : ''}`} aria-live="polite">
        {typed ? (
          [...typed].map((ch, i) => (
            <span key={i} className={ch === hive.center ? 'c' : hive.letters.includes(ch) ? undefined : 'x'}>
              {ch}
            </span>
          ))
        ) : (
          <span className="hv-caret">Type or tap</span>
        )}
      </div>
      <WordToast message={toast} />
      <svg className="hv-comb" viewBox="0 0 200 200" role="group" aria-label="Letters">
        {order.map((k, slot) => (
          <g key={slot} className="hv-cell" role="button" aria-label={outer[k]} tabIndex={-1} onPointerDown={(e) => { e.preventDefault(); type(outer[k]); }}>
            <polygon points={hexPoints(SPOTS[slot].x, SPOTS[slot].y, R)} />
            <text x={SPOTS[slot].x} y={SPOTS[slot].y} textAnchor="middle" dominantBaseline="central">
              {outer[k].toUpperCase()}
            </text>
          </g>
        ))}
        <g className="hv-cell center" role="button" aria-label={`${hive.center}, centre letter`} tabIndex={-1} onPointerDown={(e) => { e.preventDefault(); type(hive.center); }}>
          <polygon points={hexPoints(100, 100, R)} />
          <text x={100} y={100} textAnchor="middle" dominantBaseline="central">
            {hive.center.toUpperCase()}
          </text>
        </g>
      </svg>
      <div className="hv-actions">
        <button type="button" className="btn" onClick={() => setTyped(typed.slice(0, -1))} disabled={locked || !typed}>
          Delete
        </button>
        <button type="button" className="btn hv-round" onClick={shuffle} disabled={locked} aria-label="Shuffle letters">
          🔀
        </button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={locked || !typed}>
          Enter
        </button>
      </div>
      <div className="hv-actions small">
        {!daily && (
          <button type="button" className="btn btn-sm" onClick={() => { save.clear(); fresh(today, true); }} disabled={shell.paused}>
            📅 Today’s hive
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={() => { save.clear(); fresh(`r${Date.now()}`, false); }} disabled={shell.paused}>
          🔀 New hive
        </button>
        <button type="button" className="btn btn-sm" onClick={() => finish(found)} disabled={locked || !found.length}>
          🏁 Finish & see answers
        </button>
      </div>
    </WordLayout>
  );
}
