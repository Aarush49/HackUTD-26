# Canopy Finance — Expo

Mobile-first personal finance demo built with Expo, React Native, TypeScript, and Expo Router.

## Run

1. Install dependencies: `npm install`
2. Start Metro: `npx expo start`
3. Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS.

Start FastAPI from `backend` with `python -m uvicorn app.main:app --reload`. Create `frontend/.env.local` with:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

For web on the same computer, run `npm run web`. For a physical phone on the same trusted Wi-Fi network, use your computer's LAN address in the Expo configuration and add `--host 0.0.0.0` to the FastAPI command. Keep the Nessie API key in the backend environment.

Canopy uses an accessible backend default or lets the user choose a customer. `EXPO_PUBLIC_NESSIE_CUSTOMER_ID` is an optional build-time override. Restart Expo if you change it.

The app uses only Expo Go-compatible libraries; no custom native build or Skia is required.

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
- `lib/api.ts` — FastAPI client and response types
- `lib/store.ts` — dashboard loading and forecast state
- `lib/auth/` — replaceable auth service and Zustand auth store
- `lib/theme.ts` — shared colors, spacing, and radii

The finance screens read the selected Nessie sandbox customer through FastAPI. Unavailable values reflect missing upstream data or projection inputs. The shock presets and simulator sliders are hypothetical inputs.
