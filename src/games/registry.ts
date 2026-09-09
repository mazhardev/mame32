import type { GameDefinition } from '@/types';

/**
 * Every implemented game registers its definition here.
 * Adding a game means: create src/games/<id>/, export a definition, add one
 * import + one array entry below. Nothing else in the app needs editing.
 */
export const GAME_REGISTRY: GameDefinition[] = [];
