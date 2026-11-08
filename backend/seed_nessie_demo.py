"""Populate a dedicated Canopy customer in the Nessie banking sandbox."""

from datetime import datetime, timedelta, timezone

import httpx

from app.config import Settings
from app.integrations.nessie_client import safe_id

SANDBOX_URL = "https://prod-api.nessieisreal.com"
FIRST_NAME, LAST_NAME = "Canopy", "Chart Demo"
ADDRESS = {
    "street_number": "100", "street_name": "Demo Way",
    "city": "Richardson", "state": "TX", "zip": "75080",
}


def request(client, method, path, payload=None):
    try:
        response = client.request(method, path, json=payload)
    except httpx.RequestError:
        raise SystemExit(f"Nessie connection failed for {method} {path}. Run again to resume.") from None
    if not response.is_success:
        raise SystemExit(f"Nessie returned HTTP {response.status_code} for {method} {path}.")
    return response.json()


def find_or_create(client, path, matches, payload):
    matches_found = [row for row in request(client, "GET", path) if matches(row)]
    if len(matches_found) > 1:
        raise SystemExit(f"Multiple demo records matched in {path}.")
    if matches_found:
        return safe_id(matches_found[0]["_id"])
    result = request(client, "POST", path, payload)
    return safe_id(result.get("objectCreated", result)["_id"])


def seed():
    settings = Settings.from_env()
    if not settings.nessie_api_key or settings.nessie_base_url.rstrip("/") != SANDBOX_URL:
        raise SystemExit("Configure a Nessie key and the official Nessie sandbox URL in backend/.env.")

    with httpx.Client(base_url=SANDBOX_URL, params={"key": settings.nessie_api_key}, timeout=12) as client:
        customer = find_or_create(
            client, "/customers",
            lambda row: row.get("first_name") == FIRST_NAME and row.get("last_name") == LAST_NAME
            and row.get("address") == ADDRESS,
            {"first_name": FIRST_NAME, "last_name": LAST_NAME, "address": ADDRESS},
        )
        print(f"Demo customer ID: {customer}", flush=True)
        accounts = f"/customers/{customer}/accounts"
        for kind, balance in (("Checking", 2800), ("Savings", 6500)):
            nickname = f"Canopy Demo {kind}"
            account = find_or_create(
                client, accounts,
                lambda row: row.get("type") == kind and row.get("nickname") == nickname,
                {"type": kind, "nickname": nickname, "rewards": 0, "balance": balance},
            )
            if kind == "Checking":
                checking = account

        today = datetime.now(timezone.utc).date()
        friday = today - timedelta(days=(today.weekday() - 4) % 7)
        deposits, withdrawals = (f"/accounts/{checking}/{name}" for name in ("deposits", "withdrawals"))
        existing = {
            path: {(row.get("transaction_date"), row.get("description")) for row in request(client, "GET", path)}
            for path in (deposits, withdrawals)
        }
        added = 0
        for week in range(7, -1, -1):
            payday = friday - timedelta(weeks=week)
            transactions = (
                (deposits, payday, "Canopy Demo Payroll", 1250),
                (withdrawals, payday - timedelta(days=1), "Canopy Demo Grocery and household", 158 + week * 4),
                (withdrawals, payday - timedelta(days=2), "Canopy Demo Fuel", 39 + week * 2),
                (withdrawals, payday - timedelta(days=4), "Canopy Demo Rent and utilities", 610),
            )
            for path, day, description, amount in transactions:
                day = day.isoformat()
                if (day, description) not in existing[path]:
                    request(client, "POST", path, {
                        "medium": "balance", "transaction_date": day, "description": description,
                        "amount": amount, "status": "completed",
                    })
                    added += 1
        print(f"Seeded {added} new transactions.", flush=True)


if __name__ == "__main__":
    seed()
