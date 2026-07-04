import { useEffect, useRef } from "react"
import { type ImageSourcePropType, Image, Pressable, StyleSheet, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated"

import { SelectedBadge } from "./icons"
import { C } from "./palette"

// Tile bumped 1.2x from the original 76 for a chunkier grid.
export const TILE_SIZE = 91
export const TILE_RADIUS = 22
const BADGE_SIZE = 28

/**
 * A single Kheper app-icon option: a rounded (squircle-ish) tile with a colored
 * background and the Kheper isologo centered on top.
 *
 * Three states drive its animation:
 *   - `pop`: the reveal jump (a fast scale up and settle) when a scratched icon
 *     first shows through.
 *   - `selectable`: once revealed (or for the pre-applied icon), the tile becomes
 *     tappable and fires `onSelect`.
 *   - `selected`: the currently applied icon. Selecting bounces the tile subtly
 *     and pops the dark badge in; deselecting pops the badge back out.
 */
export function AppIconTile({
  background,
  logo,
  selected = false,
  selectable = false,
  onSelect,
  pop = false,
  size = TILE_SIZE,
}: {
  background: string
  logo: ImageSourcePropType
  selected?: boolean
  /** Whether the tile can be tapped to become the applied icon. */
  selectable?: boolean
  onSelect?: () => void
  /** When it flips to true, the tile jumps toward the camera and settles back. */
  pop?: boolean
  /** Tile edge length; radius and logo scale with it. Defaults to the grid size. */
  size?: number
}) {
  // Keep the squircle corner ratio and logo inset constant across sizes.
  const radius = (TILE_RADIUS / TILE_SIZE) * size
  const logoSize = size * 0.62

  const scale = useSharedValue(1)
  // 0 = badge hidden, 1 = badge shown. Starts matching the initial selected state
  // so the pre-applied icon renders its badge without a spurious mount pop.
  const badge = useSharedValue(selected ? 1 : 0)
  const mounted = useRef(false)

  const tileStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, badge.value),
    transform: [{ scale: badge.value }],
  }))

  // The reveal "pop": a fast scale up to 1.2 and a slightly softer settle back,
  // ~200ms total. Fires when the icon transitions from covered to revealed.
  useEffect(() => {
    if (pop) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 90 }),
        withTiming(1, { duration: 110 }),
      )
    }
  }, [pop, scale])

  // Selection: a subtle bounce (peaks ~1.05) as tap feedback, plus the badge
  // popping in - or out when this icon is deselected. Skipped on mount so the
  // initially applied icon shows its badge statically.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (selected) {
      scale.value = withSequence(
        withTiming(1.05, { duration: 110 }),
        withTiming(1, { duration: 130 }),
      )
      badge.value = withSequence(
        withTiming(1.25, { duration: 110 }),
        withTiming(1, { duration: 130 }),
      )
    } else {
      badge.value = withTiming(0, { duration: 140 })
    }
  }, [selected, scale, badge])

  return (
    <Animated.View style={[{ height: size, width: size }, tileStyle]}>
      <Pressable onPress={onSelect} disabled={!selectable}>
        <View
          style={[
            styles.tile,
            { backgroundColor: background, borderRadius: radius, height: size, width: size },
          ]}
        >
          <Image source={logo} style={{ height: logoSize, width: logoSize }} resizeMode="contain" />
        </View>
      </Pressable>
      <Animated.View style={[styles.badge, badgeStyle]} pointerEvents="none">
        <SelectedBadge size={BADGE_SIZE} />
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    borderColor: C.tileStroke,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
  },
  badge: {
    bottom: -8,
    position: "absolute",
    right: -8,
  },
})
