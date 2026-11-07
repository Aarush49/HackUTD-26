from decimal import Decimal


def test_required_inputs_reported_without_inventing_debt_terms(api, sandbox, assumptions):
    sandbox.responses["/accounts/checking/loans"] = [
        {"_id": "loan", "type": "home", "status": "approved", "amount": 8500, "monthly_payment": 250}
    ]
    result = api.post("/api/simulate", json={"assumptions": assumptions, "horizon_months": 2})
    assert result.status_code == 200, result.text
    run = result.json()["baseline_projection"]
    assert run["status"] == "incomplete"
    assert any("principal" in field for field in run["missing_requirements"])
    assert any("APR" in field for field in run["missing_requirements"])
    assert Decimal(run["monthly"][1]["debt_payment"]) == 250
    assert run["monthly"][1]["debt_balance"] is None


def test_extra_debt_payment_reduces_cash_and_principal_by_same_amount(api, sandbox, assumptions):
    sandbox.responses["/accounts/checking/loans"] = [
        {"_id": "loan", "type": "auto", "status": "approved", "amount": 8500, "monthly_payment": 100}
    ]
    assumptions["debt_terms"] = {"loan": {"outstanding_principal": "1000", "apr": "0"}}
    result = api.post("/api/simulate", json={
        "assumptions": assumptions, "horizon_months": 1, "decision": {"extra_debt_payments": {"loan": 200}}
    }).json()
    delta = result["difference_from_baseline"]
    assert Decimal(delta["ending_debt_balance"]) == -200
    assert Decimal(delta["ending_liquid_balance"]) == -200
    assert Decimal(delta["ending_known_account_net_worth"]) == 0
