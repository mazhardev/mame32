import type { DifficultySetting } from '@/types';
import { tieredUpgrades } from '../_shared/idle/clicker';
import type { ClickerCfg, Producer, Upgrade } from '../_shared/idle/clicker';

/** Rates are brisk on purpose: a session should reach the goal in well under an hour. */
const PACE = 4;

export const PRODUCERS: Producer[] = [
  {
    id: 'pin',
    name: 'Rolling Pin',
    icon: '🥖',
    base: 15,
    rate: 0.1 * PACE,
    desc: 'Rolls a little dough',
  },
  {
    id: 'oven',
    name: 'Home Oven',
    icon: '🔥',
    base: 100,
    rate: 1 * PACE,
    desc: 'A cosy kitchen oven',
  },
  { id: 'bakery', name: 'Bakery', icon: '🏠', base: 1100, rate: 8 * PACE, desc: 'A corner bakery' },
  {
    id: 'field',
    name: 'Wheat Field',
    icon: '🌾',
    base: 12000,
    rate: 47 * PACE,
    desc: 'Grows cookie flour',
  },
  {
    id: 'line',
    name: 'Factory Line',
    icon: '🏭',
    base: 130000,
    rate: 260 * PACE,
    desc: 'Conveyor-belt baking',
  },
  {
    id: 'mine',
    name: 'Sugar Mine',
    icon: '⛏️',
    base: 1.4e6,
    rate: 1400 * PACE,
    desc: 'Digs up sugar crystals',
  },
  {
    id: 'river',
    name: 'Chocolate River',
    icon: '🍫',
    base: 2e7,
    rate: 7800 * PACE,
    desc: 'Endless melted chocolate',
  },
  {
    id: 'lab',
    name: 'Cookie Lab',
    icon: '🧪',
    base: 3.3e8,
    rate: 44000 * PACE,
    desc: 'Science-grade cookies',
  },
];

const CLICK_UPGRADES: Upgrade[] = [
  {
    id: 'mitts',
    name: 'Oven Mitts',
    icon: '🧤',
    cost: 100,
    desc: 'Clicking bakes twice as much.',
    target: 'click',
    mult: 2,
    needsTotal: 50,
  },
  {
    id: 'whisk',
    name: 'Golden Whisk',
    icon: '🥄',
    cost: 2000,
    desc: 'Clicking bakes twice as much.',
    target: 'click',
    mult: 2,
    needsTotal: 1000,
  },
  {
    id: 'butter',
    name: 'Butter Fingers',
    icon: '🧈',
    cost: 50000,
    desc: 'Clicks also earn 1% of your per-second rate.',
    target: 'share',
    mult: 0.01,
    needsTotal: 20000,
  },
  {
    id: 'sprinkles',
    name: 'Sprinkle Storm',
    icon: '✨',
    cost: 5e6,
    desc: 'Clicks earn another 2% of your rate.',
    target: 'share',
    mult: 0.02,
    needsTotal: 2e6,
  },
  {
    id: 'icing',
    name: 'Royal Icing',
    icon: '🎂',
    cost: 5e8,
    desc: 'Clicks earn another 3% of your rate.',
    target: 'share',
    mult: 0.03,
    needsTotal: 2e8,
  },
];

const NAMES: Record<string, string[]> = {
  pin: ['Marble Pin', 'Twin Pins', 'Velvet Grip', 'Turbo Roller'],
  oven: ['Convection Fan', 'Double Racks', 'Stone Hearth', 'Thermo Oven'],
  bakery: ['Night Shift', 'Window Display', 'Franchise', 'Bakery Chain'],
  field: ['Irrigation', 'Golden Wheat', 'Combine Harvester', 'Mega Farm'],
  line: ['Faster Belts', 'Robot Arms', 'Three Shifts', 'Lights-Out Plant'],
  mine: ['Deeper Shafts', 'Crystal Drills', 'Sugar Railway', 'Candy Core'],
  river: ['Wider Banks', 'Cocoa Rapids', 'Waterfall', 'Chocolate Ocean'],
  lab: ['Peer Review', 'Flavour Atoms', 'Quantum Ovens', 'Infinite Recipe'],
};

const GOAL: Record<DifficultySetting, number> = { easy: 1e6, normal: 1e7, hard: 1e8 };
const GROWTH: Record<DifficultySetting, number> = { easy: 1.14, normal: 1.15, hard: 1.16 };

export function cookieConfig(d: DifficultySetting): ClickerCfg {
  return {
    producers: PRODUCERS,
    upgrades: [...tieredUpgrades(PRODUCERS, NAMES), ...CLICK_UPGRADES],
    click: 1,
    growth: GROWTH[d],
    goal: GOAL[d],
  };
}
