import { StartPickerGame } from '../_shared/arcade/StartPicker';
import { GAME_ID, LEVEL_NAMES, makeSpec } from './spec';

export default function BubbleBayGame() {
  return (
    <StartPickerGame
      gameId={GAME_ID}
      pack="bay"
      names={LEVEL_NAMES}
      loading="Filling the bay…"
      makeSpec={(hooks) => makeSpec({ startLevel: hooks.startLevel, onClear: (index, s) => hooks.onClear(index, s.score) })}
    />
  );
}
