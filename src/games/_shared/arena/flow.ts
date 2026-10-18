import type { SoundName } from '@/services/audio';
import { updateSparks } from '../arcade/draw';
import type { Spark } from '../arcade/draw';
import type { BaseState, Input } from '../arcade/kit';
import { chaserHits, newChaser, newHero, stepChaser } from './actors';
import type { Chaser, Hero, HeroInput, Loot } from './actors';
import type { Stage } from './stage';

/**
 * The life cycle shared by single-screen arena games:
 *
 *   intro ─▶ play ─▶ clear ─▶ transition ─▶ intro (next stage) … ─▶ won
 *              │
 *              └─ hero dies ─▶ respawn (or game over when out of lives)
 *
 * During play a stage clock runs: after `hurryAt` seconds the enemies get
 * angry, after `chaserAt` an unbeatable chaser drifts after the hero.
 */
export type ArenaPhase = 'intro' | 'play' | 'clear' | 'transition';

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

export interface ArenaCore extends BaseState {
  stageIndex: number;
  stage: Stage;
  /** The stage being scrolled away during a transition. */
  prev: Stage | null;
  phase: ArenaPhase;
  phaseTime: number;
  hero: Hero;
  heroStart: [number, number];
  lives: number;
  invuln: number;
  /** Seconds since the hero was hit; 0 while alive. */
  dying: number;
  stageTime: number;
  hurry: 0 | 1 | 2;
  chaser: Chaser | null;
  loot: Loot[];
  popups: Popup[];
  particles: Spark[];
  won: boolean;
  /** Score at which the next extra life is awarded. */
  nextLife: number;
  /** Deaths so far (for "no-miss" achievements). */
  deaths: number;
}

export interface FlowConfig<S extends ArenaCore> {
  stages: number;
  /** Builds a stage's contents (enemies and so on) and calls resetHero. */
  load: (s: S, index: number) => void;
  hurryAt: number;
  chaserAt: number;
  lifeEvery: number;
  /** Called when the hero is about to respawn (reset power-ups here). */
  onRespawn?: (s: S) => void;
  /** Seconds the clear phase lasts before moving on. */
  clearTime?: number;
}

export const INTRO_TIME = 1.5;
export const TRANSITION_TIME = 1.1;

export function coreState(stage: Stage, heroStart: [number, number], lives: number, lifeEvery: number): Omit<ArenaCore, keyof BaseState> {
  return {
    stageIndex: 0,
    stage,
    prev: null,
    phase: 'intro',
    phaseTime: 0,
    hero: newHero(heroStart[0], heroStart[1]),
    heroStart,
    lives,
    invuln: 0,
    dying: 0,
    stageTime: 0,
    hurry: 0,
    chaser: null,
    loot: [],
    popups: [],
    particles: [],
    won: false,
    nextLife: lifeEvery,
    deaths: 0,
  };
}

export function heroInput(input: Input): HeroInput {
  return {
    left: input.held.has('left'),
    right: input.held.has('right'),
    jump: input.held.has('action') || input.held.has('up'),
    jumpPressed: input.pressed.has('action') || input.pressed.has('up'),
    downPressed: input.pressed.has('down'),
  };
}

export function popup(s: ArenaCore, x: number, y: number, text: string, color = '#ffffff') {
  s.popups.push({ x, y, text, life: 1, color });
}

export function sound(s: ArenaCore, name: SoundName) {
  if (!s.events.includes(name)) s.events.push(name);
}

/** Puts the hero back at the stage start, facing into the room. */
export function resetHero(s: ArenaCore) {
  s.hero = newHero(s.heroStart[0], s.heroStart[1], s.heroStart[0] < 10 ? 1 : -1);
}

/** Starts a stage: the game's load() fills it in, the clocks reset. */
export function enterStage<S extends ArenaCore>(s: S, index: number, cfg: FlowConfig<S>) {
  s.stageIndex = index;
  s.stageTime = 0;
  s.hurry = 0;
  s.chaser = null;
  s.loot = [];
  s.invuln = 0;
  cfg.load(s, index);
}

export function killHero(s: ArenaCore): boolean {
  if (s.dying > 0 || s.invuln > 0 || s.phase === 'transition' || s.phase === 'intro') return false;
  s.dying = 0.0001;
  s.hero.vy = -300;
  s.deaths++;
  sound(s, 'failure');
  return true;
}

function fx(s: ArenaCore, dt: number) {
  updateSparks(s.particles, dt, 260);
  for (let i = s.popups.length - 1; i >= 0; i--) {
    const p = s.popups[i];
    p.life -= dt;
    p.y -= 26 * dt;
    if (p.life <= 0) s.popups.splice(i, 1);
  }
}

/**
 * Advances the shared flow. Returns true when the game should simulate the
 * hero, enemies and loot this frame (during play, and while collecting
 * leftovers after a clear).
 */
export function arenaFlow<S extends ArenaCore>(s: S, dt: number, cfg: FlowConfig<S>): boolean {
  s.phaseTime += dt;
  fx(s, dt);
  while (s.score >= s.nextLife) {
    s.lives++;
    s.nextLife += cfg.lifeEvery;
    popup(s, s.hero.x + 7, s.hero.y - 6, '1UP', '#4ade80');
    sound(s, 'success');
  }
  switch (s.phase) {
    case 'intro':
      if (s.phaseTime >= INTRO_TIME) {
        s.phase = 'play';
        s.phaseTime = 0;
        // A moment's grace while the hero gets bearings.
        s.invuln = Math.max(s.invuln, 1.5);
      }
      return false;
    case 'transition':
      if (s.phaseTime >= TRANSITION_TIME) {
        s.prev = null;
        s.phase = 'intro';
        s.phaseTime = 0;
      }
      return false;
    case 'clear':
      if (s.phaseTime >= (cfg.clearTime ?? 3)) {
        const next = s.stageIndex + 1;
        if (next >= cfg.stages) {
          s.won = true;
          s.over = true;
          return false;
        }
        s.prev = s.stage;
        enterStage(s, next, cfg);
        s.phase = 'transition';
        s.phaseTime = 0;
        return false;
      }
      break;
    case 'play':
      break;
  }

  if (s.dying > 0) {
    s.dying += dt;
    s.hero.vy += 900 * dt;
    s.hero.y += s.hero.vy * dt;
    if (s.dying > 1.8) {
      s.dying = 0;
      s.lives--;
      if (s.lives <= 0) {
        s.over = true;
        return false;
      }
      cfg.onRespawn?.(s);
      resetHero(s);
      s.invuln = 2.5;
      s.chaser = null;
      s.stageTime = Math.min(s.stageTime, cfg.hurryAt - 5);
      if (s.hurry === 2) s.hurry = 1;
    }
    return false;
  }

  s.invuln = Math.max(0, s.invuln - dt);
  if (s.phase === 'play') {
    s.stageTime += dt;
    if (s.hurry === 0 && s.stageTime >= cfg.hurryAt) {
      s.hurry = 1;
      sound(s, 'whoosh');
    }
    if (s.hurry === 1 && s.stageTime >= cfg.chaserAt) {
      s.hurry = 2;
      s.chaser = newChaser(s.hero.x);
      sound(s, 'explosion');
    }
  }
  if (s.chaser) {
    stepChaser(s.chaser, s.hero, dt, s.phase === 'play' ? 46 : 0);
    if (s.phase === 'play' && chaserHits(s.chaser, s.hero)) killHero(s);
  }
  return true;
}

/** Call when the last enemy of a stage is gone. */
export function stageCleared(s: ArenaCore) {
  if (s.phase !== 'play') return;
  s.phase = 'clear';
  s.phaseTime = 0;
  s.chaser = null;
  sound(s, 'levelComplete');
}

/** 0 → 1 progress of the scroll between stages. */
export const transitionProgress = (s: ArenaCore) => (s.phase === 'transition' ? Math.min(1, s.phaseTime / TRANSITION_TIME) : 1);
