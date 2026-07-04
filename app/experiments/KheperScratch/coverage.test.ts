import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  cellRange,
  cellsForPoint,
  cellSize,
  GRID,
  isRevealed,
  RADIUS,
  REVEAL_THRESHOLD,
} from "./coverage"

const TILE = 91
const CELL = TILE / GRID

describe("cellSize", () => {
  test("splits the tile into GRID cells", () => {
    assert.equal(cellSize(80), 10)
    assert.equal(cellSize(TILE), CELL)
  })

  test("scales linearly with the tile", () => {
    assert.equal(cellSize(160), 2 * cellSize(80))
  })
})

describe("cellRange", () => {
  const cell = 10

  test("never returns a negative index at the left edge", () => {
    assert.deepEqual(cellRange(0, cell), { min: 0, max: 1 })
  })

  test("never exceeds GRID - 1 at the right edge", () => {
    assert.deepEqual(cellRange(80, cell), { min: 6, max: GRID - 1 })
  })

  test("centers a symmetric block in the middle of the tile", () => {
    assert.deepEqual(cellRange(40, cell), { min: 2, max: 5 })
  })

  test("min never exceeds max across the whole tile", () => {
    for (let center = 0; center <= TILE; center += 1) {
      const { min, max } = cellRange(center, CELL)
      assert.ok(min <= max, `min ${min} > max ${max} at center ${center}`)
      assert.ok(min >= 0 && max <= GRID - 1, `out of bounds at center ${center}`)
    }
  })

  test("the eraser is wider than one cell, so a stroke spans several", () => {
    const { min, max } = cellRange(40, cell)
    assert.ok(max - min >= 2)
    assert.ok(2 * RADIUS > cell)
  })
})

describe("cellsForPoint", () => {
  const cell = 10

  test("clears a rectangular block sized by both axis ranges", () => {
    const cols = cellRange(30, cell)
    const rows = cellRange(50, cell)
    const expected = (cols.max - cols.min + 1) * (rows.max - rows.min + 1)
    assert.equal(cellsForPoint(30, 50, cell).length, expected)
  })

  test("every index is a valid, unique grid cell", () => {
    const idxs = cellsForPoint(45, 60, cell)
    for (const idx of idxs) {
      assert.ok(idx >= 0 && idx < GRID * GRID, `index ${idx} out of range`)
    }
    assert.equal(new Set(idxs).size, idxs.length)
  })

  test("indices follow the row * GRID + col layout", () => {
    const idxs = cellsForPoint(5, 5, cell)
    assert.deepEqual(idxs, [0, 1, 2, 8, 9, 10, 16, 17, 18])
  })

  test("a corner tap includes cell 0 and never leaves the grid", () => {
    const idxs = cellsForPoint(0, 0, cell)
    assert.ok(idxs.includes(0))
    assert.ok(Math.min(...idxs) >= 0)
  })

  test("a far-corner tap includes the last cell", () => {
    const idxs = cellsForPoint(TILE, TILE, CELL)
    assert.ok(idxs.includes(GRID * GRID - 1))
    assert.ok(Math.max(...idxs) < GRID * GRID)
  })
})

describe("isRevealed", () => {
  test("stays covered below the threshold", () => {
    assert.equal(isRevealed(0), false)
    assert.equal(isRevealed(REVEAL_THRESHOLD - 0.01), false)
  })

  test("reveals at and above the threshold", () => {
    assert.equal(isRevealed(REVEAL_THRESHOLD), true)
    assert.equal(isRevealed(1), true)
  })
})
