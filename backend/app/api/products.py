from fastapi import APIRouter

from app.api.dependencies import DB, Nessie
from app.schemas.simulation import ProductRequest
from app.services.product_service import catalog, recommend
from app.services.scenario_service import load_context

router = APIRouter(tags=["Products"])


@router.get("/products")
def get_catalog() -> list[dict]:
    return catalog()


@router.post("/products/recommend")
async def recommend_products(request: ProductRequest, client: Nessie, db: DB) -> dict:
    profile, goals = await load_context(client, request.customer_id, db)
    return recommend(profile, goals, request)
