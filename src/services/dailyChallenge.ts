import { createRng, todayKey } from '@/utils/random';
import { getPlayableGames } from '@/data/gameCatalog';
import {
  addCoins,
  getDailyChallengeState,
  logActivity,
  setDailyChallengeState,
} from '@/storage/StorageService';
import { reportProgress } from '@/achievements/AchievementService';
import type { DailyChallengeState, GameDefinition } from '@/types';
import { lsGet, lsSet, LS_KEYS } from '@/storage/local';

export interface DailyChallenge {
  id: string;
  date: string;
  gameId: string;
  game: GameDefinition;
  description: string;
  goalType: 'score' | 'win' | 'complete';
  target: number;
  reward: number;
}

const COMPLETED_COUNT_KEY = `${LS_KEYS.dailyChallenge}.completedCount`;

/**
 * Builds today's challenge from the calendar date alone, so the same day always
 * produces the same challenge on this device without any server involvement.
 */
export function getTodaysChallenge(date = new Date()): DailyChallenge | null {
  const key = todayKey(date);
  const games = getPlayableGames();
  if (!games.length) return null;

  const rng = createRng(`daily:${key}`);
  const candidates = games.filter((g) => g.hasHighScore || g.multiplayer === 'vs-ai');
  const game = rng.pick(candidates.length ? candidates : games);

  let goalType: DailyChallenge['goalType'] = 'complete';
  let target = 1;
  let description = `Finish a round of ${game.title}.`;

  if (game.hasHighScore) {
    goalType = 'score';
    const tiers = [10, 15, 20, 25, 30, 40, 50];
    target = rng.pick(tiers);
    description = `Score at least ${target} in ${game.title}.`;
  } else if (game.multiplayer === 'vs-ai') {
    goalType = 'win';
    description = `Win a game of ${game.title}.`;
  }

  return {
    id: `${key}:${game.id}:${goalType}:${target}`,
    date: key,
    gameId: game.id,
    game,
    description,
    goalType,
    target,
    reward: 40,
  };
}

export function getChallengeState(challenge: DailyChallenge): DailyChallengeState {
  const stored = getDailyChallengeState();
  if (stored && stored.challengeId === challenge.id) return stored;
  const fresh: DailyChallengeState = {
    date: challenge.date,
    challengeId: challenge.id,
    completed: false,
    progress: 0,
    target: challenge.target,
    claimedCoins: false,
  };
  setDailyChallengeState(fresh);
  return fresh;
}

export interface RoundOutcome {
  gameId: string;
  score?: number;
  won?: boolean;
  completed?: boolean;
}

/** Called after every finished round; awards the reward once per day. */
export async function reportRoundForChallenge(outcome: RoundOutcome): Promise<boolean> {
  const challenge = getTodaysChallenge();
  if (!challenge || challenge.gameId !== outcome.gameId) return false;

  const state = getChallengeState(challenge);
  if (state.completed) return false;

  let progress = state.progress;
  if (challenge.goalType === 'score') progress = Math.max(progress, outcome.score ?? 0);
  else if (challenge.goalType === 'win') progress = outcome.won ? 1 : progress;
  else progress = outcome.completed ? 1 : progress;

  const completed = progress >= challenge.target;
  setDailyChallengeState({ ...state, progress, completed, claimedCoins: completed });

  if (completed) {
    addCoins(challenge.reward, `Daily challenge: ${challenge.game.title}`);
    await logActivity({
      type: 'challenge',
      gameId: challenge.gameId,
      message: `Completed the daily challenge in ${challenge.game.title}`,
      createdAt: Date.now(),
    });
    const total = lsGet<number>(COMPLETED_COUNT_KEY, 0) + 1;
    lsSet(COMPLETED_COUNT_KEY, total);
    await reportProgress('global.daily-1', total);
    await reportProgress('global.daily-7', total);
    return true;
  }
  return false;
}

export function getCompletedChallengeCount(): number {
  return lsGet<number>(COMPLETED_COUNT_KEY, 0);
}
