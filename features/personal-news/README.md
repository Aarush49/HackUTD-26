# Portable personal news feature

This package separates reusable functions from this repository's Expo, Nessie, MongoDB, authentication and navigation code. Copy the portable files into another project; adapt the small host-specific boundaries. It is not a universal binary for arbitrary framework versions.

## Files to copy

| File in archive | Purpose |
| --- | --- |
| `python/personal_news.py` | Questionnaire data model, local purchase analysis, query construction, News API retrieval and Gemini formatting |
| `react-native/PersonalNews.tsx` | Questionnaire and news feed with injected API, UI and date formatting |
| `reference/backend_adapter.py` | Current FastAPI/Nessie/Mongo adapter, for reference when wiring the destination project |
| `reference/frontend_adapter.tsx` | Current app adapter, showing runtime injection |
| `requirements.txt` | Standalone Python core dependencies |

Requires Python 3.11+, Pydantic 2, HTTPX 0.27–0.28. React Native UI requires React hooks, React Native (or React Native Web), and TypeScript. The UI imports no Expo router, project store, API aliases or database code. Supply the host's existing cards/buttons to retain its style. The existing Canopy palette is defined in the feature file and can be adjusted in one place.

After extracting, install `requirements.txt` in the destination Python environment and run `python python/smoke_test.py`. This standalone check needs no credentials, database or network. The `reference/` files and repository tests are examples for this checkout; adapt their imports rather than overwriting another app's files.

## Backend functions

```python
from personal_news import Preferences, NewsSettings, PersonalNewsService, analyze_purchases

preferences = Preferences(
    goals=["Travel to Japan"], topics=["hotel prices"],
    destination="Japan", timeframe="April 2027",
).clean()

suggestions = analyze_purchases([
    {"id": "purchase-1", "date": "2026-11-01", "category": "food",
     "posted": True, "transaction_type": "purchase", "direction": "outflow"},
])
```

The analysis function makes no network calls. It ignores malformed/future dates, records older than 60 days, duplicates, refunds, internal movements, non-purchases, unposted records and categories outside the broad allowlist. Results contain only suggested topic, count and most recent date. Show these as unchecked choices. Persist only choices the user approves. Adapting an older purchase model requires mapping it to the documented normalized dictionary; the core does not need the original bank SDK.

Create one `PersonalNewsService(NewsSettings(...))` per backend process and reuse it. Call `await service.feed(customer_id, preferences)` and `await service.close()` at shutdown. Configuration is injected; the module never reads a particular filesystem path. The existing Settings object also works because it supplies the same three attributes.

```python
import os
settings = NewsSettings(
    news_api_key=os.environ["NEWS_API_KEY"],
    gemini_api_key=os.environ["GEMINI_API_KEY"],
    gemini_model=os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite"),
)
service = PersonalNewsService(settings)
```

Keep keys server-side and out of source control. Translate `NewsError.status_code` and `.detail` to the host's HTTP response. Wire authentication/ownership checks in the host adapter before accessing a customer's preferences or transactions. The current repository retains its trusted-local sandbox identity model; it is not a production authorization service.

## Stable HTTP contract

- `GET /api/news/preferences/{customer_id}` → `{goals: string[], topics: string[], destination: string, timeframe: string}`.
- `POST /api/news/preferences` → same fields plus `customer_id`; returns normalized preferences. Saving is a replacement, so clearing a field removes it.
- `GET /api/news/suggestions/{customer_id}` → `{suggestions: [{topic, purchase_count, latest_date}], window_days: 60}`. This request never saves inferred interests.
- `POST /api/news/feed` with `{customer_id}` → `{articles, ai_formatted, notice, checked_at, cached}`. Articles include stable source URL, publisher, date, headline, summary, possible relevance, and a suggested next step.

Persist preferences in the host's database, keyed by the authenticated customer. Do not copy database records or credentials between computers. The current Mongo adapter stores preferences in `news_preferences` and the normalized purchase adapter uses Nessie. Other projects may use SQL, files or another service without changing the portable core.

## Frontend integration

Wrap `NewsSetup` and `PersonalNews` in `NewsProvider`. Its runtime takes:

- `api<T>(path, body?, signal?)`: the host request client, automatically using GET without a body and POST with a body.
- `displayDate(value)`: a safe date formatter.
- `goalNames`: existing saved goal names to prefill the questionnaire, without changing goal balances or targets.
- `ui`: host `Card`, `Badge`, `Eyebrow` and `Button3D` components. See the reference adapter for prop shapes.

Render `<NewsSetup customerId={id} onSaved={...}/>` during onboarding or from settings. Render `<PersonalNews key={id} customerId={id}/>` in the existing news/prediction screen. Remount on customer changes to clear another customer's local form/feed state. Navigation and authentication remain owned by the host application.

## Provider behavior and costs

News API supplies up to eight recent articles per fetch; Gemini uses ordinary JSON text generation, with an explicit response schema, to summarize supplied snippets. No Google Search grounding is used. The model never supplies source URLs or changes a goal. If AI formatting is unavailable, the UI labels publisher snippets rather than inventing summaries. Queries and results are cached for one hour, with a one-minute cooldown for changed queries; limits are process-local. Use shared storage if deploying multiple workers.

News API Developer is for development/testing, has a 24-hour article delay and a 100-request daily limit. Snippets are not full articles. Do not label these as breaking-news alerts. See https://newsapi.org/pricing and https://newsapi.org/docs/endpoints/everything. Gemini generation remains subject to the project's quota and billing configuration.

## Validation

The repository tests import the Python file independently, validate purchase filtering and deduplication, exercise preference persistence, verify external request privacy, and test Gemini formatting/fallback. Run `python -m pytest` from `backend` and `npm run typecheck` from `frontend` after integration. Native-device execution must be checked in the destination app; the current UI is verified through Expo web.
