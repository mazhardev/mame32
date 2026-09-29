/**
 * Maze Muncher's original maze. Legend:
 *   '#' wall, '.' dot, 'o' power pellet, '_' open floor, ' ' outside the maze,
 *   '=' ghost-house door, 'H' ghost house, 'P' player start.
 * Row 9 is a tunnel: walking off either side wraps to the other.
 */
export const MAZE = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###.#.###.####',
  '   #.#.......#.#   ',
  '####.#.##=##.#.####',
  '____._.#HHH#._.____',
  '####.#.#####.#.####',
  '   #.#.......#.#   ',
  '####.#.#####.#.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];

export const COLS = MAZE[0].length;
export const ROWS = MAZE.length;
export const TUNNEL_ROW = 9;
export const DOOR = { x: 9, y: 8 };
export const HOUSE = { x: 9, y: 9 };
export const PLAYER_START = { x: 9, y: 15 };

export function tile(x: number, y: number): string {
  if (y === TUNNEL_ROW && (x < 0 || x >= COLS)) return '_';
  return MAZE[y]?.[x] ?? ' ';
}

/** Floor the player can walk on. */
export function walkable(x: number, y: number): boolean {
  return '._oP'.includes(tile(x, y));
}

/** Ghosts may also use the door and the house. */
export function ghostWalkable(x: number, y: number): boolean {
  return walkable(x, y) || tile(x, y) === '=' || tile(x, y) === 'H';
}
