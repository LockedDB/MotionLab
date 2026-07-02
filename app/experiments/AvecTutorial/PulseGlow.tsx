import { useEffect } from "react"
import { StyleSheet } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

// A pulsating glow behind a rounded-pill button: a solid shape that swells
// outward and fades to nothing on a one-directional loop (no reverse), so the
// restart is invisible. It fills its parent and measures itself, so the parent
// just renders it inside (behind) whatever should glow - no layout plumbing.

const GLOW_COLOR = "#1c1c1c" // softer than pure black
const BASE_OPACITY = 0.28 // visible from the very start, then decays to 0
const GLOW_SPREAD = 8 // px the glow swells past each edge at the peak

export function PulseGlow({ radius }: { radius: number }) {
  const t = useSharedValue(0)
  const width = useSharedValue(0)
  const height = useSharedValue(0)

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    )
  }, [t])

  const style = useAnimatedStyle(() => {
    const measured = width.value > 0 && height.value > 0
    if (!measured) return { opacity: 0, transform: [{ scaleX: 1 }, { scaleY: 1 }] }

    // Split scaleX/scaleY so the glow grows by the SAME number of pixels on both
    // axes. A uniform scale would add more px on the long (X) axis than the short
    // (Y) one on a pill, making it look like it stretches sideways.
    const spread = t.value * GLOW_SPREAD
    return {
      opacity: BASE_OPACITY * (1 - t.value),
      transform: [
        { scaleX: (width.value + spread * 2) / width.value },
        { scaleY: (height.value + spread * 2) / height.value },
      ],
    }
  })

  const radiusStyle = useAnimatedStyle(() => ({
    borderRadius: height.value > 0 ? Math.min(radius, height.value / 2) : radius,
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glow, radiusStyle, style]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width
        height.value = e.nativeEvent.layout.height
      }}
    />
  )
}

const styles = StyleSheet.create({
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: GLOW_COLOR,
  },
})
