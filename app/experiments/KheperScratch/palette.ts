// Local palette for the Kheper "scratch to reveal app icons" screen. It's a
// light, warm modal (mirrors the Threads birthday sheet), so it doesn't use the
// dark playground theme tokens. Shared by the screen, the icons and the foil.
export const C = {
  // Warm off-white backdrop of the celebration sheet.
  bg: "#F5EEF0",
  sheet: "#FFFFFF",
  ink: "#0E0E0E",
  body: "#8A8A8E",
  hint: "#A9A6AA",

  // App-icon tile backgrounds.
  tileDark: "#151515",
  tileCream: "#EFEAE0",
  tileLilac: "#F0ECFA",
  tileMint: "#E7F3E9",
  tileBlue: "#E6EFFA",
  tileLime: "#EFF4DE",
  tileStroke: "#D8D6D6",

  // Silver scratch-off foil. Cool-tinted greys with real light-to-dark range so
  // the metallic gradient and grain have something to bite on. `foilSheen` is the
  // near-white specular band that sweeps across the middle of the foil.
  foilLight: "#D2D4DB",
  foilMid: "#A7A9B4",
  foilDark: "#8C8E99",
  foilSheen: "#D5D6DD",
  foilLabel: "#6F717C",

  // Selected badge.
  badge: "#0E0E0E",
  badgeTick: "#FFFFFF",

  // Balloon accents for the birthday illustration.
  balloonOrange: "#F6A02A",
  balloonPurple: "#A06CF6",
  balloonPink: "#FF5C8A",
} as const
