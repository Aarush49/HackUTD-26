from datetime import date, timedelta
from uuid import uuid4


def create(api, **overrides):
    response = api.post("/api/goals", json={"name": "Japan in spring", "target_amount": "6500",
                        "monthly_contribution": "200", "initial_funded_amount": "4200",
                        "opening_source": "Job", "news_context": "Japan hotel prices", **overrides})
    assert response.status_code == 201, response.text
    return response.json()


def test_create_roots_contribution_and_retry(api):
    goal = create(api)
    assert goal["news_context"] == "Japan hotel prices"
    roots_path = f'/api/goals/{goal["id"]}/roots?customer_id=customer'
    roots = api.get(roots_path).json()
    assert roots["saved"] == "4200"
    assert roots["roots"][0]["source"] == "Job"
    assert roots["can_contribute"] is True
    request = {"customer_id": "customer", "request_id": str(uuid4()), "source": "Extra savings from last month",
               "amount": "65.29", "contributed_on": date.today().isoformat()}
    path = f'/api/goals/{goal["id"]}/contributions'
    first = api.post(path, json=request)
    assert first.status_code == 200, first.text
    assert first.json()["initial_funded_amount"] == "4265.29"
    assert api.post(path, json=request).json()["initial_funded_amount"] == "4265.29"
    assert api.post(path, json={**request, "amount": "80"}).status_code == 409
    roots = api.get(roots_path).json()
    assert len(roots["roots"]) == 2
    assert api.get("/api/goals/customer").json()[0]["initial_funded_amount"] == "4265.29"
    # The normal goal PATCH must preserve the separately stored context.
    assert api.patch(f'/api/goals/{goal["id"]}', json={"name": "Japan trip"}).json()["news_context"] == "Japan hotel prices"


def test_roots_scope_dates_and_linked_balance(api):
    goal = create(api, funding_account_id="savings", initial_funded_amount=None)
    path = f'/api/goals/{goal["id"]}'
    assert api.get(path + "/roots?customer_id=another").status_code == 404
    roots = api.get(path + "/roots?customer_id=customer").json()
    assert roots["saved"] == "2400"
    assert roots["can_contribute"] is False
    request = {"customer_id": "customer", "request_id": str(uuid4()), "source": "Job",
               "amount": "10", "contributed_on": date.today().isoformat()}
    assert api.post(path + "/contributions", json=request).status_code == 422
    assert api.post(path + "/contributions", json={**request, "contributed_on": (date.today() + timedelta(days=1)).isoformat()}).status_code == 422
    assert api.post(path + "/contributions", json={**request, "customer_id": "another"}).status_code == 404
    assert api.post("/api/goals", json={"name": "   ", "target_amount": 1, "monthly_contribution": 0}).status_code == 422


def test_manual_funding_adjustment_is_reconciled_without_inventing_sources(api):
    goal = create(api)
    assert api.patch(f'/api/goals/{goal["id"]}', json={"initial_funded_amount": "4000"}).status_code == 200
    roots = api.get(f'/api/goals/{goal["id"]}/roots?customer_id=customer').json()
    assert roots["roots"][-1]["amount"] == "-200"
    assert roots["roots"][-1]["source"] == "Opening balance / adjustments"
