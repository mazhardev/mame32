import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import {
  COLS,
  ENEMIES,
  MAPS,
  ROWS,
  TILE,
  TOWERS,
  build,
  canBuild,
  lost,
  newTD,
  positionAt,
  sell,
  startWave,
  step,
  upgrade,
  upgradeCost,
  won,
} from './engine';
import type { TD, TdEvent, Tower, TowerKind } from './engine';

/** Tower defense on a 12 × 8 grid, 15–20 waves. */
export const W = COLS * TILE;
const TOP = 36;
const PANEL = TOP + ROWS * TILE;
export const H = PANEL + 84;
const KINDS: TowerKind[] = ['arrow', 'cannon', 'frost', 'laser'];
const BTN_W = 92;

export interface State extends BaseState {
  td: TD;
  choice: TowerKind | null;
  selected: Tower | null;
  cursor: { c: number; r: number };
  hover: { c: number; r: number } | null;
  message: string;
  messageT: number;
  noLeaks: boolean;
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  return {
    ...baseState(),
    td: newTD(difficulty, Math.floor(random() * MAPS.length)),
    choice: 'arrow',
    selected: null,
    cursor: { c: 0, r: 0 },
    hover: null,
    message: 'Build towers beside the path, then start the wave',
    messageT: 4,
    noLeaks: true,
  };
}

const say = (s: State, m: string, t = 1.6) => {
  s.message = m;
  s.messageT = t;
};

function nextWave(s: State) {
  if (startWave(s.td)) {
    say(s, `Wave ${s.td.wave} of ${s.td.tuning.waves}!`, 1.4);
    s.events.push('powerup');
  }
}

function tapTile(s: State, c: number, r: number) {
  const td = s.td;
  const tower = td.towers.find((t) => t.c === c && t.r === r);
  if (tower) {
    s.selected = tower === s.selected ? null : tower;
    s.choice = null;
    return;
  }
  s.selected = null;
  if (!s.choice) return;
  if (!canBuild(td, c, r)) {
    say(s, 'You cannot build there', 1);
    return;
  }
  if (build(td, s.choice, c, r)) s.events.push('click');
  else say(s, 'Not enough gold', 1);
}

function doUpgrade(s: State) {
  if (!s.selected) return;
  if (upgrade(s.td, s.selected)) s.events.push('success');
  else say(s, upgradeCost(s.selected) === null ? 'Fully upgraded' : 'Not enough gold', 1);
}

function doSell(s: State) {
  if (!s.selected) return;
  const g = sell(s.td, s.selected);
  s.selected = null;
  say(s, `Sold for ${g} gold`, 1);
  s.events.push('coin');
}

function panelHit(s: State, x: number) {
  if (s.selected) {
    if (x < 200) return;
    if (x < 300) doUpgrade(s);
    else if (x < 390) doSell(s);
    else nextWave(s);
    return;
  }
  const i = Math.floor((x - 6) / BTN_W);
  if (i >= 0 && i < KINDS.length) {
    s.choice = s.choice === KINDS[i] ? null : KINDS[i];
    return;
  }
  nextWave(s);
}

export function update(s: State, dt: number, input: Input) {
  s.messageT = Math.max(0, s.messageT - dt);
  const td = s.td;
  const p = input.pointer;
  s.hover =
    p.active && p.y >= TOP && p.y < PANEL
      ? { c: Math.floor(p.x / TILE), r: Math.floor((p.y - TOP) / TILE) }
      : null;
  if (p.pressed) {
    if (p.y >= PANEL) panelHit(s, p.x);
    else if (p.y >= TOP) tapTile(s, Math.floor(p.x / TILE), Math.floor((p.y - TOP) / TILE));
  }
  // Keyboard: arrows move a cursor, Enter places or selects, 1–4 pick a tower.
  if (input.pressed.has('left')) s.cursor.c = clamp(s.cursor.c - 1, 0, COLS - 1);
  if (input.pressed.has('right')) s.cursor.c = clamp(s.cursor.c + 1, 0, COLS - 1);
  if (input.pressed.has('up')) s.cursor.r = clamp(s.cursor.r - 1, 0, ROWS - 1);
  if (input.pressed.has('down')) s.cursor.r = clamp(s.cursor.r + 1, 0, ROWS - 1);
  if (input.pressed.has('action')) tapTile(s, s.cursor.c, s.cursor.r);
  for (let i = 0; i < KINDS.length; i++)
    if (input.keys.has(String(i + 1))) {
      s.choice = KINDS[i];
      s.selected = null;
    }
  if (input.keys.has('u')) doUpgrade(s);
  if (input.keys.has('x')) doSell(s);
  if (input.keys.has('n') || input.pressed.has('action2')) nextWave(s);

  const ev: TdEvent[] = [];
  step(td, dt, ev);
  if (ev.includes('leak')) {
    s.noLeaks = false;
    s.events.push('failure');
  }
  if (ev.includes('boom')) s.events.push('explosion');
  else if (ev.includes('shoot')) s.events.push('shoot');
  if (ev.includes('kill')) s.events.push('pop');
  if (ev.includes('wave')) {
    say(
      s,
      td.wave >= td.tuning.waves ? 'Final wave cleared!' : `Wave ${td.wave} cleared — bonus gold`,
      1.8,
    );
    s.events.push('success');
  }
  if (s.selected && !td.towers.includes(s.selected)) s.selected = null;
  s.score = td.kills * 5 + td.wave * 100 + Math.max(0, td.lives) * 25;
  if (won(td) || lost(td)) {
    if (won(td)) s.score += 500 + td.lives * 50;
    s.over = true;
    s.events.push(won(td) ? 'levelComplete' : 'gameOver');
  }
}

function drawTower(ctx: CanvasRenderingContext2D, t: Tower) {
  const x = t.c * TILE + TILE / 2;
  const y = TOP + t.r * TILE + TILE / 2;
  const spec = TOWERS[t.kind];
  fillRound(ctx, x - 16, y - 16, 32, 32, 7, '#334155');
  circle(ctx, x, y, 12, spec.color);
  const aim = t.shotAt ? Math.atan2(t.shotAt.y + TOP - y, t.shotAt.x - x) : -Math.PI / 2;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = t.kind === 'cannon' ? 7 : 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(aim) * 15, y + Math.sin(aim) * 15);
  ctx.stroke();
  for (let i = 0; i < t.level; i++) circle(ctx, x - 8 + i * 8, y + 13, 2.5, '#facc15');
  if (t.shotAt && t.shotAt.t > 0 && t.kind !== 'cannon') {
    ctx.strokeStyle = t.kind === 'laser' ? '#f472b6' : t.kind === 'frost' ? '#7dd3fc' : '#fde68a';
    ctx.lineWidth = t.kind === 'laser' ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(t.shotAt.x, t.shotAt.y + TOP);
    ctx.stroke();
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const td = s.td;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const path = td.pathTiles.has(`${c},${r}`);
      ctx.fillStyle = path ? '#b08850' : (c + r) % 2 ? '#3f8f3a' : '#4a9a43';
      ctx.fillRect(c * TILE, TOP + r * TILE, TILE, TILE);
    }
  // Entrance and exit markers.
  const start = td.path[0];
  const end = td.path[td.path.length - 1];
  text(ctx, '▶', clamp(start.x, 10, W - 10), clamp(start.y + TOP, TOP + 10, PANEL - 10), {
    size: 16,
    color: '#fef3c7',
  });
  text(ctx, '🏰', clamp(end.x, 14, W - 14), clamp(end.y + TOP, TOP + 14, PANEL - 14), { size: 20 });

  const focus = s.selected ?? null;
  const ghost = !focus && s.choice ? (s.hover ?? s.cursor) : null;
  if (focus || ghost) {
    const c = focus ? focus.c : ghost!.c;
    const r = focus ? focus.r : ghost!.r;
    const kind = focus ? focus.kind : (s.choice as TowerKind);
    const ok = focus ? true : canBuild(td, c, r);
    ctx.fillStyle = ok ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.15)';
    ctx.strokeStyle = ok ? 'rgba(255,255,255,0.5)' : 'rgba(239,68,68,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      c * TILE + TILE / 2,
      TOP + r * TILE + TILE / 2,
      TOWERS[kind].range * TILE,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
  for (const t of td.towers) drawTower(ctx, t);
  for (const e of td.enemies) {
    const p = positionAt(td, e.dist);
    const spec = ENEMIES[e.kind];
    circle(ctx, p.x, p.y + TOP, spec.r, e.slowT > 0 ? '#93c5fd' : spec.color);
    circle(
      ctx,
      p.x - spec.r * 0.3,
      p.y + TOP - spec.r * 0.3,
      spec.r * 0.3,
      'rgba(255,255,255,0.4)',
    );
    fillRound(ctx, p.x - 12, p.y + TOP - spec.r - 7, 24, 4, 2, '#1f2937');
    fillRound(
      ctx,
      p.x - 12,
      p.y + TOP - spec.r - 7,
      24 * Math.max(0, e.hp / e.maxHp),
      4,
      2,
      '#22c55e',
    );
  }
  for (const sh of td.shells) {
    const k = 1 - sh.t / 0.25;
    const x = sh.x + (sh.tx - sh.x) * k;
    const y = sh.y + (sh.ty - sh.y) * k - Math.sin(k * Math.PI) * 18;
    circle(ctx, x, y + TOP, 4, '#111827');
  }
  // Keyboard cursor.
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(s.cursor.c * TILE + 2, TOP + s.cursor.r * TILE + 2, TILE - 4, TILE - 4);
  ctx.setLineDash([]);

  // Top bar.
  text(ctx, `🪙 ${td.gold}`, 10, 18, { size: 16, align: 'left' });
  text(ctx, `❤️ ${Math.max(0, td.lives)}`, 110, 18, { size: 16, align: 'left' });
  text(
    ctx,
    `Wave ${td.wave}/${td.tuning.waves}${td.waveActive ? ` · ${td.queue.length + td.enemies.length} left` : ''}`,
    W - 10,
    18,
    { size: 14, align: 'right' },
  );
  if (s.messageT > 0) text(ctx, s.message, W / 2 + 20, 18, { size: 12, color: '#fde68a' });

  // Bottom panel.
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, PANEL, W, H - PANEL);
  if (s.selected) {
    const t = s.selected;
    const spec = TOWERS[t.kind];
    text(ctx, `${spec.name} · level ${t.level}`, 12, PANEL + 22, { size: 15, align: 'left' });
    text(ctx, `Damage ${spec.damage[t.level - 1]} · range ${spec.range}`, 12, PANEL + 46, {
      size: 12,
      align: 'left',
      color: '#cbd5e1',
    });
    const cost = upgradeCost(t);
    fillRound(
      ctx,
      204,
      PANEL + 12,
      90,
      58,
      10,
      cost !== null && td.gold >= cost ? '#16a34a' : '#475569',
    );
    text(ctx, cost === null ? 'Max level' : `Upgrade`, 249, PANEL + 32, { size: 13 });
    if (cost !== null) text(ctx, `🪙 ${cost} (U)`, 249, PANEL + 52, { size: 12 });
    fillRound(ctx, 300, PANEL + 12, 84, 58, 10, '#b45309');
    text(ctx, 'Sell (X)', 342, PANEL + 32, { size: 13 });
    text(ctx, `+${Math.floor(t.spent * 0.7)}`, 342, PANEL + 52, { size: 12 });
  } else {
    KINDS.forEach((k, i) => {
      const spec = TOWERS[k];
      const x = 6 + i * BTN_W;
      const active = s.choice === k;
      fillRound(
        ctx,
        x,
        PANEL + 8,
        BTN_W - 6,
        68,
        10,
        active ? '#4f46e5' : td.gold >= spec.cost ? '#334155' : '#273449',
      );
      circle(ctx, x + 20, PANEL + 30, 10, spec.color);
      text(ctx, `${i + 1}`, x + 20, PANEL + 30, { size: 10 });
      text(ctx, spec.name, x + 34, PANEL + 30, { size: 11, align: 'left' });
      text(ctx, `🪙 ${spec.cost}`, x + (BTN_W - 6) / 2, PANEL + 56, {
        size: 12,
        color: td.gold >= spec.cost ? '#fde68a' : '#94a3b8',
      });
    });
  }
  const nx = 6 + KINDS.length * BTN_W;
  fillRound(ctx, nx, PANEL + 8, W - nx - 6, 68, 10, td.waveActive ? '#334155' : '#dc2626');
  text(ctx, td.waveActive ? 'Fighting…' : 'Next wave', nx + (W - nx - 6) / 2, PANEL + 34, {
    size: 13,
  });
  if (!td.waveActive)
    text(ctx, '(N)', nx + (W - nx - 6) / 2, PANEL + 54, { size: 11, color: '#fecaca' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Wave', value: `${s.td.wave}/${s.td.tuning.waves}` },
    { label: 'Lives', value: Math.max(0, s.td.lives) },
    { label: 'Gold', value: s.td.gold },
  ],
  result: (s) => ({
    score: s.score,
    won: won(s.td),
    lost: lost(s.td),
    title: won(s.td)
      ? s.noLeaks
        ? 'Flawless defence!'
        : 'The castle stands!'
      : `Overrun on wave ${s.td.wave}`,
    details: [
      {
        label: 'Waves survived',
        value: `${won(s.td) ? s.td.wave : s.td.wave - 1}/${s.td.tuning.waves}`,
      },
      { label: 'Enemies defeated', value: String(s.td.kills) },
      { label: 'Lives left', value: String(Math.max(0, s.td.lives)) },
    ],
  }),
  onEnd: (s, difficulty) => {
    const td = s.td;
    void reportProgress('tower-defense.wave10', td.wave);
    void incrementProgress('tower-defense.kills', td.kills);
    if (td.towers.some((t) => t.level === 3)) void reportProgress('tower-defense.max', 1);
    if (!won(td)) return;
    void reportProgress('tower-defense.win', 1);
    if (s.noLeaks) void reportProgress('tower-defense.flawless', 1);
    if (difficulty === 'hard') void reportProgress('tower-defense.hard', 1);
  },
  touch: { pad: 'none' },
  pointerStarts: false,
  keys: {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    Enter: 'action',
    ' ': 'action',
  },
  customKeys: ['1', '2', '3', '4', 'u', 'x', 'n'],
  startHint:
    'Pick a tower (1–4), tap grass beside the path to build, tap a tower to upgrade or sell. Press Next wave (N) when ready.',
};
