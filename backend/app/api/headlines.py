from fastapi import APIRouter

from app.api.dependencies import DB, Nessie
from app.schemas.headlines import Event, HeadlineInput
from app.schemas.simulation import HeadlineAnalysis
from app.services.headline_classifier import classify
from app.services.scenario_service import compare, load_context

router = APIRouter(tags=["Headlines"])


@router.post("/headlines/classify")
def classify_headline(request: HeadlineInput) -> Event:
    return classify(request.headline)


@router.post("/headlines/analyze")
async def analyze(request: HeadlineAnalysis, client: Nessie, db: DB) -> dict:
    profile, goals = await load_context(client, request.customer_id, db)
    return compare(profile, goals, request)
