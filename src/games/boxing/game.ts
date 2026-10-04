import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import { ROUNDS, dodge, judges, newBout, step, throwPunch, won } from './engine';
import type { Bout } from './engine';

/** Three rounds against a computer boxer: read the wind-up, slip, counter. */
export const W = 420;
export const H = 560;

export interface State extends BaseState {
  bout: Bout;
  jabAnim: number;
  hookAnim: number;
}

export function create(difficulty: DifficultySetting): State {
  return { ...baseState(), bout: newBout(difficulty), jabAnim: 0, hookAnim: 0 };
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const b = s.bout;
  s.jabAnim = Math.max(0, s.jabAnim - dt);
  s.hookAnim = Math.max(0, s.hookAnim - dt);
  const p = input.pointer;
  if (b.youDown) {
    if (input.pressed.has('action') || input.pressed.has('action2') || p.pressed) b.presses += 1;
  } else {
    b.blocking = input.held.has('down');
    if (input.pressed.has('left')) dodge(b, 'left');
    if (input.pressed.has('right')) dodge(b, 'right');
    let punch: 'jab' | 'hook' | null = input.pressed.has('action')
      ? 'jab'
      : input.pressed.has('action2')
        ? 'hook'
        : null;
    if (p.pressed) {
      // Touch: tap the lower corners to slip, the upper half to punch.
      if (p.y > H * 0.72) dodge(b, p.x < W / 2 ? 'left' : 'right');
      else punch = p.x < W / 2 ? 'jab' : 'hook';
    }
    if (punch) {
      const sound = throwPunch(b, punch, random);
      if (sound) {
        s.events.push(sound);
        if (punch === 'jab') s.jabAnim = 0.2;
        else s.hookAnim = 0.32;
      }
    }
  }
  s.events.push(...step(b, dt, random));
  const j = judges(b);
  s.score = Math.max(0, Math.round(j.you * 4 + b.opp.knockdowns * 150));
  if (b.over && b.log.t < 1.4) {
    if (won(b)) s.score += b.over === 'ko-win' ? 600 : 300;
    s.over = true;
    s.events.push(won(b) ? 'levelComplete' : 'gameOver');
  }
}

function drawOpponent(ctx: CanvasRenderingContext2D, s: State, ox: number) {
  const b = s.bout;
  const cx = W / 2 + ox;
  const base = 330;
  const down = b.oppState === 'down';
  const hurt = b.hitFlash > 0;
  const lean = down ? 1 : b.oppState === 'stunned' ? Math.sin(s.time * 8) * 0.12 : 0;
  ctx.save();
  ctx.translate(cx, base + (down ? 120 : 0));
  ctx.rotate(lean * (down ? 1.4 : 1));
  // Body.
  fillRound(ctx, -48, -150, 96, 150, 30, '#b45309');
  fillRound(ctx, -50, -20, 100, 60, 12, '#7c3aed');
  // Head with headguard.
  circle(ctx, 0, -180, 38, '#dc2626');
  circle(ctx, 0, -172, 26, '#f1c27d');
  circle(ctx, -9, -176, 3.5, '#1f2937');
  circle(ctx, 9, -176, 3.5, '#1f2937');
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (hurt || b.oppState === 'stunned' || down) {
    ctx.moveTo(-8, -158);
    ctx.lineTo(8, -158);
  } else ctx.arc(0, -162, 7, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // Gloves: their position telegraphs the next punch.
  const wind = b.oppState === 'windup' ? 1 - b.stateT / (b.ai.windup * 1.15) : 0;
  const punching = b.oppState === 'punch';
  let l = { x: -46, y: -150, r: 26 };
  let r = { x: 46, y: -150, r: 26 };
  const glow = b.oppState === 'windup';
  if (b.next === 'jab' && (glow || punching))
    l = punching ? { x: -10, y: -40, r: 48 } : { x: -54, y: -150 + wind * 10, r: 24 };
  if (b.next === 'hookL' && (glow || punching))
    l = punching ? { x: 40, y: -60, r: 46 } : { x: -110 * (0.6 + wind * 0.4), y: -170, r: 26 };
  if (b.next === 'hookR' && (glow || punching))
    r = punching ? { x: -40, y: -60, r: 46 } : { x: 110 * (0.6 + wind * 0.4), y: -170, r: 26 };
  if (b.next === 'upper' && (glow || punching))
    r = punching ? { x: 0, y: -60, r: 50 } : { x: 40, y: -40 + wind * 20, r: 26 };
  for (const g of [l, r]) {
    if (
      glow &&
      (g === l ? b.next === 'jab' || b.next === 'hookL' : b.next === 'hookR' || b.next === 'upper')
    ) {
      circle(ctx, g.x, g.y, g.r + 10 + Math.sin(s.time * 30) * 2, 'rgba(250,204,21,0.45)');
    }
    circle(ctx, g.x, g.y, g.r, '#dc2626');
    circle(ctx, g.x - g.r * 0.3, g.y - g.r * 0.3, g.r * 0.3, 'rgba(255,255,255,0.35)');
  }
  if (b.oppState === 'guard') {
    fillRound(ctx, -60, -205, 120, 6, 3, 'rgba(255,255,255,0)');
  }
  ctx.restore();
  if (hurt) {
    const sx = cx + (s.hookAnim > 0 ? 30 : -20);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = i % 2 ? 14 : 30;
      ctx.lineTo(sx + Math.cos(a) * rr, 160 + Math.sin(a) * rr);
    }
    ctx.fill();
    text(ctx, 'POW', sx, 160, { size: 13, color: '#b91c1c', weight: 900 });
  }
}

function drawYou(ctx: CanvasRenderingContext2D, s: State) {
  const b = s.bout;
  const block = b.blocking;
  const jab = s.jabAnim > 0 ? Math.sin((s.jabAnim / 0.2) * Math.PI) : 0;
  const hook = s.hookAnim > 0 ? Math.sin((s.hookAnim / 0.32) * Math.PI) : 0;
  const lx = block ? W / 2 - 50 : W / 2 - 110 + jab * 70;
  const ly = block ? 380 : H - 70 - jab * 170;
  const rx = block ? W / 2 + 50 : W / 2 + 110 - hook * 120;
  const ry = block ? 380 : H - 60 - hook * 160;
  for (const [x, y, sc] of [
    [lx, ly, 1 - jab * 0.35],
    [rx, ry, 1 - hook * 0.3],
  ]) {
    circle(ctx, x, y, 46 * sc, '#1d4ed8');
    circle(ctx, x - 14 * sc, y - 14 * sc, 14 * sc, 'rgba(255,255,255,0.3)');
    fillRound(ctx, x - 26 * sc, y + 30 * sc, 52 * sc, 40, 10, '#f8fafc');
  }
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  v: number,
  color: string,
  label: string,
  right = false,
) {
  fillRound(ctx, x, y, w, 12, 6, '#1f2937');
  const fw = (w * clamp(v, 0, 100)) / 100;
  fillRound(ctx, right ? x + w - fw : x, y, fw, 12, 6, color);
  text(ctx, label, right ? x + w : x, y - 8, {
    size: 11,
    align: right ? 'right' : 'left',
    color: '#e2e8f0',
  });
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const b = s.bout;
  const ox = b.dodge === 'left' ? 70 : b.dodge === 'right' ? -70 : 0;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);
  // Crowd and ring.
  for (let i = 0; i < 70; i++)
    circle(
      ctx,
      ((i * 47) % (W + 40)) - 20 + ox * 0.3,
      40 + ((i * 13) % 90),
      9,
      ['#334155', '#475569', '#1e293b'][i % 3],
    );
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 300, W, H - 300);
  for (const [y, c] of [
    [170, '#ef4444'],
    [215, '#f8fafc'],
    [260, '#3b82f6'],
  ] as [number, string][]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + 10);
    ctx.stroke();
  }
  drawOpponent(ctx, s, ox);
  if (b.youFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${b.youFlash})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawYou(ctx, s);
  // Bars and clock.
  fillRound(ctx, 8, 8, W - 16, 58, 10, 'rgba(15,23,42,0.85)');
  bar(ctx, 20, 32, 150, b.you.hp, '#22c55e', 'YOU');
  bar(ctx, 20, 48, 150, b.you.stamina, '#38bdf8', '');
  bar(ctx, W - 170, 32, 150, b.opp.hp, '#ef4444', 'OPPONENT', true);
  text(ctx, `R${b.round}/${ROUNDS}`, W / 2, 26, { size: 13, color: '#cbd5e1' });
  text(ctx, `${Math.max(0, Math.ceil(b.clock))}`, W / 2, 48, { size: 20 });
  if (b.youDown) {
    fillRound(ctx, 40, H / 2 - 50, W - 80, 100, 16, 'rgba(127,29,29,0.92)');
    text(ctx, `${Math.min(10, Math.floor(b.count) + 1)}…`, W / 2, H / 2 - 18, { size: 34 });
    text(ctx, `Mash Space / tap to get up! ${b.presses}/${b.ai.getUp}`, W / 2, H / 2 + 24, {
      size: 15,
    });
  } else if (b.log.t > 0) {
    fillRound(ctx, 60, 80, W - 120, 36, 10, 'rgba(15,23,42,0.8)');
    text(ctx, b.log.text, W / 2, 98, { size: 16, color: '#fde68a' });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Round', value: `${s.bout.round}/${ROUNDS}` },
    { label: 'Knockdowns', value: s.bout.opp.knockdowns },
    { label: 'Best combo', value: s.bout.bestCombo },
  ],
  result: (s) => {
    const b = s.bout;
    const j = judges(b);
    const win = won(b);
    return {
      score: s.score,
      won: win,
      lost: !win,
      title:
        b.over === 'ko-win'
          ? 'Knockout victory!'
          : b.over === 'ko-loss'
            ? 'Knocked out'
            : win
              ? `You win on points ${j.you}–${j.opp}`
              : `Points decision to your opponent ${j.opp}–${j.you}`,
      details: [
        { label: 'Knockdowns scored', value: String(b.opp.knockdowns) },
        { label: 'Times down', value: String(b.you.knockdowns) },
        { label: 'Counter punches', value: String(b.counters) },
        { label: 'Best combo', value: String(b.bestCombo) },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    const b = s.bout;
    if (b.opp.knockdowns > 0) void reportProgress('boxing.knockdown', 1);
    void reportProgress('boxing.combo', b.bestCombo);
    void incrementProgress('boxing.counters', b.counters);
    if (!won(b)) return;
    void reportProgress('boxing.win', 1);
    if (b.over === 'ko-win') void reportProgress('boxing.ko', 1);
    if (difficulty === 'hard') void reportProgress('boxing.hard', 1);
  },
  touch: {
    pad: 'dpad',
    buttons: [
      { action: 'action', label: 'Jab' },
      { action: 'action2', label: 'Hook' },
    ],
  },
  pointerStarts: false,
  startHint:
    'Watch the glowing glove: ← / → to slip, ↓ to block, Space to jab, X to hook. Punch when your opponent is open!',
};
