// 3D world-space positions for the 28 tiles of the board.
// The board is a 10x10 square centered on origin (y=0 for the platform top).
// Corners sit at (±5, ±5). Each side has 7 tiles (including corners shared at
// the ends), but we model 8 slots per side minus the corners: 7 side slots
// plus 1 corner — matching the 28-tile layout:
//   0 corner  (bottom-right, +x/+z)
//   1..6 bottom row (going -x)
//   7 corner  (bottom-left, -x/+z)
//   8..13 left column (going -z)
//   14 corner (top-left, -x/-z)
//   15..20 top row (going +x)
//   21 corner (top-right, +x/-z)
//   22..27 right column (going +z back toward start)

import { BOARD_SIZE } from "@/game/tiles";

export const BOARD_HALF = 5; // board extends [-5,5] on x/z
export const TILE_Y = 0.16;  // top of platform where tiles sit
export const AVATAR_Y = 0.55;

export interface TileXform {
  x: number;
  z: number;
  rotY: number; // rotation about Y so text faces inward
  side: "bottom" | "left" | "top" | "right" | "corner";
  isCorner: boolean;
}

// Distance from center to the middle of the tile row
const RING = 4.35;
// Side tiles are spaced along the side. 6 side slots per side, so we want
// them centered between corners.
const SIDE_SPAN = 7.2; // total span the 6 side tiles cover
const SIDE_STEP = SIDE_SPAN / 6; // step between adjacent side tiles

function sideSlotOffset(i: number): number {
  // i in 1..6 → positions across the side, centered on 0
  // map to offsets: -SIDE_SPAN/2 + (i - 0.5) * step
  return -SIDE_SPAN / 2 + (i - 0.5) * SIDE_STEP;
}

const POSITIONS: TileXform[] = (() => {
  const arr: TileXform[] = [];
  // 0 corner bottom-right (+x, +z). Camera is at +z looking toward origin,
  // so "bottom" row (closest to camera) is +z.
  arr.push({ x: RING, z: RING, rotY: Math.PI / 4, side: "corner", isCorner: true });
  // 1..6 bottom row moving from +x toward -x (z = +RING)
  for (let i = 1; i <= 6; i++) {
    arr.push({ x: RING - i * SIDE_STEP - (RING - SIDE_SPAN / 2 - SIDE_STEP / 2), z: RING, rotY: 0, side: "bottom", isCorner: false });
  }
  // fix: rewrite cleanly
  arr.length = 0;
  arr.push({ x: RING, z: RING, rotY: Math.PI / 4, side: "corner", isCorner: true });
  for (let i = 1; i <= 6; i++) {
    // moving -x direction
    const off = sideSlotOffset(i); // -pos → ... → +pos
    // i=1 should be closest to the +x corner, so x = +off... but we want to
    // march from +x-ish to -x-ish. Use x = -off (flip).
    arr.push({ x: -off, z: RING, rotY: 0, side: "bottom", isCorner: false });
  }
  // 7 corner bottom-left (-x, +z)
  arr.push({ x: -RING, z: RING, rotY: -Math.PI / 4, side: "corner", isCorner: true });
  // 8..13 left column moving from +z to -z (x = -RING)
  for (let i = 1; i <= 6; i++) {
    const off = sideSlotOffset(i);
    // i=1 closest to bottom-left (z near +RING), so z = -off (flip).
    arr.push({ x: -RING, z: -off, rotY: Math.PI / 2, side: "left", isCorner: false });
  }
  // 14 corner top-left (-x, -z)
  arr.push({ x: -RING, z: -RING, rotY: Math.PI + Math.PI / 4, side: "corner", isCorner: true });
  // 15..20 top row moving from -x to +x (z = -RING)
  for (let i = 1; i <= 6; i++) {
    const off = sideSlotOffset(i);
    // i=1 closest to top-left (x near -RING), so x = off (not flipped).
    arr.push({ x: off, z: -RING, rotY: Math.PI, side: "top", isCorner: false });
  }
  // 21 corner top-right (+x, -z)
  arr.push({ x: RING, z: -RING, rotY: -Math.PI / 4 + Math.PI, side: "corner", isCorner: true });
  // 22..27 right column moving from -z to +z (x = +RING)
  for (let i = 1; i <= 6; i++) {
    const off = sideSlotOffset(i);
    // i=1 closest to top-right (z near -RING), so z = off (not flipped).
    arr.push({ x: RING, z: off, rotY: -Math.PI / 2, side: "right", isCorner: false });
  }
  return arr;
})();

export function getTileXform(idx: number): TileXform {
  return POSITIONS[((idx % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
}

export function allTileXforms(): TileXform[] {
  return POSITIONS;
}

// Small in-tile offsets when multiple avatars occupy the same tile
export function occupantOffset(i: number, count: number): [number, number] {
  if (count <= 1) return [0, 0];
  // ring arrangement
  const r = 0.28;
  const a = (i / count) * Math.PI * 2;
  return [Math.cos(a) * r, Math.sin(a) * r];
}
