export interface LoopHandlers {
  /** Fixed-ish update; dt is seconds, clamped to avoid huge catch-up jumps. */
  update: (dt: number, elapsed: number) => void;
  render?: (alpha: number) => void;
  onFps?: (fps: number) => void;
}

/**
 * requestAnimationFrame driver shared by every canvas game.
 * Stops entirely while paused or when the tab is hidden so no work is done
 * off-screen, and clamps dt so returning to a backgrounded tab never
 * teleports the simulation.
 */
export class GameLoop {
  private handlers: LoopHandlers;
  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private running = false;
  private paused = false;
  private frames = 0;
  private fpsTimer = 0;
  private maxDt: number;

  constructor(handlers: LoopHandlers, options: { maxDt?: number } = {}) {
    this.handlers = handlers;
    this.maxDt = options.maxDt ?? 0.05;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.schedule();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    } else if (this.running) {
      this.lastTime = performance.now();
      this.schedule();
    }
  }

  isPaused() {
    return this.paused;
  }

  isRunning() {
    return this.running && !this.paused;
  }

  getElapsed() {
    return this.elapsed;
  }

  private schedule() {
    if (!this.running || this.paused || this.rafId) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.rafId = 0;
    if (!this.running || this.paused) return;
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, this.maxDt);
    this.elapsed += dt;

    this.handlers.update(dt, this.elapsed);
    this.handlers.render?.(1);

    if (this.handlers.onFps) {
      this.frames += 1;
      this.fpsTimer += rawDt;
      if (this.fpsTimer >= 0.5) {
        this.handlers.onFps(Math.round(this.frames / this.fpsTimer));
        this.frames = 0;
        this.fpsTimer = 0;
      }
    }
    this.schedule();
  };
}
