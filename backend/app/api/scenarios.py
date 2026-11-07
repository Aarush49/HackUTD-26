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


def saved_scenario(row: ScenarioRow) -> dict:
    return {
        "id": row.id, "name": row.name, "customer_id": row.customer_id,
        "created_at": row.created_at, "parameters": row.parameters,
    }


@router.post("/scenarios/save", status_code=201)
async def save_scenario(request: SavedScenarioRequest, client: Nessie, db: DB) -> dict:
    profile, _ = await load_context(client, request.customer_id, db)
    validate_inputs(profile, request.assumptions, request.decision)
    payload = request.model_dump(mode="json", exclude={"name"})
    payload["customer_id"] = profile.customer.id
    row = ScenarioRow(customer_id=profile.customer.id, name=request.name, parameters=payload)
    db.add(row)
    db.commit()
    return saved_scenario(row)


@router.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: str, db: DB) -> dict:
    row = db.get(ScenarioRow, scenario_id)
    if row is None:
        raise HTTPException(404, "Scenario not found")
    return saved_scenario(row)
