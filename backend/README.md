# Financial Health Navigator

Financial Health Navigator is a FastAPI backend for exploring how an economic headline or financial decision could affect a Nessie sandbox customer. Every bank balance, transaction, bill and loan record used by the API comes from a read-only Nessie request. SQLite stores user-created goals and saved scenario parameters.

## Install and run

Use Python 3.11 or newer. From the repository root in PowerShell:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Sign in to [Nessie](https://prod.nessieisreal.com/) and copy your sandbox key into `NESSIE_API_KEY` in `.env`. Use the HTTPS API origin from the example or set the HTTPS origin supplied by your event. Leave `NESSIE_CUSTOMER_ID` blank while discovering customers. Keep the database URL or point it at another SQLite file.

```powershell
.\.venv\Scripts\python -m uvicorn app.main:app --reload
```

Open [Swagger UI](http://127.0.0.1:8000/docs). The local service uses a shared sandbox key and is designed for a trusted local environment.

## Choose a customer and inspect the data

In a second PowerShell terminal:

```powershell
$api = 'http://127.0.0.1:8000'
Invoke-RestMethod "$api/health"
Invoke-RestMethod "$api/api/nessie/status"
Invoke-RestMethod "$api/api/customers"
$customer = Read-Host 'Paste the customer ID'
Invoke-RestMethod "$api/api/accounts/$customer"
Invoke-RestMethod "$api/api/transactions/$customer"
Invoke-RestMethod "$api/api/financial-profile/$customer"
Invoke-RestMethod "$api/api/dashboard/$customer"
```

Choose an ID returned by your key. A customer with posted purchases and identifiable payroll deposits gives better cash-flow estimates. A customer with a positive savings balance works for the interest-rate demo. Set `NESSIE_CUSTOMER_ID` in `.env` and restart Uvicorn if you want POST requests to use that customer by default.

## Run the live headline demo

From `backend`, with Uvicorn running:

```powershell
.\.venv\Scripts\python demo_headline.py --customer $customer --savings-apy 0.04 --pass-through 0.5
```

The demo fetches the live profile, picks an actual funded savings account, and submits **“Federal Reserve cuts rates by 50 basis points.”** The APY and pass-through shown are illustrative inputs you explicitly supply. The response includes the Nessie account ID, its opening balance, the modeled first-month interest change, provenance and missing inputs. The isolated interest change can be calculated even when transaction history is too sparse for a complete cash-flow forecast.

If the customer has recognizable gasoline purchases, you can use a price-shock demonstration:

```powershell
.\.venv\Scripts\python demo_headline.py --customer $customer --gas-sensitivity 0.8
```

This uses observed gasoline spending to model a hypothetical 10% increase. For either demo, a nonzero result depends on the selected customer's Nessie data and the supplied assumptions. The script reports missing data or a zero modeled impact explicitly.

## API reference

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Check the FastAPI process |
| GET | `/api/nessie/status` | Check configuration and make an authenticated Nessie read when configured |
| GET | `/api/customers`, `/api/customers/{customer_id}` | Discover sandbox IDs or read a customer summary |
| GET | `/api/accounts/{customer_id}` | Retrieve the customer's account balances |
| GET | `/api/transactions/{customer_id}` | Inspect normalized transaction history |
| GET | `/api/financial-profile/{customer_id}` | Inspect the full normalized profile and estimates |
| GET | `/api/dashboard/{customer_id}` | View account totals, spending, obligations, health indicators and goals |
| GET | `/api/goals/{customer_id}` | Read saved goals |
| POST | `/api/goals` | Create a goal |
| GET | `/api/goals/{goal_id}/roots?customer_id=…` | Inspect recorded contribution sources or the live linked balance |
| POST | `/api/goals/{goal_id}/contributions` | Record a contribution to a manually funded goal |
| POST | `/api/goals/contribution-id` | Get an idempotency key for a contribution retry |
| POST | `/api/goals/{goal_id}/news` | Check Google-grounded Gemini news for a saved goal |
| PATCH | `/api/goals/{goal_id}` | Update a goal |
| POST | `/api/goals/project` | Compare goal completion with a baseline |
| POST | `/api/headlines/classify` | Classify an event without credentials |
| POST | `/api/headlines/analyze` | Model headline effects for a customer |
| POST | `/api/risk/predict` | Calculate a hypothetical liquidity shortfall |
| POST | `/api/simulate` | Compare one decision or a list of strategies with the same baseline |
| GET | `/api/products` | List illustrative product categories |
| POST | `/api/products/recommend` | Compare taking action, doing nothing and waiting |
| POST | `/api/scenarios/compare` | Combine a headline, shock and financial decision |
| POST | `/api/scenarios/save` | Save scenario inputs for replay |
| GET | `/api/scenarios/{scenario_id}` | Retrieve saved scenario inputs |
| POST | `/api/transfers/simulate` | Preview a transfer between owned liquid accounts |

Use the Swagger request models to inspect each option. To try a three-month hypothetical job loss against the selected customer's data:

```powershell
$body = @{
  customer_id = $customer
  horizon_months = 12
  shock = @{ income_reduction = '1'; income_reduction_months = 3 }
} | ConvertTo-Json -Depth 6
Invoke-RestMethod "$api/api/risk/predict" -Method Post -ContentType 'application/json' -Body $body
```

Use fractional rates, such as `0.04` for 4%, and decimal money values. `rate_increase_bps` takes whole basis points. `assumptions.monthly_spending` means recurring non-debt spending including recurring bills. Pending one-time bills and scheduled debt payments are handled separately. Assumptions apply to the baseline and scenario. Account and debt IDs must come from the customer's profile. Savings rates are APYs and debt rates are APRs. Set `variable: true` only when you want to model a rate-sensitive account or debt. A supported rate headline also needs `exposure.rate_pass_through`, and an optional two-value `rate_pass_through_range` runs both sensitivity bounds.

Money and fractional rates are serialized as decimal strings to preserve precision. Convert those fields to numbers when plotting the monthly series. If a recurring debt bill cannot be reconciled with a known loan payment, `monthly_unmatched_debt_bill_payments` can specify the additional cash obligation after accounting for any overlap.

For goals, a linked account contributes its current balance unless you supply an explicit `initial_funded_amount` within that balance. Each account can fund one goal. Dedicated starting amounts with no linked account are tracked separately from account assets. Required spending can draw down funded goals. Optional debt payments and product transfers use unallocated funds.

For product comparisons, supply the terms of an illustrative CD, HYSA, balance-transfer card or rewards card. The catalog contains no quoted offers. A CD uses an explicit APY, fee and lockup term. A balance transfer uses an explicit promotional APR, duration, later APR, payment and fees. Rewards use purchase history, an explicit eligible fraction, fees and a reward rate. The rewards model requires `pay_statement_in_full: true` and credits the modeled reward monthly.

## Data contract and model boundaries

- The published spec defines query parameter `key` and the customer, account, deposit, withdrawal, bill, loan and merchant routes. The SDKs document the account-level purchase and transfer lists. The banking collections used here return arrays and have no documented pagination parameters. Missing supplemental routes surface as data gaps. Failures from required routes return structured HTTP errors. The service fetches a fresh snapshot and attaches its UTC retrieval timestamp. [OpenAPI spec](https://prod.nessieisreal.com/nessie-openapi-spec.yaml) · [Purchase SDK](https://github.com/nessieisreal/nessie-javascript-sdk/blob/master/lib/purchase.js) · [Transfer SDK](https://github.com/nessieisreal/nessie-golang-sdk/blob/master/lib/transfer/transfer.go)
- Income estimates use explicit evidence such as payroll descriptions and cadence. Spending uses a window of up to 180 observed days. Exact duplicate IDs are collapsed and mirrors with matching metadata are marked in the feed. Recurring bills replace matched historical payments in the forecast. Future bills do not appear in historical spending. Ambiguous categories are marked `unclassified`.
- Nessie loan `amount` is retained as a reported loan amount. Current principal and interest rates require explicit assumptions where unavailable. Dashboard net worth covers only valued Nessie accounts. Unsupported account types and incomplete history are visible in data gaps. No documented market holdings are available for the stock scenario.
- Projections are monthly scenarios. Interest uses effective monthly APY and nominal APR divided by 12. Months are numbered from the retrieval date, with month zero showing starting balances. Model status and missing requirements qualify the projected series. Liquidity shortfall estimates when accessible cash cannot cover modeled obligations. Scenario results only cover the requested horizon.
- SQLite saves the inputs for replay against a new snapshot. It does not retain a customer API key or a copy of their Nessie profile. Banking reads are authenticated and the transfer endpoint only calculates resulting balances.

## Tests

### Goal trees and relevant news

Set `GEMINI_API_KEY` in `backend/.env` to enable Predict → News. `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite` and can be changed to a search-grounding model available to your API project. Keep the key on the backend; never use an `EXPO_PUBLIC_` variable for it. Search grounding can incur Google API charges.

Only the saved goal's name, target date, and `news_context` are sent to Gemini. Account balances, contribution sources, Nessie keys, and customer IDs are excluded from the prompt. Requests must identify the goal's customer, matching the existing trusted-local sandbox API model. There is no production user authentication layer in this demo.

News checks are on demand. Reports include dated text, source references, source links, and Google's Search suggestions. Web embeds a script-disabled provider attribution page; native apps open that page in the browser. Reports are cached for ten minutes and capped at five new checks per customer per minute in this process. Attribution pages expire after one hour. This is not a background scheduler or push notification service. Model warnings appear in the app; they never alter the goal amount or date.

New `goal_contexts` and `goal_contributions` tables are created alongside existing tables at startup, without changing existing goal columns. Existing goals continue to load. Contributions use decimal money and request UUIDs to prevent duplicate funding on retry. Linked-account goals always read Nessie funding and reject manual contributions; sources such as payroll are not fabricated from balances. Manually funded goals show user-recorded sources, with an explicit adjustment root if an existing balance was edited outside the ledger.

The SQLAlchemy `Base` and database factory required by the existing routes are restored in `app/models/database.py`; the Mongo `Db` helper remains available. SQLAlchemy is now included in `requirements.txt`.

```powershell
.\.venv\Scripts\python -m pytest -q
```

Default tests use isolated HTTPX mocks and temporary SQLite databases. For the optional live test, configure `NESSIE_API_KEY` and `NESSIE_CUSTOMER_ID` and run:

```powershell
$env:RUN_LIVE_NESSIE = '1'
.\.venv\Scripts\python -m pytest -q tests/test_live_nessie.py
```
