import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const reactionTimerGame: GameDefinition = {
  id: 'reaction-timer',
  title: 'Reaction Timer',
  shortDescription: 'Wait for GO, then react. Five trials to find your rhythm.',
  fullDescription:
    'Test your reflexes with five randomly delayed visual signals. See every reaction time, your fastest trial and your average, then try to beat your saved score. False starts cost points; patience counts as much as speed.',
  category: 'casual',
  difficulty: 'easy',
  tags: ['reflex', 'quick', 'timing', 'featured'],
  icon: '⚡',
  controls: {
    keyboard: ['Tab to the reaction pad, then press Space or Enter', 'P to pause; R to restart'],
    mouse: ['Press the large reaction pad'],
    touch: ['Tap the large reaction pad'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 1,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  related: ['aim-trainer', 'simon-memory', 'snake'],
  component: lazy(() => import('./ReactionTimerGame')),
};
