export const STROKE_WIDTH = 30
export const GRID = 8
export const RADIUS = STROKE_WIDTH / 2
export const REVEAL_THRESHOLD = 0.97

export function cellSize(size: number): number {
  "worklet"
  return size / GRID
}

export function cellRange(center: number, cell: number): { min: number; max: number } {
  "worklet"
  return {
    min: Math.max(0, Math.floor((center - RADIUS) / cell)),
    max: Math.min(GRID - 1, Math.floor((center + RADIUS) / cell)),
  }
}

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

export function isRevealed(clearedFraction: number): boolean {
  "worklet"
  return clearedFraction >= REVEAL_THRESHOLD
}
