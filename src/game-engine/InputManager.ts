export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PointerState {
  active: boolean;
  x: number;
  y: number;
  startX: number;
  startY: number;
  id: number;
}

export interface InputOptions {
  /** Keys whose default browser behaviour (scrolling) is suppressed while the game is focused. */
  preventDefaultKeys?: string[];
  onKeyDown?: (key: string, event: KeyboardEvent) => void;
  onKeyUp?: (key: string, event: KeyboardEvent) => void;
  onDirection?: (dir: Direction) => void;
  onSwipe?: (dir: Direction) => void;
  onPointerDown?: (p: PointerState, event: PointerEvent) => void;
  onPointerMove?: (p: PointerState, event: PointerEvent) => void;
  onPointerUp?: (p: PointerState, event: PointerEvent) => void;
  swipeThreshold?: number;
  target?: HTMLElement | null;
}

const DEFAULT_PREVENT = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  ' ',
  'Space',
  'PageUp',
  'PageDown',
];

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

/**
 * Centralised keyboard + pointer input.
 * Pointer Events unify mouse and touch so games implement one code path;
 * multi-touch is exposed through the pointers map for virtual pads.
 */
export class InputManager {
  private keys = new Set<string>();
  private opts: InputOptions;
  private target: HTMLElement | Window;
  private pointers = new Map<number, PointerState>();
  private preventKeys: Set<string>;
  private disposed = false;

  constructor(opts: InputOptions = {}) {
    this.opts = opts;
    this.target = opts.target ?? window;
    this.preventKeys = new Set(opts.preventDefaultKeys ?? DEFAULT_PREVENT);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    const el = this.target as HTMLElement;
    el.addEventListener('pointerdown', this.handlePointerDown as EventListener);
    el.addEventListener('pointermove', this.handlePointerMove as EventListener);
    el.addEventListener('pointerup', this.handlePointerUp as EventListener);
    el.addEventListener('pointercancel', this.handlePointerUp as EventListener);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    const el = this.target as HTMLElement;
    el.removeEventListener('pointerdown', this.handlePointerDown as EventListener);
    el.removeEventListener('pointermove', this.handlePointerMove as EventListener);
    el.removeEventListener('pointerup', this.handlePointerUp as EventListener);
    el.removeEventListener('pointercancel', this.handlePointerUp as EventListener);
    this.keys.clear();
    this.pointers.clear();
  }

  isDown(...keys: string[]): boolean {
    return keys.some((k) => this.keys.has(k));
  }

  /** Virtual controls call this so on-screen pads share the keyboard code path. */
  setVirtualKey(key: string, down: boolean) {
    if (down) {
      if (!this.keys.has(key)) {
        this.keys.add(key);
        this.opts.onKeyDown?.(key, new KeyboardEvent('keydown', { key }));
        const dir = DIRECTION_KEYS[key];
        if (dir) this.opts.onDirection?.(dir);
      }
    } else {
      this.keys.delete(key);
      this.opts.onKeyUp?.(key, new KeyboardEvent('keyup', { key }));
    }
  }

  getAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('ArrowLeft', 'a', 'A')) x -= 1;
    if (this.isDown('ArrowRight', 'd', 'D')) x += 1;
    if (this.isDown('ArrowUp', 'w', 'W')) y -= 1;
    if (this.isDown('ArrowDown', 's', 'S')) y += 1;
    return { x, y };
  }

  getPointers(): PointerState[] {
    return [...this.pointers.values()];
  }

  clearKeys() {
    this.keys.clear();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key === ' ' ? ' ' : e.key;
    if (this.preventKeys.has(key) || this.preventKeys.has(e.code)) e.preventDefault();
    if (e.repeat) {
      this.opts.onKeyDown?.(key, e);
      return;
    }
    this.keys.add(key);
    this.opts.onKeyDown?.(key, e);
    const dir = DIRECTION_KEYS[key];
    if (dir) this.opts.onDirection?.(dir);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
    this.opts.onKeyUp?.(e.key, e);
  };

  private handleBlur = () => {
    this.keys.clear();
  };

  private localPoint(e: PointerEvent) {
    const el = this.opts.target;
    if (!el) return { x: e.clientX, y: e.clientY };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private handlePointerDown = (e: PointerEvent) => {
    const { x, y } = this.localPoint(e);
    const state: PointerState = { active: true, x, y, startX: x, startY: y, id: e.pointerId };
    this.pointers.set(e.pointerId, state);
    this.opts.onPointerDown?.(state, e);
  };

  private handlePointerMove = (e: PointerEvent) => {
    const state = this.pointers.get(e.pointerId);
    const { x, y } = this.localPoint(e);
    if (state) {
      state.x = x;
      state.y = y;
      this.opts.onPointerMove?.(state, e);
    } else {
      this.opts.onPointerMove?.(
        { active: false, x, y, startX: x, startY: y, id: e.pointerId },
        e,
      );
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    const state = this.pointers.get(e.pointerId);
    if (!state) return;
    const { x, y } = this.localPoint(e);
    state.x = x;
    state.y = y;
    state.active = false;
    this.pointers.delete(e.pointerId);
    this.opts.onPointerUp?.(state, e);

    if (this.opts.onSwipe) {
      const dx = x - state.startX;
      const dy = y - state.startY;
      const threshold = this.opts.swipeThreshold ?? 28;
      if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        if (Math.abs(dx) > Math.abs(dy)) this.opts.onSwipe(dx > 0 ? 'right' : 'left');
        else this.opts.onSwipe(dy > 0 ? 'down' : 'up');
      }
    }
  };
}
