import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const brickBreakerGame: GameDefinition = {
  id: 'brick-breaker',
  title: 'Brick Breaker',
  shortDescription: 'Bounce the ball to smash every brick on the wall.',
  fullDescription: 'Guide the paddle to keep the ball in play and clear all forty bricks. You have three balls.',
  category: 'arcade',
  difficulty: 'medium',
  tags: ['classic', 'paddle', 'retro', 'bricks'],
  icon: '🧱',
  controls: {
    keyboard: ['Arrow Left / Arrow Right to move the paddle', 'P to pause, R to restart'],
    mouse: ['Move the pointer across the court to steer the paddle'],
    touch: ['Drag across the court or hold the Left/Right buttons'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'single',
  estimatedMinutes: 5,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./BrickBreakerGame')),
};
