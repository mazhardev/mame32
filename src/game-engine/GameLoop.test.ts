import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameLoop } from './GameLoop';

describe('GameLoop lifecycle', () => {
  let frames: Map<number, FrameRequestCallback>;
  let nextId: number;

  beforeEach(() => {
    frames = new Map();
    nextId = 1;
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function frame(now: number) {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
  }

  it('does not schedule any work when started while paused', () => {
    const update = vi.fn();
    const loop = new GameLoop({ update });
    loop.setPaused(true);
    loop.start();
    expect(frames.size).toBe(0);
    expect(update).not.toHaveBeenCalled();
    loop.setPaused(false);
    expect(frames.size).toBe(1);
  });

  it.each(['stop', 'pause'] as const)('does not schedule another frame after %s inside update', (action) => {
    const loop = new GameLoop({
      update: () => action === 'stop' ? loop.stop() : loop.setPaused(true),
    });
    loop.start();
    frame(16);
    expect(frames.size).toBe(0);
    expect(loop.isRunning()).toBe(false);
  });

  it('keeps one frame scheduled if update stops and starts the loop', () => {
    const loop = new GameLoop({ update: () => { loop.stop(); loop.start(); } });
    loop.start();
    loop.start();
    frame(16);
    expect(frames.size).toBe(1);
    loop.stop();
    expect(frames.size).toBe(0);
  });

  it('excludes paused time and clamps long frames', () => {
    const update = vi.fn();
    const loop = new GameLoop({ update });
    loop.start();
    frame(1000);
    expect(update).toHaveBeenLastCalledWith(0.05, 0.05);
    loop.setPaused(true);
    expect(frames.size).toBe(0);
    vi.mocked(performance.now).mockReturnValue(5000);
    loop.setPaused(false);
    frame(5010);
    expect(update).toHaveBeenLastCalledWith(0.01, expect.closeTo(0.06));
  });
});
