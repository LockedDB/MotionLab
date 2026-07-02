// Decision and curve functions for the swipeable card stack. No React, no
// Reanimated: everything here is a plain function of numbers, so the gesture
// worklets can call it on the UI thread and physics.test.ts can exercise it in
// Node without a simulator.

export type ReleaseConfig = {
  // Horizontal distance (px) past which a slow release dismisses.
  dismissDistance: number
  // Flick speed (px/s) past which velocity alone can dismiss.
  dismissVelocity: number
  canDismissLeft: boolean
  canDismissRight: boolean
}

export type ReleaseOutcome = { verdict: "dismiss"; direction: 1 | -1 } | { verdict: "settle" }

/**
 * Decide what a released card does, given where it sits and how fast it moves.
 *
 * - A fast flick dismisses only when it points AWAY from center. A flick back
 *   toward center means "I changed my mind": the card settles home even if it
 *   currently sits past the dismiss distance.
 * - A slow release dismisses when the card sits past the dismiss distance.
 * - Either way only a dismissable side flies off; the rest settle back.
 */
export function resolveRelease(
  x: number,
  velocityX: number,
  config: ReleaseConfig,
): ReleaseOutcome {
  "worklet"
  if (Math.abs(velocityX) >= config.dismissVelocity) {
    const direction = velocityX > 0 ? 1 : -1
    const canDismiss = direction === 1 ? config.canDismissRight : config.canDismissLeft
    const awayFromCenter = x === 0 || x > 0 === (direction === 1)
    if (awayFromCenter && canDismiss) return { verdict: "dismiss", direction }
    return { verdict: "settle" }
  }

  const direction = x > 0 ? 1 : -1
  const canDismiss = direction === 1 ? config.canDismissRight : config.canDismissLeft
  if (Math.abs(x) > config.dismissDistance && canDismiss) return { verdict: "dismiss", direction }
  return { verdict: "settle" }
}

/**
 * iOS-style rubber band: the further you pull, the less the content moves,
 * asymptotically approaching `limit`. The 0.55 coefficient is the one Apple
 * uses in UIScrollView.
 */
export function rubberBand(x: number, limit: number, coefficient: number = 0.55): number {
  "worklet"
  return Math.sign(x) * (1 - 1 / ((Math.abs(x) * coefficient) / limit + 1)) * limit
}
