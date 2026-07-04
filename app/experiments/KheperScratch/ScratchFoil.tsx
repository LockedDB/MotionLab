import {
    Canvas,
    ColorMatrix,
    FractalNoise,
    Group,
    LinearGradient,
    matchFont,
    notifyChange,
    Paint,
    Path,
    RoundedRect,
    Skia,
    Text as SkiaText,
    vec,
} from "@shopify/react-native-skia"
import * as Haptics from "expo-haptics"
import { useMemo } from "react"
import { Platform, StyleSheet } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useDerivedValue, useSharedValue } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

import { TILE_RADIUS, TILE_SIZE } from "./AppIconTile"
import { cellsForPoint, cellSize, GRID, isRevealed, STROKE_WIDTH } from "./coverage"
import { C } from "./palette"

// Collapses the (naturally rainbow) fractal-noise channels to luminance grain and
// forces the alpha opaque, so the grain reads as monochrome metallic speckle
// rather than coloured dots. Rows are the standard Rec. 709 luma weights.
const GRAIN_TO_LUMA = [
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 0, 1,
]

/**
 * The silver "scratch-off" foil that covers an unrevealed app icon. The real
 * Kheper icon (an RN <Image>) lives *below* this Skia <Canvas>, which is
 * transparent by default - so erasing the foil simply lets the icon show
 * through. No crossfade: the reveal is pure masking.
 *
 * How it works, layer by layer (all inside one offscreen `layer` group so the
 * eraser and the fade stay contained to the foil):
 *   - RoundedRect + LinearGradient -> the metallic silver fill
 *   - Skia Text -> the "scratch" label (inside the layer, so it erodes too)
 *   - Path with blendMode "clear" -> the finger trail, which punches the buffer
 *     to transparent along its stroke
 * A Pan gesture feeds the path points and a coverage grid; once cleared past
 * `REVEAL_THRESHOLD`, the whole layer snaps away at once and `onRevealComplete`
 * fires (the parent then unmounts this foil).
 */
export function ScratchFoil({
  label = "scratch",
  size = TILE_SIZE,
  onRevealComplete,
}: {
  label?: string
  /** Edge length of the covered tile; the foil geometry derives from it. */
  size?: number
  /** Fired once the foil is scratched past the reveal threshold. */
  onRevealComplete?: () => void
}) {
  const { gesture, path, layerOpacity } = useScratchReveal({ size, onRevealComplete })

  // Same corner ratio as AppIconTile, so the foil hugs the tile at any size.
  const radius = (TILE_RADIUS / TILE_SIZE) * size

  // System font for the label - no bundled .ttf needed. matchFont is synchronous.
  const font = useMemo(
    () =>
      matchFont({
        fontFamily: Platform.select({ ios: "Helvetica", default: "sans-serif" }),
        fontSize: 13,
        fontWeight: "600",
      }),
    [],
  )
  const textWidth = font.measureText(label).width
  const textX = (size - textWidth) / 2
  // Center the baseline from the font's real metrics (ascent is negative).
  const metrics = font.getMetrics()
  const textY = size / 2 - (metrics.ascent + metrics.descent) / 2

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={[styles.foil, { borderRadius: radius }]}>
        {/* Offscreen layer: the eraser's "clear" and the fade only touch the foil. */}
        <Group layer={<Paint opacity={layerOpacity} />}>
          {/* Metallic base: a near-horizontal gradient (tilted ~18deg off level) with
              two specular bands (foilSheen) - a narrow one on the left and a broader
              one through the middle - separated by darker valleys. The tilt makes the
              bands lean like light glancing across brushed metal. The axis overshoots
              the tile (negative start / >size end) so the bands still span the corners
              once rotated. */}
          <RoundedRect x={0} y={0} width={size} height={size} r={radius}>
            <LinearGradient
              start={vec(-0.094 * size, 0.693 * size)}
              end={vec(1.094 * size, 0.307 * size)}
              colors={[
                C.foilDark,
                C.foilMid,
                C.foilSheen,
                C.foilMid,
                C.foilMid,
                C.foilLight,
                C.foilSheen,
                C.foilLight,
                C.foilMid,
                C.foilDark,
              ]}
              positions={[0, 0.1, 0.18, 0.28, 0.44, 0.5, 0.57, 0.64, 0.82, 1]}
            />
          </RoundedRect>

          {/* Fine metallic grain over the base. The layer desaturates the noise to
              luminance and composites it with overlay at low opacity, so it darkens
              and brightens the silver without tinting it. */}
          <Group
            layer={
              <Paint opacity={0.08} blendMode="overlay">
                <ColorMatrix matrix={GRAIN_TO_LUMA} />
              </Paint>
            }
          >
            <RoundedRect x={0} y={0} width={size} height={size} r={radius}>
              <FractalNoise freqX={0.85} freqY={0.85} octaves={3} seed={1} />
            </RoundedRect>
          </Group>

          <SkiaText x={textX} y={textY} text={label} font={font} color={C.foilLabel} />

          {/* The finger trail. "clear" turns these pixels transparent in the layer. */}
          <Path
            path={path}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            strokeJoin="round"
            blendMode="clear"
            color="black"
          />
        </Group>
      </Canvas>
    </GestureDetector>
  )
}

/**
 * The scratch-to-reveal interaction hook.
 *
 * Owns the Pan gesture, the growing finger path (one persistent SkPath appended
 * to in place, with notifyChange triggering the redraw), the coverage grid, and
 * the instant snap-to-complete. All the per-frame work runs on the UI thread; we
 * hop back to JS via scheduleOnRN for the haptics and `onRevealComplete`.
 */
export function useScratchReveal({
  size,
  onRevealComplete,
}: {
  size: number
  onRevealComplete?: () => void
}) {
  const cell = cellSize(size)
  // The finger trail, accumulated across every stroke (lifting the finger does
  // not clear it). Mutated in place - moveTo starts a fresh sub-path so separate
  // strokes don't get joined - and O(1) per point, so long scratch sessions
  // don't degrade. notifyChange tells Skia the path changed.
  const path = useSharedValue(Skia.Path.Make())
  // 1 = cell scratched. Mutated in place; nothing subscribes to it reactively,
  // `clearedCount` carries the running total instead of a per-frame recount.
  const cells = useSharedValue<number[]>(new Array(GRID * GRID).fill(0))
  const clearedCount = useSharedValue(0)
  const revealed = useSharedValue(false)
  // 0 while scratching (layer fully opaque, with holes); flips to 1 at once on
  // reveal so the leftover foil vanishes instantly (no fade).
  const snap = useSharedValue(0)

  const layerOpacity = useDerivedValue(() => 1 - snap.value)

  // Haptics run on the JS thread; hop over from the gesture worklets via
  // scheduleOnRN. A light "tick" per newly cleared cell gives the grainy feel of
  // scratching; a firmer impact lands the moment the icon is revealed.
  const tick = () => Haptics.selectionAsync()
  const reveal = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

  // Mark every grid cell touched by the stroke at (x, y) and return the fraction
  // of the tile cleared so far. Fires a haptic tick whenever a fresh cell is
  // cleared, so the buzz tracks actual scratching rather than every frame.
  const applyPoint = (x: number, y: number) => {
    "worklet"
    const arr = cells.value
    const idxs = cellsForPoint(x, y, cell)
    let clearedNew = false
    for (let i = 0; i < idxs.length; i++) {
      const idx = idxs[i]
      if (arr[idx] === 0) {
        arr[idx] = 1
        clearedCount.value += 1
        clearedNew = true
      }
    }
    if (clearedNew) scheduleOnRN(tick)
    return clearedCount.value / arr.length
  }

  const maybeSnap = (ratio: number) => {
    "worklet"
    if (!revealed.value && isRevealed(ratio)) {
      revealed.value = true
      // Snap the foil away at once - no opacity fade. The parent then unmounts it.
      snap.value = 1
      scheduleOnRN(reveal)
      if (onRevealComplete) scheduleOnRN(onRevealComplete)
    }
  }

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      if (revealed.value) return
      // Begin a new sub-path; keep every previous stroke.
      path.value.moveTo(e.x, e.y)
      notifyChange(path)
      maybeSnap(applyPoint(e.x, e.y))
    })
    .onUpdate((e) => {
      if (revealed.value) return
      path.value.lineTo(e.x, e.y)
      notifyChange(path)
      maybeSnap(applyPoint(e.x, e.y))
    })

  return { gesture, path, layerOpacity }
}

const styles = StyleSheet.create({
  foil: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
})
