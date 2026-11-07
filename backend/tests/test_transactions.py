from datetime import date
from decimal import Decimal

import pytest

from app.services.income_estimator import cadence


def test_nessie_transactions_classified_and_deduplicated(api):
    profile = api.get("/api/financial-profile/customer").json()
    transactions = {row["id"]: row for row in profile["transactions"]}
    assert transactions["transfer"]["classification"] == "internal_transfer"
    assert transactions["transfer"]["related_account_ids"] == ["checking", "savings"]
    assert transactions["mirror-deposit"]["duplicate_of"] == "transfer"
    assert transactions["mirror-withdrawal"]["duplicate_of"] == "transfer"
    assert transactions["refund"]["classification"] == "refund"
    assert transactions["loan-proceeds"]["classification"] == "loan_proceeds"
    assert Decimal(profile["income"]["amount"]) == Decimal("2166.67")
    assert profile["income"]["streams"][0]["cadence"] == "weekly"
    assert Decimal(profile["expenses"]["breakdown"]["housing"]) == Decimal("121.75")
    assert Decimal(profile["expenses"]["forecast_breakdown"]["housing"]) == 200
    assert Decimal(profile["expenses"]["recurring_bills"]) == 200
    assert "insurance" not in profile["expenses"]["breakdown"]
    assert Decimal(profile["expenses"]["gasoline_monthly"]) == Decimal("85.22")


@pytest.mark.parametrize(("days", "name"), [
    (["2026-03-01", "2026-03-15", "2026-03-29", "2026-04-12"], "biweekly"),
    (["2026-01-15", "2026-01-31", "2026-02-15", "2026-02-28", "2026-03-15"], "semimonthly"),
    (["2026-01-05", "2026-02-05", "2026-03-05"], "monthly"),
    (["2026-01-05", "2026-01-08", "2026-02-28"], "irregular"),
])
def test_pay_cadence(days, name):
    assert cadence([date.fromisoformat(day) for day in days])[0] == name
