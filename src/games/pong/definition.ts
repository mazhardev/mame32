import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const pongGame: GameDefinition = {
  id: 'pong',
  title: 'Pong',
  shortDescription: 'Classic paddle duel against a local computer opponent.',
  fullDescription: 'Bounce the ball past the computer paddle. The first side to seven points wins. The computer paddle moves faster on higher difficulties.',
  category: 'arcade',
  difficulty: 'easy',
  tags: ['classic', 'retro', 'paddle', 'ai'],
  icon: '🏓',
  controls: {
    keyboard: ['Arrow Up / Arrow Down to move the paddle', 'P to pause, R to restart'],
    mouse: ['Move the pointer over the court to steer the paddle'],
    touch: ['Drag across the court or hold the Up/Down buttons'],
  },
  supportsTouch: true,
  supportsKeyboard: true,
  supportsMouse: true,
  multiplayer: 'vs-ai',
  estimatedMinutes: 4,
  hasHighScore: true,
  hasAchievements: true,
  status: 'available',
  instructions,
  achievements,
  component: lazy(() => import('./PongGame')),
};
