import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const brickBreakerGame: GameDefinition = {
  id: 'brick-breaker',
  title: 'Brick Breaker',
  shortDescription: 'Bounce the ball to smash every brick on the wall.',
  fullDescription:
    'Guide the paddle to keep the ball in play and clear all forty bricks. You have three balls, the ball speeds up as the wall thins out, and breaking several bricks in one go scores a combo bonus. For another paddle classic, play [Pong](game:pong) against the computer.',
  category: 'arcade',
  difficulty: 'medium',
  tags: ['classic', 'paddle', 'retro', 'bricks'],
  icon: '🧱',
  controls: {
    keyboard: ['Arrow Left / Right (or A, D) to move the paddle', 'Space to launch the ball', 'P to pause, R to restart'],
    mouse: ['Move the pointer across the court to steer the paddle; click to launch'],
    touch: ['Drag across the court to steer; tap to launch', 'Or hold the ◀ ▶ buttons and press Launch'],
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
