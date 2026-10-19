import { StartPickerGame } from '../_shared/arcade/StartPicker';
import { LEVEL_NAMES } from './levels';
import { GAME_ID, makeSpec, reportClear } from './spec';

/**
 * Leap Quest: pick any level reached so far; a run carries on from there
 * through the rest of the quest until Pip runs out of lives.
 */
export default function LeapQuestGame() {
  return (
    <StartPickerGame
      gameId={GAME_ID}
      pack="quest"
      names={LEVEL_NAMES}
      loading="Packing Pip’s scarf…"
      makeSpec={(hooks) =>
        makeSpec({
          startLevel: hooks.startLevel,
          hooks: {
            onLevelClear: (index, s) => {
              hooks.onClear(index, s.score);
              reportClear(index, s);
            },
          },
        })
      }
    />
  );
}
