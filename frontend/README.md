# Canopy Finance — Expo

Mobile-first personal finance demo built with Expo, React Native, TypeScript, and Expo Router.

## Run

1. Install dependencies: `npm install`
2. Start Metro: `npx expo start`
3. Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS.

The app uses typed synthetic data from `lib/mock` and only Expo Go-compatible libraries; no server, custom native build, or Skia is required.

## Demo authentication

Login and sign-up use a typed mock `AuthService`. Any valid email and password of at least eight characters are accepted after a short simulated delay. The mock session is stored with `expo-secure-store`.

## What changed

- Next.js App Router became `expo-router`, with `(auth)` and `(tabs)` route groups.
- Tailwind web styles became NativeWind plus shared native theme tokens.
- Framer Motion became React Native Reanimated with reduced-motion handling.
- Recharts became lightweight `react-native-svg` history, projection, and comparison charts.
- Web blur and gradients became `expo-blur` and `expo-linear-gradient`.
- Fraunces and Inter are loaded with Expo Font while the splash screen is held.
- The bottom navigation is a safe native custom tab bar with haptics and a raised What If action.
- The five-stage Garden uses `react-native-svg` to show saved goal progress.
- Added login, sign-up, recovery stub, first-goal onboarding, profile, and logout flows.
- Added React Hook Form + Zod validation, secure password controls, loading states, and failure shake feedback.

## Architecture

- `app/` — Expo Router routes and route guards
- `components/` — reusable native UI, screens, charts, navigation, and Garden
- `lib/mock/` — typed synthetic finance data
- `lib/store.ts` — dashboard, goal, period, and simulator state
- `lib/auth/` — replaceable auth service and Zustand auth store
- `lib/theme.ts` — shared colors, spacing, and radii

All finance figures are synthetic estimates. The mock layer is intentionally replaceable without changing screen components.
