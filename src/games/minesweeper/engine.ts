export type CellState = 'hidden' | 'revealed' | 'flagged' | 'question';

export interface Cell {
  mine: boolean;
  adjacent: number;
  state: CellState;
}

export interface BoardConfig {
  cols: number;
  rows: number;
  mines: number;
}

export const PRESETS: Record<'easy' | 'normal' | 'hard', BoardConfig> = {
  easy: { cols: 9, rows: 9, mines: 10 },
  normal: { cols: 16, rows: 16, mines: 40 },
  hard: { cols: 24, rows: 16, mines: 70 },
};

export type Status = 'ready' | 'playing' | 'won' | 'lost';

export class MinesweeperEngine {
  readonly config: BoardConfig;
  cells: Cell[] = [];
  status: Status = 'ready';
  /** Safe cells revealed so far, used to detect the win condition. */
  revealed = 0;
  flags = 0;
  explodedIndex: number | null = null;
  private random: () => number;

  constructor(config: BoardConfig, random: () => number = Math.random) {
    this.config = config;
    this.random = random;
    this.reset();
  }

  reset() {
    const { cols, rows } = this.config;
    this.cells = Array.from({ length: cols * rows }, () => ({
      mine: false,
      adjacent: 0,
      state: 'hidden' as CellState,
    }));
    this.status = 'ready';
    this.revealed = 0;
    this.flags = 0;
    this.explodedIndex = null;
  }

  index(col: number, row: number) {
    return row * this.config.cols + col;
  }

  coords(index: number): [number, number] {
    return [index % this.config.cols, Math.floor(index / this.config.cols)];
  }

  neighbours(index: number): number[] {
    const { cols, rows } = this.config;
    const [col, row] = this.coords(index);
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        out.push(this.index(c, r));
      }
    }
    return out;
  }

  /**
   * Mines are placed after the first click, avoiding that cell and its
   * neighbours, so the opening move always reveals a useful area.
   */
  placeMines(safeIndex: number) {
    const total = this.cells.length;
    const forbidden = new Set<number>([safeIndex, ...this.neighbours(safeIndex)]);
    const candidates: number[] = [];
    for (let i = 0; i < total; i++) if (!forbidden.has(i)) candidates.push(i);

    const mineCount = Math.min(this.config.mines, candidates.length);
    for (let i = 0; i < mineCount; i++) {
      const pick = i + Math.floor(this.random() * (candidates.length - i));
      const tmp = candidates[i];
      candidates[i] = candidates[pick];
      candidates[pick] = tmp;
      this.cells[candidates[i]].mine = true;
    }

    for (let i = 0; i < total; i++) {
      if (this.cells[i].mine) continue;
      this.cells[i].adjacent = this.neighbours(i).filter((n) => this.cells[n].mine).length;
    }
  }

  reveal(index: number): { exploded: boolean; revealed: number } {
    if (this.status === 'won' || this.status === 'lost') return { exploded: false, revealed: 0 };
    const cell = this.cells[index];
    if (!cell || cell.state !== 'hidden') return { exploded: false, revealed: 0 };

    if (this.status === 'ready') {
      this.placeMines(index);
      this.status = 'playing';
    }

    if (cell.mine) {
      cell.state = 'revealed';
      this.explodedIndex = index;
      this.status = 'lost';
      for (const c of this.cells) if (c.mine) c.state = 'revealed';
      return { exploded: true, revealed: 0 };
    }

    const count = this.floodReveal(index);
    this.checkWin();
    return { exploded: false, revealed: count };
  }

  /** Iterative flood fill so a large empty region cannot overflow the stack. */
  private floodReveal(start: number): number {
    const stack = [start];
    let count = 0;
    while (stack.length) {
      const i = stack.pop() as number;
      const cell = this.cells[i];
      if (cell.state === 'revealed' || cell.state === 'flagged') continue;
      cell.state = 'revealed';
      count += 1;
      this.revealed += 1;
      if (cell.adjacent === 0 && !cell.mine) {
        for (const n of this.neighbours(i)) {
          if (this.cells[n].state === 'hidden') stack.push(n);
        }
      }
    }
    return count;
  }

  toggleFlag(index: number): CellState | null {
    if (this.status === 'won' || this.status === 'lost') return null;
    const cell = this.cells[index];
    if (!cell || cell.state === 'revealed') return null;
    if (cell.state === 'hidden') {
      cell.state = 'flagged';
      this.flags += 1;
    } else if (cell.state === 'flagged') {
      cell.state = 'question';
      this.flags -= 1;
    } else {
      cell.state = 'hidden';
    }
    return cell.state;
  }

  /**
   * Reveals every unflagged neighbour of a satisfied number — the standard
   * "chord" shortcut. Detonates if the flags were placed wrongly.
   */
  chord(index: number): { exploded: boolean; revealed: number } {
    const cell = this.cells[index];
    if (!cell || cell.state !== 'revealed' || cell.adjacent === 0) {
      return { exploded: false, revealed: 0 };
    }
    const neighbours = this.neighbours(index);
    const flagged = neighbours.filter((n) => this.cells[n].state === 'flagged').length;
    if (flagged !== cell.adjacent) return { exploded: false, revealed: 0 };

    let revealed = 0;
    for (const n of neighbours) {
      if (this.cells[n].state === 'hidden') {
        const result = this.reveal(n);
        revealed += result.revealed;
        if (result.exploded) return { exploded: true, revealed };
      }
    }
    return { exploded: false, revealed };
  }

  checkWin() {
    const safeCells = this.cells.length - this.config.mines;
    if (this.revealed >= safeCells) {
      this.status = 'won';
      for (const cell of this.cells) {
        if (cell.mine && cell.state !== 'flagged') {
          cell.state = 'flagged';
          this.flags += 1;
        }
      }
    }
  }

  get minesRemaining() {
    return this.config.mines - this.flags;
  }

  getStatus(): Status {
    return this.status;
  }
}
