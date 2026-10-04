import { describe, expect, it } from 'vitest';
import { hills, makeBody, step } from './vehicle';
import type { VehicleSpec } from './vehicle';

const JEEP: VehicleSpec = {
  mass: 1,
  inertia: 600,
  wheels: [
    [-24, 14],
    [24, 14],
  ],
  wheelR: 11,
  spring: 900,
  damping: 40,
  engine: 700,
  brake: 900,
  airTorque: 2000,
  head: [-2, -22],
  maxSpeed: 420,
};

const flat = () => 300;

describe('hill vehicle physics', () => {
  it('rests on flat ground without sinking or bouncing away', () => {
    const b = makeBody(0, flat, JEEP);
    for (let i = 0; i < 180; i++) step(b, JEEP, flat, 0, 1 / 60);
    expect(b.grounded).toBe(true);
    expect(Math.abs(b.vy)).toBeLessThan(5);
    expect(Math.abs(b.a)).toBeLessThan(0.05);
    expect(b.crashed).toBe(false);
  });

  it('drives forwards with throttle and stops with the brake', () => {
    const b = makeBody(0, flat, JEEP);
    for (let i = 0; i < 120; i++) step(b, JEEP, flat, 1, 1 / 60);
    expect(b.vx).toBeGreaterThan(100);
    for (let i = 0; i < 240; i++) step(b, JEEP, flat, -1, 1 / 60);
    expect(b.vx).toBeLessThan(40);
  });

  it('climbs gentle hills and stays upright', () => {
    const g = hills(3, 0.6);
    const b = makeBody(0, g, JEEP);
    for (let i = 0; i < 60 * 8; i++) step(b, JEEP, g, 0.7, 1 / 60);
    expect(b.x).toBeGreaterThan(800);
    expect(b.crashed).toBe(false);
  });

  it('flipping onto the roof crashes', () => {
    const b = makeBody(0, flat, JEEP);
    b.a = Math.PI;
    b.y -= 10;
    for (let i = 0; i < 60; i++) step(b, JEEP, flat, 0, 1 / 60);
    expect(b.crashed).toBe(true);
  });
});
