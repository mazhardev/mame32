import type { GameDefinition } from '@/types';
import { DEFINITION_MODULES } from './registry.generated';

/**
 * Every implemented game lives in src/games/<id>/ and exports its
 * GameDefinition from definition.ts. They are discovered automatically by
 * scripts/gen-registry.mjs: adding a game never requires editing this file.
 * Game code itself is still lazy-loaded; only the small definition modules
 * are bundled eagerly.
 */
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

export const GAME_REGISTRY: GameDefinition[] = Object.entries(DEFINITION_MODULES)
  .map(([folder, mod]) => {
    const def = Object.values(mod).find(isDefinition);
    if (!def) throw new Error(`src/games/${folder}/definition.ts does not export an available GameDefinition`);
    return def;
  })
  .sort((a, b) => a.title.localeCompare(b.title));
