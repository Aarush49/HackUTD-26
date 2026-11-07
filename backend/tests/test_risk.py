from decimal import Decimal


def test_risk_runway_uses_liquid_cash_and_due_bills(api, assumptions):
    result = api.post("/api/risk/predict", json={
        "horizon_months": 10, "assumptions": assumptions, "shock": {"income_reduction": 1}
    })
    assert result.status_code == 200, result.text
    risk = result.json()
    assert Decimal(risk["current_liquid_reserves"]) == 3500
    assert Decimal(risk["estimated_monthly_burn"]) == 600
    assert risk["first_shortfall_month"] == 7
    assert len(risk["monthly"]) == 11
    assert "bankruptcy" not in risk["interpretation"]
    assert risk["baseline_runway"]["first_shortfall_month"] is None


def test_positive_flow_does_not_get_shortfall_countdown(api, assumptions):
    result = api.post("/api/risk/predict", json={"assumptions": assumptions}).json()
    assert result["first_shortfall_month"] is None
    assert result["status"] == "no_shortfall_within_horizon"
