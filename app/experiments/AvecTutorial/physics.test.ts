import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { type ReleaseConfig, type ReleaseOutcome, resolveRelease, rubberBand } from "./physics"

// Run with `yarn test` (Node's built-in runner through tsx - no simulator needed).

const BOTH: ReleaseConfig = {
  dismissDistance: 100,
  dismissVelocity: 800,
  canDismissLeft: true,
  canDismissRight: true,
}
// The first tutorial card: left dismisses ("Later"), right resists ("The other way!").
const LEFT_ONLY: ReleaseConfig = { ...BOTH, canDismissRight: false }

const SETTLE: ReleaseOutcome = { verdict: "settle" }
const DISMISS_LEFT: ReleaseOutcome = { verdict: "dismiss", direction: -1 }
const DISMISS_RIGHT: ReleaseOutcome = { verdict: "dismiss", direction: 1 }

describe("resolveRelease", () => {
  const cases: {
    name: string
    x: number
    velocityX: number
    config: ReleaseConfig
    expected: ReleaseOutcome
  }[] = [
    // Plain releases.
    { name: "tap on a resting card stays put", x: 0, velocityX: 0, config: BOTH, expected: SETTLE },
    {
      name: "slow release short of the distance springs back",
      x: 60,
      velocityX: 0,
      config: BOTH,
      expected: SETTLE,
    },
    {
      name: "slow release past the distance dismisses toward that side",
      x: 140,
      velocityX: 0,
      config: BOTH,
      expected: DISMISS_RIGHT,
    },
    {
      name: "slow release past the distance on a resisting side springs back",
      x: 140,
      velocityX: 0,
      config: LEFT_ONLY,
      expected: SETTLE,
    },
    // Flicks.
    {
      name: "fast flick dismisses before reaching the distance",
      x: 40,
      velocityX: 1200,
      config: BOTH,
      expected: DISMISS_RIGHT,
    },
    {
      name: "flick from dead center dismisses toward the flick",
      x: 0,
      velocityX: -1500,
      config: BOTH,
      expected: DISMISS_LEFT,
    },
    {
      name: "flick toward a resisting side springs back",
      x: 40,
      velocityX: 1200,
      config: LEFT_ONLY,
      expected: SETTLE,
    },
    {
      name: "flick velocity below the threshold falls back to the distance rule",
      x: 60,
      velocityX: 799,
      config: BOTH,
      expected: SETTLE,
    },
    // Bug regression: dragging right past the distance, then flinging the card
    // back toward center used to dismiss it LEFT (direction came from velocity
    // alone). The user's intent is "put it back": it must settle.
    {
      name: "flick back toward center settles, even past the dismiss distance",
      x: 140,
      velocityX: -2000,
      config: BOTH,
      expected: SETTLE,
    },
    // Bug regression: on the left-only card, the whiplash of releasing a
    // rubber-banded right drag used to dismiss "Later" unintentionally.
    {
      name: "rubber-band whiplash toward center never dismisses the opposite side",
      x: 120,
      velocityX: -2000,
      config: LEFT_ONLY,
      expected: SETTLE,
    },
    // Companion to the tap-freeze fix: a tap that catches a card mid-return
    // (gesture never activates, so velocity is 0) must resolve, not freeze.
    {
      name: "tap catching a card mid-return resolves to settle",
      x: 80,
      velocityX: 0,
      config: BOTH,
      expected: SETTLE,
    },
    {
      name: "tap catching a card mid-dismissal resumes the dismissal",
      x: 160,
      velocityX: 0,
      config: BOTH,
      expected: DISMISS_RIGHT,
    },
  ]

  for (const c of cases) {
    test(c.name, () => {
      assert.deepEqual(resolveRelease(c.x, c.velocityX, c.config), c.expected)
    })
  }
})

describe("rubberBand", () => {
  test("is zero at zero", () => {
    assert.equal(rubberBand(0, 300), 0)
  })

  test("is symmetric around zero", () => {
    assert.equal(rubberBand(-120, 300), -rubberBand(120, 300))
  })

  test("grows monotonically with the pull", () => {
    assert.ok(rubberBand(100, 300) < rubberBand(200, 300))
  })

  test("never exceeds the limit, no matter the pull", () => {
    assert.ok(rubberBand(1e9, 300) < 300)
  })

  test("moves less than the finger from the very start", () => {
    assert.ok(rubberBand(50, 300) < 50)
  })
})
