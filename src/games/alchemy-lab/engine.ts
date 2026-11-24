import { ELEMENTS, RECIPES, START } from './recipes';

/**
 * Alchemy Lab: mix two elements you have found to discover a new one.
 * Recipes are symmetric (fire + water is the same as water + fire).
 */
const key = (a: string, b: string) => (a < b ? `${a}+${b}` : `${b}+${a}`);
const BOOK = new Map(RECIPES.map(([a, b, r]) => [key(a, b), r]));

export const TOTAL = Object.keys(ELEMENTS).length;

export function mix(a: string, b: string): string | null {
  return BOOK.get(key(a, b)) ?? null;
}

export function startSet(): string[] {
  return [...START];
}

/** An element with nothing left to make from it (given everything there is). */
export function isFinal(id: string): boolean {
  return !RECIPES.some(([a, b]) => a === id || b === id);
}

/** A recipe you could make now that gives something new, or null. */
export function hintFor(found: readonly string[], random: () => number = Math.random): [string, string, string] | null {
  const have = new Set(found);
  const open = RECIPES.filter(([a, b, r]) => have.has(a) && have.has(b) && !have.has(r));
  return open.length ? open[Math.floor(random() * open.length)] : null;
}

/** How many recipes that use this element still lead somewhere new. */
export function openUses(found: readonly string[], id: string): number {
  const have = new Set(found);
  return RECIPES.filter(([a, b, r]) => (a === id || b === id) && !have.has(r)).length;
}

export function validFound(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string' && x in ELEMENTS) && START.every((s) => v.includes(s));
}
