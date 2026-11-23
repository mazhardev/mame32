import { getPreferences, subscribe } from '@/storage/StorageService';

export type SoundName =
  | 'click'
  | 'select'
  | 'success'
  | 'failure'
  | 'coin'
  | 'levelComplete'
  | 'gameOver'
  | 'pop'
  | 'blip'
  | 'whoosh'
  | 'hit'
  | 'explosion'
  | 'jump'
  | 'powerup'
  | 'achievement'
  | 'shoot'
  | 'card'
  | 'tick'
  | 'pad0'
  | 'pad1'
  | 'pad2'
  | 'pad3';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;

function syncPrefs() {
  const prefs = getPreferences();
  enabled = prefs.sound;
  volume = prefs.volume;
  if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
}

let subscribed = false;

/** Resumes a context the browser has paused; never throws. */
function wakeContext(context: AudioContext) {
  // 'interrupted' is iOS after a phone call or switching apps.
  if (context.state !== 'running') void context.resume().catch(() => undefined);
}

let gesturesHooked = false;
let primed = false;

/**
 * Phones only let a page start audio from a tap or key press. A game that plays
 * its sounds from the animation loop or a timer (a bounce, the computer's move)
 * would stay silent if nothing had woken the audio in a gesture, and iOS pauses
 * it again after a call or an app switch. So once a game has used sound, every
 * tap or key press wakes it; the first one also plays a silent sample, which
 * older iOS versions need before any sound is heard.
 */
function hookGestures() {
  if (gesturesHooked || typeof window === 'undefined') return;
  gesturesHooked = true;
  const wake = () => {
    if (!enabled || !ctx) return;
    wakeContext(ctx);
    if (primed) return;
    primed = true;
    try {
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 22050);
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Decorative only.
    }
  };
  for (const type of ['pointerdown', 'touchend', 'keydown']) {
    window.addEventListener(type, wake, { capture: true, passive: true });
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!subscribed) {
    subscribed = true;
    syncPrefs();
    subscribe('preferences', syncPrefs);
  }
  hookGestures();
  if (ctx && ctx.state === 'closed') ctx = null;
  if (ctx) {
    wakeContext(ctx);
    return ctx;
  }
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

interface ToneSpec {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  duration: number;
  gain?: number;
  delay?: number;
  sweep?: 'exp' | 'linear';
}

function playTone(spec: ToneSpec) {
  const context = ensureContext();
  if (!context || !master) return;
  const start = context.currentTime + (spec.delay ?? 0);
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = spec.type ?? 'sine';
  osc.frequency.setValueAtTime(spec.freq, start);
  if (spec.freqEnd && spec.freqEnd !== spec.freq) {
    const target = Math.max(1, spec.freqEnd);
    if (spec.sweep === 'linear') osc.frequency.linearRampToValueAtTime(target, start + spec.duration);
    else osc.frequency.exponentialRampToValueAtTime(target, start + spec.duration);
  }
  const peak = spec.gain ?? 0.2;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + spec.duration + 0.03);
}

function playNoise(duration: number, gainValue = 0.15, filterFreq = 1200, delay = 0) {
  const context = ensureContext();
  if (!context || !master) return;
  const start = context.currentTime + delay;
  const frames = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, Math.max(1, frames), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = context.createGain();
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(start);
}

/** All effects are synthesised at runtime — no audio files are shipped. */
const RECIPES: Record<SoundName, () => void> = {
  click: () => playTone({ type: 'square', freq: 620, duration: 0.05, gain: 0.08 }),
  select: () => playTone({ type: 'triangle', freq: 880, freqEnd: 1120, duration: 0.09, gain: 0.1 }),
  blip: () => playTone({ type: 'square', freq: 440, duration: 0.06, gain: 0.09 }),
  tick: () => playTone({ type: 'sine', freq: 1400, duration: 0.03, gain: 0.05 }),
  pop: () => playTone({ type: 'sine', freq: 320, freqEnd: 720, duration: 0.1, gain: 0.14 }),
  success: () => {
    playTone({ type: 'triangle', freq: 523, duration: 0.12, gain: 0.14 });
    playTone({ type: 'triangle', freq: 659, duration: 0.12, gain: 0.14, delay: 0.1 });
    playTone({ type: 'triangle', freq: 784, duration: 0.2, gain: 0.14, delay: 0.2 });
  },
  failure: () => {
    playTone({ type: 'sawtooth', freq: 320, freqEnd: 110, duration: 0.32, gain: 0.13 });
  },
  coin: () => {
    playTone({ type: 'square', freq: 988, duration: 0.07, gain: 0.11 });
    playTone({ type: 'square', freq: 1319, duration: 0.16, gain: 0.11, delay: 0.06 });
  },
  levelComplete: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      playTone({ type: 'triangle', freq: f, duration: 0.16, gain: 0.13, delay: i * 0.09 }),
    );
  },
  gameOver: () => {
    [440, 370, 294, 220].forEach((f, i) =>
      playTone({ type: 'sawtooth', freq: f, duration: 0.22, gain: 0.12, delay: i * 0.14 }),
    );
  },
  whoosh: () => playNoise(0.22, 0.1, 800),
  hit: () => {
    playTone({ type: 'square', freq: 180, freqEnd: 60, duration: 0.12, gain: 0.16 });
    playNoise(0.08, 0.1, 900);
  },
  explosion: () => {
    playNoise(0.5, 0.22, 600);
    playTone({ type: 'sawtooth', freq: 120, freqEnd: 40, duration: 0.45, gain: 0.14 });
  },
  jump: () => playTone({ type: 'square', freq: 300, freqEnd: 720, duration: 0.13, gain: 0.11 }),
  powerup: () => {
    [392, 523, 659, 880].forEach((f, i) =>
      playTone({ type: 'square', freq: f, duration: 0.09, gain: 0.1, delay: i * 0.05 }),
    );
  },
  achievement: () => {
    [659, 784, 988, 1319].forEach((f, i) =>
      playTone({ type: 'triangle', freq: f, duration: 0.2, gain: 0.12, delay: i * 0.08 }),
    );
  },
  shoot: () => playTone({ type: 'square', freq: 1200, freqEnd: 300, duration: 0.09, gain: 0.09 }),
  card: () => playNoise(0.1, 0.08, 2400),
  // Four musical notes for memory pads (G4, C5, E5, G5), the same on playback and press.
  pad0: () => playTone({ type: 'triangle', freq: 392, duration: 0.32, gain: 0.16 }),
  pad1: () => playTone({ type: 'triangle', freq: 523, duration: 0.32, gain: 0.16 }),
  pad2: () => playTone({ type: 'triangle', freq: 659, duration: 0.32, gain: 0.16 }),
  pad3: () => playTone({ type: 'triangle', freq: 784, duration: 0.32, gain: 0.16 }),
};

export function playSound(name: SoundName) {
  if (!enabled) return;
  try {
    RECIPES[name]?.();
  } catch {
    // Audio is decorative; never let a failure break gameplay.
  }
}

export function vibrate(pattern: number | number[]) {
  const prefs = getPreferences();
  if (!prefs.vibration) return;
  // Chrome rejects (and logs) vibration before the user has interacted.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported — ignore.
  }
}

/** Browsers require a user gesture before audio can start. */
export function unlockAudio() {
  ensureContext();
}

export function setAudioEnabled(next: boolean) {
  enabled = next;
}

export function isAudioEnabled() {
  return enabled;
}
