import asyncio
import json
from collections import defaultdict

from fastapi import APIRouter

from app.api.dependencies import DB, Nessie
from app.integrations.canopy_demo import demo_account, demo_records
from app.integrations.nessie_client import NessieError
from app.models.financial import FinancialProfile, ZERO
from app.services.dashboard_service import dashboard
from app.services.financial_aggregator import aggregate
from app.services.scenario_service import load_context

router = APIRouter(tags=["Dashboard"])


@router.get("/financial-profile/{customer_id}")
async def financial_profile(customer_id: str, client: Nessie) -> FinancialProfile:
    return await aggregate(client, customer_id)


@router.get("/dashboard/{customer_id}")
async def customer_dashboard(customer_id: str, client: Nessie, db: DB) -> dict:
    profile, goals = await load_context(client, customer_id, db)
    return dashboard(profile, goals)


@router.get("/canopy")
async def canopy(client: Nessie, customer_id: str | None = None) -> dict:
    if not (customer_id or client.settings.nessie_customer_id):
        customers = await client.customers()
        if len(customers) == 1:
            customer_id = customers[0].id
    customer_id = client.customer_id(customer_id)
    profile, account_id = await asyncio.gather(aggregate(client, customer_id), demo_account(client, customer_id))
    records = await demo_records(client, account_id) if account_id else {}
    try:
        inputs = {section: json.loads(payload) for section, payload in records.items()}
    except ValueError:
        raise NessieError("nessie_invalid_response", "Invalid Canopy demo inputs in Nessie.", 502) from None

    as_of = profile.retrieved_at.date()
    daily_changes = defaultdict(lambda: ZERO)
    for tx in profile.transactions:
        if tx.posted(as_of) and tx.direction in {"inflow", "outflow"}:
            daily_changes[tx.date.isoformat()] += tx.amount if tx.direction == "inflow" else -tx.amount

    metrics = dashboard(profile, [])
    return {
        "accounts": profile.accounts,
        "asOf": as_of,
        "dailyChanges": daily_changes,
        "historyStart": profile.income.observation.start,
        "income": metrics["monthly_income"],
        "cashFlow": metrics["monthly_cash_flow"],
        "runway": metrics["emergency_fund_months"],
        "liquidReserves": metrics["liquid_reserves"],
        "inputs": inputs,
    }
