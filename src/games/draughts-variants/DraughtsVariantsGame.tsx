import { DraughtsGame } from '../_shared/board/DraughtsGame';
import { BRAZILIAN, INTERNATIONAL } from '../_shared/board/draughts';

export default function DraughtsVariantsGame() {
  return (
    <DraughtsGame
      gameId="draughts-variants"
      variants={[
        { name: 'International (10×10)', rules: INTERNATIONAL, depth: { easy: 1, normal: 3, hard: 4 } },
        { name: 'Brazilian (8×8)', rules: BRAZILIAN, depth: { easy: 1, normal: 4, hard: 5 } },
      ]}
    />
  );
}
