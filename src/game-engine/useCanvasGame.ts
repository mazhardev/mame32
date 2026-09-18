import { useEffect, useRef, useState } from 'react';
import { GameLoop } from './GameLoop';
import { useGameShell } from './context';
import { useResponsiveCanvas } from '@/hooks/useResponsiveCanvas';
import type { ResponsiveCanvasOptions } from '@/hooks/useResponsiveCanvas';
import { usePreferences } from '@/hooks/usePlatform';

export interface CanvasGameOptions extends ResponsiveCanvasOptions {
  update: (dt: number, elapsed: number) => void;
  render: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Runs once the canvas has a real size — good for seeding entity positions. */
  init?: (width: number, height: number) => void;
  autoStart?: boolean;
}

/**
 * Wires a canvas, the shared game loop and the shell's pause state together.
 * The loop is fully stopped while paused, so nothing runs off-screen, and the
 * render callback receives a context already scaled for devicePixelRatio.
 */
export function useCanvasGame(options: CanvasGameOptions) {
  const {
    update,
    render,
    init,
    autoStart = true,
    ...canvasOptions
  } = options;
  const shell = useGameShell();
  const [prefs] = usePreferences();
  const [fps, setFps] = useState(0);

  const updateRef = useRef(update);
  const renderRef = useRef(render);
  const initRef = useRef(init);
  updateRef.current = update;
  renderRef.current = render;
  initRef.current = init;

  const { containerRef, canvasRef, size } = useResponsiveCanvas(canvasOptions);
  const loopRef = useRef<GameLoop | null>(null);
  const initialisedRef = useRef(false);
  // Read inside the effect so a loop rebuilt by a resize starts in the state the
  // shell is actually in, rather than always starting unpaused.
  const pausedRef = useRef(shell.paused);
  pausedRef.current = shell.paused;

  useEffect(() => {
    if (!size.width || !size.height) return;
    if (!initialisedRef.current) {
      initialisedRef.current = true;
      initRef.current?.(size.width, size.height);
    }

    const loop = new GameLoop({
      update: (dt, elapsed) => updateRef.current(dt, elapsed),
      render: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        renderRef.current(ctx, size.width, size.height);
      },
      onFps: prefs.showFps ? setFps : undefined,
    });
    loopRef.current = loop;
    loop.setPaused(pausedRef.current);
    if (autoStart) loop.start();
    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, [size.width, size.height, autoStart, prefs.showFps, canvasRef]);

  useEffect(() => {
    loopRef.current?.setPaused(shell.paused);
  }, [shell.paused]);

  return {
    containerRef,
    canvasRef,
    size,
    fps: prefs.showFps ? fps : null,
    showFps: prefs.showFps,
    loop: loopRef,
  };
}
