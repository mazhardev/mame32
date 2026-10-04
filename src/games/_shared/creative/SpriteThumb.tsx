import type { Sprite } from './sprites';

/** A small SVG rendering of a pixel sprite. */
export function SpriteThumb({
  sprite,
  colors,
  size = 16,
}: {
  sprite?: Sprite;
  colors?: (string | null)[];
  size?: number;
}) {
  const cells: { x: number; y: number; c: string }[] = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const c = colors
        ? colors[y * size + x]
        : sprite
          ? sprite.rows[y][x] === '.'
            ? null
            : sprite.palette[sprite.rows[y][x]]
          : null;
      if (c) cells.push({ x, y, c });
    }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" aria-hidden="true">
      {cells.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={1} height={1} fill={p.c} />
      ))}
    </svg>
  );
}
