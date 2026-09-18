import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'Outscore the computer in a penalty shootout: five kicks each, then sudden death.',
  howToPlay: [
    "You take the first kick, then go in goal for the computer's kick, and so on.",
    'Shooting: aim at the goal and tap (or press Space) to lock the aim. A power meter starts moving; tap again to strike.',
    'Strike when the marker is in the green band for an accurate shot. Too early or too late scatters the ball, and overhitting sends it over the bar.',
    'Keeping: dive left, stay central or dive right before the ball arrives.',
    'After five kicks each, a tie goes to sudden death. If it is still level after five more each, the match is drawn.',
  ],
  scoring: '100 points per goal and per save, plus 300 for winning the shootout.',
  difficultyNotes:
    'Harder levels speed up the power meter and the computer kicks, badly timed strikes scatter further, and the computer keeper reads your side more often. On Normal and Hard the computer kicker may switch sides if you dive early.',
  tips: [
    "The top corners (next to a post and under the bar) are out of the keeper's reach, but they are close to missing.",
    'Wait for the ball to leave the spot before diving; early dives get punished on Hard.',
  ],
  touchNotes: [
    'Shooting: tap the goal to aim and lock, then tap again to strike.',
    'Keeping: tap the left, middle or right of the goal, or use the Dive buttons.',
  ],
};
