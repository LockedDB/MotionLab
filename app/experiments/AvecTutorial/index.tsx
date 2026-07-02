import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { type LayoutRectangle, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { scheduleOnRN } from "react-native-worklets"

import { ArrowLeftIcon, CheckIcon, ClockIcon } from "./icons"
import { C } from "./palette"
import { PulseGlow } from "./PulseGlow"
import { SwipeWash } from "./SwipeWash"

/**
 * Static replica of the "How to use Avec" onboarding card (email-triage app),
 * backed by a real 3-card stack: flinging the front card away promotes the next
 * one, which scales up to full size and drops into the front position.
 *
 * Each card owns its own drag state and gesture (only the front one is enabled),
 * so a dismissed card keeps flying off-screen until it unmounts - there's no
 * shared value snapping the outgoing card back to center for a frame (which is
 * what caused the flicker when the whole stack shared one translateX).
 */

// How the front card chases the finger and springs back / flies off.
const FOLLOW_SPRING = { damping: 20, stiffness: 250, mass: 0.2 }
// How the next card rises into the front slot once a dismiss changes its index.
// Not driven by the drag - behind cards stay still until the front one has left.
const REVEAL_SPRING = { damping: 18, stiffness: 200, mass: 0.5 }

// A flick faster than this dismisses even before reaching the distance (px/s).
const DISMISS_VELOCITY = 800
// Full tilt is reached once the card is dragged half a screen sideways.
const MAX_TILT = 14
// The next card sits scaled down and lifted up; on promotion it springs to
// scale 1 / translateY 0, landing exactly where the front card was.
const PEEK_SCALE = 0.92
const PEEK_Y = -35

// One swipe direction's behavior: the feedback wash shown while dragging that
// way, and whether releasing past the threshold dismisses the card. Resistance
// isn't a separate flag - a direction with `dismiss: false` (or no entry at all)
// simply rubber-bands and springs back. Grows cleanly: add more sides, an
// `onResolve` outcome, haptics, etc. per direction without touching the gesture.
type SwipeAction = {
  color: string
  icon: ReactNode
  label: string
  dismiss: boolean
}

// A card's swipe behavior, keyed by side. Sides left unset are inert - they
// resist and show no feedback.
type CardSwipes = { left?: SwipeAction; right?: SwipeAction }

// The actions the tutorial cards are composed from.
const LATER: SwipeAction = {
  color: C.neutral,
  icon: <ClockIcon size={20} color="#FFFFFF" />,
  label: "Later",
  dismiss: true,
}
const DONE: SwipeAction = {
  color: C.green,
  icon: <CheckIcon size={20} color="#FFFFFF" />,
  label: "Done",
  dismiss: true,
}
const WRONG: SwipeAction = {
  color: C.danger,
  icon: <ArrowLeftIcon size={20} color="#FFFFFF" />,
  label: "The other way!",
  dismiss: false,
}

// The static card face - identical across the stack, so a dismissed card is
// seamlessly replaced by the one promoted behind it.
function CardFace() {
  return (
    <>
      <View style={styles.center}>
        <View style={styles.titleRow}>
          <ClockIcon size={20} />
          <Text style={styles.cardTitle}>Later</Text>
        </View>
        <Text style={styles.subtitle}>
          If you aren&apos;t ready to handle an email now, mark it{" "}
          <Text style={styles.subtitleBold}>Later</Text>
        </Text>
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>Tap </Text>
        <ClockIcon size={13} />
        <Text style={styles.hint}> </Text>
        <Text style={[styles.hint, styles.hintBold]}>Later</Text>
        <Text style={styles.hint}> or swipe left</Text>
      </View>
    </>
  )
}

// The "mark as done" card: a title, two selectable-looking option rows (one
// flagged Recommended), and a footnote.
function DoneCardFace() {
  return (
    <View style={styles.doneFace}>
      <Text style={styles.doneTitle}>When you mark an email as done</Text>

      <View style={styles.optionRow}>
        <Text style={styles.optionTitle}>Archive</Text>
        <Text style={styles.optionSub}>Archive the email in Gmail</Text>
      </View>

      <View style={styles.optionRow}>
        <View style={styles.optionHeader}>
          <Text style={styles.optionTitle}>Keep in inbox</Text>
          <View style={styles.recommendedPill}>
            <Text style={styles.recommendedText}>Recommended</Text>
          </View>
        </View>
        <Text style={styles.optionSub}>Mark as read in Gmail</Text>
      </View>

      <Text style={styles.doneFooter}>
        Emails you swipe to &quot;Later&quot; will stay unread in Gmail. You can change these
        defaults in Settings.
      </Text>
    </View>
  )
}

// One card in the stack, self-contained: it owns its drag state and gesture.
//   index 0 (front) - gesture enabled, follows the drag (translate + tilt).
//   index 1+ (rest) - gesture disabled, parked at their depth, ignoring the drag.
// A card only moves when a dismiss changes its index: `depth` then springs to the
// new position, so the next card rises into the front slot AFTER the front one
// has left - never in reaction to the drag itself.
function StackCard({
  index,
  zIndex,
  face,
  swipes,
  onDismiss,
  swipeTint,
}: {
  index: number
  zIndex: number
  face: ReactNode
  swipes: CardSwipes
  onDismiss: () => void
  // Shared 0..1 the front card feeds with its left-swipe progress, so the parent's
  // "Later" pill can tint along with the drag. Only the front card's gesture runs.
  swipeTint?: SharedValue<number>
}) {
  const { width } = useWindowDimensions()
  const isFront = index === 0

  // Dismiss past a fifth of the screen; distances stay relative to the screen.
  const dismissDistance = width * 0.25
  const exitX = width * 1.25
  const tiltRange = width / 2

  // Plain booleans the gesture worklets can capture (the SwipeAction objects hold
  // JSX, which can't cross to the UI thread). A side that can't dismiss resists.
  const canDismissLeft = swipes.left?.dismiss ?? false
  const canDismissRight = swipes.right?.dismiss ?? false

  // targetX/Y = where the finger is; translateX/Y = the rendered position that
  // chases it with a hair of spring. Both are per-card, so the outgoing card
  // keeps its own off-screen position instead of a shared value snapping it back.
  const targetX = useSharedValue(0)
  const targetY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  // Depth in the stack, animated so a promotion (index change) springs the card
  // up into place.
  const depth = useSharedValue(index)
  useEffect(() => {
    depth.value = withSpring(index, REVEAL_SPRING)
  }, [index, depth])

  const pan = Gesture.Pan()
    .enabled(isFront)
    .onBegin(() => {
      // Catch the card mid-flight: stop any animation and continue from here.
      cancelAnimation(translateX)
      cancelAnimation(translateY)
      targetX.value = translateX.value
      targetY.value = translateY.value
    })
    .onChange((e) => {
      targetX.value += e.changeX
      targetY.value += e.changeY
      // A non-dismissable side rubber-bands (fights back, never far enough to
      // feel dismissible); a dismissable side tracks the finger freely.
      const x = targetX.value
      const resist = (x > 0 && !canDismissRight) || (x < 0 && !canDismissLeft)
      const resistedX = resist
        ? Math.sign(x) * (1 - 1 / ((Math.abs(x) * 0.55) / width + 1)) * width
        : x
      translateX.value = withSpring(resistedX, FOLLOW_SPRING)
      translateY.value = withSpring(targetY.value, FOLLOW_SPRING)
      // Feed the left-swipe progress up (0 at rest -> 1 at the dismiss threshold);
      // right drags map to 0, so the "Later" pill only tints on a left swipe.
      if (swipeTint) {
        swipeTint.value = Math.min(1, Math.max(0, -targetX.value / dismissDistance))
      }
    })
    .onEnd((e) => {
      const flung = Math.abs(e.velocityX) > DISMISS_VELOCITY
      const past = Math.abs(targetX.value) > dismissDistance
      const dir = (flung ? e.velocityX : targetX.value) > 0 ? 1 : -1
      const canDismiss = dir === 1 ? canDismissRight : canDismissLeft

      // The drag is over: fade the pill tint back to white regardless of outcome.
      if (swipeTint) {
        swipeTint.value = withTiming(0, { duration: 220 })
      }

      // Only a dismissable side flies off; a resisting side always springs back.
      if ((flung || past) && canDismiss) {
        // Fly off toward the drag/flick direction; when it lands off-screen the
        // parent drops this card and promotes the next.
        targetX.value = dir * exitX
        targetY.value = 0
        translateY.value = withSpring(0, { ...FOLLOW_SPRING, velocity: e.velocityY })
        translateX.value = withSpring(
          dir * exitX,
          { ...FOLLOW_SPRING, velocity: e.velocityX },
          (finished) => {
            if (finished) {
              scheduleOnRN(onDismiss)
            }
          },
        )
      } else {
        // Not far enough: spring back home, carrying the flick momentum.
        targetX.value = 0
        targetY.value = 0
        translateX.value = withSpring(0, { ...FOLLOW_SPRING, velocity: e.velocityX })
        translateY.value = withSpring(0, { ...FOLLOW_SPRING, velocity: e.velocityY })
      }
    })

  const animatedStyle = useAnimatedStyle(() => {
    // Only one peek layer is ever shown: cards deeper than the next one hide
    // directly behind it (clamped to depth 1) instead of stacking higher and
    // poking into the header.
    const d = Math.min(depth.value, 1)
    const scale = 1 - d * (1 - PEEK_SCALE)
    const depthY = d * PEEK_Y

    if (isFront) {
      const rotate = interpolate(
        translateX.value,
        [-tiltRange, 0, tiltRange],
        [-MAX_TILT, 0, MAX_TILT],
      )
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value + depthY },
          { rotate: `${rotate}deg` },
          { scale },
        ],
      }
    }

    return { transform: [{ translateY: depthY }, { scale }] }
  })

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, { zIndex }, animatedStyle]}
        pointerEvents={isFront ? "auto" : "none"}
      >
        {face}
        {isFront ? (
          <>
            {/* One wash per configured side. The badge sits in the opposite
                corner to the direction of travel (right-swipe -> top-left). */}
            {swipes.right ? (
              <SwipeWash
                translateX={translateX}
                direction={1}
                threshold={dismissDistance}
                color={swipes.right.color}
                corner="left"
                icon={swipes.right.icon}
                label={swipes.right.label}
              />
            ) : null}
            {swipes.left ? (
              <SwipeWash
                translateX={translateX}
                direction={-1}
                threshold={dismissDistance}
                color={swipes.left.color}
                corner="right"
                icon={swipes.left.icon}
                label={swipes.left.label}
              />
            ) : null}
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  )
}

export function AvecTutorial() {
  const insets = useSafeAreaInsets()

  // The stack lives in state so cards can be promoted/recycled. Each card declares
  // its own face + swipe behavior: the first teaches "Later" (left) and blocks the
  // wrong way (right resists); the second is the "mark as done" card.
  const [cards, setCards] = useState<
    { id: number; face: ReactNode; swipes: CardSwipes; glow?: "later" | "done" }[]
  >(() => [
    { id: 0, face: <CardFace />, swipes: { left: LATER, right: WRONG }, glow: "later" },
    { id: 1, face: <DoneCardFace />, swipes: { left: LATER, right: DONE } },
    { id: 2, face: <CardFace />, swipes: { left: LATER, right: DONE } },
  ])
  const nextId = useRef(cards.length)

  // The front card can ask the bottom bar to glow one of its actions; it stays
  // lit only while that card is up front (the first card highlights "Later").
  const [laterLayout, setLaterLayout] = useState<LayoutRectangle | null>(null)
  const glowLater = cards[0]?.glow === "later"

  // Left-swipe progress of the front card (0..1). The "Later" pill tints from its
  // white toward the grey the Later swipe wash uses, following the drag.
  const laterTint = useSharedValue(0)
  const laterPillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(laterTint.value, [0, 1], ["#FFFFFF", C.ring]),
  }))

  // Front card left the screen: drop it and queue a fresh one at the back so the
  // deck always shows three.
  const handleDismiss = useCallback(() => {
    setCards((prev) => [
      ...prev.slice(1),
      { id: nextId.current++, face: <CardFace />, swipes: { left: LATER, right: DONE } },
    ])
  }, [])

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>How to use Avec</Text>
      </View>

      {/* Card stack - the front card is draggable; the one behind rises to take
          its place when the front is dismissed. */}
      <View style={styles.cardStack}>
        {cards.map((card, i) => (
          <StackCard
            key={card.id}
            index={i}
            zIndex={cards.length - i}
            face={card.face}
            swipes={card.swipes}
            onDismiss={handleDismiss}
            swipeTint={i === 0 ? laterTint : undefined}
          />
        ))}
      </View>

      {/* Action pills */}
      <View style={styles.actions}>
        {/* Pulsating ring behind the Later pill - only while the front card asks
            for it. Sits exactly over the measured pill and grows via transform. */}
        {glowLater && laterLayout ? (
          <View
            pointerEvents="none"
            style={[styles.glowLayer, { left: laterLayout.x, top: laterLayout.y }]}
          >
            <PulseGlow width={laterLayout.width} height={laterLayout.height} radius={22} />
          </View>
        ) : null}
        <View style={styles.ghost} />
        <Animated.View
          style={[styles.pill, styles.laterPill, laterPillStyle]}
          onLayout={(e) => setLaterLayout(e.nativeEvent.layout)}
        >
          <ClockIcon size={16} />
          <Text style={styles.laterLabel}>Later</Text>
        </Animated.View>
        <View style={[styles.pill, styles.donePill]}>
          <CheckIcon size={16} />
          <Text style={styles.doneLabel}>Done</Text>
        </View>
        <View style={styles.ghost} />
      </View>

      {/* Peeking next-stack placeholders */}
      <View style={[styles.stack, { marginBottom: insets.bottom }]}>
        <View style={styles.stackBar} />
        <View style={styles.stackDot} />
        <View style={styles.stackDot} />
        <View style={styles.stackDot} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: C.bg,
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 48,
    paddingHorizontal: 22,
  },
  headerTitle: {
    color: C.ink,
    fontSize: 19,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  cardStack: {
    // Sits above the sibling pills/placeholders so a dragged card that spills
    // over them stays on top (zIndex orders siblings; elevation matches Android).
    elevation: 10,
    flex: 1,
    marginHorizontal: 14,
    marginTop: 24,
    position: "relative",
    zIndex: 10,
  },
  card: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.card,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  center: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    color: C.ink,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: C.body,
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 270,
    textAlign: "center",
  },
  subtitleBold: {
    color: C.ink,
    fontWeight: "700",
  },
  hintRow: {
    alignItems: "center",
    bottom: 26,
    flexDirection: "row",
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  doneFace: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  doneTitle: {
    color: C.ink,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 22,
    textAlign: "center",
  },
  optionRow: {
    backgroundColor: C.field,
    borderRadius: 12,
    marginBottom: 10,
    padding: 16,
  },
  optionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  optionTitle: {
    color: C.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  optionSub: {
    color: C.hint,
    fontSize: 13,
    marginTop: 3,
  },
  recommendedPill: {
    backgroundColor: C.blue,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  recommendedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  doneFooter: {
    color: C.hint,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    paddingHorizontal: 8,
    textAlign: "center",
  },
  hint: {
    color: C.hint,
    fontSize: 13,
  },
  hintBold: {
    color: C.ink,
    fontWeight: "700",
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    marginTop: 22,
    // Margin from the screen edges; the two ghost circles sit fully inside it.
    paddingHorizontal: 16,
  },
  pill: {
    alignItems: "center",
    borderRadius: 26,
    // The two real pills share the middle equally, like the mockup.
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 14,
  },
  laterPill: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  laterLabel: {
    color: C.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  donePill: {
    backgroundColor: C.field,
  },
  doneLabel: {
    color: C.green,
    fontSize: 14,
    fontWeight: "600",
  },
  ghost: {
    backgroundColor: C.ghost,
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  glowLayer: {
    position: "absolute",
  },
  stack: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    opacity: 0.55,
    paddingHorizontal: 24,
  },
  stackBar: {
    backgroundColor: C.ghost,
    borderRadius: 22,
    flex: 1,
    height: 44,
  },
  stackDot: {
    backgroundColor: C.ghost,
    borderRadius: 22,
    height: 44,
    width: 44,
  },
})
