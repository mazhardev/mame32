import { useCallback, useEffect, useRef, useState } from 'react';

export interface CanvasSize {
  /** Logical (CSS pixel) width the game draws with. */
  width: number;
  height: number;
  dpr: number;
}

export interface ResponsiveCanvasOptions {
  /** Logical design size. The canvas keeps this aspect ratio. */
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** When set, the drawing surface is fixed to these logical units and scaled. */
  logicalWidth?: number;
  logicalHeight?: number;
  onResize?: (size: CanvasSize) => void;
}

/**
 * Sizes a canvas to its container while keeping crisp rendering on HiDPI
 * screens: the backing store is scaled by devicePixelRatio and the 2D context
 * is pre-transformed so games can keep drawing in logical coordinates.
 */
export function useResponsiveCanvas(options: ResponsiveCanvasOptions = {}) {
  const {
    aspectRatio,
    maxWidth = Infinity,
    maxHeight = Infinity,
    logicalWidth,
    logicalHeight,
    onResize,
  } = options;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0, dpr: 1 });
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const apply = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    let cssWidth = Math.min(rect.width, maxWidth);
    let cssHeight = Math.min(rect.height || cssWidth, maxHeight);

    if (aspectRatio) {
      if (cssWidth / cssHeight > aspectRatio) cssWidth = cssHeight * aspectRatio;
      else cssHeight = cssWidth / aspectRatio;
    }
    cssWidth = Math.max(1, Math.floor(cssWidth));
    cssHeight = Math.max(1, Math.floor(cssHeight));

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const drawWidth = logicalWidth ?? cssWidth;
    const drawHeight = logicalHeight ?? cssHeight;

    canvas.width = Math.round(drawWidth * dpr);
    canvas.height = Math.round(drawHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const next = { width: drawWidth, height: drawHeight, dpr };
    setSize((prev) =>
      prev.width === next.width && prev.height === next.height && prev.dpr === next.dpr
        ? prev
        : next,
    );
    onResizeRef.current?.(next);
  }, [aspectRatio, maxWidth, maxHeight, logicalWidth, logicalHeight]);

  useEffect(() => {
    apply();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => apply());
    observer.observe(container);
    window.addEventListener('orientationchange', apply);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', apply);
    };
  }, [apply]);

  return { containerRef, canvasRef, size, resize: apply };
}
