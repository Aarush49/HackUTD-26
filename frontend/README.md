# Canopy Finance — Expo

Mobile-first personal finance demo built with Expo, React Native, TypeScript, and Expo Router.

## Run

1. Install dependencies: `npm install`
2. Start Metro: `npx expo start`
3. Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS.

To connect the merged FastAPI backend, create `frontend/.env` with:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8000
EXPO_PUBLIC_NESSIE_CUSTOMER_ID=your-sandbox-customer-id
```

Use `http://127.0.0.1:8000` when running the web client on the same computer. A physical phone must use the computer's LAN address.

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
- The five-stage Garden is rendered with `react-native-svg` and springs through shock and recovery states.
- Added login, sign-up, recovery stub, first-goal onboarding, profile, and logout flows.
- Added React Hook Form + Zod validation, secure password controls, loading states, and failure shake feedback.

## Architecture

- `app/` — Expo Router routes and route guards
- `components/` — reusable native UI, screens, charts, navigation, and Garden
- `lib/mock/` — unchanged typed finance mock engine
- `lib/store.ts` — preserved finance Zustand store shape
- `lib/auth/` — replaceable auth service and Zustand auth store
- `lib/theme.ts` — shared colors, spacing, and radii

All finance values still originate from `lib/mock`, and every primary screen identifies the content as synthetic demo data.
