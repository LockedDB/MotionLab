// Minimal design tokens for the playground. Kept tiny on purpose - the whole
// point of this project is to iterate on animations, not to maintain a design system.
export const colors = {
  bg: "#0B0B10",
  surface: "#16161F",
  surfaceAlt: "#1F1F2E",
  border: "#2A2A3A",
  text: "#F2F2F7",
  textDim: "#9A9AB0",
  accent: "#6EA8FE",
  accent2: "#B892FF",
  pink: "#FF6EC7",
  green: "#4ADE80",
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const
