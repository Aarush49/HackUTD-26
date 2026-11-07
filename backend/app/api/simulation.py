from fastapi import APIRouter

from app.api.dependencies import DB, Nessie
from app.schemas.simulation import SimulationRequest
from app.services.scenario_service import load_context
from app.services.simulation_service import simulate

router = APIRouter(tags=["Simulation"])


@router.post("/simulate")
async def run_simulation(request: SimulationRequest, client: Nessie, db: DB) -> dict:
    profile, goals = await load_context(client, request.customer_id, db)
    return simulate(profile, goals, request)
