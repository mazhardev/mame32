import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { E, N, S, W, distances, generateMaze, openDirections, run, shortestPath, step } from './maze';

describe('maze generation', () => {
  it('produces a perfect maze: connected, with exactly w·h − 1 passages', () => {
    for (let seed = 0; seed < 10; seed++) {
      const maze = generateMaze(12, 9, createRng(seed).next);
      const { dist } = distances(maze, 0);
      expect([...dist].every((d) => d >= 0)).toBe(true);
      let passages = 0;
      for (let c = 0; c < maze.w * maze.h; c++) {
        if (!(maze.walls[c] & E) && c % maze.w < maze.w - 1) passages++;
        if (!(maze.walls[c] & S) && Math.floor(c / maze.w) < maze.h - 1) passages++;
      }
      expect(passages).toBe(maze.w * maze.h - 1);
    }
  });

  it('keeps the outer boundary closed and walls symmetric', () => {
    const maze = generateMaze(8, 8, createRng('walls').next);
    for (let x = 0; x < 8; x++) {
      expect(maze.walls[x] & N).toBeTruthy();
      expect(maze.walls[56 + x] & S).toBeTruthy();
    }
    for (let c = 0; c < 64; c++) {
      if (c % 8 < 7) expect(!!(maze.walls[c] & E)).toBe(!!(maze.walls[c + 1] & W));
      if (c < 56) expect(!!(maze.walls[c] & S)).toBe(!!(maze.walls[c + 8] & N));
    }
  });
});

describe('maze movement', () => {
  const maze = generateMaze(10, 10, createRng('move').next);

  it('never steps through a wall or off the grid', () => {
    for (let c = 0; c < 100; c++) {
      for (const d of openDirections(maze, c)) expect(step(maze, c, d)).toBeGreaterThanOrEqual(0);
    }
    expect(step(maze, 0, 'up')).toBe(-1);
    expect(step(maze, 0, 'left')).toBe(-1);
  });

  it('finds a connected shortest path between corners', () => {
    const path = shortestPath(maze, 0, 99);
    expect(path[0]).toBe(0);
    expect(path[path.length - 1]).toBe(99);
    for (let i = 1; i < path.length; i++) {
      expect(openDirections(maze, path[i - 1]).some((d) => step(maze, path[i - 1], d) === path[i])).toBe(true);
    }
  });

  it('runs along a corridor and stops at junctions or dead ends', () => {
    for (let c = 0; c < 100; c++) {
      for (const d of openDirections(maze, c)) {
        const path = run(maze, c, d);
        expect(path.length).toBeGreaterThan(0);
        const end = path[path.length - 1];
        // Every intermediate cell is a plain corridor (exactly two openings).
        for (const mid of path.slice(0, -1)) expect(openDirections(maze, mid)).toHaveLength(2);
        // It stops at a dead end (one opening) or a junction (three or more).
        expect(openDirections(maze, end)).not.toHaveLength(2);
      }
    }
  });
});
