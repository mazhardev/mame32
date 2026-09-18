import type { GameInstructions } from '@/types';

export const instructions: GameInstructions = {
  objective: 'React to the GO signal as quickly as you can across five trials.',
  howToPlay: [
    'Press the large pad to start a trial. Wait while the pad says WAIT.',
    'When it changes to GO, press immediately. Your reaction time appears in milliseconds.',
    'Start the next trial when ready. Complete five valid reactions for your final score.',
    'Pressing before GO costs 100 points and restarts that trial.',
    'Pausing or leaving the tab cancels the current trial without a penalty. Completed trials are kept until you restart or leave the game.',
  ],
  scoring:
    'Score = 1,000 minus your average reaction time in milliseconds, minus 100 for each false start. The minimum score is zero. Higher scores are better.',
  difficultyNotes:
    'Every difficulty preference uses the same five-trial rules. The signal delay is randomized on each attempt.',
  tips: [
    'Focus on the GO label as well as the color.',
    'Use the same device and input method when comparing personal scores.',
  ],
  touchNotes: ['Tap anywhere on the large pad. Timing is captured when your finger touches down.'],
};
