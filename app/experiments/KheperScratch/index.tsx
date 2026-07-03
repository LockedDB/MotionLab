import { type ImageSourcePropType, StatusBar, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppIconTile, TILE_SIZE } from "./AppIconTile"
import { CakeIcon } from "./icons"
import { C } from "./palette"
import { ScratchFoil } from "./ScratchFoil"

/**
 * Static replica of the Threads "turning one" app-icon sheet, reskinned for
 * Kheper: a birthday celebration modal where alternative app icons are hidden
 * under a silver scratch-off foil and revealed by scratching.
 *
 * This is the DESIGN SKELETON only - the scratch-to-reveal animation is not
 * wired yet. The covered icons render the static foil; the reveal mechanic and
 * its callback (`handleRevealComplete`) are stubs to fill in next.
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

export function KheperScratch() {
  const insets = useSafeAreaInsets()

  // STUB - called once a foil is fully scratched off. Will flip the icon from
  // `covered` to selectable (and, eventually, apply it as the app icon).
  const handleRevealComplete = (_id: string) => {
    // TODO(anim): mark icon revealed, allow selecting it.
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.hero}>
        <CakeIcon size={104} />

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
          {ICONS.map((icon) => (
            <View key={icon.id} style={styles.slot}>
              <AppIconTile background={icon.background} logo={icon.logo} selected={icon.selected} />
              {icon.covered ? (
                <ScratchFoil onRevealComplete={() => handleRevealComplete(icon.id)} />
              ) : null}
            </View>
          ))}
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
    marginBottom: 16,
    marginTop: 18,
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
    marginTop: 16,
  },
  // The sheet hugs its content (the icon grid); the hero above takes the rest.
  sheet: {
    alignItems: "center",
    backgroundColor: C.sheet,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  // Width fixed to exactly three tiles per row so six icons wrap into a 2x3 grid.
  iconGrid: {
    columnGap: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: 22,
    // 3 * TILE_SIZE + 2 * columnGap (18) = 264
    width: TILE_SIZE * 3 + 36,
  },
  slot: {
    height: TILE_SIZE,
    width: TILE_SIZE,
  },
})
