from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_docs_and_graceful_missing_credentials():
    with TestClient(create_app(Settings(mongo_uri="mongomock://localhost"))) as client:
        assert client.get("/health").json() == {"status": "ok"}
        assert client.get("/docs").status_code == 200
        assert not client.get("/api/nessie/status").json()["configured"]
        response = client.get("/api/dashboard/missing")
        assert response.status_code == 503
        assert response.json()["detail"]["code"] == "nessie_not_configured"
        assert client.post("/api/headlines/classify", json={"headline": "Gas prices jump 5%"}).status_code == 200


def test_live_transport_is_read_only_and_local_persistence_works(api, sandbox):
    transfer = api.post("/api/transfers/simulate", json={
        "from_account_id": "savings", "to_account_id": "checking", "amount": 10,
    })
    assert transfer.status_code == 200, transfer.text
    assert transfer.json()["resulting_balances"] == {"checking": "1110", "savings": "2390"}
    assert api.get("/api/accounts/customer").json()[1]["balance"] == "2400"
    saved = api.post("/api/scenarios/save", json={"name": "Fuel shock", "headline": "Gas prices jump 10%"})
    assert saved.status_code == 201, saved.text
    scenario = api.get(f"/api/scenarios/{saved.json()['id']}").json()
    assert scenario == saved.json()
    assert scenario["parameters"]["customer_id"] == "customer"
    assert "test-key" not in str(scenario)
    assert api.get("/api/scenarios/unknown").status_code == 404
    assert api.get("/api/nessie/status").json()["reachable"]
    assert sandbox.requests


def test_request_validation(api):
    assert api.post("/api/risk/predict", json={"shock": {"income_reduction": "1.1"}}).status_code == 422
    assert api.post("/api/transfers/simulate", json={
        "from_account_id": "savings", "to_account_id": "checking", "amount": -10,
    }).status_code == 422
    assert api.post("/api/simulate", json={
        "assumptions": {"account_rates": {"unknown": {"apy": ".05"}}},
    }).status_code == 422
