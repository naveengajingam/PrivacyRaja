import { TILES, BOARD_SIZE } from "@/game/tiles";

/**
 * Maps tile index (0..27) to grid {row, col} on an 11x11 grid.
 * Outer ring with 7 tiles per side (corners shared).
 *
 * Layout (1-indexed grid lines, but we return 0-indexed for CSS row/col -1):
 *   index 0  -> bottom-right corner
 *   1..6     -> bottom row leftward
 *   7        -> bottom-left corner
 *   8..13    -> left column upward
 *   14       -> top-left corner
 *   15..20   -> top row rightward
 *   21       -> top-right corner
 *   22..27   -> right column downward back to start
 */
export interface TilePosition {
  row: number;     // 1..11
  col: number;     // 1..11
  side: "bottom" | "left" | "top" | "right" | "corner";
}

const SIZE = 11;

const POSITIONS: TilePosition[] = (() => {
  const arr: TilePosition[] = [];
  // 0: bottom-right
  arr.push({ row: SIZE, col: SIZE, side: "corner" });
  // 1..6: bottom row, columns 10..5
  for (let i = 1; i <= 6; i++) {
    arr.push({ row: SIZE, col: SIZE - i, side: "bottom" });
  }
  // 7: bottom-left
  arr.push({ row: SIZE, col: 1, side: "corner" });
  // 8..13: left column, rows 10..5
  for (let i = 1; i <= 6; i++) {
    arr.push({ row: SIZE - i, col: 1, side: "left" });
  }
  // 14: top-left
  arr.push({ row: 1, col: 1, side: "corner" });
  // 15..20: top row, columns 2..7
  for (let i = 1; i <= 6; i++) {
    arr.push({ row: 1, col: 1 + i, side: "top" });
  }
  // 21: top-right
  arr.push({ row: 1, col: SIZE, side: "corner" });
  // 22..27: right column, rows 2..7
  for (let i = 1; i <= 6; i++) {
    arr.push({ row: 1 + i, col: SIZE, side: "right" });
  }
  return arr;
})();

export function getTilePosition(idx: number): TilePosition {
  return POSITIONS[((idx % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
}

export function allTilePositions(): TilePosition[] {
  return POSITIONS;
}

void TILES;
