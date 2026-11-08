from fastapi import APIRouter, HTTPException

from app.api.dependencies import DB, Nessie
from app.models.goals import GoalRow
from app.schemas.goals import Goal, GoalCreate, GoalInput, GoalPatch
from app.schemas.simulation import ScenarioRequest
from app.services.goal_service import get_goal, list_goals, save_goal, validate_funding
from app.services.scenario_service import compare, load_context

router = APIRouter(tags=["Goals"])


@router.get("/goals/{customer_id}")
def get_goals(customer_id: str, client: Nessie, db: DB) -> list[Goal]:
    return list_goals(db, client.customer_id(customer_id))


@router.post("/goals", status_code=201)
async def create_goal(request: GoalCreate, client: Nessie, db: DB) -> Goal:
    customer_id = client.customer_id(request.customer_id)
    goal = GoalInput.model_validate(request.model_dump(exclude={"customer_id"}))
    await validate_funding(client, customer_id, goal)
    return save_goal(db, customer_id, goal)


@router.patch("/goals/{goal_id}")
async def patch_goal(goal_id: str, request: GoalPatch, client: Nessie, db: DB) -> Goal:
    existing = get_goal(db, goal_id)
    if existing is None:
        raise HTTPException(404, "Goal not found")
    values = existing.model_dump(exclude={"id", "customer_id"})
    goal = GoalInput.model_validate(values | request.model_dump(exclude_unset=True))
    await validate_funding(client, existing.customer_id, goal)
    return save_goal(db, existing.customer_id, goal, row=existing, goal_id=goal_id)


@router.post("/goals/project")
async def project_goals(request: ScenarioRequest, client: Nessie, db: DB) -> dict:
    profile, goals = await load_context(client, request.customer_id, db)
    result = compare(profile, goals, request)
    return {
        "goals": result["goal_changes"], "event": result["event"], "data_sources": result["data_sources"],
        "assumptions": result["assumptions"],
        "baseline_missing_requirements": result["baseline_projection"]["missing_requirements"],
        "scenario_missing_requirements": result["scenario_projection"]["missing_requirements"],
    }
