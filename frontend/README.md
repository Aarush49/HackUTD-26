# Canopy Finance — Expo

Mobile-first personal finance demo built with Expo, React Native, TypeScript, and Expo Router.

## Run

1. Configure and run FastAPI with your Nessie key. See the [backend setup](../backend/README.md).
2. Set `EXPO_PUBLIC_NESSIE_CUSTOMER_ID` in `.env.local`. For Expo Go on a physical phone, set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN address and run FastAPI with `--host 0.0.0.0`.
3. Run `npm install` and `npx expo start`.
4. Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS.

For a new sandbox customer, run `python seed_canopy_demo.py --customer <customer-id>` from `backend`. The command stores missing demo inputs in a dedicated zero-balance Nessie account and verifies them by reading them back. Canopy reads available balances and posted activity from the customer's banking accounts. It uses the separate demo inputs for figures such as goal targets, rates, and forecast assumptions.

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
- `lib/finance/` — Nessie-backed API client and dashboard calculations
- `lib/store.ts` — dashboard, goal, period, and simulator state
- `lib/auth/` — replaceable auth service and Zustand auth store
- `lib/theme.ts` — shared colors, spacing, and radii
