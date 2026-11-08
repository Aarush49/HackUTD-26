# Canopy Finance — Expo

Mobile-first personal finance demo built with Expo, React Native, TypeScript, and Expo Router.

## Run

1. Install dependencies: `npm install`
2. Start Metro: `npx expo start`
3. Scan the QR code with Expo Go, or press `a` for Android / `i` for iOS.

Start FastAPI from `backend` with `python -m uvicorn app.main:app --reload`. Create `frontend/.env.local` with:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
EXPO_PUBLIC_NESSIE_CUSTOMER_ID=your-sandbox-customer-id
```

For web on the same computer, run `npm run web`. For a physical phone on the same trusted Wi-Fi network, use your computer's LAN address in the Expo configuration and add `--host 0.0.0.0` to the FastAPI command. Keep the Nessie API key in the backend environment. Reload Expo after changing the customer ID.

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

## Goal trees and goal news

Goals → **Create a new goal** saves a name, target amount/date, monthly plan, starting savings/source, and optional news context through FastAPI. Tap a goal or an ambient sapling to see its current tree against the full-grown target, then scroll to roots showing the recorded sources. Add contributions to manually funded goals; linked goals use their bank balance. Existing fonts, colors, cards, background, navigation, and stress/savings tools are reused.

Predict opens **News**, alongside **Break** and **Simulate**. Each goal can request a Google-grounded Gemini check. Relevant changes show a review alert, possible effects, and citations. News checks require `GEMINI_API_KEY` in the backend environment. Without it, the screen explains that live news is not configured. There is no synthetic-news fallback in application code. Google Search suggestions render in a sandboxed frame on web and open in the browser on native.

Run `npm run typecheck` for TypeScript validation. Backend tests cover goal persistence, root accounting, contribution retries, customer scoping, provider errors, news caching, and the Gemini payload. Live provider calls require your own configured credentials; mock tests do not incur provider charges.
