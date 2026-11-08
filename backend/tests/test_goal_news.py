import json
from datetime import date

import httpx
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def grounded():
    return {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "STATUS: WATCH\nTravel costs may change. Check hotel quotes."}]},
        "groundingMetadata": {"webSearchQueries": ["Japan travel news"],
            "groundingChunks": [{"web": {"title": "Travel reporting", "uri": "https://example.com/news"}},
                                {"web": {"uri": "javascript:alert(1)"}}],
            "groundingSupports": [{"segment": {"text": "Travel costs may change."}, "groundingChunkIndices": [0, 1]}],
            "searchEntryPoint": {"renderedContent": '<div>Google Search suggestions</div>'}}}]}


def test_goal_news_contract_cache_privacy_and_scoping(sandbox, tmp_path):
    requests = []
    def provider(request):
        requests.append(request)
        assert request.headers["x-goog-api-key"] == "gemini-test-key"
        payload = json.loads(request.content)
        assert payload["tools"] == [{"google_search": {}}]
        assert "4200" not in request.content.decode()
        assert "PRIVATE_SOURCE" not in request.content.decode()
        if len(requests) == 1:
            assert "Japan hotel prices" in request.content.decode()
        return httpx.Response(200, json=grounded())
    settings = Settings(nessie_api_key="test-key", nessie_customer_id="customer", gemini_api_key="gemini-test-key",
                        database_url=f"sqlite:///{tmp_path / 'news.db'}")
    with TestClient(create_app(settings, transport=httpx.MockTransport(sandbox), news_transport=httpx.MockTransport(provider))) as api:
        goal = api.post("/api/goals", json={"name": "Japan", "target_amount": 6500, "monthly_contribution": 0,
                       "initial_funded_amount": 4200, "opening_source": "PRIVATE_SOURCE", "news_context": "Japan hotel prices"}).json()
        path = f'/api/goals/{goal["id"]}/news'
        assert api.post(path, json={"customer_id": "another"}).status_code == 404
        response = api.post(path, json={"customer_id": "customer"})
        assert response.status_code == 200, response.text
        report = response.json()
        assert report["status"] == "watch"
        assert len(report["sources"]) == 1
        assert "[1]" in report["text"] and "[2]" not in report["text"]
        assert "gemini-test-key" not in response.text
        assert "search_suggestions" not in report
        assert api.post(path, json={"customer_id": "customer"}).json()["cached"] is True
        assert len(requests) == 1
        suggestions = api.get("/api" + report["suggestions_path"])
        assert suggestions.status_code == 200
        assert "Google Search suggestions" in suggestions.text
        assert "default-src 'none'" in suggestions.headers["content-security-policy"]
        assert api.get("/api" + report["suggestions_path"].replace("customer_id=customer", "customer_id=another")).status_code == 404
        for index in range(5):
            second = api.post("/api/goals", json={"name": f"Home {index}", "target_amount": 500, "monthly_contribution": 0}).json()
            assert api.post(f'/api/goals/{second["id"]}/news', json={"customer_id": "customer"}).status_code == (200 if index < 4 else 429)
        # Reports never edit the plan.
        assert api.get("/api/goals/customer").json()[0]["target_amount"] in {"6500", "500"}


def test_missing_key_is_clear_and_never_uses_fake_news(api):
    goal = api.post("/api/goals", json={"name": "Japan", "target_amount": 6500, "monthly_contribution": 0}).json()
    response = api.post(f'/api/goals/{goal["id"]}/news', json={"customer_id": "customer"})
    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]


def test_provider_errors_and_ungrounded_output(sandbox, tmp_path):
    for index, upstream in enumerate([httpx.Response(429), httpx.Response(500), httpx.Response(200, json={"candidates": []}),
                                     httpx.Response(200, json={"candidates": [{"finishReason": "MAX_TOKENS"}]})]):
        settings = Settings(nessie_api_key="test-key", nessie_customer_id="customer", gemini_api_key="test",
                            database_url=f"sqlite:///{tmp_path / f'error-{index}.db'}")
        with TestClient(create_app(settings, transport=httpx.MockTransport(sandbox), news_transport=httpx.MockTransport(lambda _: upstream))) as api:
            goal = api.post("/api/goals", json={"name": "Japan", "target_amount": 6500, "monthly_contribution": 0}).json()
            result = api.post(f'/api/goals/{goal["id"]}/news', json={"customer_id": "customer"})
            assert result.status_code == (429 if index == 0 else 502)
