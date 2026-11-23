import { lazy } from 'react';
import type { GameDefinition } from '@/types';
import { achievements } from './achievements';
import { instructions } from './instructions';

export const pongGame: GameDefinition = {
  id: 'pong',
  title: 'Pong',
  shortDescription: 'Classic paddle duel against a local computer opponent.',
  fullDescription:
    'Bounce the ball past the computer paddle. The first side to seven points wins. Your paddle is at the bottom of the court, so it plays well on a phone held upright: drag with a finger or the mouse. The ball speeds up with every return, and the computer paddle gets quicker and sharper on higher difficulties. For a full match with rallies and spin, try [Table Tennis](game:table-tennis), or break bricks in [Brick Breaker](game:brick-breaker).',
  category: 'arcade',
  difficulty: 'easy',
  tags: ['classic', 'retro', 'paddle', 'ai'],
  icon: '🏓',
  controls: {
    keyboard: ['Arrow Left / Right (or A, D) to move the paddle', 'P to pause, R to restart'],
    mouse: ['Move the pointer over the court to steer the paddle'],
    touch: ['Drag across the court or hold the ◀ ▶ buttons'],
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
