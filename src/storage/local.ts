import { site } from '@/config/site';

const prefix = site.storagePrefix;

export const LS_KEYS = {
  profile: `${prefix}.profile`,
  preferences: `${prefix}.preferences`,
  theme: `${prefix}.theme`,
  audio: `${prefix}.audio`,
  favorites: `${prefix}.favorites`,
  recentGames: `${prefix}.recentGames`,
  lastGame: `${prefix}.lastGame`,
  dataVersion: `${prefix}.dataVersion`,
  dailyChallenge: `${prefix}.dailyChallenge`,
  unlockedCosmetics: `${prefix}.unlockedCosmetics`,
  equippedCosmetics: `${prefix}.equippedCosmetics`,
  coins: `${prefix}.coins`,
} as const;

let warned = false;

function warnOnce(err: unknown) {
  if (!warned) {
    warned = true;
    console.warn('[storage] localStorage unavailable, falling back to memory', err);
  }
}

const memoryFallback = new Map<string, string>();

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key) ?? memoryFallback.get(key) ?? null;
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    warnOnce(err);
    const raw = memoryFallback.get(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}

export function lsSet(key: string, value: unknown): boolean {
  const raw = JSON.stringify(value);
  memoryFallback.set(key, raw);
  try {
    localStorage.setItem(key, raw);
    return true;
  } catch (err) {
    warnOnce(err);
    return false;
  }
}

export function lsRemove(key: string): void {
  memoryFallback.delete(key);
  try {
    localStorage.removeItem(key);
  } catch (err) {
    warnOnce(err);
  }
}

export function lsClearAll(): void {
  memoryFallback.clear();
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    warnOnce(err);
  }
}
