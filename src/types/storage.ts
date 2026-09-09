import type { DifficultySetting } from './game';

export interface PlayerProfile {
  id: 'local-player';
  nickname: string;
  createdAt: number;
  totalGamesPlayed: number;
  totalPlayTime: number;
  totalCoins: number;
}

export interface HighScoreRecord {
  id: string;
  gameId: string;
  mode: string;
  difficulty: DifficultySetting;
  score: number;
  createdAt: number;
}

export interface ScoreHistoryRecord {
  id?: number;
  gameId: string;
  score: number;
  difficulty: DifficultySetting;
  won: boolean;
  durationMs: number;
  createdAt: number;
}

export interface GameProgressRecord {
  gameId: string;
  level?: number;
  checkpoint?: string;
  percent?: number;
  label?: string;
  state: unknown;
  updatedAt: number;
}

export interface AchievementRecord {
  achievementId: string;
  gameId: string | null;
  unlocked: boolean;
  unlockedAt: number | null;
  progress: number;
  target: number;
}

export interface GameStatistics {
  gameId: string;
  gamesStarted: number;
  gamesCompleted: number;
  wins: number;
  losses: number;
  draws: number;
  highScore: number | null;
  bestTime: number | null;
  totalScore: number;
  totalPlayTime: number;
  lastPlayed: number | null;
  currentWinStreak: number;
  bestWinStreak: number;
}

export interface GameSettingsRecord {
  gameId: string;
  difficulty?: DifficultySetting;
  [key: string]: unknown;
}

export interface SavedGameRecord {
  id: string;
  gameId: string;
  slot: string;
  name: string;
  state: unknown;
  createdAt: number;
}

export interface ActivityRecord {
  id?: number;
  type: 'play' | 'achievement' | 'highscore' | 'coins' | 'challenge';
  gameId: string | null;
  message: string;
  value?: number;
  createdAt: number;
}

export interface Preferences {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  difficulty: DifficultySetting;
  reducedMotion: boolean;
  theme: 'dark' | 'light' | 'system';
  preferFullscreen: boolean;
  showFps: boolean;
  volume: number;
}

export interface DailyChallengeState {
  date: string;
  challengeId: string;
  completed: boolean;
  progress: number;
  target: number;
  claimedCoins: boolean;
}

export interface ExportBundle {
  app: string;
  dataVersion: number;
  exportedAt: number;
  profile: PlayerProfile | null;
  preferences: Preferences | null;
  favorites: string[];
  recentGames: RecentGameEntry[];
  highScores: HighScoreRecord[];
  scoreHistory: ScoreHistoryRecord[];
  achievements: AchievementRecord[];
  statistics: GameStatistics[];
  gameProgress: GameProgressRecord[];
  gameSettings: GameSettingsRecord[];
  savedGames: SavedGameRecord[];
  activity: ActivityRecord[];
  dailyChallenge: DailyChallengeState | null;
}

export interface RecentGameEntry {
  gameId: string;
  playedAt: number;
}
