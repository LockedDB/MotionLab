# CLAUDE.md

Guidance for Claude Code when working in this repo (MotionLab - a React Native animation playground).

## Worklets: use the non-deprecated threading APIs

Always use the current `react-native-worklets` scheduling functions. Do **not** use the deprecated `runOnJS` / `runOnUI` (the legacy names re-exported from `react-native-reanimated`).

- `runOnJS(fn)(...args)` → `scheduleOnRN(fn, ...args)`
- `runOnUI(fn)(...args)` → `scheduleOnUI(fn, ...args)`

Import them from `react-native-worklets`, not from `react-native-reanimated`:

```ts
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets"
```

Note the call shape changed: `scheduleOnRN`/`scheduleOnUI` take the function and its arguments directly (`scheduleOnRN(fn, a, b)`), rather than currying like `runOnJS(fn)(a, b)`.

Reference: https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/

When you touch code that still uses `runOnJS`/`runOnUI`, migrate it to the new API as part of the change.
