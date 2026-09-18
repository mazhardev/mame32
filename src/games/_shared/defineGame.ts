import { lazy } from 'react';
import type { ComponentType } from 'react';
import type {
  Difficulty,
  GameCategory,
  GameComponentProps,
  GameControls,
  GameDefinition,
  GameInstructions,
  MultiplayerType,
} from '@/types';

/** [key, name, description, target?, icon?, coins?] — the id becomes `<gameId>.<key>`. */
export type AchievementSpec = [
  key: string,
  name: string,
  description: string,
  target?: number,
  icon?: string,
  coins?: number,
];

export interface GameSpec {
  id: string;
  title: string;
  category: GameCategory;
  difficulty: Difficulty;
  icon: string;
  tags: string[];
  short: string;
  full: string;
  controls: GameControls;
  instructions: GameInstructions;
  achievements: AchievementSpec[];
  load: () => Promise<{ default: ComponentType<GameComponentProps> | ComponentType }>;
  multiplayer?: MultiplayerType;
  minutes?: number;
  touch?: boolean;
  keyboard?: boolean;
  mouse?: boolean;
  hasHighScore?: boolean;
  hasSaveState?: boolean;
  hasLevels?: boolean;
  scoreDirection?: 'high' | 'low';
  scoreUnit?: string;
}

/**
 * Builds a GameDefinition with sensible defaults so a game's definition.ts
 * stays a short, readable spec. Achievement ids are namespaced by game id,
 * matching the ids games pass to reportProgress().
 */
export function defineGame(spec: GameSpec): GameDefinition {
  return {
    id: spec.id,
    title: spec.title,
    shortDescription: spec.short,
    fullDescription: spec.full,
    category: spec.category,
    difficulty: spec.difficulty,
    tags: spec.tags,
    icon: spec.icon,
    controls: spec.controls,
    supportsTouch: spec.touch ?? true,
    supportsKeyboard: spec.keyboard ?? true,
    supportsMouse: spec.mouse ?? true,
    multiplayer: spec.multiplayer ?? 'single',
    estimatedMinutes: spec.minutes ?? 5,
    hasHighScore: spec.hasHighScore ?? true,
    hasAchievements: spec.achievements.length > 0,
    hasSaveState: spec.hasSaveState,
    hasLevels: spec.hasLevels,
    scoreDirection: spec.scoreDirection,
    scoreUnit: spec.scoreUnit,
    status: 'available',
    instructions: spec.instructions,
    achievements: spec.achievements.map(([key, name, description, target, icon, coins]) => ({
      id: `${spec.id}.${key}`,
      gameId: spec.id,
      name,
      description,
      target: target ?? 1,
      icon: icon ?? spec.icon,
      coins: coins ?? 10,
    })),
    component: lazy(spec.load as () => Promise<{ default: ComponentType<GameComponentProps> }>),
  };
}
