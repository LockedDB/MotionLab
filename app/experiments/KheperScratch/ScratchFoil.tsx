import { useMemo } from "react"
import { Platform, StyleSheet } from "react-native"
import {
  Canvas,
  Group,
  LinearGradient,
  matchFont,
  Paint,
  Path,
  RoundedRect,
  Skia,
  Text as SkiaText,
  vec,
} from "@shopify/react-native-skia"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

import { TILE_RADIUS, TILE_SIZE } from "./AppIconTile"
import { C } from "./palette"

// Eraser width (finger tip) and the coverage grid used to decide when "enough"
// foil is gone. An 8x8 grid is cheap to update on the UI thread every frame.
const STROKE_WIDTH = 30
const GRID = 8
const CELL = TILE_SIZE / GRID
const RADIUS = STROKE_WIDTH / 2
// Past this fraction of cleared cells, the remaining foil snap-fades away.
const REVEAL_THRESHOLD = 0.9

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
 * `REVEAL_THRESHOLD`, the whole layer fades out and `onRevealComplete` fires.
 */
export function ScratchFoil({
  label = "scratch",
  onRevealComplete,
}: {
  label?: string
  /** Fired once the foil is scratched past the reveal threshold. */
  onRevealComplete?: () => void
}) {
  const { gesture, path, layerOpacity } = useScratchReveal({ onRevealComplete })

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
  const textX = (TILE_SIZE - textWidth) / 2
  // Baseline offset to visually center the single line within the square.
  const textY = TILE_SIZE / 2 + 4.5

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={styles.foil}>
        {/* Offscreen layer: the eraser's "clear" and the fade only touch the foil. */}
        <Group layer={<Paint opacity={layerOpacity} />}>
          <RoundedRect x={0} y={0} width={TILE_SIZE} height={TILE_SIZE} r={TILE_RADIUS}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(TILE_SIZE, TILE_SIZE)}
              colors={[C.foilLight, C.foilMid, C.foilDark]}
            />
          </RoundedRect>

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
 * Owns the Pan gesture, the growing finger path (kept as points and rebuilt into
 * an SkPath reactively via useDerivedValue), the coverage grid, and the
 * snap-to-complete fade. All the per-frame work runs on the UI thread; we hop
 * back to JS only once, for `onRevealComplete`, via scheduleOnRN.
 */
export function useScratchReveal({ onRevealComplete }: { onRevealComplete?: () => void }) {
  // Raw finger points, accumulated across every stroke (lifting the finger does
  // not clear them). `move` starts a fresh sub-path so separate strokes don't get
  // joined by a straight line across the tile.
  const points = useSharedValue<{ x: number; y: number; move: boolean }[]>([])
  // 1 = cell scratched. Reassigned (not mutated in place) so reads stay clean.
  const cells = useSharedValue<number[]>(new Array(GRID * GRID).fill(0))
  const revealed = useSharedValue(false)
  // 0 while scratching (layer fully opaque, with holes); 1 once snapped away.
  const snap = useSharedValue(0)

  // Rebuild the stroke path from the accumulated points. Recomputes whenever a
  // new point is pushed; O(n) with a tiny n for a 91px tile.
  const path = useDerivedValue(() => {
    const p = Skia.Path.Make()
    const pts = points.value
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].move) {
        p.moveTo(pts[i].x, pts[i].y)
      } else {
        p.lineTo(pts[i].x, pts[i].y)
      }
    }
    return p
  })

  const layerOpacity = useDerivedValue(() => 1 - snap.value)

  // Mark every grid cell touched by the stroke at (x, y) and return the fraction
  // of the tile cleared so far.
  const applyPoint = (x: number, y: number) => {
    "worklet"
    const arr = cells.value.slice()
    const minCol = Math.max(0, Math.floor((x - RADIUS) / CELL))
    const maxCol = Math.min(GRID - 1, Math.floor((x + RADIUS) / CELL))
    const minRow = Math.max(0, Math.floor((y - RADIUS) / CELL))
    const maxRow = Math.min(GRID - 1, Math.floor((y + RADIUS) / CELL))
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        arr[row * GRID + col] = 1
      }
    }
    cells.value = arr
    let count = 0
    for (let i = 0; i < arr.length; i++) count += arr[i]
    return count / arr.length
  }

  const maybeSnap = (ratio: number) => {
    "worklet"
    if (!revealed.value && ratio >= REVEAL_THRESHOLD) {
      revealed.value = true
      snap.value = withTiming(1, { duration: 240 })
      if (onRevealComplete) scheduleOnRN(onRevealComplete)
    }
  }

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      if (revealed.value) return
      // Begin a new sub-path; keep every previous stroke.
      points.value = [...points.value, { x: e.x, y: e.y, move: true }]
      maybeSnap(applyPoint(e.x, e.y))
    })
    .onUpdate((e) => {
      if (revealed.value) return
      points.value = [...points.value, { x: e.x, y: e.y, move: false }]
      maybeSnap(applyPoint(e.x, e.y))
    })

  return { gesture, path, layerOpacity }
}

const styles = StyleSheet.create({
  foil: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TILE_RADIUS,
    overflow: "hidden",
  },
})
