import { CanvasRunner } from '../_shared/arcade/CanvasRunner';
import { BlockEngine } from './engine';
const create = () => new BlockEngine();
const controls = [
  { key: 'ArrowLeft', label: 'Left' },
  { key: 'ArrowRight', label: 'Right' },
  { key: 'ArrowUp', label: 'Rotate' },
  { key: 'ArrowDown', label: 'Soft drop' },
  { key: 'Space', label: 'Drop' },
];
export default function BlockDropGame() {
  return (
    <CanvasRunner
      create={create}
      controls={controls}
      instructions="Left/Right move, Up rotates, Down speeds descent, Space drops. Fill complete rows and clear twenty lines."
    />
  );
}
