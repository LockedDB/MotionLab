import { type ReactNode, useCallback, useRef, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import Animated, {
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { CardStack, type CardSwipes, type SwipeAction, type SwipeDirection } from "./CardStack"
import { ArrowLeftIcon, CheckIcon, ClockIcon } from "./icons"
import { C } from "./palette"
import { PulseGlow } from "./PulseGlow"

/**
 * Static replica of the "How to use Avec" onboarding card (email-triage app).
 * The swipe mechanic (drag, tilt, dismiss, promotion) lives in CardStack; this
 * screen declares the deck and the bottom action pills as data and reacts when
 * a card is swiped away.
 */

const PILL_RADIUS = 26

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

//   later    - teaches the "Later" swipe: left dismisses, right resists.
//   done     - the "mark as done" settings card: both sides dismiss.
//   practice - a free-swipe card, also used to refill the deck.
type TutorialCardKind = "later" | "done" | "practice"
type TutorialCard = { id: number; kind: TutorialCardKind }

const CARD_CONFIG: Record<
  TutorialCardKind,
  { swipes: CardSwipes; highlightPill?: PillAction["key"] }
> = {
  later: { swipes: { left: LATER, right: WRONG }, highlightPill: "later" },
  done: { swipes: { left: LATER, right: DONE } },
  practice: { swipes: { left: LATER, right: DONE } },
}

const cardKey = (card: TutorialCard) => card.id
const swipesForCard = (card: TutorialCard) => CARD_CONFIG[card.kind].swipes
const renderTutorialCard = (card: TutorialCard) =>
  card.kind === "done" ? <DoneCardFace /> : <CardFace />

type PillAction = {
  key: string
  icon: ReactNode
  label: string
  background: string
  labelColor: string
  // The white pill carries a drop shadow.
  elevated?: boolean
  // Tints the background toward `color` as the front card drags toward `side`.
  tint?: { side: SwipeDirection; color: string }
}

const PILL_ACTIONS: PillAction[] = [
  {
    key: "later",
    icon: <ClockIcon size={16} />,
    label: "Later",
    background: "#FFFFFF",
    labelColor: C.ink,
    elevated: true,
    tint: { side: "left", color: C.ring },
  },
  {
    key: "done",
    icon: <CheckIcon size={16} />,
    label: "Done",
    background: C.field,
    labelColor: C.green,
  },
]

export function AvecTutorial() {
  const insets = useSafeAreaInsets()

  const [cards, setCards] = useState<TutorialCard[]>(() => [
    { id: 0, kind: "later" },
    { id: 1, kind: "done" },
    { id: 2, kind: "practice" },
  ])
  const nextId = useRef(cards.length)

  const frontCard = cards[0]
  const highlightedPill = frontCard ? CARD_CONFIG[frontCard.kind].highlightPill : undefined

  const swipeProgress = useSharedValue(0)

  const handleSwipe = useCallback((card: TutorialCard, _direction: SwipeDirection) => {
    setCards((prev) => [
      ...prev.filter((c) => c.id !== card.id),
      { id: nextId.current++, kind: "practice" },
    ])
  }, [])

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>How to use Avec</Text>
      </View>

      <CardStack
        cards={cards}
        keyExtractor={cardKey}
        renderCard={renderTutorialCard}
        swipesFor={swipesForCard}
        onSwipe={handleSwipe}
        swipeProgress={swipeProgress}
        style={styles.cardStack}
      />

      <View style={styles.actions}>
        <View style={styles.ghost} />
        {PILL_ACTIONS.map((action) => (
          <ActionPill
            key={action.key}
            action={action}
            glow={action.key === highlightedPill}
            swipeProgress={swipeProgress}
          />
        ))}
        <View style={styles.ghost} />
      </View>

      <View style={[styles.stack, { marginBottom: insets.bottom }]}>
        <View style={styles.stackBar} />
        <View style={styles.stackDot} />
        <View style={styles.stackDot} />
        <View style={styles.stackDot} />
      </View>
    </View>
  )
}

// One bottom-bar pill. The PulseGlow renders inside the slot, behind the pill,
// so it inherits the pill's box with no measuring by the parent.
function ActionPill({
  action,
  glow,
  swipeProgress,
}: {
  action: PillAction
  glow: boolean
  swipeProgress: SharedValue<number>
}) {
  const tint = action.tint
  const background = action.background
  const tintStyle = useAnimatedStyle(() => {
    if (!tint) return { backgroundColor: background }
    const toward = tint.side === "left" ? -swipeProgress.value : swipeProgress.value
    const progress = Math.min(1, Math.max(0, toward))
    return { backgroundColor: interpolateColor(progress, [0, 1], [background, tint.color]) }
  })

  return (
    <View style={styles.pillSlot}>
      {glow ? <PulseGlow radius={PILL_RADIUS} /> : null}
      <Animated.View style={[styles.pill, action.elevated && styles.pillElevated, tintStyle]}>
        {action.icon}
        <Text style={[styles.pillLabel, { color: action.labelColor }]}>{action.label}</Text>
      </Animated.View>
    </View>
  )
}

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
    paddingHorizontal: 16,
  },
  pillSlot: {
    flex: 1,
  },
  pill: {
    alignItems: "center",
    borderRadius: PILL_RADIUS,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 14,
  },
  pillElevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  ghost: {
    backgroundColor: C.ghost,
    borderRadius: 24,
    height: 48,
    width: 48,
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
