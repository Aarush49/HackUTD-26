from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.api.dependencies import DB, Nessie
from app.models.scenarios import ScenarioRow
from app.schemas.simulation import SavedScenarioRequest, ScenarioRequest
from app.services.projection_engine import validate_inputs
from app.services.scenario_service import compare, load_context

router = APIRouter(tags=["Scenarios"])


@router.post("/scenarios/compare")
async def compare_scenarios(request: ScenarioRequest, client: Nessie, db: DB) -> dict:
    profile, goals = await load_context(client, request.customer_id, db)
    return compare(profile, goals, request)


def saved_scenario(doc: dict) -> dict:
    return {
        "id": doc.get("id") or str(doc.get("_id")),
        "name": doc["name"],
        "customer_id": doc["customer_id"],
        "created_at": doc["created_at"],
        "parameters": doc["parameters"],
    }


@router.post("/scenarios/save", status_code=201)
async def save_scenario(request: SavedScenarioRequest, client: Nessie, db: DB) -> dict:
    profile, _ = await load_context(client, request.customer_id, db)
    validate_inputs(profile, request.assumptions, request.decision)
    payload = request.model_dump(mode="json", exclude={"name"})
    payload["customer_id"] = profile.customer.id
    scenario_id = str(uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    doc = {
        "_id": scenario_id,
        "id": scenario_id,
        "customer_id": profile.customer.id,
        "name": request.name,
        "created_at": created_at,
        "parameters": payload,
    }
    db["scenarios"].insert_one(doc)
    return saved_scenario(doc)


@router.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: str, db: DB) -> dict:
    doc = db["scenarios"].find_one({"id": scenario_id}) or db["scenarios"].find_one({"_id": scenario_id})
    if doc is None:
        raise HTTPException(404, "Scenario not found")
    return saved_scenario(doc)
