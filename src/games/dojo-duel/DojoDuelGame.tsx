import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameShell } from '@/game-engine/context';
import { ArcadeGame } from '../_shared/arcade/ArcadeGame';
import '../_shared/board/board.css';
import '../_shared/platform/campaign.css';
import { drawStanding } from './draw';
import { ROSTER, fighterById } from './fighters';
import type { FighterDef } from './fighters';
import type { Mode } from './game';
import { makeSpec } from './spec';
import './dojo-duel.css';

const PREF_KEY = 'browserArcade.dojoDuel';

function loadPrefs(): { p1: string; p2: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') as { p1?: unknown; p2?: unknown };
    const ok = (v: unknown) => typeof v === 'string' && ROSTER.some((f) => f.id === v);
    return { p1: ok(raw.p1) ? (raw.p1 as string) : 'kenta', p2: ok(raw.p2) ? (raw.p2 as string) : 'mei' };
  } catch {
    return { p1: 'kenta', p2: 'mei' };
  }
}

function Portrait({ def }: { def: FighterDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 48 * dpr;
    c.height = 58 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStanding(ctx, def, 22, 55, 1, 0.56, 0);
  }, [def]);
  return <canvas ref={ref} className="dd-portrait" aria-hidden="true" />;
}

function Picker({ label, value, onPick }: { label: string; value: string; onPick: (id: string) => void }) {
  return (
    <div className="dd-pick" role="radiogroup" aria-label={label}>
      <span className="campaign-label">{label}</span>
      <div className="dd-roster">
        {ROSTER.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={value === f.id}
            className={value === f.id ? 'dd-fighter on' : 'dd-fighter'}
            onClick={() => onPick(f.id)}
            title={`${f.name} — ${f.title}`}
          >
            <Portrait def={f} />
            <span>{f.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MoveList({ def }: { def: FighterDef }) {
  const sp = def.specials;
  const rows: [string, string][] = [
    ['Special', sp.neutral.name],
    ['→ + Special', sp.fwd.name],
    ['↓ + Special', sp.down.name],
  ];
  if (sp.air) rows.push(['Special in the air', sp.air.name]);
  rows.push(['Super (full meter)', sp.super.name], ['→ + Punch up close', 'Throw']);
  return (
    <details className="dd-moves">
      <summary>
        Move list: {def.name}, {def.title}
      </summary>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export default function DojoDuelGame() {
  const shell = useGameShell();
  const initial = useMemo(loadPrefs, []);
  const [mode, setMode] = useState<Mode>('arcade');
  const [p1, setP1] = useState(initial.p1);
  const [p2, setP2] = useState(initial.p2);
  const refs = useRef({ mode: 'arcade' as Mode, p1: initial.p1, p2: initial.p2 });

  const spec = useMemo(
    () =>
      makeSpec(
        () => refs.current.mode,
        () => refs.current.p1,
        () => refs.current.p2,
      ),
    [],
  );

  const change = (next: Partial<{ mode: Mode; p1: string; p2: string }>) => {
    refs.current = { ...refs.current, ...next };
    if (next.mode) setMode(next.mode);
    if (next.p1) setP1(next.p1);
    if (next.p2) setP2(next.p2);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ p1: refs.current.p1, p2: refs.current.p2 }));
    } catch {
      /* Preferences are a convenience only. */
    }
    shell.requestRestart();
  };

  return (
    <div className="campaign">
      {!shell.isFullscreen && (
        <div className="dd-menu">
          <div className="seg" role="radiogroup" aria-label="Game mode">
            {(['arcade', 'versus'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => mode !== m && change({ mode: m })}>
                {m === 'arcade' ? 'Arcade vs computer' : '2 players, one keyboard'}
              </button>
            ))}
          </div>
          <Picker label={mode === 'versus' ? 'Player 1' : 'Your fighter'} value={p1} onPick={(id) => id !== p1 && change({ p1: id })} />
          {mode === 'versus' && <Picker label="Player 2" value={p2} onPick={(id) => id !== p2 && change({ p2: id })} />}
          {mode === 'versus' && (
            <p className="dd-keys">
              Player 1: WASD, F punch, G kick, H special, T super. Player 2: arrows, comma punch, full stop kick, slash special, semicolon super
              (or 1, 2, 3, 0).
            </p>
          )}
        </div>
      )}
      <ArcadeGame spec={spec} maxHeight={0.74} />
      {!shell.isFullscreen && <MoveList def={fighterById(p1)} />}
    </div>
  );
}
