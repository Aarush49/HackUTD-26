from fastapi import APIRouter

from app.api.dependencies import DB, Nessie
from app.schemas.simulation import ScenarioRequest
from app.services.risk_service import predict_risk
from app.services.scenario_service import load_context

router = APIRouter(tags=["Risk"])


@router.post("/risk/predict")
async def predict(request: ScenarioRequest, client: Nessie, db: DB) -> dict:
    profile, goals = await load_context(client, request.customer_id, db)
    return predict_risk(profile, goals, request)
