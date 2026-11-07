from fastapi import APIRouter

from app.api.dependencies import Nessie
from app.models.financial import Account
from app.services.financial_aggregator import customer_accounts

router = APIRouter(tags=["Accounts"])


@router.get("/accounts/{customer_id}")
async def accounts(customer_id: str, client: Nessie) -> list[Account]:
    return await customer_accounts(client, customer_id)
