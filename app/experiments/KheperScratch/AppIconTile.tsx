import { type ImageSourcePropType, Image, StyleSheet, View } from "react-native"

import { SelectedBadge } from "./icons"
import { C } from "./palette"

// Tile bumped 1.2x from the original 76 for a chunkier grid.
export const TILE_SIZE = 91
export const TILE_RADIUS = 22

/**
 * A single Kheper app-icon option: a rounded (squircle-ish) tile with a colored
 * background and the Kheper isologo centered on top. When `selected`, it carries
 * the dark "currently applied" badge in the bottom-right corner - the same slot
 * the scratch foil will hand off to once an icon is revealed.
 */
export function AppIconTile({
  background,
  logo,
  selected = false,
}: {
  background: string
  logo: ImageSourcePropType
  selected?: boolean
}) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.tile, { backgroundColor: background }]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
      {selected ? (
        <View style={styles.badge}>
          <SelectedBadge size={26} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    height: TILE_SIZE,
    width: TILE_SIZE,
  },
  tile: {
    alignItems: "center",
    borderColor: C.tileStroke,
    borderRadius: TILE_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    height: TILE_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: TILE_SIZE,
  },
  logo: {
    height: TILE_SIZE * 0.62,
    width: TILE_SIZE * 0.62,
  },
  badge: {
    bottom: -2,
    position: "absolute",
    right: -2,
  },
})
