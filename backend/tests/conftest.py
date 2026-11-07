from dataclasses import dataclass, field
from datetime import date, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def days_ago(days):
    return (date.today() - timedelta(days=days)).isoformat()


def movement(record_id, days, amount, description, **extra):
    return {"_id": record_id, "transaction_date": days_ago(days), "amount": amount,
            "description": description, "status": "completed", **extra}


@dataclass
class Sandbox:
    responses: dict
    requests: list = field(default_factory=list)

    def __call__(self, request):
        assert request.method == "GET"
        assert request.url.params.get("key") == "test-key"
        self.requests.append(request.url.path)
        if request.url.path not in self.responses:
            return httpx.Response(404, json={"message": "unknown resource"})
        value = self.responses[request.url.path]
        return value if isinstance(value, httpx.Response) else httpx.Response(200, json=value)


@pytest.fixture
def sandbox():
    customer = {"_id": "customer", "first_name": "Test", "last_name": "Customer"}
    checking = {"_id": "checking", "customer_id": "customer", "type": "Checking", "balance": 1100}
    savings = {"_id": "savings", "customer_id": "customer", "type": "Savings", "balance": 2400}
    transfer = movement("transfer", 12, 300, "Account transfer", payer_id="checking", payee_id="savings")
    rows = {
        "/customers": [customer], "/customers/customer": customer, "/customers/customer/accounts": [checking, savings],
        "/accounts/checking": checking, "/accounts/savings": savings,
        "/accounts/checking/deposits": [movement(f"pay-{i}", i * 7 + 2, 500, "ACME Payroll") for i in range(8)]
        + [movement("refund", 9, 50, "Refund for shoes"), movement("loan-proceeds", 8, 700, "Loan proceeds")],
        "/accounts/savings/deposits": [movement("mirror-deposit", 12, 300, "Account transfer")],
        "/accounts/checking/withdrawals": [
            movement("rent", 24, 200, "Rent"), movement("mirror-withdrawal", 12, 300, "Account transfer"),
            movement("pending", 1, 4000, "Rent", status="pending"),
        ],
        "/accounts/checking/purchases": [movement(f"gas-{i}", i * 12 + 2, 35, "Pump", merchant_id="gas") for i in range(4)],
        "/accounts/checking/transfers": [transfer], "/accounts/savings/transfers": [transfer],
        "/accounts/checking/bills": [
            {"_id": "paid", "status": "completed", "payee": "Rent", "account_id": "checking", "payment_amount": 200,
             "payment_date": days_ago(24)},
            {"_id": "recurring", "status": "recurring", "payee": "Rent", "account_id": "checking", "payment_amount": 200,
             "recurring_date": 10},
            {"_id": "future", "status": "pending", "payee": "Insurance", "account_id": "checking", "payment_amount": 100,
             "payment_date": days_ago(-15)},
        ],
        "/accounts/savings/bills": [], "/accounts/savings/loans": [], "/accounts/checking/loans": [],
        "/accounts/savings/withdrawals": [], "/accounts/savings/purchases": [],
        "/merchants/gas": {"_id": "gas", "name": "Filling station", "category": ["Gas Stations"]},
    }
    return Sandbox(rows)


@pytest.fixture
def api(sandbox, tmp_path):
    settings = Settings(nessie_api_key="test-key", nessie_customer_id="customer",
                        database_url=f"sqlite:///{tmp_path / 'test.db'}")
    with TestClient(create_app(settings, transport=httpx.MockTransport(sandbox))) as client:
        yield client


@pytest.fixture
def assumptions():
    return {"monthly_income": "1000", "monthly_spending": "500", "account_rates": {"savings": {"apy": "0"}}}
