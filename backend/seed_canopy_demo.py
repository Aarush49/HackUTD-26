"""Seed only the Canopy demo inputs that Nessie's banking schema cannot represent."""

import argparse
import asyncio
import json
import logging
from datetime import date

from app.config import Settings
from app.integrations.canopy_demo import ACCOUNT_NICKNAME, RECORD_PREFIX, demo_account, demo_records
from app.integrations.nessie_client import NessieClient, NessieError, safe_id

INPUTS = {
    "accounts": {
        "c1": {"balance": 2800},
        "s1": {"balance": 6500, "rate": 4.1},
        "cd": {"balance": 2500, "rate": 4.35},
        "ira": {"balance": 14400},
        "cc": {"balance": -1200, "rate": 22.4},
        "auto": {"balance": -6100, "rate": 6.1},
        "mort": {"balance": -11400, "rate": 4.0},
    },
    "cashFlow": {"income": 5400, "spending": 3700, "priorMonthlyGrowth": 225},
    "goals": {
        "japan": {"saved": 2800, "target": 6500, "eta": "2027-04-18", "change": 6},
        "home": {"saved": 4400, "target": 18000, "eta": "2027-08-04"},
        "car": {"saved": 2100, "target": 14000, "eta": "2028-11-20", "change": 3},
    },
    "risk": {"inflation": 3.2, "monthlyFees": 9, "incomeReduction": 0.8, "rangeMargin": 15},
    "simulation": {
        "monthly": {"initial": 650, "min": 100, "max": 1800, "step": 50},
        "years": {"initial": 8, "min": 2, "max": 20, "step": 1},
        "rate": {"initial": 6.5, "min": 2, "max": 12, "step": 0.5},
        "growthPremium": 2.0,
    },
    "impact": {
        "Fed signals a slower path for rate cuts": [0, -0.1, 0.1, 3],
        "Fed holds rates": [0, 0, 0, 0],
        "Inflation cools": [0, -0.25, -0.15, -2],
        "Oil prices climb": [-120, 0, 0, 8],
        "range": [40, 0.15, 0.2, 3],
    },
    "display": {
        "accountRates": {"c1": 0.05, "ira": 6.5},
        "defaultImpact": [0, 0, 0, 0],
    },
}


async def seed(settings: Settings, customer_id: str) -> None:
    client = NessieClient(settings)
    try:
        await client.customer(customer_id)
        account_id = await demo_account(client, customer_id)
        if account_id is None:
            await client.create_demo_record(f"customers/{customer_id}/accounts", {
                "type": "Savings", "nickname": ACCOUNT_NICKNAME, "balance": 0, "rewards": 0,
            })
            account_id = await demo_account(client, customer_id)
        if account_id is None:
            raise SystemExit("The demo account could not be read back. Check Nessie before retrying.")
        existing = await demo_records(client, account_id)
        for name, values in INPUTS.items():
            if name not in existing:
                await client.create_demo_record(f"accounts/{safe_id(account_id)}/deposits", {
                    "medium": "balance", "status": "completed", "transaction_date": date.today().isoformat(),
                    "amount": 0,
                    "description": RECORD_PREFIX + name + ":" + json.dumps(values, separators=(",", ":")),
                })
        verified = await demo_records(client, account_id)
        if missing := INPUTS.keys() - verified.keys():
            raise SystemExit(f"Nessie did not return these demo sections: {', '.join(sorted(missing))}")
        for name in INPUTS:
            json.loads(verified[name])
        print(f"Verified {len(INPUTS)} Canopy demo sections in Nessie.")
    finally:
        await client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--customer", required=True, help="Nessie sandbox customer to seed")
    args = parser.parse_args()
    logging.getLogger("httpx").setLevel(logging.WARNING)
    try:
        asyncio.run(seed(Settings.from_env(), safe_id(args.customer)))
    except NessieError as error:
        raise SystemExit(str(error)) from None
