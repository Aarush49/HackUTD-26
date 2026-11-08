import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import httpx
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.api.personal_news import purchase_suggestions, Preferences, query_for


def test_preferences_roundtrip_and_no_automatic_history_selection(api):
    assert api.get('/api/news/customer').json() == {'customer_id': 'customer'}
    assert api.get('/api/news/preferences/customer').json()['topics'] == []
    assert api.post('/api/news/feed', json={'customer_id': 'customer'}).status_code == 503
    response = api.post('/api/news/preferences', json={'customer_id': 'customer', 'goals': ['Japan trip'],
        'topics': ['hotel prices', 'hotel prices'], 'destination': 'Japan', 'timeframe': 'spring 2027'})
    assert response.status_code == 200, response.text
    assert response.json()['topics'] == ['hotel prices']
    assert api.get('/api/news/preferences/another').json()['goals'] == []
    assert api.get('/api/news/preferences/customer').json()['goals'] == ['Japan trip']
    assert api.get('/api/news/suggestions/customer').status_code == 200
    assert api.get('/api/news/preferences/customer').json()['topics'] == ['hotel prices']
    assert api.post('/api/news/preferences', json={'customer_id': 'customer', 'topics': ['x' * 81]}).status_code == 422
    assert api.post('/api/news/feed', json={'customer_id': 'customer'}).status_code == 503


def test_purchase_suggestions_filter_and_rank():
    now = datetime.now(timezone.utc)
    def tx(category, days=1, kind='purchase', posted=True, direction='outflow'):
        return SimpleNamespace(category=category, date=(now-timedelta(days=days)).date(), transaction_type=kind,
                               classification='purchase', direction=direction, posted=lambda _: posted)
    profile = SimpleNamespace(retrieved_at=now, transactions=[tx('food'), tx('food', 2), tx('transportation'),
        tx('entertainment', 70), tx('food', posted=False), tx('insurance'), tx('other', kind='deposit'), tx('other', direction='internal')])
    suggestions = purchase_suggestions(profile)
    assert [s['topic'] for s in suggestions] == ['Food prices', 'Fuel and transportation']
    assert suggestions[0]['purchase_count'] == 2
    assert 'OR' not in query_for(Preferences(topics=['Japan" OR "password'])).replace('Japan OR password', '')


def test_news_and_gemini_contract_privacy_cache_and_fallback(sandbox):
    calls = []
    def transport(request):
        calls.append(request)
        if request.url.host == 'newsapi.org':
            assert request.headers['X-Api-Key'] == 'news-test'
            assert request.url.params['q'] == '"Japan trip" OR "Buy a house" OR "New car" OR "hotel prices" OR "Japan"'
            return httpx.Response(200, json={'status': 'ok', 'articles': [
                {'title': 'Hotel costs', 'description': 'Publisher description', 'content': 'A short snippet', 'url': 'https://example.com/a',
                 'source': {'name': 'Example'}, 'publishedAt': '2026-11-01T10:00:00Z'},
                {'title': 'Unsafe', 'url': 'javascript:alert(1)'},
                {'title': 'Duplicate', 'url': 'https://example.com/a'}]})
        assert request.url.host == 'generativelanguage.googleapis.com'
        body = json.loads(request.content)
        assert 'tools' not in body  # Plain generation, no paid Google grounding.
        assert body['generationConfig']['responseSchema']['required'] == ['articles']
        assert 'test-key' not in request.content.decode() and 'account_id' not in request.content.decode()
        assert 'hotel prices' in request.content.decode()
        return httpx.Response(200, json={'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps({'articles': [
            {'id': 0, 'summary': 'Hotel costs are changing.', 'why_it_matters': 'May affect your Japan trip.', 'suggested_action': 'Check current hotel quotes.'}]})}]}}]})
    settings = Settings(nessie_api_key='test-key', nessie_customer_id='customer', mongo_uri='memory://', news_api_key='news-test', gemini_api_key='gemini-test')
    with TestClient(create_app(settings, transport=httpx.MockTransport(sandbox), news_transport=httpx.MockTransport(transport))) as client:
        client.post('/api/news/preferences', json={'customer_id': 'customer', 'goals': ['Old goal'], 'topics': ['hotel prices'], 'destination': 'Japan'})
        response = client.post('/api/news/feed', json={'customer_id': 'customer'})
        assert response.status_code == 200, response.text
        result = response.json()
        assert result['ai_formatted'] is True and len(result['articles']) == 1
        assert result['articles'][0]['summary'] == 'Hotel costs are changing.'
        assert '24 hours' in result['notice']
        assert client.post('/api/news/feed', json={'customer_id': 'customer'}).json()['cached']
        assert len(calls) == 2


def test_gemini_failure_preserves_publisher_snippets(sandbox):
    def provider(request):
        if request.url.host == 'newsapi.org':
            return httpx.Response(200, json={'status': 'ok', 'articles': [{'title': 'News', 'description': 'Original snippet', 'url': 'https://example.com'}]})
        return httpx.Response(429)
    settings = Settings(nessie_api_key='test-key', nessie_customer_id='customer', mongo_uri='memory://', news_api_key='news', gemini_api_key='gemini')
    with TestClient(create_app(settings, transport=httpx.MockTransport(sandbox), news_transport=httpx.MockTransport(provider))) as client:
        client.post('/api/news/preferences', json={'customer_id': 'customer', 'topics': ['travel']})
        result = client.post('/api/news/feed', json={'customer_id': 'customer'}).json()
        assert result['ai_formatted'] is False
        assert result['articles'][0]['summary'] == 'Original snippet'
        assert 'unavailable' in result['notice']
