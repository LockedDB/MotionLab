// Pure geometry for the scratch-to-reveal coverage grid. No React, no Reanimated,
// no Skia: everything here is a plain function of numbers, so the gesture worklets
// can call it on the UI thread and coverage.test.ts can exercise it in Node
// without a simulator.

// The eraser (finger tip) width and the coverage grid used to decide when "enough"
// foil is gone. An 8x8 grid is cheap to update on the UI thread every frame. The
// stroke is a physical finger size, so it does not scale with the tile.
export const STROKE_WIDTH = 30
export const GRID = 8
export const RADIUS = STROKE_WIDTH / 2
// Past this fraction of cleared cells, the remaining foil snaps away at once.
export const REVEAL_THRESHOLD = 0.9

/** Edge length of one grid cell for a tile of the given size. */
export function cellSize(size: number): number {
  "worklet"
  return size / GRID
}

/**
 * Inclusive [min, max] grid index range covered along one axis by an eraser
 * stroke centered at `center`, for a grid whose cells are `cell` px wide. The
 * eraser has radius RADIUS, and the range is clamped to [0, GRID - 1] so a stroke
 * near an edge never reaches off-grid cells.
 */
export function cellRange(center: number, cell: number): { min: number; max: number } {
  "worklet"
  return {
    min: Math.max(0, Math.floor((center - RADIUS) / cell)),
    max: Math.min(GRID - 1, Math.floor((center + RADIUS) / cell)),
  }
}

/**
 * The flat grid indices (row * GRID + col) cleared by an eraser stroke centered
 * at (x, y). A single stroke covers a square block of cells because the eraser is
 * wider than one cell on a small tile.
 */
export function cellsForPoint(x: number, y: number, cell: number): number[] {
  "worklet"
  const cols = cellRange(x, cell)
  const rows = cellRange(y, cell)
  const idxs: number[] = []
  for (let row = rows.min; row <= rows.max; row++) {
    for (let col = cols.min; col <= cols.max; col++) {
      idxs.push(row * GRID + col)
    }
  }
  return idxs
}

/** Whether the cleared fraction has crossed the reveal threshold. */
export function isRevealed(clearedFraction: number): boolean {
  "worklet"
  return clearedFraction >= REVEAL_THRESHOLD
}
