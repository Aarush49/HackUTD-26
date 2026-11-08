"""Run beside personal_news.py; no application imports, network, database or keys."""
from datetime import date
from personal_news import Preferences, NewsSettings, analyze_purchases, query_for

preferences = Preferences(goals=["Japan trip"], topics=["hotel prices"], destination="Japan").clean()
assert '"hotel prices"' in query_for(preferences)
records = [{"id": "1", "date": "2026-11-01", "category": "food", "posted": True,
            "transaction_type": "purchase", "direction": "outflow"}]
assert analyze_purchases(records + records, as_of=date(2026, 11, 7))[0]["purchase_count"] == 1
assert "example-secret" not in repr(NewsSettings(news_api_key="example-secret"))
print("Portable news smoke test passed; no network requests made.")
