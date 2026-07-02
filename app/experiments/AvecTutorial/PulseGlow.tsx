import { useEffect } from "react"
import { StyleSheet } from "react-native"
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated"

// A pulsating glow that emanates from behind a rounded-pill button. It's a solid
// filled shape sitting exactly over the pill (same size, position and radius) that
// swells outward on a one-directional loop (in -> out): it starts already visible
// at the button's size, then grows and fades to nothing as it expands, so the
// restart is seamless. Plain RN + Reanimated - no Skia needed.

const GLOW_COLOR = "#1c1c1c" // softer than pure black
const BASE_OPACITY = 0.28 // visible from the very start, then decays to 0
const GLOW_SPREAD = 8 // px the glow swells past each edge at the peak

export function PulseGlow({
  width,
  height,
  radius,
}: {
  width: number
  height: number
  radius: number
}) {
  // One-directional loop: t runs 0 -> 1 and restarts (no reverse). The glow fades
  // to 0 as it reaches the end, so the jump back to the start is invisible.
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    )
  }, [t])

  const style = useAnimatedStyle(() => {
    // Split scaleX/scaleY so the glow grows by the SAME number of pixels on both
    // axes. A uniform scale would add more px on the long (X) axis than the short
    // (Y) one on a pill, making it look like it stretches sideways.
    const spread = t.value * GLOW_SPREAD
    return {
      // Opacity starts at BASE_OPACITY (pressed against the button) and decays to
      // 0 as it grows; each axis expands outward from the button's exact size.
      opacity: BASE_OPACITY * (1 - t.value),
      transform: [
        { scaleX: (width + spread * 2) / width },
        { scaleY: (height + spread * 2) / height },
      ],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glow, { borderRadius: Math.min(radius, height / 2), height, width }, style]}
    />
  )
}

const styles = StyleSheet.create({
  glow: {
    backgroundColor: GLOW_COLOR,
  },
})
