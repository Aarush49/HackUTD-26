# Canopy Finance

Canopy Finance is a mobile-first personal finance experience that turns banking data into an approachable view of financial health. The Expo app shows balances, goals, projections, headline impacts, and hypothetical shocks. A FastAPI service reads financial data from the Nessie sandbox, builds forecasts, and exposes the results to the app.

> This project uses synthetic sandbox data and hypothetical estimates. It is informational, not financial advice.

## Repository layout

```text
HackUTD-26/
├── frontend/              Expo / React Native application
│   ├── app/               expo-router routes
│   ├── components/        screens, charts, navigation, and Garden UI
│   └── lib/               API client, Zustand stores, auth, mocks, and theme
└── backend/               FastAPI application
    ├── app/api/           HTTP route handlers
    ├── app/integrations/  Nessie API client
    ├── app/services/      aggregation, forecasting, and scenario logic
    ├── app/models/        persisted goal and scenario models
    └── tests/             unit and API tests
```

## How the system works

```text
Expo screen
   │
   ├── mock AuthService ──> SecureStore (or localStorage on web)
   │
   └── Zustand finance store
           │
           └── frontend/lib/api.ts
                   │ HTTP /api/*
                   ▼
              FastAPI backend
                ├── Nessie sandbox (customers, accounts, bills, transactions, loans)
                ├── financial aggregation and projection services
                └── local database (goals and saved scenario inputs)
```

1. The root Expo layout loads Fraunces and Inter, restores the mock login session, and guards the auth, onboarding, and tab routes.
2. After sign-in, the finance Zustand store resolves the configured Nessie customer and requests the dashboard, risk forecast, products, and scenario results from FastAPI.
3. FastAPI retrieves a fresh Nessie snapshot, normalizes the records, calculates known net position, liquid reserves, spending, obligations, goals, and projections, then returns typed JSON.
4. The app converts decimal money strings to numbers for display and charting. Missing upstream data remains visible as unavailable or incomplete instead of being silently invented.
5. Headline, shock, and simulation tools are hypothetical. They compare a baseline projection with explicitly supplied assumptions; they do not move money or modify Nessie accounts.

## Prerequisites

- Node.js and npm
- Python 3.11 or newer
- Expo Go on a phone, or an Android/iOS simulator
- A Nessie sandbox API key

## 1. Start the backend

From the repository root in PowerShell:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
```

Create `backend/.env`:

```env
NESSIE_API_KEY=your-nessie-sandbox-key
NESSIE_BASE_URL=https://prod-api.nessieisreal.com
NESSIE_CUSTOMER_ID=
DATABASE_URL=sqlite:///./financial_navigator.db
```

`NESSIE_CUSTOMER_ID` may be left blank while discovering customers. Never put the Nessie API key in the Expo environment—the backend is the only layer that should hold it.

Start FastAPI:

```powershell
.\.venv\Scripts\python -m uvicorn app.main:app --reload
```

Useful local URLs:

- Health check: `http://127.0.0.1:8000/health`
- Swagger UI: `http://127.0.0.1:8000/docs`
- Customer list: `http://127.0.0.1:8000/api/customers`

Choose a customer returned by `/api/customers`. You can set that ID in both backend and frontend configuration, then restart the affected process.

## 2. Start the frontend

In a second terminal:

```powershell
Set-Location frontend
npm install
```

Create `frontend/.env.local`:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
EXPO_PUBLIC_NESSIE_CUSTOMER_ID=your-sandbox-customer-id
```

Start Expo:

```powershell
npx expo start
```

Scan the QR code with Expo Go, or press `a`, `i`, or `w` for Android, iOS, or web.

### Using a physical phone

`127.0.0.1` on a phone refers to the phone itself. Put the computer and phone on the same trusted Wi-Fi network, use the computer's LAN address in `frontend/.env.local`, and expose FastAPI on the LAN:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:8000
```

```powershell
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0
```

Reload Expo after changing an `EXPO_PUBLIC_*` variable. Do not expose this development service to an untrusted network.

## Frontend

The frontend uses Expo, React Native, TypeScript, expo-router, Zustand, React Native Reanimated, `react-native-svg`, NativeWind, Expo Blur, and Expo Linear Gradient. It runs in Expo Go and does not require Skia or a custom development client.

### Routes

- `(auth)/login`, `(auth)/signup`, `(auth)/forgot` — validated mock authentication UI
- `onboarding` — first-sign-up goal selection
- `(tabs)/index` — Today overview
- `(tabs)/picture` — net position, period charts, accounts, and health indicators
- `(tabs)/goals` — goal progress and saplings
- `(tabs)/predict` — shocks and longer-term simulations
- `impact` — estimated effects of an economic headline
- `profile` — user details and logout

The custom tab bar includes a raised **What if** action. It opens a draggable sheet for headline and shock workflows. The Garden layer derives sapling growth from financial goals and sits behind the tab content.

### Authentication

Authentication is frontend-only. `lib/auth/service.ts` defines a replaceable `AuthService`; its current mock implementation accepts valid-format credentials after a short delay. Native sessions are stored in Expo SecureStore, while web sessions use localStorage. Signing up triggers the one-step goal onboarding flow.

### State and data

- `lib/auth/store.ts` owns session and onboarding state.
- `lib/store.ts` owns loaded dashboard data, projections, selected periods, shocks, simulations, and sheets.
- `lib/api.ts` is the typed FastAPI client and centralizes number, money, and date formatting.
- `lib/mock/` contains deterministic demo series and reusable typed mock values.
- `lib/theme.ts` contains shared design tokens.

## Backend

The backend is organized as small API, integration, and service layers:

- API routes validate requests and return typed responses.
- `NessieClient` performs authenticated, read-only sandbox requests.
- Aggregation services normalize accounts, purchases, transfers, bills, loans, merchants, and income evidence.
- Projection services calculate monthly baseline and scenario paths.
- Risk services identify the first modeled liquidity shortfall.
- Goal, headline, product, and simulation services build the corresponding comparisons.
- The local database stores user-created goals and saved scenario inputs; it does not store the Nessie API key or a copy of the customer's banking profile.

Important endpoint groups include:

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Backend process health |
| `GET /api/nessie/status` | Nessie configuration and connectivity |
| `GET /api/customers` | Discover sandbox customers |
| `GET /api/dashboard/{customer_id}` | Aggregated data used by the main screens |
| `POST /api/risk/predict` | Baseline or shocked liquidity forecast |
| `POST /api/simulate` | Compare savings decisions over time |
| `POST /api/headlines/analyze` | Estimate a headline's effects |
| `/api/goals` | Create, update, list, and project goals |
| `/api/products` | Illustrative product comparisons |
| `/api/scenarios` | Compare or save scenario inputs |
| `POST /api/transfers/simulate` | Preview balances without moving money |

See [backend/README.md](backend/README.md) and Swagger UI for full request models and endpoint details.

## Verification and tests

Frontend type checking:

```powershell
Set-Location frontend
npm run typecheck
```

Backend tests:

```powershell
Set-Location backend
.\.venv\Scripts\python -m pytest -q
```

The default backend tests use mocked HTTP responses and isolated databases. The optional live Nessie test requires `NESSIE_API_KEY`, `NESSIE_CUSTOMER_ID`, and `RUN_LIVE_NESSIE=1`; see [backend/README.md](backend/README.md) before running it.

## Troubleshooting

- **The app says it cannot reach the API:** start FastAPI and verify `EXPO_PUBLIC_API_BASE_URL`. Use a LAN address for a physical phone.
- **More than one Nessie customer is available:** set `EXPO_PUBLIC_NESSIE_CUSTOMER_ID` to the customer you want to display.
- **A projection says inputs are missing:** the selected customer may not have enough transaction, income, debt, or rate data. The response's `missing_requirements` field explains what is absent.
- **Environment changes do not appear:** stop and restart Expo so public environment variables are rebundled.
- **Authentication accepts demo credentials:** this is intentional. Replace the `AuthService` implementation when connecting real identity infrastructure.

## Additional documentation

- [Frontend guide](frontend/README.md)
- [Backend guide and API reference](backend/README.md)
