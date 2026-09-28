import { useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { Maze } from './maze';
import { wallPath } from './maze';
import './maze.css';

/** Cell centre in maze units (one unit per cell). */
export function centre(maze: Maze, cell: number): [number, number] {
  return [(cell % maze.w) + 0.5, Math.floor(cell / maze.w) + 0.5];
}

export function MazeView({
  maze,
  player,
  exit,
  trail,
  hintPath,
  label,
  children,
  overlay,
  onPointerDown,
  onPointerUp,
}: {
  maze: Maze;
  player: number;
  exit: number;
  trail?: Iterable<number>;
  hintPath?: number[];
  label: string;
  /** Extra SVG drawn under the player (keys, doors, coins…). */
  children?: ReactNode;
  /** Extra SVG drawn over everything (fog). */
  overlay?: ReactNode;
  onPointerDown?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<SVGSVGElement>) => void;
}) {
  const walls = useMemo(() => wallPath(maze, 1), [maze]);
  const [px, py] = centre(maze, player);
  const [ex, ey] = centre(maze, exit);
  const hint = hintPath?.map((c) => centre(maze, c).join(' ')).join(' L');

  return (
    <svg
      className="maze-svg"
      viewBox={`-0.15 -0.15 ${maze.w + 0.3} ${maze.h + 0.3}`}
      style={{ aspectRatio: `${maze.w + 0.3} / ${maze.h + 0.3}` }}
      role="img"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <rect x={0} y={0} width={maze.w} height={maze.h} className="maze-floor" />
      {trail &&
        [...trail].map((c) => (
          <rect
            key={c}
            x={c % maze.w + 0.2}
            y={Math.floor(c / maze.w) + 0.2}
            width={0.6}
            height={0.6}
            rx={0.3}
            className="maze-trail"
          />
        ))}
      <g transform={`translate(${ex} ${ey})`}>
        <rect x={-0.42} y={-0.42} width={0.84} height={0.84} rx={0.15} className="maze-exit" />
        <text className="maze-exit-text" textAnchor="middle" dominantBaseline="central" fontSize={0.5}>
          ⚑
        </text>
      </g>
      {hint && <path d={`M${hint}`} className="maze-hint" />}
      {children}
      <path d={walls} className="maze-walls" />
      <g className="maze-player" style={{ transform: `translate(${px}px, ${py}px)` }}>
        <circle r={0.34} />
        <circle r={0.12} cx={-0.1} cy={-0.1} className="maze-player-shine" />
      </g>
      {overlay}
    </svg>
  );
}
