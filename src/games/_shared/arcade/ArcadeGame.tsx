import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameShell } from '@/game-engine/context';
import { GameLoop } from '@/game-engine/GameLoop';
import { GameHud } from '@/components/game/GameHud';
import type { HudItem } from '@/components/game/GameHud';
import { ActionButton, DPad, TouchControls } from '@/components/game/TouchControls';
import { useIsCoarsePointer } from '@/hooks/usePlatform';
import { DEFAULT_KEYS, emptyInput } from './kit';
import type { Action, ArcadeSpec, BaseState, Input } from './kit';
import './arcade.css';

type Phase = 'ready' | 'playing' | 'over';

/** Letter keys are delivered lower-case so Shift or Caps Lock do not matter. */
const normKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/**
 * Runs an ArcadeSpec: sizes a sharp canvas, drives the game loop (stopped
 * whenever the shell is paused or the tab is hidden), collects keyboard,
 * pointer and touch-button input, and handles start, game over and restart.
 */
export function ArcadeGame<S extends BaseState>({ spec, maxHeight = 0.72 }: { spec: ArcadeSpec<S>; maxHeight?: number }) {
  const shell = useGameShell();
  const coarse = useIsCoarsePointer();
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<S>(spec.create(shell.difficulty, Math.random));
  const inputRef = useRef<Input>(emptyInput());
  const phaseRef = useRef<Phase>('ready');
  const [phase, setPhase] = useState<Phase>('ready');
  const [hud, setHud] = useState<HudItem[]>(() => spec.hud(stateRef.current));
  const scaleRef = useRef(1);
  const specRef = useRef(spec);
  specRef.current = spec;

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const start = useCallback(() => {
    if (phaseRef.current !== 'ready' || shell.paused) return;
    setPhaseBoth('playing');
    shell.startRound();
    shell.play('select');
  }, [shell]);

  const restart = useCallback(() => {
    stateRef.current = specRef.current.create(shell.difficulty, Math.random);
    inputRef.current = emptyInput();
    setPhaseBoth('ready');
    setHud(specRef.current.hud(stateRef.current));
  }, [shell.difficulty]);

  useEffect(() => shell.registerRestart(restart), [shell, restart]);

  /* ------------------------------------------------------------ canvas size */
  const expanded = shell.isFullscreen;
  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !stage || !canvas) return;
    const apply = () => {
      let avail: number;
      let maxH: number;
      if (expanded) {
        // Full screen: fit the box the layout leaves after the HUD and touch pads.
        const box = stage.getBoundingClientRect();
        avail = box.width;
        maxH = box.height;
        if (!avail || !maxH) return;
      } else {
        avail = wrap.getBoundingClientRect().width;
        if (!avail) return;
        maxH = Math.max(240, window.innerHeight * maxHeight);
      }
      let cssW = avail;
      let cssH = (cssW * spec.height) / spec.width;
      if (cssH > maxH) {
        cssH = maxH;
        cssW = (cssH * spec.width) / spec.height;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.style.width = `${Math.floor(cssW)}px`;
      canvas.style.height = `${Math.floor(cssH)}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      scaleRef.current = (cssW / spec.width) * dpr;
      draw();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    ro.observe(stage);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.width, spec.height, maxHeight, expanded]);

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const k = scaleRef.current;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    specRef.current.render(ctx, stateRef.current);
  };

  /* -------------------------------------------------------------- the loop */
  useEffect(() => {
    let hudTimer = 0;
    const loop = new GameLoop({
      update: (dt) => {
        const s = stateRef.current;
        const input = inputRef.current;
        if (phaseRef.current === 'playing' && !s.over) {
          s.time += dt;
          specRef.current.update(s, dt, input, Math.random);
          for (const e of s.events) shell.play(e);
          s.events.length = 0;
          if (s.over) {
            setPhaseBoth('over');
            setHud(specRef.current.hud(s));
            specRef.current.onEnd?.(s, shell.difficulty);
            shell.endRound(specRef.current.result(s));
          }
        }
        input.pressed.clear();
        input.keys.clear();
        input.pointer.pressed = false;
        input.pointer.released = false;
        hudTimer += dt;
        if (hudTimer > 0.15) {
          hudTimer = 0;
          setHud(specRef.current.hud(s));
        }
      },
      render: draw,
    });
    loop.setPaused(shell.paused);
    loop.start();
    return () => loop.stop();
    // Recreated when pause changes so a paused game does no work at all.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell.paused]);

  /* ------------------------------------------------------------- keyboard */
  useEffect(() => {
    const keys = spec.keys ?? DEFAULT_KEYS;
    const custom = new Set(spec.customKeys ?? []);
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const raw = normKey(e.key);
      if (custom.has(raw)) {
        e.preventDefault();
        if (phaseRef.current === 'ready') start();
        else {
          if (!e.repeat) inputRef.current.keys.add(raw);
          inputRef.current.keysHeld.add(raw);
        }
        return;
      }
      const action = keys[e.key];
      if (!action) return;
      e.preventDefault();
      if (phaseRef.current === 'ready') {
        start();
        return;
      }
      const input = inputRef.current;
      if (!e.repeat) input.pressed.add(action);
      input.held.add(action);
    };
    const up = (e: KeyboardEvent) => {
      inputRef.current.keysHeld.delete(normKey(e.key));
      const action = keys[e.key];
      if (action) inputRef.current.held.delete(action);
    };
    const blur = () => {
      inputRef.current.held.clear();
      inputRef.current.keysHeld.clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [spec.customKeys, spec.keys, start]);

  /* -------------------------------------------------------------- pointer */
  const toLogical = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * spec.width, ((e.clientY - r.top) / r.height) * spec.height];
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [x, y] = toLogical(e);
    const p = inputRef.current.pointer;
    // The press that starts the game is not also delivered as a game action.
    const starting = phaseRef.current === 'ready' && spec.pointerStarts !== false;
    Object.assign(p, { x, y, down: !starting, pressed: !starting, active: true });
    if (starting) start();
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const [x, y] = toLogical(e);
    Object.assign(inputRef.current.pointer, { x, y, active: true });
  };
  const onPointerUp = () => {
    const p = inputRef.current.pointer;
    p.down = false;
    p.released = true;
  };

  /* ---------------------------------------------------------- touch pads */
  const press = (a: Action) => {
    if (phaseRef.current === 'ready') {
      start();
      return;
    }
    inputRef.current.pressed.add(a);
    inputRef.current.held.add(a);
  };
  const release = (a: Action) => inputRef.current.held.delete(a);
  const touch = spec.touch ?? {};
  const dirMap: Record<string, Action> = { up: 'up', down: 'down', left: 'left', right: 'right' };

  return (
    <div className="arcade" ref={wrapRef}>
      <GameHud items={hud} />
      <div className="arcade-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="arcade-canvas"
          role="img"
          aria-label={`${shell.game.title} play area`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />
        {phase === 'ready' && (
          <button type="button" className="arcade-start" onClick={start} disabled={shell.paused}>
            <span className="arcade-start-title">Tap or press Space to start</span>
            <span className="arcade-start-hint">{spec.startHint}</span>
          </button>
        )}
      </div>
      {coarse && (touch.pad !== 'none' || touch.buttons?.length) && (
        <TouchControls>
          {touch.pad === 'dpad' || touch.pad === undefined ? (
            <DPad onPress={(d) => press(dirMap[d])} onRelease={(d) => release(dirMap[d])} />
          ) : touch.pad === 'horizontal' ? (
            <DPad axis="horizontal" onPress={(d) => press(dirMap[d])} onRelease={(d) => release(dirMap[d])} />
          ) : touch.pad === 'vertical' ? (
            <div className="arcade-vpad">
              <ActionButton label="▲" ariaLabel="Up" onPress={() => press('up')} onRelease={() => release('up')} />
              <ActionButton label="▼" ariaLabel="Down" onPress={() => press('down')} onRelease={() => release('down')} />
            </div>
          ) : (
            <span />
          )}
          <div className="arcade-buttons">
            {touch.buttons?.map((b) => (
              <ActionButton key={b.action} label={b.label} onPress={() => press(b.action)} onRelease={() => release(b.action)} />
            ))}
          </div>
        </TouchControls>
      )}
    </div>
  );
}
