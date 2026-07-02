import Svg, { Circle, Line, Path } from "react-native-svg"

import { C } from "./palette"

// Support icons for the Avec tutorial card - drawn as SVG so they stay crisp at
// any size. Colors default to the local palette but can be overridden per use.

export function ClockIcon({ size = 22, color = C.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={11} cy={13} r={8} stroke={color} strokeWidth={1.9} fill="none" />
      <Circle cx={20} cy={5.5} r={2.4} fill={color} />
      <Line x1={11} y1={13} x2={11} y2={8} stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Line
        x1={11}
        y1={13}
        x2={14.5}
        y2={14.5}
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  )
}

export function CheckIcon({ size = 20, color = C.green }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 12.5 L10 17.5 L19 6.5"
        stroke={color}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function Ring({ size = 20, color = C.ring }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  )
}

export function ArrowLeftIcon({ size = 24, color = C.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path
        d="M11 6 L5 12 L11 18"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
