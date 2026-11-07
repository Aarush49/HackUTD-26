def test_goal_allocation_and_headline_completion(api, assumptions):
    goal = {"name": "Emergency reserve", "target_amount": 2508, "monthly_contribution": 100,
            "funding_account_id": "savings"}
    created = api.post("/api/goals", json=goal)
    assert created.status_code == 201, created.text
    assert api.post("/api/goals", json=goal).status_code == 409
    goal_id = created.json()["id"]
    assert api.patch(f"/api/goals/{goal_id}", json={"name": "Emergency"}).json()["name"] == "Emergency"
    assert api.patch(f"/api/goals/{goal_id}", json={"priority": None}).status_code == 422
    assert len(api.get("/api/goals/customer").json()) == 1
    assumptions["account_rates"]["savings"] = {"apy": ".05", "variable": True}
    response = api.post("/api/goals/project", json={
        "headline": "Fed cuts rates by 500 bps", "horizon_months": 3, "assumptions": assumptions,
        "exposure": {"rate_pass_through": 1},
    })
    assert response.status_code == 200, response.text
    change = response.json()["goals"][0]
    assert change["baseline"]["starting_amount"] == "2400"
    assert change["baseline"]["completion_month"] == 1
    assert change["scenario"]["completion_month"] == 2


def test_goal_account_must_be_owned(api):
    result = api.post("/api/goals", json={"name": "Goal", "target_amount": 100,
                                          "monthly_contribution": 20, "funding_account_id": "other"})
    assert result.status_code == 422
