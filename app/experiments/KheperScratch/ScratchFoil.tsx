import { StyleSheet, Text, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"

import { TILE_RADIUS, TILE_SIZE } from "./AppIconTile"
import { C } from "./palette"

/**
 * The silver "scratch-off" foil that covers an unrevealed app icon, like a
 * scratch card. Right now this only paints the *covered* state (metallic
 * gradient + "scratch" label) so the screen matches the reference at rest.
 *
 * The scratch-to-reveal mechanic is intentionally NOT implemented yet - see the
 * stubs below. The plan: drive a Skia mask with a Pan gesture, erode the foil
 * along the finger path, track the cleared-area ratio, and snap-clear + call
 * `onRevealComplete` once past a threshold.
 */
export function ScratchFoil({
  label = "scratch",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRevealComplete,
}: {
  label?: string
  /** Fired once the foil is fully scratched away. Unused until the mechanic lands. */
  onRevealComplete?: () => void
}) {
  // TODO(anim): const scratch = useScratchReveal({ onRevealComplete })
  // TODO(anim): wrap in <GestureDetector gesture={scratch.gesture}> and render
  //             the Skia mask instead of this static gradient.

  return (
    <View style={styles.foil} pointerEvents="none">
      <Svg width={TILE_SIZE} height={TILE_SIZE}>
        <Defs>
          <LinearGradient id="silver" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={C.foilLight} />
            <Stop offset="0.5" stopColor={C.foilMid} />
            <Stop offset="1" stopColor={C.foilDark} />
          </LinearGradient>
        </Defs>
        <Rect
          width={TILE_SIZE}
          height={TILE_SIZE}
          rx={TILE_RADIUS}
          ry={TILE_RADIUS}
          fill="url(#silver)"
        />
      </Svg>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

/**
 * STUB - the scratch-to-reveal interaction hook.
 *
 * Will own: the Pan gesture, the shared value that accumulates the scratched
 * path, the % of area cleared, and the snap-to-complete timing. Returns the
 * gesture + mask primitives the foil renders. No-op for now.
 */
export function useScratchReveal(_opts: { onRevealComplete?: () => void }) {
  // TODO(anim): implement with react-native-gesture-handler + Skia + Reanimated.
  // Move the path work to the UI thread with scheduleOnUI from react-native-worklets.
  return null
}

const styles = StyleSheet.create({
  foil: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    borderRadius: TILE_RADIUS,
    justifyContent: "center",
    overflow: "hidden",
  },
  label: {
    ...StyleSheet.absoluteFillObject,
    color: C.foilLabel,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: "center",
    textAlignVertical: "center",
    // Vertically center the single-line label within the square foil.
    lineHeight: TILE_SIZE,
  },
})
