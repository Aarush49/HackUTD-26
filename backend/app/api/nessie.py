from fastapi import APIRouter
from pydantic import BaseModel

from app.api.dependencies import Nessie
from app.models.financial import Customer

router = APIRouter(tags=["Nessie"])


class CustomerOptions(BaseModel):
    customers: list[Customer]
    default_customer_id: str | None


@router.get("/nessie/customer-options")
async def customer_options(client: Nessie) -> CustomerOptions:
    customers = [Customer.model_validate(record.model_dump()) for record in await client.customers()]
    default = client.settings.nessie_customer_id
    return CustomerOptions(
        customers=customers,
        default_customer_id=default if any(customer.id == default for customer in customers) else None,
    )


@router.get("/nessie/status")
async def status(client: Nessie):
    configured = bool(client.settings.nessie_api_key)
    return {
        "configured": configured,
        "default_customer_configured": bool(client.settings.nessie_customer_id),
        "read_only": True,
        "reachable": (await _check(client)) if configured else None,
    }


async def _check(client: Nessie) -> bool:
    if client.settings.nessie_customer_id:
        await client.customer()
    else:
        await client.customers()
    return True
