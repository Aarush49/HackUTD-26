from fastapi import APIRouter, HTTPException

from app.api.dependencies import DB, Nessie
from decimal import Decimal
from uuid import uuid4
from sqlalchemy import select

from app.models.goals import GoalRow, GoalContributionRow
from app.schemas.goals import ContributionCreate, Goal, GoalCreate, GoalInput, GoalPatch
from app.schemas.simulation import ScenarioRequest
from app.services.goal_service import add_contribution, goal_record, list_goals, owned_goal, save_goal, validate_funding
from app.services.financial_aggregator import customer_accounts
from app.services.scenario_service import compare, load_context

router = APIRouter(tags=["Goals"])


@router.post("/goals/contribution-id")
def contribution_id() -> dict:
    return {"request_id": str(uuid4())}


@router.get("/goals/{customer_id}")
def get_goals(customer_id: str, client: Nessie, db: DB) -> list[Goal]:
    return list_goals(db, client.customer_id(customer_id))


@router.post("/goals", status_code=201)
async def create_goal(request: GoalCreate, client: Nessie, db: DB) -> Goal:
    customer_id = client.customer_id(request.customer_id)
    goal = GoalInput.model_validate(request.model_dump(exclude={"customer_id", "opening_source"}))
    await validate_funding(client, customer_id, goal)
    return save_goal(db, customer_id, goal, opening_source=request.opening_source)


@router.patch("/goals/{goal_id}")
async def patch_goal(goal_id: str, request: GoalPatch, client: Nessie, db: DB) -> Goal:
    row = db.get(GoalRow, goal_id)
    if row is None:
        raise HTTPException(404, "Goal not found")
    values = goal_record(db, row).model_dump(exclude={"id", "customer_id"})
    goal = GoalInput.model_validate(values | request.model_dump(exclude_unset=True))
    await validate_funding(client, row.customer_id, goal)
    return save_goal(db, row.customer_id, goal, row)


@router.get("/goals/{goal_id}/roots")
async def goal_roots(goal_id: str, customer_id: str, client: Nessie, db: DB) -> dict:
    row = owned_goal(db, goal_id, client.customer_id(customer_id))
    if row.funding_account_id:
        accounts = await customer_accounts(client, row.customer_id)
        account = next((a for a in accounts if a.id == row.funding_account_id), None)
        balance = account.balance if account else None
        initial = Decimal(row.initial_funded_amount) if row.initial_funded_amount is not None else None
        saved = None if balance is None or (initial is not None and initial > max(Decimal(0), balance)) else initial if initial is not None else max(Decimal(0), balance)
        return {"goal_id": row.id, "saved": str(saved) if saved is not None else None, "can_contribute": False,
                "roots": [{"id": "account", "source": account.nickname or account.type if account else "Funding account",
                           "amount": str(saved) if saved is not None else None, "date": None,
                           "provenance": "Nessie account balance; original income sources are not inferred."}]}
    rows = db.scalars(select(GoalContributionRow).where(GoalContributionRow.goal_id == row.id)
                      .order_by(GoalContributionRow.contributed_on, GoalContributionRow.id)).all()
    saved = Decimal(row.initial_funded_amount or "0")
    roots = [{"id": r.id, "source": r.source, "amount": r.amount, "date": r.contributed_on.isoformat(),
              "provenance": "User-recorded contribution"} for r in rows]
    difference = saved - sum((Decimal(r.amount) for r in rows), Decimal(0))
    if difference:
        roots.append({"id": "unattributed", "source": "Opening balance / adjustments", "amount": str(difference),
                      "date": None, "provenance": "Funding without a recorded source"})
    return {"goal_id": row.id, "saved": str(saved), "can_contribute": True, "roots": roots}


@router.post("/goals/{goal_id}/contributions")
def contribute(goal_id: str, request: ContributionCreate, client: Nessie, db: DB) -> Goal:
    row = owned_goal(db, goal_id, client.customer_id(request.customer_id))
    return add_contribution(db, row, request)


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
