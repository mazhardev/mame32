import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { circle, fillRound, text } from '../_shared/arcade/draw';
import { newAim, scoreName, updateAim } from '../_shared/golf/golf';
import type { Aim, P } from '../_shared/golf/golf';
import { CLUBS, COURSE, CUP_R, PUTTER, playShot, suggestClub, surfaceAt } from './course';
import type { Hole, ShotResult } from './course';

/** Nine holes of golf: pick a club, read the wind, then putt on sloping greens. */
export const W = 400;
export const H = 640;
const MAX_STROKES = 10;

interface Tuning {
  /** Aiming error (radians) for a full-power swing. */
  accuracy: number;
  /** Strongest wind (mph). */
  wind: number;
  slope: number;
  /** 2 = show landing including wind and the putt line, 1 = landing ring, 0 = aim line only. */
  guide: number;
}

const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { accuracy: 0.02, wind: 0, slope: 0.5, guide: 2 },
  normal: { accuracy: 0.035, wind: 8, slope: 1, guide: 1 },
  hard: { accuracy: 0.05, wind: 15, slope: 1.6, guide: 0 },
};

type Phase = 'aim' | 'flight' | 'roll' | 'holed';

export interface State extends BaseState {
  hole: number;
  ball: P;
  strokes: number;
  card: number[];
  club: number;
  aim: Aim;
  phase: Phase;
  phaseT: number;
  shot: ShotResult | null;
  shotFrom: P;
  shotClub: number;
  windMph: number;
  windDir: number;
  tuning: Tuning;
  message: string;
  messageT: number;
  birdies: number;
  longestPutt: number;
}

export function windVector(s: State): P {
  // Yards of drift per 100 yards carried.
  return { x: Math.cos(s.windDir) * s.windMph * 0.6, y: Math.sin(s.windDir) * s.windMph * 0.6 };
}

function startHole(s: State, n: number, random: () => number) {
  const h = COURSE[n];
  s.hole = n;
  s.ball = { ...h.tee };
  s.strokes = 0;
  s.phase = 'aim';
  s.windMph = Math.round(random() * s.tuning.wind);
  s.windDir = random() * Math.PI * 2;
  prepareShot(s);
  s.message = `Hole ${n + 1} · Par ${h.par} · ${Math.round(h.tee.y - h.pin.y)} yards`;
  s.messageT = 2.5;
}

function prepareShot(s: State) {
  const h = COURSE[s.hole];
  const dist = Math.hypot(h.pin.x - s.ball.x, h.pin.y - s.ball.y);
  const lie = surfaceAt(h, s.ball.x, s.ball.y);
  s.club = suggestClub(dist, lie);
  const angle = Math.atan2(h.pin.y - s.ball.y, h.pin.x - s.ball.x);
  s.aim = newAim(angle);
  s.aim.power =
    s.club === PUTTER
      ? clamp(Math.sqrt(dist / 30), 0.08, 1)
      : clamp(dist / CLUBS[s.club].carry, 0.3, 1);
}

export function create(difficulty: DifficultySetting, random: () => number): State {
  const s: State = {
    ...baseState(),
    hole: 0,
    ball: { x: 0, y: 0 },
    strokes: 0,
    card: [],
    club: 0,
    aim: newAim(),
    phase: 'aim',
    phaseT: 0,
    shot: null,
    shotFrom: { x: 0, y: 0 },
    shotClub: 0,
    windMph: 0,
    windDir: 0,
    tuning: TUNING[difficulty],
    message: '',
    messageT: 0,
    birdies: 0,
    longestPutt: 0,
  };
  startHole(s, 0, random);
  return s;
}

export const totalPar = (n = COURSE.length) => COURSE.slice(0, n).reduce((a, h) => a + h.par, 0);

interface View {
  s: number;
  ox: number;
  oy: number;
}

function onGreen(s: State) {
  return surfaceAt(COURSE[s.hole], s.ball.x, s.ball.y) === 'green';
}

function courseView(h: Hole): View {
  const sc = Math.min((W - 16) / h.w, (H - 70) / h.h);
  return { s: sc, ox: (W - h.w * sc) / 2, oy: 48 + (H - 60 - h.h * sc) / 2 };
}

function greenView(s: State, h: Hole): View {
  const cx = (s.ball.x + h.pin.x) / 2;
  const cy = (s.ball.y + h.pin.y) / 2;
  const span = Math.max(
    Math.abs(s.ball.x - h.pin.x) / (W * 0.6),
    Math.abs(s.ball.y - h.pin.y) / (H * 0.5),
    1 / 28,
  );
  const sc = clamp(1 / span, 9, 28);
  return { s: sc, ox: W / 2 - cx * sc, oy: H / 2 + 10 - cy * sc };
}

export function currentView(s: State): View {
  const h = COURSE[s.hole];
  const putting =
    (s.phase === 'aim' && onGreen(s)) ||
    (s.phase === 'roll' &&
      s.shotClub === PUTTER &&
      surfaceAt(h, s.shotFrom.x, s.shotFrom.y) === 'green');
  return putting ? greenView(s, h) : courseView(h);
}

const toScreen = (v: View, p: P): P => ({ x: v.ox + p.x * v.s, y: v.oy + p.y * v.s });

function gaussian(random: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random());
}

export function takeShot(s: State, random: () => number) {
  const h = COURSE[s.hole];
  const t = s.tuning;
  const putt = s.club === PUTTER;
  const err = putt ? t.accuracy * 0.12 : t.accuracy * (0.3 + s.aim.power ** 2);
  const angle = s.aim.angle + gaussian(random) * err;
  const power = clamp(s.aim.power * (1 + gaussian(random) * (putt ? 0.015 : 0.03)), 0.02, 1.05);
  s.shotFrom = { ...s.ball };
  s.shotClub = s.club;
  s.shot = playShot(h, s.ball, s.club, angle, power, windVector(s), t.slope);
  s.strokes += 1;
  s.phase = putt ? 'roll' : 'flight';
  s.phaseT = 0;
  s.events.push(putt ? 'click' : 'whoosh');
}

function finishHole(s: State, strokes: number) {
  const h = COURSE[s.hole];
  s.card.push(strokes);
  if (strokes < h.par) s.birdies += 1;
  s.score = s.card.reduce((a, st, i) => a + Math.max(0, COURSE[i].par + 3 - st) * 100, 0);
  s.phase = 'holed';
  s.phaseT = 0;
  s.message = scoreName(strokes, h.par);
  s.messageT = 2.2;
  s.events.push(strokes <= h.par ? 'success' : 'coin');
}

function settle(s: State) {
  const shot = s.shot;
  if (!shot) return;
  if (shot.holed) {
    if (s.shotClub === PUTTER)
      s.longestPutt = Math.max(
        s.longestPutt,
        Math.hypot(s.shotFrom.x - shot.x, s.shotFrom.y - shot.y) * 3,
      );
    finishHole(s, s.strokes);
    return;
  }
  if (shot.penalty) {
    s.strokes += 1;
    s.message = shot.penalty === 'water' ? 'In the water — +1 stroke' : 'Out of bounds — +1 stroke';
    s.messageT = 2;
    s.events.push('failure');
  } else {
    s.ball = { x: shot.x, y: shot.y };
    const kind = surfaceAt(COURSE[s.hole], shot.x, shot.y);
    s.message = shot.tree
      ? 'Clipped a tree!'
      : kind === 'sand'
        ? 'In the bunker'
        : kind === 'green'
          ? 'On the green'
          : kind === 'rough'
            ? 'In the rough'
            : 'On the fairway';
    s.messageT = 1.6;
  }
  if (s.strokes >= MAX_STROKES) {
    finishHole(s, MAX_STROKES);
    return;
  }
  s.phase = 'aim';
  prepareShot(s);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.phaseT += dt;
  s.messageT = Math.max(0, s.messageT - dt);
  if (s.phase === 'aim') {
    if (input.pressed.has('action2')) s.club = (s.club + 1) % CLUBS.length;
    if (input.keys.has('q')) s.club = (s.club + CLUBS.length - 1) % CLUBS.length;
    const ball = toScreen(currentView(s), s.ball);
    if (updateAim(s.aim, input, dt, ball, 170, false)) takeShot(s, random);
    return;
  }
  if (s.phase === 'flight' && s.shot) {
    const carry = Math.hypot(s.shot.landX - s.shotFrom.x, s.shot.landY - s.shotFrom.y);
    if (s.phaseT >= 0.8 + carry / 220) {
      s.phase = 'roll';
      s.phaseT = 0;
      if (s.shot.penalty === 'water') s.events.push('pop');
    }
    return;
  }
  if (s.phase === 'roll' && s.shot) {
    if (s.shot.penalty || s.phaseT >= s.shot.path.length * 0.05) settle(s);
    return;
  }
  if (s.phase === 'holed' && s.phaseT > 2.2) {
    if (s.hole + 1 >= COURSE.length) {
      s.over = true;
      s.events.push('levelComplete');
      return;
    }
    startHole(s, s.hole + 1, random);
  }
}

/** Ball position for drawing during a flight or roll. */
function ballNow(s: State): { p: P; z: number } {
  const shot = s.shot;
  if (s.phase === 'flight' && shot) {
    const carry = Math.hypot(shot.landX - s.shotFrom.x, shot.landY - s.shotFrom.y);
    const t = clamp(s.phaseT / (0.8 + carry / 220), 0, 1);
    return {
      p: {
        x: s.shotFrom.x + (shot.landX - s.shotFrom.x) * t,
        y: s.shotFrom.y + (shot.landY - s.shotFrom.y) * t,
      },
      z: 4 * CLUBS[s.shotClub].height * t * (1 - t),
    };
  }
  if (s.phase === 'roll' && shot && shot.path.length) {
    const i = Math.min(shot.path.length - 1, Math.floor(s.phaseT / 0.05));
    return { p: shot.path[i], z: 0 };
  }
  return { p: s.ball, z: 0 };
}

function drawHole(ctx: CanvasRenderingContext2D, s: State, v: View, h: Hole) {
  ctx.fillStyle = '#1e3a1a';
  ctx.fillRect(0, 0, W, H);
  const o = toScreen(v, { x: 0, y: 0 });
  ctx.fillStyle = '#3f7d3a';
  ctx.fillRect(o.x, o.y, h.w * v.s, h.h * v.s);
  ctx.strokeStyle = '#5cad4a';
  ctx.lineWidth = h.fairwayW * v.s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  h.fairway.forEach((p, i) => {
    const q = toScreen(v, p);
    if (i) ctx.lineTo(q.x, q.y);
    else ctx.moveTo(q.x, q.y);
  });
  ctx.stroke();
  ctx.lineCap = 'butt';
  for (const w of h.water) {
    const c = toScreen(v, w);
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, w.rx * v.s, w.ry * v.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const g = toScreen(v, h.pin);
  circle(ctx, g.x, g.y, h.greenR * v.s, '#86d16b');
  for (const b of h.bunkers) {
    const c = toScreen(v, b);
    circle(ctx, c.x, c.y, b.r * v.s, '#f2d58b');
  }
  // Slope arrows on the green.
  if (v.s > 6 && s.tuning.slope > 0) {
    const ang = Math.atan2(h.slope.y, h.slope.x);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    for (let gx = -h.greenR; gx <= h.greenR; gx += 4) {
      for (let gy = -h.greenR; gy <= h.greenR; gy += 4) {
        if (gx * gx + gy * gy > (h.greenR - 1) ** 2) continue;
        const c = toScreen(v, { x: h.pin.x + gx, y: h.pin.y + gy });
        const len = 6 + Math.hypot(h.slope.x, h.slope.y) * s.tuning.slope * 6;
        ctx.beginPath();
        ctx.moveTo(c.x - (Math.cos(ang) * len) / 2, c.y - (Math.sin(ang) * len) / 2);
        ctx.lineTo(c.x + (Math.cos(ang) * len) / 2, c.y + (Math.sin(ang) * len) / 2);
        ctx.lineTo(
          c.x + (Math.cos(ang + 2.6) * 3 + Math.cos(ang) * len) / 2 + 0,
          c.y + (Math.sin(ang + 2.6) * 3 + Math.sin(ang) * len) / 2,
        );
        ctx.stroke();
      }
    }
  }
  for (const t of h.trees) {
    const c = toScreen(v, t);
    circle(ctx, c.x + t.r * v.s * 0.2, c.y + t.r * v.s * 0.25, t.r * v.s, 'rgba(0,0,0,0.25)');
    circle(ctx, c.x, c.y, t.r * v.s, '#14532d');
    circle(ctx, c.x - t.r * v.s * 0.3, c.y - t.r * v.s * 0.3, t.r * v.s * 0.45, '#166534');
  }
  const tee = toScreen(v, h.tee);
  fillRound(ctx, tee.x - 5 * v.s, tee.y - 3 * v.s, 10 * v.s, 6 * v.s, 2, 'rgba(255,255,255,0.18)');
  circle(ctx, g.x, g.y, Math.max(2.5, CUP_R * v.s), '#0b0f0a');
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x, g.y - 26);
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(g.x, g.y - 26);
  ctx.lineTo(g.x + 14, g.y - 21);
  ctx.lineTo(g.x, g.y - 16);
  ctx.fill();
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const h = COURSE[s.hole];
  const v = currentView(s);
  drawHole(ctx, s, v, h);
  const b = toScreen(v, s.ball);

  if (s.phase === 'aim') {
    const putt = s.club === PUTTER;
    if (putt) {
      if (s.tuning.guide >= 2) {
        const preview = playShot(
          h,
          s.ball,
          PUTTER,
          s.aim.angle,
          s.aim.power,
          { x: 0, y: 0 },
          s.tuning.slope,
        );
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        preview.path.forEach((p, i) => {
          const q = toScreen(v, p);
          if (i) ctx.lineTo(q.x, q.y);
          else ctx.moveTo(q.x, q.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const len = 20 + s.aim.power * (s.tuning.guide >= 1 ? 120 : 50);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + Math.cos(s.aim.angle) * len, b.y + Math.sin(s.aim.angle) * len);
      ctx.stroke();
    } else {
      const lie = surfaceAt(h, s.ball.x, s.ball.y);
      const carry =
        CLUBS[s.club].carry *
        s.aim.power *
        (lie === 'rough' ? 0.85 : lie === 'sand' ? (s.club === PUTTER - 1 ? 0.9 : 0.6) : 1);
      const wind = s.tuning.guide >= 2 ? windVector(s) : { x: 0, y: 0 };
      const land = toScreen(v, {
        x: s.ball.x + Math.cos(s.aim.angle) * carry + (wind.x * carry) / 100,
        y: s.ball.y + Math.sin(s.aim.angle) * carry + (wind.y * carry) / 100,
      });
      ctx.strokeStyle = 'rgba(250,204,21,0.85)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(land.x, land.y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (s.tuning.guide >= 1) {
        const spread = Math.max(
          4,
          carry * s.tuning.accuracy * (0.3 + s.aim.power ** 2) * v.s * 1.4,
        );
        ctx.beginPath();
        ctx.ellipse(land.x, land.y, spread, spread * 0.7, s.aim.angle, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const now = ballNow(s);
  const bp = toScreen(v, now.p);
  if (s.phase !== 'holed') {
    const r = Math.max(3, 0.6 * v.s * 0.25);
    circle(ctx, bp.x + 1, bp.y + 1.5, r, 'rgba(0,0,0,0.35)');
    circle(ctx, bp.x, bp.y - now.z * v.s * 0.6, r + now.z * 0.05, '#f8fafc');
  }

  // Info panel.
  fillRound(ctx, 8, 6, W - 16, 38, 8, 'rgba(15,23,42,0.85)');
  const dist = Math.round(
    Math.hypot(h.pin.x - s.ball.x, h.pin.y - s.ball.y) * (s.club === PUTTER ? 3 : 1),
  );
  text(ctx, `Hole ${s.hole + 1} · Par ${h.par} · Shot ${s.strokes + 1}`, 18, 18, {
    size: 12,
    align: 'left',
    color: '#cbd5e1',
  });
  text(ctx, `${CLUBS[s.club].name} · ${dist} ${s.club === PUTTER ? 'ft' : 'yd'} to pin`, 18, 34, {
    size: 13,
    align: 'left',
  });
  if (s.windMph > 0) {
    const cx = W - 40;
    const cy = 25;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(s.windDir) * 10, cy - Math.sin(s.windDir) * 10);
    ctx.lineTo(cx + Math.cos(s.windDir) * 10, cy + Math.sin(s.windDir) * 10);
    ctx.stroke();
    circle(ctx, cx + Math.cos(s.windDir) * 10, cy + Math.sin(s.windDir) * 10, 3, '#7dd3fc');
    text(ctx, `${s.windMph} mph`, cx - 20, cy, { size: 12, align: 'right', color: '#7dd3fc' });
  } else text(ctx, 'Calm', W - 18, 25, { size: 12, align: 'right', color: '#94a3b8' });

  if (s.phase === 'aim') {
    fillRound(ctx, W - 22, 60, 12, 160, 6, 'rgba(15,23,42,0.6)');
    const ph = 156 * clamp(s.aim.power, 0, 1);
    fillRound(ctx, W - 20, 218 - ph, 8, ph, 4, '#f59e0b');
  }
  if (s.messageT > 0 && s.message) {
    fillRound(ctx, 40, H - 50, W - 80, 36, 10, 'rgba(15,23,42,0.85)');
    text(ctx, s.message, W / 2, H - 32, {
      size: s.phase === 'holed' ? 18 : 14,
      color: s.phase === 'holed' ? '#fde68a' : '#fff',
    });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => {
    const played = s.card.length;
    const diff = s.card.reduce((a, b) => a + b, 0) - totalPar(played);
    return [
      { label: 'Hole', value: `${s.hole + 1}/9` },
      { label: 'To par', value: diff === 0 ? 'E' : diff > 0 ? `+${diff}` : String(diff) },
      { label: 'Club', value: CLUBS[s.club].name },
    ];
  },
  result: (s) => {
    const total = s.card.reduce((a, b) => a + b, 0);
    const diff = total - totalPar();
    return {
      score: s.score,
      won: diff <= 0,
      title: `Round of ${total} (${diff === 0 ? 'even par' : diff > 0 ? `+${diff}` : diff})`,
      details: COURSE.map((h, i) => ({
        label: `Hole ${i + 1} (par ${h.par})`,
        value: String(s.card[i] ?? '–'),
      })),
    };
  },
  onEnd: (s, difficulty) => {
    const total = s.card.reduce((a, b) => a + b, 0);
    void incrementProgress('golf.rounds', 1);
    if (s.birdies > 0) void reportProgress('golf.birdie', 1);
    void reportProgress('golf.putt', Math.round(s.longestPutt));
    if (total <= totalPar() + 5) void reportProgress('golf.bogey', 1);
    if (total <= totalPar() && difficulty !== 'easy') void reportProgress('golf.par', 1);
  },
  touch: {
    pad: 'dpad',
    buttons: [
      { action: 'action', label: 'Swing' },
      { action: 'action2', label: 'Club' },
    ],
  },
  customKeys: ['q'],
  pointerStarts: false,
  startHint:
    'Drag back from the ball and release to swing (or ← → aim, ↑ ↓ power, Space). X / Q change club. Nine holes, par 36.',
};
