import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'character-dress-up',
  title: 'Character Dress-Up',
  category: 'creative',
  difficulty: 'easy',
  icon: '👕',
  tags: ['dress up', 'fashion', 'outfits', 'kids', 'creative', 'style'],
  short: 'Dress a character for the beach, the snow, a party, sports day or a trip to space.',
  full: 'Mix and match hats, tops, trousers, shoes and extras in any colour, then change the hairstyle and skin tone. In Style Challenge mode five clients each need an outfit for a different occasion — sun hats and flip-flops for the beach, parkas and snow boots for the snow, a space suit and jetpack for orbit — and some want a favourite colour too. Or switch to Free Play and just design. All drawings are original vector art.',
  minutes: 5,
  controls: {
    keyboard: ['Tab to move between items', 'Enter or Space to choose'],
    mouse: ['Click a tab, then an item or colour'],
    touch: ['Tap a tab, then an item or colour'],
  },
  instructions: {
    objective: 'Dress each client perfectly for their occasion.',
    howToPlay: [
      'Choose Style Challenge or Free Play.',
      'Pick a wardrobe tab — Hat, Top, Bottom, Shoes, Extra or Hair & skin — and tap an item.',
      'Tap a colour swatch to recolour the selected piece.',
      'In the challenge, press “Show the look” to see what the client thinks.',
    ],
    scoring:
      'Each of the five pieces scores 18 if it suits the occasion, 6 if it is plain and 0 if it belongs to a different occasion. A requested colour is worth 10 more. 90+ earns three stars.',
    difficultyNotes:
      'Easy marks which occasions each item suits and has no colour wishes. Normal hides the hints and adds a colour wish. Hard also gives you 40 seconds per client.',
    tips: [
      'Some items suit two occasions — a tank top works at the beach and on sports day.',
      '“No hat” or “Nothing” is plain: safe, but not perfect.',
      'The colour wish counts on any piece you are wearing.',
    ],
    touchNotes: ['Items and colour swatches are large tap targets; no dragging needed.'],
  },
  achievements: [
    ['first', 'First Fitting', 'Show a look to a client.', 1, '🪞', 5],
    ['perfect', 'Flawless', 'Score 100 on a look.', 1, '💯', 20],
    ['icon', 'Style Icon', 'Earn three stars from all five clients in one game.', 1, '🌟', 30],
    ['hard', 'Runway Ready', 'Score 400 or more on Hard.', 1, '🏆', 35],
    ['looks', 'Fashion Week', 'Style 50 looks in total.', 50, '👗', 25],
    ['wardrobe', 'Wardrobe Explorer', 'Try 25 different items in one visit.', 25, '🧳', 10],
  ],
  load: () => import('./DressUpGame'),
});
