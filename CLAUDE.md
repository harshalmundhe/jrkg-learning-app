# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Target Audience

This is a **learning app for children aged 3–5 years**. All UI, interactions, copy, and content decisions must be appropriate for toddlers and preschoolers:
- Large tap targets, bold colors, simple shapes
- No reading required — icons, audio, and visuals over text
- Short, rewarding feedback loops (animations, sounds on success)
- Zero friction — no login walls, no complex navigation

## Commands

```bash
npx expo start          # Start dev server (scan QR to open on device)
npx expo start --android
npx expo start --ios
npx expo start --web
npx expo lint           # Run ESLint (initializes config on first run)
node ./scripts/reset-project.js  # Reset to blank app/ (moves starter to app-example/)
```

No test runner or `tsc --noEmit` script is configured yet.

## Architecture

This is a minimal [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) app using **file-based routing via expo-router**.

**Source layout:**
- `src/app/` — all screens and layouts. Files here map 1:1 to routes (Next.js convention).
  - `_layout.tsx` — root Stack navigator
  - `index.tsx` — home screen (`/` route)
- `assets/images/` — app icons, splash, tab icons

**Path aliases** (`tsconfig.json`):
- `@/*` → `./src/*`
- `@/assets/*` → `./assets/*`

**Key settings** (`app.json`):
- `experiments.typedRoutes: true` — use typed `href` props everywhere with expo-router
- `experiments.reactCompiler: true` — React Compiler (auto-memoization) is active; do not add manual `useMemo`/`useCallback` unless profiling shows a need
- Deep link scheme: `jrkglearningapp://`

**Pre-installed libraries** (not yet used but ready to import):
- `react-native-reanimated` + `react-native-worklets` — animations
- `react-native-gesture-handler` — gestures
- `expo-glass-effect` — blur/glass UI
- `expo-symbols` — SF Symbols icons
- `@expo/ui` — Expo native UI components
- `expo-image` — optimized image rendering

No state management, no HTTP client, and no backend integration exist yet.
