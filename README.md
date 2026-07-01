# MotionLab

A minimal React Native playground for building, previewing and screen-recording
animations. It ships with **nothing but the animation and graphics stack** so
there's zero boilerplate between you and the motion code.

Scaffolded with [Ignite](https://github.com/infinitered/ignite) and then
stripped down: no state management, navigation, i18n, API layer, storage or
tests - just a tiny menu that hosts self-contained animation "experiments".

## Why this exists

Most starter templates bury animation code under layers of app architecture.
MotionLab is the opposite: open an experiment file and you're looking at pure
Reanimated / Skia / gesture code you can tweak, learn from, and record for
social. It's meant to be **read, cloned and hacked on**.

## Stack

| Library | What it's for |
| --- | --- |
| [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) | UI-thread animations (the core) |
| [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) | Gesture-driven motion |
| [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) | GPU 2D graphics / canvas / shaders |
| [moti](https://moti.fyi/) | Declarative animations on top of Reanimated |
| [react-native-svg](https://github.com/software-mansion/react-native-svg) | Vector graphics |

Built on **Expo SDK 55** / **React Native 0.83** with the New Architecture and
Hermes enabled.

## Requirements

- **Node** >= 20 and **Yarn** (v1)
- **iOS:** macOS with Xcode + CocoaPods
- **Android:** Android Studio with an SDK/emulator configured
- Uses [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/),
  so the `ios/` and `android/` folders are generated on demand - you don't
  commit or hand-edit them.

## Getting started

```bash
git clone https://github.com/LockedDB/MotionLab.git
cd MotionLab
yarn install

# Build + run on a simulator/emulator (runs expo prebuild automatically):
yarn ios       # iOS simulator
yarn android   # Android emulator
```

The first `yarn ios` / `yarn android` compiles the native app - give it a few
minutes. After that, `yarn start` boots just the Metro dev server for fast JS
reloads (you need the dev build installed on the device first).

If the native folders ever get out of sync, regenerate them:

```bash
yarn prebuild:clean
```

## Project structure

```
index.tsx                 # entry point (registers the root component)
app/
  app.tsx                 # root: gesture-handler + safe-area providers
  Playground.tsx          # the menu + full-screen host for the selected experiment
  theme.ts                # a tiny set of color/spacing tokens
  experiments/
    index.ts              # registry - every experiment is listed here
    Blank.tsx             # empty white canvas to start from
```

There is **no navigation library**. `Playground.tsx` is a plain state switcher:
it shows a list of experiments, and tapping one renders it full-screen with a
`‹ Back` button. One less abstraction between you and the animation.

## Add your own animation

1. Create a component in `app/experiments/`, e.g. `MyThing.tsx`. Make it
   full-screen and give it its own background so it looks clean when recorded:

   ```tsx
   import { StyleSheet, View } from "react-native"
   import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"
   import { useEffect } from "react"

   export function MyThing() {
     const p = useSharedValue(0)
     useEffect(() => {
       p.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true)
     }, [p])
     const style = useAnimatedStyle(() => ({ opacity: 0.3 + p.value * 0.7 }))
     return (
       <View style={styles.container}>
         <Animated.View style={[styles.box, style]} />
       </View>
     )
   }

   const styles = StyleSheet.create({
     container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
     box: { width: 120, height: 120, borderRadius: 24, backgroundColor: "#6EA8FE" },
   })
   ```

2. Register it in `app/experiments/index.ts`:

   ```ts
   import { MyThing } from "./MyThing"

   export const experiments: Experiment[] = [
     // ...existing
     { title: "My Thing", subtitle: "what it demonstrates", accent: colors.accent, component: MyThing },
   ]
   ```

That's it - it shows up in the menu automatically.

## Scripts

| Command | What it does |
| --- | --- |
| `yarn ios` / `yarn android` | Build + run the native app |
| `yarn start` | Metro dev server only |
| `yarn compile` | TypeScript check (`tsc --noEmit`) |
| `yarn lint` / `yarn lint:check` | ESLint (with / without autofix) |
| `yarn prebuild:clean` | Regenerate the native `ios/` and `android/` folders |
| `yarn align-deps` | `expo install --fix` to keep native deps on compatible versions |

## License

MIT - do whatever you want with it.
