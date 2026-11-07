from decimal import Decimal


def test_cd_transfer_preserves_wealth_and_restricts_liquidity(api, assumptions):
    cd = {"kind": "cd", "account_id": "savings", "amount": 900, "term_months": 2, "apy": 0, "fee": 0}
    response = api.post("/api/simulate", json={
        "horizon_months": 4, "assumptions": assumptions, "decision": {"product": cd}
    })
    assert response.status_code == 200, response.text
    result = response.json()
    baseline = result["baseline_projection"]["monthly"]
    scenario = result["scenario_projection"]["monthly"]
    assert scenario[1]["known_account_net_worth"] == baseline[1]["known_account_net_worth"]
    assert Decimal(scenario[1]["liquid_balance"]) == Decimal(baseline[1]["liquid_balance"]) - 900
    assert Decimal(scenario[2]["restricted_balance"]) == 900
    assert Decimal(scenario[3]["restricted_balance"]) == 0
    assert scenario[3]["liquid_balance"] == baseline[3]["liquid_balance"]


def test_product_comparison_accounts_for_fees_and_waiting(api, assumptions):
    response = api.post("/api/products/recommend", json={
        "horizon_months": 5, "assumptions": assumptions,
        "product": {"kind": "hysa", "account_id": "savings", "amount": 900, "apy": 0, "fee": 10},
    })
    assert response.status_code == 200, response.text
    options = {row["option"]: row for row in response.json()["options"]}
    assert set(options) == {"take_action", "do_nothing", "wait"}
    assert Decimal(options["take_action"]["estimated_effects"]["ending_known_account_net_worth"]) == -10
    assert Decimal(options["take_action"]["estimated_effects"]["product_fees"]) == 10
    assert Decimal(options["do_nothing"]["estimated_effects"]["product_fees"]) == 0
    assert Decimal(options["wait"]["projection"]["monthly"][3]["product_balance"]) == 0
    assert Decimal(options["wait"]["projection"]["monthly"][4]["product_balance"]) == 900
    assert response.json()["preferred_option"] == "do_nothing"


def test_hysa_cash_is_available_for_required_debt_payment(api, sandbox, assumptions):
    sandbox.responses["/accounts/checking/loans"] = [
        {"_id": "loan", "type": "auto", "status": "approved", "amount": 1000, "monthly_payment": 900}
    ]
    assumptions.update(monthly_income=0, monthly_spending=1800,
                       debt_terms={"loan": {"outstanding_principal": 1000, "apr": 0}})
    response = api.post("/api/simulate", json={
        "horizon_months": 1, "assumptions": assumptions,
        "decision": {"product": {"kind": "hysa", "account_id": "savings", "amount": 2000, "apy": 0, "fee": 0}},
    })
    assert response.status_code == 200, response.text
    data = response.json()["scenario_projection"]
    assert data["financial_runway"]["first_shortfall_month"] is None
    assert Decimal(data["monthly"][1]["debt_payment"]) == 900
    assert Decimal(data["monthly"][1]["liquid_balance"]) == 700


def test_balance_transfer_charges_fee_without_creating_cash(api, sandbox, assumptions):
    card = {"_id": "card", "type": "Credit Card", "balance": 1000, "customer_id": "customer"}
    sandbox.responses["/customers/customer/accounts"].append(card)
    sandbox.responses["/accounts/card"] = card
    for resource in ("deposits", "withdrawals", "purchases", "transfers", "bills", "loans"):
        sandbox.responses[f"/accounts/card/{resource}"] = []
    assumptions["debt_terms"] = {"card": {"apr": 0, "monthly_payment": 50}}
    response = api.post("/api/simulate", json={
        "horizon_months": 1, "assumptions": assumptions,
        "decision": {"product": {
            "kind": "balance_transfer", "debt_id": "card", "amount": 1000, "promo_apr": 0, "promo_months": 1,
            "post_promo_apr": ".15", "monthly_payment": 50, "transfer_fee_rate": ".03", "flat_fee": 5,
        }},
    })
    assert response.status_code == 200, response.text
    delta = response.json()["difference_from_baseline"]
    assert Decimal(delta["product_fees"]) == 35
    assert Decimal(delta["ending_debt_balance"]) == 35
    assert Decimal(delta["ending_liquid_balance"]) == 0
