from datetime import date
import importlib.util
from pathlib import Path
import sys

from app.features.personal_news import analyze_purchases


def test_core_imports_as_standalone_file_without_app_package():
    path = Path(__file__).resolve().parents[1] / 'app/features/personal_news.py'
    spec = importlib.util.spec_from_file_location('portable_news_smoke', path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
        prefs = module.Preferences(topics=['Japan travel'])
        assert module.query_for(prefs) == '"Japan travel"'
        assert 'private-key' not in repr(module.NewsSettings(news_api_key='private-key'))
    finally:
        sys.modules.pop(spec.name, None)


def test_normalized_records_deduplicate_and_reject_future_and_malformed_dates():
    record = {'id': 'a', 'date': '2026-11-01', 'category': 'food', 'posted': True,
              'transaction_type': 'purchase', 'direction': 'outflow'}
    result = analyze_purchases([record, record, {**record, 'id': 'b', 'date': 'bad'},
                               {**record, 'id': 'c', 'date': '2027-01-01'},
                               {**record, 'id': 'd', 'classification': 'refund'}], as_of=date(2026, 11, 7))
    assert result == [{'topic': 'Food prices', 'purchase_count': 1, 'latest_date': '2026-11-01'}]
