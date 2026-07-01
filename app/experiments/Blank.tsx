import { StyleSheet, View } from "react-native"

/**
 * A blank white canvas. Start your animation here.
 *
 * Everything is already wired up (Reanimated, Gesture Handler, Skia, Moti,
 * react-native-svg) - just build inside this component, or copy it into a new
 * file and add an entry in `app/experiments/index.ts`.
 */
export function Blank() {
  return <View style={styles.container} />
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
})
