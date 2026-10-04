import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'kingdom-builder',
  title: 'Kingdom Builder',
  category: 'strategy',
  difficulty: 'medium',
  icon: '👑',
  tags: ['kingdom', 'medieval', 'resources', 'decisions', 'building', 'save'],
  short:
    'Feed your people, survive raids and hard choices, and build a castle before your reign ends.',
  full: 'Rule a small medieval kingdom season by season. Build farms, lumber camps, quarries and cottages and put your people to work; markets, barracks, temples and walls come later. Every season brings a decision — a merchant at the gates, a blight in the fields, settlers asking to join, raiders demanding tribute — and your tax rate trades gold against your people’s happiness. Keep everyone fed and content, and gather enough stone, wood and gold to raise a castle before your reign ends.',
  minutes: 15,
  hasSaveState: true,
  controls: {
    keyboard: ['Tab between buttons; Enter or Space to press'],
    mouse: ['Click a choice, a Build button or End season'],
    touch: ['Tap a choice, a Build button or End season'],
  },
  instructions: {
    objective: 'Build the castle before your reign ends.',
    howToPlay: [
      'Each season starts with an event — pick one of the choices.',
      'Build to put idle people (👷) to work. A building only produces if it is fully staffed.',
      'Farms yield little in winter and a lot in autumn; everyone eats every season.',
      'People arrive while there is housing, food and at least some happiness.',
      'Taxes: low taxes raise happiness, high taxes bring more gold but anger people.',
      'With a market you can trade gold for wood and stone at any time.',
    ],
    scoring:
      'Building the castle scores 1,000 plus 40 for every season to spare; you also score 5 per person and 25 per raid repelled.',
    difficultyNotes:
      'Easy: a generous start, weaker raids and milder disasters, eight years. Normal: a smaller start, eight years. Hard: a lean start, fierce raids and harsher events, only seven years.',
    tips: [
      'Stock up on food before winter.',
      'Raiders grow stronger over time — barracks and walls pay off.',
      'Stone is usually the castle’s bottleneck: get quarries running early.',
      'If happiness falls to zero, the people revolt.',
    ],
    touchNotes: ['Every action is a button; nothing needs precise tapping.'],
  },
  achievements: [
    ['raids', 'Defender of the Realm', 'Repel 5 raids in total.', 5, '🛡️', 20],
    ['builds', 'Master Builder', 'Construct 100 buildings in total.', 100, '🔨', 20],
    ['people', 'Thriving Realm', 'Rule over 100 people.', 100, '👥', 20],
    ['joy', 'Beloved Ruler', 'Reach 90% happiness.', 1, '😊', 20],
    ['castle', 'Castle Complete', 'Build the castle.', 1, '🏰', 30],
    ['hard', 'Legendary Monarch', 'Build the castle on Hard.', 1, '👑', 40],
  ],
  load: () => import('./KingdomGame'),
});
