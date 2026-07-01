/**
 * Root of the MotionLab playground.
 *
 * Deliberately tiny: providers that every animation needs (safe area +
 * gesture handler root) wrap a single Playground screen. Add your experiments
 * in `app/experiments` - you should rarely need to touch this file.
 */
import { StyleSheet } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { Playground } from "@/Playground"

export function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Playground />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
