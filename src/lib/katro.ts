/** Katro game logic — ported from the Flutter/Dart implementation */

export const GREEN = 1;
export const RED = 2;
export const LEFT = 0;
export const RIGHT = 1;

export type Player = typeof GREEN | typeof RED;
export type Direction = typeof LEFT | typeof RIGHT;

const placeCache = new Map<number, number[]>();

function placeFor(holes: number): number[] {
  if (placeCache.has(holes)) return placeCache.get(holes)!;
  const m = holes >> 1;
  const r: number[] = [];
  for (let j = 0; j < m; j++) r.push(j);
  for (let j = 0; j < m; j++) r.push(2 * m - 1 - j);
  for (let j = 0; j < m; j++) r.push(holes + j);
  for (let j = 0; j < m; j++) r.push(2 * holes - 1 - j);
  placeCache.set(holes, r);
  return r;
}

export class Board {
  holes: number;
  cols: number;
  tiles: number[];
  place: number[];

  constructor(holes = 8, tiles?: number[]) {
    this.holes = holes;
    this.cols = holes >> 1;
    this.tiles = tiles ? [...tiles] : Array(holes * 2).fill(2);
    this.place = placeFor(holes);
  }

  clone(): Board {
    return new Board(this.holes, this.tiles);
  }

  ownerOf(index: number): Player {
    return index < this.holes ? GREEN : RED;
  }

  sideSum(player: Player): number {
    let s = 0;
    const lo = player === GREEN ? 0 : this.holes;
    for (let i = lo; i < lo + this.holes; i++) s += this.tiles[i];
    return s;
  }

  isGameOverFor(player: Player): boolean {
    return this.sideSum(player) < 2;
  }

  isGameOver(): boolean {
    return this.isGameOverFor(GREEN) || this.isGameOverFor(RED);
  }

  /** "Laharana voalohany" (front row nearest opponent) */
  isPositionFirstPlace(index: number, player: Player): boolean {
    if (player === GREEN) return index >= this.cols && index < this.holes;
    return index >= this.holes && index < this.holes + this.cols;
  }

  isEmptyFirstPlaceOpposite(player: Player): boolean {
    let result = 0;
    if (player === GREEN) {
      for (let i = this.holes; i < this.holes + this.cols; i++) result += this.tiles[i];
    } else {
      for (let i = this.cols; i < this.holes; i++) result += this.tiles[i];
    }
    return result === 0;
  }

  private _getCapture(index1: number, index2: number, player: Player): number {
    let result = 0;
    if (this.tiles[index1] !== 0) {
      result = this.tiles[index1];
      this.tiles[index1] = 0;
    } else if (this.isEmptyFirstPlaceOpposite(player)) {
      result = this.tiles[index2];
      this.tiles[index2] = 0;
    }
    return result;
  }

  capture(index: number, player: Player): number {
    const m = this.cols;
    const n = this.holes;
    if (player === GREEN) {
      if (index < m || index >= n) return 0;
      const j = index - m;
      const c = m - 1 - j;
      return this._getCapture(n + c, n + m + j, player);
    } else {
      if (index < n || index >= n + m) return 0;
      const c = index - n;
      return this._getCapture(2 * m - 1 - c, c, player);
    }
  }

  step(index: number, player: Player, direction: Direction): number {
    const lo = player === GREEN ? 0 : this.holes;
    const hi = lo + this.holes - 1;
    let i = index + (direction === RIGHT ? 1 : -1);
    if (i > hi) i = lo;
    if (i < lo) i = hi;
    return i;
  }

  static maxLaps = 300;

  /** Play a full move (no animation). Used by AI. */
  playMove(index: number, player: Player, direction: Direction): void {
    let cap = 0;
    let laps = 0;
    while (laps++ < Board.maxLaps) {
      const value = this.tiles[index] + cap;
      this.tiles[index] = 0;
      let cur = index;
      for (let i = 0; i < value; i++) {
        cur = this.step(cur, player, direction);
        this.tiles[cur]++;
      }
      index = cur;
      if (this.tiles[index] > 1 && !this.isGameOver()) {
        cap = this.isPositionFirstPlace(index, player) ? this.capture(index, player) : 0;
      } else {
        break;
      }
    }
  }

  /** Legal move indices for the given player. */
  legalMoves(player: Player): number[] {
    const moves: number[] = [];
    const lo = player === GREEN ? 0 : this.holes;
    for (let i = lo; i < lo + this.holes; i++) {
      if (this.tiles[i] > 0) moves.push(i);
    }
    return moves;
  }
}

export interface GameSettings {
  opponent: "human" | "computer";
  startColor: Player;
  level: 0 | 1 | 2; // Easy, Medium, Hard
  direction: Direction;
  holes: 8 | 12;
}

export const defaultSettings: GameSettings = {
  opponent: "human",
  startColor: RED,
  level: 0,
  direction: RIGHT,
  holes: 8,
};

/** Simple AI evaluation & minimax (ported/adapted) */
export function evaluate(board: Board, player: Player): number {
  const opp = (3 - player) as Player;
  if (board.isGameOverFor(opp)) return 10000;
  if (board.isGameOverFor(player)) return -10000;
  return board.sideSum(player) - board.sideSum(opp);
}

function minimax(
  board: Board,
  player: Player,
  direction: Direction,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  deadline: number
): number {
  if (Date.now() > deadline || depth === 0 || board.isGameOver()) {
    return evaluate(board, maximizing ? player : ((3 - player) as Player));
  }
  const current = maximizing ? player : ((3 - player) as Player);
  const moves = board.legalMoves(current);
  if (moves.length === 0) return evaluate(board, player);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const b = board.clone();
      b.playMove(m, current, direction);
      const ev = minimax(b, player, direction, depth - 1, alpha, beta, false, deadline);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const b = board.clone();
      b.playMove(m, current, direction);
      const ev = minimax(b, player, direction, depth - 1, alpha, beta, true, deadline);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

const LEVEL_PARAMS = [
  { maxDepth: 2, timeMs: 200 },
  { maxDepth: 4, timeMs: 600 },
  { maxDepth: 6, timeMs: 1500 },
];

export function computerMove(
  board: Board,
  player: Player,
  direction: Direction,
  level: 0 | 1 | 2
): number {
  const params = LEVEL_PARAMS[level];
  const moves = board.legalMoves(player);
  if (moves.length === 0) return -1;
  if (moves.length === 1) return moves[0];

  const deadline = Date.now() + params.timeMs;
  let best = moves[0];
  let bestScore = -Infinity;

  // Shuffle for variety
  const shuffled = [...moves].sort(() => Math.random() - 0.5);

  for (const m of shuffled) {
    if (Date.now() > deadline) break;
    const b = board.clone();
    b.playMove(m, player, direction);
    const score = minimax(b, player, direction, params.maxDepth - 1, -Infinity, Infinity, false, deadline);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
