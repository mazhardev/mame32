import type { DifficultySetting } from '@/types';
import { tieredUpgrades } from '../_shared/idle/clicker';
import type { ClickerCfg, Producer, Upgrade } from '../_shared/idle/clicker';

const PACE = 4;

export const PRODUCERS: Producer[] = [
  {
    id: 'peasant',
    name: 'Peasant',
    icon: '🧑‍🌾',
    base: 15,
    rate: 0.1 * PACE,
    desc: 'Works the fields',
  },
  {
    id: 'farm',
    name: 'Farmstead',
    icon: '🌾',
    base: 100,
    rate: 1 * PACE,
    desc: 'Grain for the markets',
  },
  {
    id: 'quarry',
    name: 'Quarry',
    icon: '🪨',
    base: 1100,
    rate: 8 * PACE,
    desc: 'Stone for your walls',
  },
  {
    id: 'market',
    name: 'Market Town',
    icon: '🏘️',
    base: 12000,
    rate: 47 * PACE,
    desc: 'Busy trade and taxes',
  },
  {
    id: 'guild',
    name: 'Guild Hall',
    icon: '⚒️',
    base: 130000,
    rate: 260 * PACE,
    desc: 'Master craftspeople',
  },
  {
    id: 'port',
    name: 'Harbour',
    icon: '⚓',
    base: 1.4e6,
    rate: 1400 * PACE,
    desc: 'Ships from distant lands',
  },
  {
    id: 'castle',
    name: 'Castle',
    icon: '🏰',
    base: 2e7,
    rate: 7800 * PACE,
    desc: 'Seat of a province',
  },
  {
    id: 'wonder',
    name: 'Grand Wonder',
    icon: '🗽',
    base: 3.3e8,
    rate: 44000 * PACE,
    desc: 'Pilgrims bring gold',
  },
];

const NAMES: Record<string, string[]> = {
  peasant: ['Iron Ploughs', 'Crop Rotation', 'Village Fairs', 'Free Farmers'],
  farm: ['Windmills', 'Granaries', 'Irrigation Canals', 'Royal Estates'],
  quarry: ['Steel Picks', 'Ox Carts', 'Cranes', 'Marble Seams'],
  market: ['Weights and Measures', 'Paved Roads', 'Trade Fairs', 'Merchant Banks'],
  guild: ['Apprentices', 'Guild Charters', 'Masterworks', 'Great Workshops'],
  port: ['Lighthouses', 'Dry Docks', 'Trade Fleets', 'Ocean Charts'],
  castle: ['Stone Keeps', 'Courts of Law', 'Royal Mint', 'Imperial Capital'],
  wonder: ['Golden Domes', 'Hanging Gardens', 'Colossus', 'Eternal Flame'],
};

const CLICK: Upgrade[] = [
  {
    id: 'purse',
    name: 'Leather Purse',
    icon: '👝',
    cost: 100,
    desc: 'Collecting taxes by hand yields twice as much.',
    target: 'click',
    mult: 2,
    needsTotal: 50,
  },
  {
    id: 'scales',
    name: 'Tax Collectors',
    icon: '⚖️',
    cost: 2500,
    desc: 'Hand collection yields twice as much.',
    target: 'click',
    mult: 2,
    needsTotal: 1000,
  },
  {
    id: 'decree',
    name: 'Royal Decree',
    icon: '📜',
    cost: 60000,
    desc: 'Each collection also brings 1% of your income per second.',
    target: 'share',
    mult: 0.01,
    needsTotal: 20000,
  },
  {
    id: 'treasury',
    name: 'Grand Treasury',
    icon: '🏦',
    cost: 6e6,
    desc: 'Each collection brings another 2% of income.',
    target: 'share',
    mult: 0.02,
    needsTotal: 2e6,
  },
];

const GOAL: Record<DifficultySetting, number> = { easy: 3e7, normal: 3e8, hard: 3e9 };
const GROWTH: Record<DifficultySetting, number> = { easy: 1.14, normal: 1.15, hard: 1.16 };

export function empireConfig(d: DifficultySetting): ClickerCfg {
  return {
    producers: PRODUCERS,
    upgrades: [...tieredUpgrades(PRODUCERS, NAMES), ...CLICK],
    click: 1,
    growth: GROWTH[d],
    goal: GOAL[d],
    prestige: { per: 1e6, bonus: 0.5 },
  };
}
