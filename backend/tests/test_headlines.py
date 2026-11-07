from decimal import Decimal

import pytest

from app.services.headline_classifier import classify


@pytest.mark.parametrize(("text", "kind", "direction", "magnitude"), [
    ("Federal Reserve cuts rates by 50 basis points", "fed_rate", "decrease", ".005"),
    ("Mortgage rates rise from 5% to 6%", "mortgage_rates", "increase", ".01"),
    ("Gas prices jump 10%", "gas_prices", "increase", ".1"),
    ("S&P 500 falls 2%", "market", "decrease", ".02"),
    ("Layoffs hit local factories", "unemployment", "increase", None),
    ("Inflation rises to 3%", "inflation", "increase", None),
])
def test_classifier(text, kind, direction, magnitude):
    event = classify(text)
    assert event.type == kind
    assert event.direction == direction
    assert event.magnitude == (None if magnitude is None else Decimal(magnitude))


def test_rate_change_uses_nessie_balance_and_ignores_fixed_debt(api, sandbox, assumptions):
    sandbox.responses["/accounts/checking/loans"] = [
        {"_id": "loan", "type": "home", "status": "approved", "amount": 8500, "monthly_payment": 250}
    ]
    assumptions["debt_terms"] = {"loan": {"outstanding_principal": "2000", "apr": ".06", "variable": False}}
    assumptions["account_rates"]["savings"] = {"apy": ".04", "variable": True}
    response = api.post("/api/headlines/analyze", json={
        "headline": "Federal Reserve cuts rates by 50 basis points", "assumptions": assumptions, "horizon_months": 2,
        "exposure": {"rate_pass_through": ".5", "rate_pass_through_range": [".25", ".75"]},
    })
    assert response.status_code == 200, response.text
    result = response.json()
    assert [row["account_id"] for row in result["affected_accounts"]] == ["savings"]
    assert Decimal(result["affected_accounts"][0]["opening_balance"]) == 2400
    assert result["affected_accounts"][0]["opening_balance_source"] == "nessie"
    assert Decimal(result["affected_accounts"][0]["first_month_interest_delta"]) < 0
    assert result["baseline_projection"]["interest_paid"] == result["scenario_projection"]["interest_paid"]
    assert Decimal(result["scenario_projection"]["interest_earned"]) < Decimal(result["baseline_projection"]["interest_earned"])
    interval = result["uncertainty_range"]["interest_earned"]
    assert Decimal(interval["low"]) < Decimal(interval["high"])


def test_missing_rate_pass_through_is_reported(api, assumptions):
    response = api.post("/api/headlines/analyze", json={
        "headline": "Federal Reserve cuts rates by 50 basis points", "assumptions": assumptions,
    })
    assert response.status_code == 200, response.text
    assert response.json()["affected_accounts"] == []
    assert any("rate_pass_through" in item for item in response.json()["scenario_projection"]["missing_requirements"])


def test_gas_headline_uses_only_identified_fuel_spending(api, assumptions):
    response = api.post("/api/headlines/analyze", json={
        "headline": "Gas prices jump 10%", "assumptions": assumptions, "horizon_months": 1,
        "exposure": {"spending_sensitivity": ".5"},
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["headline_exposure_status"] == "modeled"
    assert data["affected_accounts"][0]["account_id"] == "checking"
    effect = next(row for row in data["financial_impacts"] if row["metric"] == "monthly_spending_exposure")
    assert Decimal(effect["change"]) == Decimal("4.26")
