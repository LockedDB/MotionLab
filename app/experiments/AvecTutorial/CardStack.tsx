import { type ReactNode, useEffect } from "react"
import { type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

import { resolveRelease, rubberBand } from "./physics"
import { SwipeWash } from "./SwipeWash"

/**
 * A swipeable card stack: the front card follows the finger (translate + tilt),
 * flies off when released past a distance or flung, and the card behind springs
 * up to take its place. The parent owns the deck as data - this component only
 * knows how to render and swipe whatever it's given.
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

// A side with `dismiss: false` rubber-bands and springs back but still shows
// its wash while dragged; a side with no entry at all is fully inert.
export type SwipeAction = {
  color: string
  icon: ReactNode
  label: string
  dismiss: boolean
}

export type CardSwipes = { left?: SwipeAction; right?: SwipeAction }

export type SwipeDirection = "left" | "right"

export function CardStack<T>({
  cards,
  keyExtractor,
  renderCard,
  swipesFor,
  onSwipe,
  swipeProgress,
  style,
  cardStyle,
}: {
  // Front card first. The parent owns the deck: it decides how many cards are
  // visible and what enters the stack when one leaves.
  cards: readonly T[]
  keyExtractor: (card: T) => string | number
  renderCard: (card: T) => ReactNode
  swipesFor: (card: T) => CardSwipes
  // The front card flew off. The parent reacts by updating `cards`.
  onSwipe: (card: T, direction: SwipeDirection) => void
  // Optional shared value fed with the front card's signed drag progress:
  // -1 = left dismiss threshold, +1 = right, eased back to 0 on release. Lets
  // the parent animate its own UI (e.g. tint a button) along with the drag.
  swipeProgress?: SharedValue<number>
  style?: StyleProp<ViewStyle>
  // Merged over the default card look. If it changes the border radius, keep
  // SwipeWash's radius in sync so the wash still hugs the corners.
  cardStyle?: StyleProp<ViewStyle>
}) {
  return (
    <View style={style}>
      {cards.map((card, i) => (
        <StackCard
          key={keyExtractor(card)}
          index={i}
          zIndex={cards.length - i}
          swipes={swipesFor(card)}
          cardStyle={cardStyle}
          swipeProgress={swipeProgress}
          onDismiss={(direction) => onSwipe(card, direction)}
        >
          {renderCard(card)}
        </StackCard>
      ))}
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
  swipes,
  cardStyle,
  swipeProgress,
  onDismiss,
  children,
}: {
  index: number
  zIndex: number
  swipes: CardSwipes
  cardStyle?: StyleProp<ViewStyle>
  swipeProgress?: SharedValue<number>
  onDismiss: (direction: SwipeDirection) => void
  children: ReactNode
}) {
  const { width } = useWindowDimensions()
  const isFront = index === 0

  const dismissDistance = width * 0.25
  const exitX = width * 1.25
  const tiltRange = width / 2

  // Plain booleans the gesture worklets can capture (the SwipeAction objects hold
  // JSX, which can't cross to the UI thread). A side that can't dismiss resists.
  const releaseConfig = {
    dismissDistance,
    dismissVelocity: DISMISS_VELOCITY,
    canDismissLeft: swipes.left?.dismiss ?? false,
    canDismissRight: swipes.right?.dismiss ?? false,
  }

  // targetX/Y = where the finger is; translateX/Y = the rendered position that
  // chases it with a hair of spring. Both are per-card, so the outgoing card
  // keeps its own off-screen position instead of a shared value snapping it back.
  const targetX = useSharedValue(0)
  const targetY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  // The card tilts as if it pivoted under the finger: grabbed in the top half
  // it leans toward the drag (+1), grabbed in the bottom half the top lags
  // behind and it leans the other way (-1).
  const tiltSign = useSharedValue(1)
  const cardHeight = useSharedValue(0)

  // Depth in the stack, animated so a promotion (index change) springs the card
  // up into place.
  const depth = useSharedValue(index)
  useEffect(() => {
    depth.value = withSpring(index, REVEAL_SPRING)
  }, [index, depth])

  const pan = Gesture.Pan()
    .enabled(isFront)
    .onBegin((e) => {
      // Catch the card mid-flight: stop any animation and continue from here.
      cancelAnimation(translateX)
      cancelAnimation(translateY)
      targetX.value = translateX.value
      targetY.value = translateY.value
      tiltSign.value = cardHeight.value > 0 && e.y > cardHeight.value / 2 ? -1 : 1
    })
    .onChange((e) => {
      targetX.value += e.changeX
      targetY.value += e.changeY
      const x = targetX.value
      const resist =
        (x > 0 && !releaseConfig.canDismissRight) || (x < 0 && !releaseConfig.canDismissLeft)
      translateX.value = withSpring(resist ? rubberBand(x, width) : x, FOLLOW_SPRING)
      translateY.value = withSpring(targetY.value, FOLLOW_SPRING)
      if (swipeProgress) {
        swipeProgress.value = Math.min(1, Math.max(-1, x / dismissDistance))
      }
    })
    // onFinalize, not onEnd: a touch that never activates the pan (a tap, which
    // onBegin froze mid-flight) still ends up here, so the card always resolves
    // to a stable state instead of staying stuck where the cancel left it.
    .onFinalize((e) => {
      const velocityX = e.velocityX ?? 0
      const velocityY = e.velocityY ?? 0
      const outcome = resolveRelease(targetX.value, velocityX, releaseConfig)

      if (swipeProgress) {
        swipeProgress.value = withTiming(0, { duration: 220 })
      }

      if (outcome.verdict === "dismiss") {
        // When the exit spring lands off-screen, the parent drops this card.
        const exit = outcome.direction * exitX
        targetX.value = exit
        targetY.value = 0
        translateY.value = withSpring(0, { ...FOLLOW_SPRING, velocity: velocityY })
        translateX.value = withSpring(
          exit,
          { ...FOLLOW_SPRING, velocity: velocityX },
          (finished) => {
            if (finished) {
              scheduleOnRN(onDismiss, outcome.direction === 1 ? "right" : "left")
            }
          },
        )
      } else {
        targetX.value = 0
        targetY.value = 0
        translateX.value = withSpring(0, { ...FOLLOW_SPRING, velocity: velocityX })
        translateY.value = withSpring(0, { ...FOLLOW_SPRING, velocity: velocityY })
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
      const rotate =
        tiltSign.value *
        interpolate(translateX.value, [-tiltRange, 0, tiltRange], [-MAX_TILT, 0, MAX_TILT])
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
        style={[styles.card, cardStyle, { zIndex }, animatedStyle]}
        pointerEvents={isFront ? "auto" : "none"}
        onLayout={(e) => {
          cardHeight.value = e.nativeEvent.layout.height
        }}
      >
        {children}
        {isFront ? (
          <>
            {/* The badge sits opposite to the direction of travel (right-swipe -> top-left). */}
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

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    // Must match SwipeWash's radius so the wash hugs the rounded corners.
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
})
