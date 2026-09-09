import type { GameCategory } from '@/types';

export interface CategoryMeta {
  id: GameCategory;
  name: string;
  slug: string;
  icon: string;
  description: string;
  accent: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'arcade',
    name: 'Arcade',
    slug: 'arcade',
    icon: '👾',
    description: 'Fast reflex classics — dodge, shoot, jump and chase a high score.',
    accent: 'linear-gradient(135deg, #6366f1, #a855f7)',
  },
  {
    id: 'puzzle',
    name: 'Puzzle',
    slug: 'puzzle',
    icon: '🧩',
    description: 'Logic, matching and pattern games that reward careful thinking.',
    accent: 'linear-gradient(135deg, #0ea5e9, #22d3ee)',
  },
  {
    id: 'word',
    name: 'Word',
    slug: 'word',
    icon: '🔤',
    description: 'Vocabulary, spelling and letter games with an offline dictionary.',
    accent: 'linear-gradient(135deg, #f59e0b, #f97316)',
  },
  {
    id: 'board',
    name: 'Board',
    slug: 'board',
    icon: '♟️',
    description: 'Timeless board games with local computer opponents.',
    accent: 'linear-gradient(135deg, #14b8a6, #10b981)',
  },
  {
    id: 'card',
    name: 'Card',
    slug: 'card',
    icon: '🃏',
    description: 'Solitaire variants and card duels against the computer.',
    accent: 'linear-gradient(135deg, #ef4444, #f43f5e)',
  },
  {
    id: 'sports',
    name: 'Sports',
    slug: 'sports',
    icon: '🏀',
    description: 'Aim, power and timing challenges across many sports.',
    accent: 'linear-gradient(135deg, #f97316, #ea580c)',
  },
  {
    id: 'racing',
    name: 'Racing',
    slug: 'racing',
    icon: '🏎️',
    description: 'Top-down and endless driving with lap times and traffic.',
    accent: 'linear-gradient(135deg, #dc2626, #f59e0b)',
  },
  {
    id: 'action',
    name: 'Action',
    slug: 'action',
    icon: '💥',
    description: 'Stylised shooters, survival arenas and tower defense.',
    accent: 'linear-gradient(135deg, #7c3aed, #c026d3)',
  },
  {
    id: 'strategy',
    name: 'Strategy',
    slug: 'strategy',
    icon: '🏰',
    description: 'Build, manage and simulate — all data generated locally.',
    accent: 'linear-gradient(135deg, #0891b2, #0e7490)',
  },
  {
    id: 'educational',
    name: 'Educational',
    slug: 'educational',
    icon: '🎓',
    description: 'Quizzes and drills for maths, geography, science and more.',
    accent: 'linear-gradient(135deg, #16a34a, #65a30d)',
  },
  {
    id: 'casual',
    name: 'Casual',
    slug: 'casual',
    icon: '🎈',
    description: 'Quick one-more-go games you can play in under a minute.',
    accent: 'linear-gradient(135deg, #ec4899, #f472b6)',
  },
  {
    id: 'creative',
    name: 'Creative',
    slug: 'creative',
    icon: '🎨',
    description: 'Drawing, colouring and pixel art tools that save locally.',
    accent: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
  },
  {
    id: 'brain',
    name: 'Brain Games',
    slug: 'brain',
    icon: '🧠',
    description: 'Memory, deduction and reasoning trainers.',
    accent: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  },
];

const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategoryBySlug(slug: string): CategoryMeta | undefined {
  return bySlug.get(slug);
}

export function getCategory(id: GameCategory): CategoryMeta {
  return byId.get(id) ?? CATEGORIES[0];
}

export function categoryName(id: GameCategory): string {
  return byId.get(id)?.name ?? id;
}
