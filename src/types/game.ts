import type { LazyExoticComponent, ComponentType } from 'react';

export type GameCategory =
  | 'arcade'
  | 'puzzle'
  | 'word'
  | 'board'
  | 'card'
  | 'sports'
  | 'racing'
  | 'action'
  | 'strategy'
  | 'educational'
  | 'casual'
  | 'creative'
  | 'brain';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type DifficultySetting = 'easy' | 'normal' | 'hard';

export type MultiplayerType = 'single' | 'local-multiplayer' | 'vs-ai';

export interface GameControls {
  keyboard?: string[];
  mouse?: string[];
  touch?: string[];
}

export interface GameInstructions {
  howToPlay: string[];
  objective: string;
  scoring?: string;
  difficultyNotes?: string;
  tips?: string[];
  touchNotes?: string[];
}

export interface AchievementDefinition {
  id: string;
  gameId: string | null;
  name: string;
  description: string;
  target?: number;
  icon?: string;
  coins?: number;
  secret?: boolean;
}

/** Static metadata describing one game in the catalog. */
export interface GameDefinition {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: GameCategory;
  difficulty: Difficulty;
  tags: string[];
  icon: string;
  accent?: string;
  controls: GameControls;
  supportsTouch: boolean;
  supportsKeyboard: boolean;
  supportsMouse?: boolean;
  multiplayer: MultiplayerType;
  estimatedMinutes: number;
  hasLevels?: boolean;
  hasHighScore: boolean;
  hasAchievements: boolean;
  hasSaveState?: boolean;
  scoreDirection?: 'high' | 'low';
  scoreUnit?: string;
  status: 'available' | 'planned';
  instructions: GameInstructions;
  achievements?: AchievementDefinition[];
  component?: LazyExoticComponent<ComponentType<GameComponentProps>>;
  related?: string[];
}

export interface GameComponentProps {
  gameId: string;
}
