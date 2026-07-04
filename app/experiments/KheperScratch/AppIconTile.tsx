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

export const TILE_SIZE = 91
export const TILE_RADIUS = 22
const BADGE_SIZE = 28

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
  selectable?: boolean
  onSelect?: () => void
  pop?: boolean
  size?: number
}) {
  const radius = (TILE_RADIUS / TILE_SIZE) * size
  const logoSize = size * 0.62

  const scale = useSharedValue(1)
  const badge = useSharedValue(selected ? 1 : 0)
  const mounted = useRef(false)

  const tileStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, badge.value),
    transform: [{ scale: badge.value }],
  }))

  useEffect(() => {
    if (pop) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 90 }),
        withTiming(1, { duration: 110 }),
      )
    }
  }, [pop, scale])

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
