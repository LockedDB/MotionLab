import { useMemo } from "react"
import { Platform, StyleSheet } from "react-native"
import * as Haptics from "expo-haptics"
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
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useDerivedValue, useSharedValue } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

import { TILE_RADIUS, TILE_SIZE } from "./AppIconTile"
import { cellsForPoint, cellSize, GRID, isRevealed, STROKE_WIDTH } from "./coverage"
import { C } from "./palette"

const GRAIN_TO_LUMA = [
  0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0, 0, 0,
  0, 1,
]

export function ScratchFoil({
  label = "scratch",
  size = TILE_SIZE,
  onRevealComplete,
}: {
  label?: string
  size?: number
  onRevealComplete?: () => void
}) {
  const { gesture, path, layerOpacity } = useScratchReveal({ size, onRevealComplete })

  const radius = (TILE_RADIUS / TILE_SIZE) * size

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
  const metrics = font.getMetrics()
  const textY = size / 2 - (metrics.ascent + metrics.descent) / 2

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={[styles.foil, { borderRadius: radius }]}>
        <Group layer={<Paint opacity={layerOpacity} />}>
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

export function useScratchReveal({
  size,
  onRevealComplete,
}: {
  size: number
  onRevealComplete?: () => void
}) {
  const cell = cellSize(size)
  const path = useSharedValue(Skia.Path.Make())
  const cells = useSharedValue<number[]>(new Array(GRID * GRID).fill(0))
  const clearedCount = useSharedValue(0)
  const revealed = useSharedValue(false)
  const snap = useSharedValue(0)

  const layerOpacity = useDerivedValue(() => 1 - snap.value)

  const tick = () => Haptics.selectionAsync()
  const reveal = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

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
      snap.value = 1
      scheduleOnRN(reveal)
      if (onRevealComplete) scheduleOnRN(onRevealComplete)
    }
  }

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      if (revealed.value) return
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
