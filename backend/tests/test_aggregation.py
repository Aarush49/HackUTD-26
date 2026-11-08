from decimal import Decimal

import httpx

from app.integrations.canopy_demo import ACCOUNT_NICKNAME, RECORD_PREFIX
from conftest import days_ago, movement


def test_canopy_reads_demo_inputs_separately_from_balances_and_history(api, sandbox):
    sandbox.responses["/customers/customer/accounts"].append({
        "_id": "demo", "type": "Savings", "nickname": ACCOUNT_NICKNAME,
        "customer_id": "customer", "balance": 0,
    })
    sandbox.responses["/accounts/demo/deposits"] = [
        movement("settings", 1, 0, RECORD_PREFIX + 'cashFlow:{"priorMonthlyGrowth":225}'),
        movement("ordinary", 1, 100, "ACME Payroll"),
    ]
    result = api.get("/api/canopy")
    assert result.status_code == 200, result.text
    data = result.json()
    assert data["inputs"] == {"cashFlow": {"priorMonthlyGrowth": 225}}
    assert {account["id"] for account in data["accounts"]} == {"checking", "savings"}
    assert Decimal(data["liquidReserves"]) == 3500
    assert Decimal(data["dailyChanges"][days_ago(2)]) == 465
    assert days_ago(1) not in data["dailyChanges"]
    assert days_ago(12) not in data["dailyChanges"]


def test_balances_are_live_and_reconcile(api, sandbox):
    sandbox.responses["/accounts/checking"] = {**sandbox.responses["/accounts/checking"], "balance": 1111}
    response = api.get("/api/dashboard/customer")
    assert response.status_code == 200, response.text
    data = response.json()
    assert {account["id"] for account in data["accounts"]} == {"checking", "savings"}
    assert Decimal(data["total_assets"]) == Decimal(data["known_account_net_worth"]) == 3511
    assert Decimal(data["total_known_liabilities"]) == 0
    assert data["data_completeness"]["source"] == "nessie"
    assert "/accounts/checking/loans" in sandbox.requests


def test_empty_source_stays_empty(api, sandbox):
    sandbox.responses["/customers/customer/accounts"] = []
    result = api.get("/api/dashboard/customer").json()
    assert result["accounts"] == []
    assert result["transactions"] == []
    assert result["total_assets"] is None
    assert result["monthly_income"] is None


def test_loan_amount_is_not_outstanding_principal(api, sandbox):
    sandbox.responses["/accounts/checking/loans"] = [
        {"_id": "loan", "type": "home", "status": "approved", "amount": 8500, "monthly_payment": 250}
    ]
    result = api.get("/api/dashboard/customer").json()
    assert result["total_known_liabilities"] is None
    assert result["known_account_net_worth"] is None
    assert Decimal(result["monthly_debt_payments"]) == 250
    assert Decimal(result["debts"][0]["reported_loan_amount"]) == 8500
    assert not result["data_completeness"]["all_reported_debt_balances_known"]


def test_required_failures_and_supplemental_route_gaps(api, sandbox):
    sandbox.responses.pop("/accounts/savings/transfers")
    result = api.get("/api/financial-profile/customer")
    assert result.status_code == 200, result.text
    assert any("transfer unavailable" in gap for gap in result.json()["data_gaps"])
    sandbox.responses["/accounts/checking/deposits"] = httpx.Response(200, json={"unexpected": []})
    result = api.get("/api/financial-profile/customer")
    assert result.status_code == 502
    assert result.json()["detail"]["code"] == "nessie_invalid_response"
