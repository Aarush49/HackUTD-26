from fastapi import APIRouter

from app.api.dependencies import DB, Nessie
from app.models.financial import ZERO
from app.schemas.simulation import FundingPlanRequest, ScenarioRequest
from app.services.financial_aggregator import customer_accounts
from app.services.risk_service import predict_risk
from app.services.scenario_service import load_context

router = APIRouter(tags=["Risk"])


@router.post("/risk/predict")
async def predict(request: ScenarioRequest, client: Nessie, db: DB) -> dict:
    profile, goals = await load_context(client, request.customer_id, db)
    return predict_risk(profile, goals, request)


@router.post("/risk/funding-plan")
async def funding_plan(request: FundingPlanRequest, client: Nessie) -> dict:
    customer_id = client.customer_id(request.customer_id)
    accounts = await customer_accounts(client, customer_id)
    liquid = sorted(
        (account for account in accounts if account.liquid),
        key=lambda account: (account.type.lower() != "checking", account.id),
    )
    remaining = request.amount
    sources = []
    for account in liquid:
        if account.balance is None or account.balance <= ZERO or remaining == ZERO:
            continue
        amount = min(account.balance, remaining)
        sources.append({"account_id": account.id, "name": account.nickname or account.type, "amount": amount})
        remaining -= amount
    return {
        "amount": request.amount,
        "sources": sources,
        "uncovered_amount": remaining,
        "unknown_balance_count": sum(account.balance is None for account in liquid),
    }
