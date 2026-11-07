from fastapi import APIRouter

from app.api.dependencies import Nessie
from app.schemas.financial import TransactionHistory
from app.services.financial_aggregator import aggregate

router = APIRouter(tags=["Transactions"])


@router.get("/transactions/{customer_id}")
async def transactions(customer_id: str, client: Nessie) -> TransactionHistory:
    profile = await aggregate(client, customer_id)
    return TransactionHistory(
        customer_id=profile.customer.id, transactions=profile.transactions,
        retrieved_at=profile.retrieved_at, data_gaps=profile.data_gaps,
    )
