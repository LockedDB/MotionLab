import { type ReactNode } from "react"
import { StyleSheet, Text } from "react-native"
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"

// A tint that washes over the card as it's dragged toward one side, reaching
// full color right as it crosses the dismiss threshold. Same mechanic for both
// swipes - only the color, side (direction: +1 right, -1 left) and the badge
// differ, so red-wrong and gray-correct share this one implementation.
//
// On top of the tint, an icon+label badge pops in with a pulse (fast opacity,
// scale springs up past 1 and settles) the moment the drag activates that side.
export function SwipeWash({
  translateX,
  direction,
  threshold,
  color,
  corner,
  icon,
  label,
}: {
  translateX: SharedValue<number>
  direction: 1 | -1
  threshold: number
  color: string
  corner: "left" | "right"
  icon: ReactNode
  label: string
}) {
  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value * direction, [0, threshold], [0, 1], "clamp"),
  }))

  // One-shot pop: fires when the drag crosses a small activation fraction of the
  // threshold, resets when it drops back. Opacity is quick; scale springs with
  // overshoot for the pulse.
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.9)
  useAnimatedReaction(
    () => translateX.value * direction > threshold,
    (active, was) => {
      if (active === was) return
      if (active) {
        opacity.value = withTiming(1, { duration: 70 })
        scale.value = withSpring(1, { damping: 22, stiffness: 380, mass: 0.3 })
      } else {
        opacity.value = withTiming(0, { duration: 80 })
        scale.value = withTiming(0.9, { duration: 80 })
      }
    },
  )
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.wash, { backgroundColor: color }, washStyle]} />
      <Animated.View
        style={[styles.badge, corner === "left" ? styles.badgeLeft : styles.badgeRight, badgeStyle]}
      >
        {icon}
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  // Matches the card radius so the wash follows the rounded corners without
  // clipping the card's shadow (overflow:hidden would kill it on iOS).
  wash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  // Sits in a top corner (like the reference), icon above label. The side is
  // chosen by `corner` so the badge hugs the edge the card is heading toward.
  badge: {
    gap: 6,
    position: "absolute",
    top: 16,
  },
  badgeLeft: {
    alignItems: "flex-start",
    left: 18,
  },
  badgeRight: {
    alignItems: "flex-end",
    right: 18,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
})
