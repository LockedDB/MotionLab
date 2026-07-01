import { useState } from "react"
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { experiments } from "@/experiments"
import { colors, radius, spacing } from "@/theme"

/**
 * The playground is a plain state-driven switcher: a scrollable menu of
 * experiments, and a full-screen host for whichever one you tap. No navigation
 * library on purpose - one less thing between you and the animation code.
 */
export function Playground() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const insets = useSafeAreaInsets()

  const active = activeIndex === null ? null : experiments[activeIndex]

  if (active) {
    const Experiment = active.component
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.experimentHost}>
          <Experiment />
        </View>
        <Pressable
          style={[styles.backButton, { top: insets.top + spacing.sm }]}
          onPress={() => setActiveIndex(null)}
          hitSlop={12}
        >
          <Text style={styles.backLabel}>‹ Back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.md,
        }}
      >
        <Text style={styles.title}>MotionLab</Text>
        <Text style={styles.subtitle}>Reanimated · Skia · Gesture Handler · Moti · SVG</Text>

        <View style={styles.list}>
          {experiments.map((experiment, index) => (
            <Pressable
              key={experiment.title}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => setActiveIndex(index)}
            >
              <View style={[styles.dot, { backgroundColor: experiment.accent }]} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{experiment.title}</Text>
                <Text style={styles.cardSubtitle}>{experiment.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    padding: spacing.md,
  },
  cardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  dot: {
    borderRadius: radius.pill,
    height: 12,
    marginRight: spacing.md,
    width: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: colors.textDim,
    fontSize: 24,
    fontWeight: "300",
  },
  experimentHost: {
    flex: 1,
  },
  backButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
  },
  backLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
})
