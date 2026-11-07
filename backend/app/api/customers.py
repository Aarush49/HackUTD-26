from fastapi import APIRouter

from app.api.dependencies import Nessie
from app.models.financial import Customer
from app.services.financial_aggregator import customer_summary

router = APIRouter(tags=["Customers"])


@router.get("/customers")
async def customers(client: Nessie) -> list[Customer]:
    return [Customer.model_validate(row.model_dump()) for row in await client.customers()]


@router.get("/customers/{customer_id}")
async def customer(customer_id: str, client: Nessie) -> Customer:
    return await customer_summary(client, customer_id)
