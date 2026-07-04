import { useState } from "react"
import { type ImageSourcePropType, StatusBar, StyleSheet, Text, View } from "react-native"
import * as Haptics from "expo-haptics"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppIconTile, TILE_SIZE } from "./AppIconTile"
import { C } from "./palette"
import { ScratchFoil } from "./ScratchFoil"

/**
 * Replica of the Threads "turning one" app-icon sheet, reskinned for Kheper: a
 * birthday celebration modal where alternative app icons are hidden under a
 * silver scratch-off foil and revealed by scratching.
 *
 * Flow: covered icons render the foil; scratching past the threshold fires
 * `handleRevealComplete`, which unmounts the foil (revealing the icon with a pop)
 * and makes that icon selectable. Tapping any revealed icon applies it - the dark
 * badge moves to it - mirroring the single "currently applied" icon model.
 */

type IconOption = {
  id: string
  background: string
  logo: ImageSourcePropType
  // Covered icons start hidden under the scratch foil; the selected one is the
  // currently applied icon and shows the badge instead.
  covered: boolean
  selected?: boolean
}

const ICONS: IconOption[] = [
  {
    id: "dark",
    background: C.tileDark,
    logo: require("../../../assets/images/kheper/iso-white.png"),
    covered: false,
    selected: true,
  },
  {
    id: "gradient",
    background: C.tileCream,
    logo: require("../../../assets/images/kheper/iso-gradient.png"),
    covered: true,
  },
  {
    id: "lilac",
    background: C.tileLilac,
    logo: require("../../../assets/images/kheper/iso-purple.png"),
    covered: true,
  },
  {
    id: "mint",
    background: C.tileMint,
    logo: require("../../../assets/images/kheper/iso-green.png"),
    covered: true,
  },
  {
    id: "blue",
    background: C.tileBlue,
    logo: require("../../../assets/images/kheper/iso-blue.png"),
    covered: true,
  },
  {
    id: "lime",
    background: C.tileLime,
    logo: require("../../../assets/images/kheper/iso-lime.png"),
    covered: true,
  },
]

// The icon applied when the sheet opens (the pre-revealed one carrying the badge).
const INITIAL_SELECTED_ID = ICONS.find((icon) => icon.selected)?.id ?? null

export function KheperScratch() {
  const insets = useSafeAreaInsets()
  // Which covered icons have been scratched off. Flipping an id to true unmounts
  // its foil (so it vanishes at once) and triggers the tile's reveal pop.
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  // The single currently-applied icon. Revealed icons can be tapped to become it.
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_SELECTED_ID)

  const handleRevealComplete = (id: string) => {
    setRevealed((r) => ({ ...r, [id]: true }))
  }

  // Apply an icon. A light impact confirms the switch (only when it actually
  // changes, so re-tapping the applied icon stays silent).
  const handleSelect = (id: string) => {
    if (id !== selectedId) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedId(id)
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.hero}>
        {/* The Kheper mark shown as a white app-icon tile, a touch larger than the grid. */}
        <AppIconTile
          background={C.sheet}
          logo={require("../../../assets/images/kheper/iso-black.png")}
          size={116}
        />

        <Text style={styles.title}>Kheper is turning one!</Text>

        <Text style={styles.body}>
          We&apos;re celebrating by giving you new app icons designed by the Kheper community.
        </Text>
        <Text style={[styles.body, styles.bodyGap]}>
          Come back every day this week for a new one. You can change your icon until 12 July 2025
        </Text>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.iconGrid}>
          {ICONS.map((icon) => {
            const isRevealed = !!revealed[icon.id]
            // The pre-applied icon and any scratched-off icon can be tapped to apply.
            const isSelectable = !icon.covered || isRevealed
            return (
              <View key={icon.id} style={styles.slot}>
                <AppIconTile
                  background={icon.background}
                  logo={icon.logo}
                  selected={selectedId === icon.id}
                  selectable={isSelectable}
                  onSelect={() => handleSelect(icon.id)}
                  pop={isRevealed}
                />
                {icon.covered && !isRevealed ? (
                  <ScratchFoil onRevealComplete={() => handleRevealComplete(icon.id)} />
                ) : null}
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: C.bg,
    flex: 1,
  },
  hero: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 34,
  },
  title: {
    color: C.ink,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 18,
    marginTop: 36,
    textAlign: "center",
  },
  body: {
    color: C.body,
    fontSize: 15.5,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: "center",
  },
  bodyGap: {
    marginTop: 22,
  },
  // The sheet hugs its content (the icon grid); the hero above takes the rest.
  sheet: {
    alignItems: "center",
    backgroundColor: C.sheet,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  // Width fixed to exactly three tiles per row so six icons wrap into a 2x3 grid.
  iconGrid: {
    columnGap: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: 26,
    // 3 * TILE_SIZE + 2 * columnGap (18) = 264
    width: TILE_SIZE * 3 + 36,
  },
  slot: {
    height: TILE_SIZE,
    width: TILE_SIZE,
  },
})
