import Svg, { Circle, Path } from "react-native-svg"

import { C } from "./palette"

// Small SVG marks for the Kheper birthday sheet - drawn as SVG so they stay
// crisp at any size. The hero uses the Kheper isologo image directly.

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
