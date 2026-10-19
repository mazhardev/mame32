import { StartPickerGame } from '../_shared/arcade/StartPicker';
import { FLOOR_NAMES, GAME_ID, makeSpec } from './spec';

export default function SnowballRumbleGame() {
  return (
    <StartPickerGame
      gameId={GAME_ID}
      pack="tower"
      names={FLOOR_NAMES}
      loading="Packing snowballs…"
      makeSpec={(hooks) => makeSpec({ startLevel: hooks.startLevel, onClear: (index, s) => hooks.onClear(index, s.score) })}
    />
  );
}
