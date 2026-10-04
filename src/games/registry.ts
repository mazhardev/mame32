import type { GameDefinition } from '@/types';

/**
 * Every implemented game lives in src/games/<id>/ and exports its
 * GameDefinition from definition.ts. They are discovered automatically:
 * adding a game never requires editing this file. Game code itself is still
 * lazy-loaded; only the small definition modules are bundled eagerly.
 */
const modules = import.meta.glob<Record<string, unknown>>('./*/definition.ts', { eager: true });

function isDefinition(value: unknown): value is GameDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value &&
    (value as GameDefinition).status === 'available'
  );
}

export const GAME_REGISTRY: GameDefinition[] = Object.entries(modules)
  .map(([path, mod]) => {
    const def = Object.values(mod).find(isDefinition);
    if (!def) throw new Error(`${path} does not export an available GameDefinition`);
    return def;
  })
  .sort((a, b) => a.title.localeCompare(b.title));
