import { DraughtsGame } from '../_shared/board/DraughtsGame';
import { ENGLISH } from '../_shared/board/draughts';

export default function CheckersGame() {
  return <DraughtsGame gameId="checkers" variants={[{ name: 'Checkers (8×8)', rules: ENGLISH, depth: { easy: 1, normal: 4, hard: 7 } }]} />;
}
