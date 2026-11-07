from fastapi import APIRouter

from app.api.dependencies import DB, Nessie
from app.models.financial import FinancialProfile
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
