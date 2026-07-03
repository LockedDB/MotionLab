import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg"

import { C } from "./palette"

// Illustrations for the Kheper birthday sheet - drawn as SVG so they stay crisp
// at any size, matching the line-art cake + balloons of the Threads reference.

/**
 * Birthday cake with three candles and a cluster of balloons behind it.
 * Line-art body (white fill, dark stroke), colored balloons and flames.
 */
export function CakeIcon({ size = 96 }: { size?: number }) {
  const stroke = C.ink
  return (
    <Svg width={size} height={size * 0.8} viewBox="0 0 120 96" fill="none">
      {/* Balloons (behind the cake) with curved strings. */}
      <Path d="M34 34 C 40 44, 52 50, 58 60" stroke={C.balloonOrange} strokeWidth={1.6} />
      <Path d="M86 32 C 80 44, 68 50, 62 60" stroke={C.balloonPurple} strokeWidth={1.6} />
      <Path d="M72 38 C 70 46, 64 52, 60 60" stroke={C.balloonPink} strokeWidth={1.6} />
      <Ellipse cx={34} cy={19} rx={13} ry={16} fill={C.balloonOrange} />
      <Ellipse cx={86} cy={17} rx={13} ry={16} fill={C.balloonPurple} />
      <Ellipse cx={72} cy={24} rx={11} ry={14} fill={C.balloonPink} />

      {/* Candle flames. */}
      <Ellipse cx={48} cy={40} rx={2.4} ry={3.6} fill={C.balloonOrange} />
      <Ellipse cx={60} cy={38} rx={2.4} ry={3.6} fill={C.balloonOrange} />
      <Ellipse cx={72} cy={40} rx={2.4} ry={3.6} fill={C.balloonOrange} />

      {/* Candles. */}
      <Rect x={46.8} y={44} width={2.4} height={12} fill={stroke} />
      <Rect x={58.8} y={42} width={2.4} height={14} fill={stroke} />
      <Rect x={70.8} y={44} width={2.4} height={12} fill={stroke} />

      {/* Frosting (wavy band on top of the cake). */}
      <Path
        d="M30 62 C 36 54, 44 54, 50 60 C 56 66, 64 66, 70 60 C 76 54, 84 54, 90 62 L90 68 L30 68 Z"
        fill={C.sheet}
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />

      {/* Cake body. */}
      <Rect
        x={30}
        y={66}
        width={60}
        height={18}
        rx={3}
        fill={C.sheet}
        stroke={stroke}
        strokeWidth={2.2}
      />

      {/* Plate. */}
      <Path
        d="M24 86 C 24 82, 96 82, 96 86"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/** Small check used inside the "selected" badge on the active app icon. */
export function CheckIcon({ size = 14, color = C.badgeTick }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5 L10 17.5 L19 6.5"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Circular "selected" badge (dark disc + white tick), pinned to a tile corner. */
export function SelectedBadge({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={11} fill={C.badge} stroke={C.sheet} strokeWidth={2} />
      <Path
        d="M7 12.5 L10.5 16 L17 8.5"
        stroke={C.badgeTick}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
